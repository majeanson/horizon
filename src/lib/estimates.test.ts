import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { plain } from '../engine/params/cited.ts'
import { knownYear } from '../engine/params/index.ts'
import { RRSP_LIMIT_HISTORY } from '../engine/params/rrspHistory.ts'
import { TFSA_LIMIT_HISTORY } from '../engine/params/tfsaHistory.ts'
import type { Person } from '../engine/types.ts'
import { estimateMissing, estimateRrspRoom, estimateTfsaRoom } from './estimates.ts'
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

// ── THE RRSP ROOM ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────

describe('the RRSP limits since 1991', () => {
  const rl = plain(RRSP_LIMIT_HISTORY)
  it('every year from 1991 to 2026 is there, the last is the figure the engine already cites, and the page’s known steps hold', () => {
    const years = Object.keys(rl).map(Number)
    expect(Math.min(...years)).toBe(1991)
    expect(Math.max(...years)).toBe(2026)
    for (let y = 1991; y <= 2026; y++) expect(rl[y], `${y}`).toBeGreaterThan(0)
    expect(rl[2026]).toBe(plain(knownYear(2026).accounts.rrspLimit)) // this year's limit is the one the engine uses
    // spot checks against the page's table: the first year, the 1996 step down, the freeze of 1996–2002, and a recent year
    expect([rl[1991], rl[1995], rl[1996], rl[2002], rl[2003], rl[2025]]).toEqual([11_500, 14_500, 13_500, 13_500, 14_500, 32_490])
  })
})

describe('the RRSP room estimate', () => {
  const rl = plain(RRSP_LIMIT_HISTORY)
  const person = (over: Partial<Person> = {}, rrsp: Partial<Person['accounts']['rrsp']> = {}): Person => {
    const base = golden().household.persons[0]
    return { ...base, birth: { year: 1990, month: 1 }, salaryToday: 0, earningsHistory: {}, pensions: [], ...over, accounts: { ...base.accounts, rrsp: { ...base.accounts.rrsp, balance: 0, lockedIn: 0, room: 0, ...rrsp } } }
  }
  const years = (from: number, to: number, pay: number): Record<number, number> => Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [from + i, pay]))

  it('adds up each year’s room — 18 % of the PREVIOUS year’s pay, up to that year’s limit — from the year after the first paid year', () => {
    // paid 50 000 $ a year from 2015 to 2025: room from 2016 to 2026, eleven years of 18 % = 9 000 $
    expect(estimateRrspRoom(person({ earningsHistory: years(2015, 2025, 50_000) }), TODAY, 0.03)).toBe(11 * 9_000)
  })

  it('is capped each year by the dollar limit of THAT year', () => {
    // 300 000 $ a year: 18 % is 54 000 $, far over every limit, so each year earns exactly its limit (2016 to 2026)
    let expected = 0
    for (let y = 2016; y <= 2026; y++) expected += rl[y]
    expect(estimateRrspRoom(person({ earningsHistory: years(2015, 2025, 300_000) }), TODAY, 0.03)).toBe(expected)
  })

  it('takes off what the account holds, without the locked-in part (it came from a transfer and never used room)', () => {
    const p = person({ earningsHistory: years(2015, 2025, 50_000) })
    expect(estimateRrspRoom({ ...p, accounts: { ...p.accounts, rrsp: { ...p.accounts.rrsp, balance: 40_000, lockedIn: 10_000 } } }, TODAY, 0.03)).toBe(99_000 - 30_000)
  })

  it('is never negative: a balance past what the years could earn leaves no room', () => {
    const p = person({ earningsHistory: years(2015, 2025, 50_000) })
    expect(estimateRrspRoom({ ...p, accounts: { ...p.accounts, rrsp: { ...p.accounts.rrsp, balance: 5_000_000 } } }, TODAY, 0.03)).toBe(0)
  })

  it('starts in 1991 at the earliest, whatever the history says', () => {
    // paid since 1980: the first year of room is 1991 (limit 11 500, 18 % of 1990's 80 000 $ is 14 400)
    const p = person({ birth: { year: 1960, month: 1 }, earningsHistory: years(1980, 1992, 80_000) })
    expect(estimateRrspRoom(p, { year: 1992 }, 0)).toBe(rl[1991] + rl[1992]) // 1991 and 1992, each at its limit
  })

  it('reads a salary into the past when no history is typed (the same deflation as the earnings list), and more pay never means less room', () => {
    const small = estimateRrspRoom(person({ salaryToday: 60_000 }), TODAY, 0.03)!
    const big = estimateRrspRoom(person({ salaryToday: 140_000 }), TODAY, 0.03)!
    expect(small).toBeGreaterThan(0)
    expect(big).toBeGreaterThanOrEqual(small)
  })

  it('says nothing — null, not 0 — for someone in an employer pension plan, or with no earnings to go by', () => {
    const base = person({ earningsHistory: years(2015, 2025, 50_000) })
    const rregop = golden().household.persons[0].pensions[0] // the fixture's first person has the public employees' plan
    expect(rregop.label).toBe('RREGOP')
    expect(estimateRrspRoom({ ...base, pensions: [rregop] }, TODAY, 0.03)).toBeNull()
    expect(estimateRrspRoom(person(), TODAY, 0.03)).toBeNull()
  })
})

describe('estimating the RRSP room as part of what is missing', () => {
  const withoutPlan = (p: Profile): Profile => ({
    ...p,
    household: { ...p.household, persons: p.household.persons.map((x, i) => (i === 0 ? { ...x, pensions: [], salaryToday: 90_000, earningsHistory: {}, accounts: { ...x.accounts, rrsp: { ...x.accounts.rrsp, room: 0, balance: 30_000, lockedIn: 0 } } } : x)) },
  })

  it('fills an RRSP room left at 0, says how many, and confirms nothing', () => {
    const p = withoutPlan(golden())
    const e = estimateMissing(p, TODAY)
    expect(e.rrspRooms).toBe(1)
    expect(e.profile.household.persons[0].accounts.rrsp.room).toBeGreaterThan(0)
    expect(e.profile.confirmed).toEqual(p.confirmed)
  })

  it('never replaces a room the person typed', () => {
    const p = withoutPlan(golden())
    const typed: Profile = { ...p, household: { ...p.household, persons: p.household.persons.map((x, i) => (i === 0 ? { ...x, accounts: { ...x.accounts, rrsp: { ...x.accounts.rrsp, room: 12_345 } } } : x)) } }
    const e = estimateMissing(typed, TODAY)
    expect(e.profile.household.persons[0].accounts.rrsp.room).toBe(12_345)
    expect(e.rrspRooms).toBe(0)
  })

  it('leaves a person in an employer plan at 0 — and asking again changes nothing', () => {
    const p = golden()
    const inPlan: Profile = { ...p, household: { ...p.household, persons: p.household.persons.map((x, i) => (i === 0 ? { ...x, salaryToday: 90_000, earningsHistory: {}, accounts: { ...x.accounts, rrsp: { ...x.accounts.rrsp, room: 0 } } } : x)) } }
    expect(inPlan.household.persons[0].pensions.length).toBeGreaterThan(0)
    const e = estimateMissing(inPlan, TODAY)
    expect(e.profile.household.persons[0].accounts.rrsp.room).toBe(0)
    expect(e.rrspRooms).toBe(0)
    const once = estimateMissing(withoutPlan(golden()), TODAY)
    expect(estimateMissing(once.profile, TODAY).profile).toBe(once.profile)
  })
})
