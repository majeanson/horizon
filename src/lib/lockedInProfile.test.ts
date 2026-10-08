import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { EXAMPLES } from '../engine/golden/examples.ts'
import { runScenario } from '../engine/retireAt.ts'
import { balanceBars, BALANCE_SEGMENTS } from './chartData.ts'
import { factsOf } from './facts.ts'
import { migrateProfile } from './migrations.ts'
import { setRrspBalance } from './profileEdit.ts'
import { exampleProfile } from './example.ts'
import { SCHEMA_VERSION, validateProfile, type Profile } from './schema.ts'
import { lockedOf, yearCsv } from './yearCsv.ts'

// THE LOCKED-IN PART OF THE REER, AS A SAVED PROFILE: what is accepted, what is refused, how an older file opens, what is asked of
// someone who has none (nothing), and how the part shows in the chart and the spreadsheet.

const dir = dirname(fileURLToPath(import.meta.url))
const golden = (): Profile => JSON.parse(readFileSync(join(dir, 'fixtures', `profile.v${SCHEMA_VERSION}.json`), 'utf8'))
const withLocked = (p: Profile, lockedIn: number, employerContribution = 0): Profile => ({
  ...p,
  household: { ...p.household, persons: p.household.persons.map((x, i) => (i === 0 ? { ...x, accounts: { ...x.accounts, rrsp: { ...x.accounts.rrsp, lockedIn, employerContribution } } } : x)) },
})

describe('the saved shape', () => {
  it('a locked part within the balance is accepted and survives a round trip', () => {
    const p = withLocked(golden(), 10_000, 1_500)
    const read = validateProfile(JSON.parse(JSON.stringify(p)))
    expect(read.ok && read.profile.household.persons[0].accounts.rrsp).toMatchObject({ lockedIn: 10_000, employerContribution: 1_500 })
  })

  it('more locked than the balance is refused, on the locked field', () => {
    const p = golden()
    const balance = p.household.persons[0].accounts.rrsp.balance
    const bad = validateProfile(withLocked(p, balance + 1))
    expect(!bad.ok && bad.problems).toContainEqual({ path: 'household.persons[0].accounts.rrsp.lockedIn', problem: 'range' })
    expect(validateProfile(withLocked(p, balance)).ok).toBe(true) // all of it locked is fine
  })

  it('a file without the keys is refused (the migration writes them), a negative or absurd amount is refused', () => {
    const p = JSON.parse(JSON.stringify(golden()))
    delete p.household.persons[0].accounts.rrsp.lockedIn
    const missing = validateProfile(p)
    expect(!missing.ok && missing.problems).toContainEqual({ path: 'household.persons[0].accounts.rrsp.lockedIn', problem: 'missing' })
    expect(validateProfile(withLocked(golden(), -1)).ok).toBe(false)
    expect(validateProfile(withLocked(golden(), 0, 2e9)).ok).toBe(false)
  })

  it('every example saves: its person carries both keys', () => {
    for (const id of ['golden', 'average', 'heir', 'downsizer'] as const) expect(validateProfile(exampleProfile(id)).ok, id).toBe(true)
  })
})

describe('an older file', () => {
  it('a version-9 file opens with nothing locked and no employer contribution, on every person', () => {
    const old = JSON.parse(readFileSync(join(dir, 'fixtures', 'profile.v9.json'), 'utf8'))
    const read = migrateProfile(old)
    expect(read.ok).toBe(true)
    if (read.ok) for (const p of read.profile.household.persons) expect(p.accounts.rrsp).toMatchObject({ lockedIn: 0, employerContribution: 0 })
  })
  it('a file that already carries the keys keeps its values through the step', () => {
    const old = JSON.parse(readFileSync(join(dir, 'fixtures', 'profile.v9.json'), 'utf8'))
    old.household.persons[0].accounts.rrsp.lockedIn = 7_000
    const read = migrateProfile(old)
    expect(read.ok && read.profile.household.persons[0].accounts.rrsp.lockedIn).toBe(7_000)
  })
})

describe('setRrspBalance', () => {
  it('lowering the balance lowers the locked part with it; raising it leaves the locked part alone; the same person back when nothing changes', () => {
    const person = withLocked(golden(), 30_000).household.persons[0]
    const lowered = setRrspBalance(person, 20_000)
    expect(lowered.accounts.rrsp).toMatchObject({ balance: 20_000, lockedIn: 20_000 })
    const raised = setRrspBalance(person, person.accounts.rrsp.balance + 5_000)
    expect(raised.accounts.rrsp.lockedIn).toBe(30_000)
    expect(setRrspBalance(person, person.accounts.rrsp.balance)).toBe(person)
  })
})

describe('what is asked of someone who has none: nothing', () => {
  it('the locked part is a figure to confirm only when there is one', () => {
    expect(factsOf(golden()).some((f) => f.kind === 'rrspLocked')).toBe(false)
    const facts = factsOf(withLocked(golden(), 5_000)).filter((f) => f.kind === 'rrspLocked')
    expect(facts.map((f) => f.owner)).toEqual(['self'])
  })
})

describe('in the chart and the spreadsheet', () => {
  const { household, assumptions } = EXAMPLES.average // Luc has an RVER
  const result = runScenario(household, assumptions, {}, 63)
  const scale = { dollars: 'nominal' as const, todayYear: assumptions.today.year, inflation: assumptions.inflation }

  it('the locked part is split out of the REER bar: the bars still add up to the accounts, and the split follows the rows', () => {
    const bars = balanceBars(result.rows, null, scale)
    result.rows.forEach((row, i) => {
      const locked = lockedOf(row)
      expect(bars[i].rrspLocked).toBeCloseTo(locked, 6)
      const accounts = Object.values(row.persons).reduce((s, p) => s + BALANCE_SEGMENTS.reduce((t, k) => t + p.balancesEnd[k], 0), 0)
      expect(bars[i].rrsp + bars[i].rrspLocked + bars[i].tfsa + bars[i].nonReg).toBeCloseTo(accounts, 4)
    })
    expect(bars[0].rrspLocked).toBeGreaterThan(0)
  })

  it('a person’s own bars hold only their locked part', () => {
    const bars = balanceBars(result.rows, 'self', scale) // Marie has none
    expect(bars.every((b) => b.rrspLocked === 0)).toBe(true)
    expect(balanceBars(result.rows, 'spouse', scale)[0].rrspLocked).toBeGreaterThan(0)
  })

  it('the spreadsheet gets the column only when someone has a locked part', () => {
    const heads = { year: 'Année', ages: 'Âges', income: 'Revenu', tax: 'Impôt', spending: 'Dépenses', shortfall: 'Manque', netWorth: 'Valeur nette', rrspLocked: 'REER immobilisé' }
    const header = (csv: string) => csv.replace('﻿', '').split('\r\n')[0]
    expect(header(yearCsv(result, heads, 'fr'))).toContain('REER immobilisé')
    const none = runScenario(EXAMPLES.modest.household, EXAMPLES.modest.assumptions, {}, 65)
    expect(header(yearCsv(none, heads, 'fr'))).not.toContain('REER immobilisé')
  })
})
