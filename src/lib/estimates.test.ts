import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { plain } from '../engine/params/cited.ts'
import { knownYear } from '../engine/params/index.ts'
import { TFSA_LIMIT_HISTORY } from '../engine/params/tfsaHistory.ts'
import { estimateMissing, estimateTfsaRoom } from './estimates.ts'
import { factId } from './facts.ts'
import { setFact } from './profileEdit.ts'
import { SCHEMA_VERSION, type Profile } from './schema.ts'

// THE QUICK WAY: what an estimate fills, what it never touches, and the table of limits it stands on.

const dir = dirname(fileURLToPath(import.meta.url))
const golden = (): Profile => JSON.parse(readFileSync(join(dir, 'fixtures', `profile.v${SCHEMA_VERSION}.json`), 'utf8'))
const TODAY = { year: 2026 }
const limits = plain(TFSA_LIMIT_HISTORY)

describe('the TFSA limits since 2009', () => {
  it('the nineteen years add up to the cumulative figure the engine already cites, and every year is there', () => {
    const years = Object.keys(limits).map(Number)
    expect(Math.min(...years)).toBe(2009)
    expect(Math.max(...years)).toBe(2026)
    for (let y = 2009; y <= 2026; y++) expect(limits[y], `${y}`).toBeGreaterThan(0)
    expect(years.reduce((s, y) => s + limits[y], 0)).toBe(plain(knownYear(2026).accounts.tfsaCumulativeSince2009))
    expect(limits[2026]).toBe(plain(knownYear(2026).accounts.tfsaLimit)) // this year's limit is the one the engine uses
  })
})

describe('the TFSA room estimate', () => {
  it('is every limit since the 18th birthday (not before 2009), less the balance', () => {
    expect(estimateTfsaRoom(1992, 40_000, 2026)).toBe(104_000 - 40_000) // 18 in 2010: 2010–2026
    expect(estimateTfsaRoom(1980, 0, 2026)).toBe(109_000) // eligible from the start
    expect(estimateTfsaRoom(1950, 0, 2026)).toBe(109_000) // never before 2009
    expect(estimateTfsaRoom(2005, 0, 2026)).toBe(6_500 + 7_000 * 3) // 18 in 2023
  })

  it('is never negative, and nothing for someone not yet 18', () => {
    expect(estimateTfsaRoom(1992, 500_000, 2026)).toBe(0)
    expect(estimateTfsaRoom(2010, 0, 2026)).toBe(0)
  })

  it('a year past the table uses the last known limit', () => {
    expect(estimateTfsaRoom(1980, 0, 2027)).toBe(109_000 + 7_000)
  })
})

describe('estimating what is missing', () => {
  const blankPerson = (p: Profile): Profile => ({
    ...p,
    household: { ...p.household, persons: p.household.persons.map((x, i) => (i === 0 ? { ...x, salaryToday: 120_000, earningsHistory: {}, accounts: { ...x.accounts, tfsa: { ...x.accounts.tfsa, balance: 40_000, room: 0 } } } : x)) },
  })

  it('fills blank earnings years from the salary and a TFSA room left at 0, and says how many', () => {
    const p = blankPerson(golden())
    const e = estimateMissing(p, TODAY)
    const me = e.profile.household.persons[0]
    expect(e.years).toBeGreaterThan(5)
    expect(Object.keys(me.earningsHistory).length).toBe(e.years)
    expect(me.accounts.tfsa.room).toBe(estimateTfsaRoom(p.household.persons[0].birth.year, 40_000, 2026))
    expect(e.rooms).toBeGreaterThanOrEqual(1)
  })

  it('never replaces what the person typed: a typed year and a typed room stay', () => {
    const p = blankPerson(golden())
    const typed: Profile = {
      ...p,
      household: { ...p.household, persons: p.household.persons.map((x, i) => (i === 0 ? { ...x, earningsHistory: { 2020: 55_000 }, accounts: { ...x.accounts, tfsa: { ...x.accounts.tfsa, room: 12_345 } } } : x)) },
    }
    const me = estimateMissing(typed, TODAY).profile.household.persons[0]
    expect(me.earningsHistory[2020]).toBe(55_000)
    expect(me.accounts.tfsa.room).toBe(12_345)
  })

  it('marks nothing confirmed and keeps what already was; the same profile comes back when there is nothing to fill', () => {
    const p = setFact(blankPerson(golden()), factId('self', 'rrspBalance'), true)
    const once = estimateMissing(p, TODAY)
    expect(once.profile.confirmed).toEqual(['self:rrspBalance'])
    const twice = estimateMissing(once.profile, TODAY)
    expect(twice.profile).toBe(once.profile)
    expect([twice.years, twice.rooms]).toEqual([0, 0])
  })
})
