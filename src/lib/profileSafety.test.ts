import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { project } from '../engine/projection.ts'
import { checkCases, genCases } from './householdGen.ts'
import { bookProblems } from './identities.ts'
import { readProfileJson } from './migrations.ts'
import { assumptionsOf } from './resultsModel.ts'
import { SCHEMA_VERSION, validateProfile, type Profile } from './schema.ts'
import { exportProfileJson } from './store.ts'

// A PROFILE IS THE ONE THING A PERSON CANNOT RE-ENTER. It lives as JSON, is exported to a file, imported on another machine, and — after a release — migrated from the shape it was saved in. schemaVersion.test.ts
// holds that every old fixture OPENS at the current version; nothing held what it opened AS. Here each migration's effect is read from the migrated values, the fixtures are run through the engine
// and its books, an export is shown to read back as exactly itself, and the households the generator makes (all of them plausible) are shown to be accepted by the validator — a plausible person
// whose own figures the schema refuses would be a person who cannot import their own life.

const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const versions = readdirSync(dir)
  .map((n) => /^profile\.v(\d+)\.json$/.exec(n)?.[1])
  .filter((v): v is string => v !== undefined)
  .map(Number)
  .sort((a, b) => a - b)
const text = (v: number) => readFileSync(join(dir, `profile.v${v}.json`), 'utf8')
const read = (v: number): Profile => {
  const r = readProfileJson(text(v))
  if (!r.ok) throw new Error(`profile.v${v}.json: ${r.reason} ${JSON.stringify(r.problems)}`)
  return r.profile
}
const TODAY = { year: 2026, month: 10 }

describe('every fixture, migrated to today’s schema', { timeout: 120_000 }, () => {
  it('there is one for every version, 1 to the current one', () => expect(versions).toEqual(Array.from({ length: SCHEMA_VERSION }, (_, i) => i + 1)))

  for (const v of versions) {
    it(`v${v}: reads as the current version, and the plan it holds runs through the engine with the books intact`, () => {
      const p = read(v)
      expect(p.version).toBe(SCHEMA_VERSION)
      const a = assumptionsOf(p, TODAY)
      expect(bookProblems(project(p.household, a), a), `v${v}`).toEqual([])
    })
  }
})

describe('what each migration did, read from the migrated values', () => {
  const upTo = (n: number) => versions.filter((v) => v <= n)

  it('v1 → v2: the living-alone fact is stated (a boolean), and a couple never lives alone', () => {
    for (const v of upTo(1)) {
      const h = read(v).household
      expect(typeof h.livesAlone, `v${v}`).toBe('boolean')
      if (h.persons.length === 2) expect(h.livesAlone).toBe(false)
    }
  })

  it('v7 → v8: no home where none was recorded', () => {
    for (const v of upTo(7)) expect(read(v).household.home ?? null, `v${v}`).toBeNull()
  })

  it('v8 → v9: nothing is confirmed that was not', () => {
    for (const v of upTo(8)) expect(read(v).confirmed, `v${v}`).toEqual([])
  })

  it('v9 → v10: no locked-in part where none was recorded', () => {
    for (const v of upTo(9)) for (const p of read(v).household.persons) expect(p.accounts.rrsp.lockedIn ?? 0, `v${v} ${p.id}`).toBe(0)
  })

  it('v10 → v11: the surplus is not sent to the RRSP for a file that never asked', () => {
    for (const v of upTo(10)) expect(read(v).assumptions.surplusToRrsp ?? false, `v${v}`).toBe(false)
  })

  it('v11 → v12: the markets are the average return every year (« lisse »), as every older file was computed', () => {
    for (const v of upTo(11)) expect(read(v).assumptions.marketPath?.preset, `v${v}`).toBe('smooth')
  })

  it('v12 → v13: no named plans where none were kept', () => {
    for (const v of upTo(12)) expect(read(v).plans, `v${v}`).toEqual([])
  })

  it('v14 → v15: every person keeps the scenario’s plan end (null) that every older file meant', () => {
    for (const v of upTo(14)) for (const p of read(v).household.persons) expect(p.horizonAge ?? null, `v${v} ${p.id}`).toBeNull()
  })

  it('v15 → v16: the children are in the household, as a list of birth years', () => {
    for (const v of upTo(15)) {
      const kids = read(v).household.children
      expect(Array.isArray(kids ?? []), `v${v}`).toBe(true)
      for (const y of kids ?? []) expect(Number.isInteger(y) && y > 1900 && y < 2100, `v${v} child ${y}`).toBe(true)
    }
  })

  it('v21 → v22 and v20 → v21: the way of drawing is the old one — no fill, accounts not drawn together', () => {
    for (const v of upTo(20)) expect(read(v).assumptions.drawTogether ?? false, `v${v}`).toBe(false)
    for (const v of upTo(21)) expect(read(v).assumptions.bracketFill ?? null, `v${v}`).toBeNull()
  })

  it('the budget, the ages and the money a file held are not changed by migrating it (v5 and v10, read against the raw file)', () => {
    for (const v of [5, 10]) {
      const raw = JSON.parse(text(v)) as { household: { spending: unknown; persons: { birth: unknown; retirementAge: number; salaryToday: number; accounts: { rrsp: { balance: number } } }[] } }
      const migrated = read(v).household
      expect(migrated.spending, `v${v}`).toEqual(raw.household.spending)
      raw.household.persons.forEach((p, i) => {
        expect(migrated.persons[i].birth, `v${v}`).toEqual(p.birth)
        expect(migrated.persons[i].retirementAge).toBe(p.retirementAge)
        expect(migrated.persons[i].salaryToday).toBe(p.salaryToday)
        expect(migrated.persons[i].accounts.rrsp.balance).toBe(p.accounts.rrsp.balance)
      })
    }
  })
})

describe('an export reads back as exactly itself', () => {
  for (const v of versions) {
    it(`v${v}: export → import → export is byte-identical, and the profile read back is the one exported`, () => {
      const p = read(v)
      const out = exportProfileJson(p)
      const back = readProfileJson(out)
      expect(back.ok, `v${v}`).toBe(true)
      if (!back.ok) return
      expect(back.profile).toEqual(p)
      expect(exportProfileJson(back.profile)).toBe(out)
    })
  }
})

describe('every household the generator makes is a profile the validator accepts', () => {
  it('200 plausible households, each saved, exported, imported: nothing refused, nothing changed', () => {
    const base = read(SCHEMA_VERSION)
    const list = [3, 30, 300, 3000].flatMap((s) => genCases(s, 50))
    expect(
      checkCases(list, (c) => {
        // the stored shape states what the engine leaves optional: no home is `null`, no employer contribution is 0
        const household = {
          ...c.household,
          home: c.household.home ?? null,
          persons: c.household.persons.map((p) => ({ ...p, accounts: { ...p.accounts, rrsp: { ...p.accounts.rrsp, employerContribution: p.accounts.rrsp.employerContribution ?? 0 } } })),
        } as unknown as Profile['household']
        const profile: Profile = { ...base, household }
        const refused = validateProfile(profile)
        if (!refused.ok) return refused.problems.slice(0, 4).map((p) => `${p.path}: ${p.problem}`)
        const back = readProfileJson(exportProfileJson(refused.profile))
        if (!back.ok) return [`the exported file is refused: ${back.reason}`]
        return JSON.stringify(back.profile.household) === JSON.stringify(refused.profile.household) ? [] : ['the household changes through export and import']
      }),
    ).toBeNull()
  })
})
