import { describe, expect, it } from 'vitest'
import { EXAMPLES, EXAMPLE_IDS } from './golden/examples.ts'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { MARKET_PATHS, MARKET_PRESETS, pathReturn, resolvePath } from './marketPaths.ts'
import { planGlance } from './ledger.ts'
import { project } from './projection.ts'
import { everyoneAt } from './retireAt.ts'
import type { Assumptions, Household, MarketPath, Person } from './types.ts'

// THE PATH THE MARKETS TAKE: yearly returns counted from the first retirement year; the average everywhere else. The default changes nothing,
// a path bends only the years it names, it follows the retirement age tried, and the ORDER of the same returns changes the end.

const A = (over: Partial<Assumptions> = {}): Assumptions => ({ ...GOLDEN_ASSUMPTIONS, today: { year: 2026, month: 1 }, inflation: 0.02, wageGrowth: 0.03, returns: { nonReg: 0.05, rrsp: 0.05, tfsa: 0.05 }, pensionSplitting: false, withdrawalOrder: ['rrsp', 'nonReg', 'tfsa'], ...over })
const retiree = (retirementAge = 55): Person => ({
  id: 'self', name: 'Test', birth: { year: 1971, month: 6 }, retirementAge, salaryToday: 0, earningsHistory: {},
  rrq: { startAge: 65 }, oas: { startAge: 65, residentSince: 1989 },
  accounts: { rrsp: { balance: 400_000, room: 0, annualContribution: 0 }, tfsa: { balance: 100_000, room: 0, annualContribution: 0 }, nonReg: { balance: 100_000, acb: 100_000, annualContribution: 0 } },
  pensions: [],
})
const household = (p: Person, spending = 30_000): Household => ({ livesAlone: true, persons: [p], spending: { workingToday: spending, retiredToday: spending } })
const path = (preset: MarketPath['preset'], custom: (number | null)[] = []): MarketPath => ({ preset, custom })

describe('the path as data', () => {
  it('every ready-made path is a list of plausible yearly returns; « smooth » is empty', () => {
    expect(MARKET_PATHS.smooth).toEqual([])
    for (const k of MARKET_PRESETS) for (const r of MARKET_PATHS[k]) expect(r, k).toBeGreaterThan(-0.5), expect(r, k).toBeLessThan(0.5)
    expect(MARKET_PATHS.badStart[0]).toBeLessThan(-0.1) // a real fall first
    expect(MARKET_PATHS.boomBust.some((r) => r < -0.2)).toBe(true)
  })
  it('resolvePath: a preset gives its returns, custom gives the person’s own (at most ten years), nothing gives none', () => {
    expect(resolvePath(undefined)).toEqual([])
    expect(resolvePath(path('badStart'))).toEqual(MARKET_PATHS.badStart)
    expect(resolvePath(path('custom', [-0.2, null, 0.1]))).toEqual([-0.2, null, 0.1])
    expect(resolvePath(path('custom', Array(25).fill(0.01))).length).toBe(10)
  })
  it('pathReturn: before the first retirement year and past the path, the average; a null entry is the average too', () => {
    const p = [-0.15, null, 0.04]
    expect(pathReturn(p, -1, 0.05)).toBe(0.05)
    expect(pathReturn(p, 0, 0.05)).toBe(-0.15)
    expect(pathReturn(p, 1, 0.05)).toBe(0.05)
    expect(pathReturn(p, 2, 0.05)).toBe(0.04)
    expect(pathReturn(p, 3, 0.05)).toBe(0.05)
  })
})

describe('in the projection', () => {
  const h = household(retiree(55)) // born 1971: retired from 2026
  const first = (a: Assumptions) => project(h, a)

  it('no path, « lisse », or an empty custom path: the rows are identical, to the cent', () => {
    const base = first(A())
    expect(first(A({ marketPath: path('smooth') }))).toEqual(base)
    expect(first(A({ marketPath: path('custom', []) }))).toEqual(base)
    expect(first(A({ marketPath: path('custom', [null, null, null]) }))).toEqual(base)
  })

  it('a bad start bends only the years it names: the years before it and after it earn the average', () => {
    const base = first(A())
    const bad = first(A({ marketPath: path('badStart') }))
    expect(bad[0].household.netWorthEnd).toBeLessThan(base[0].household.netWorthEnd - 50_000) // −15 % on 600 000 $
    // the first year is where the fall happens; later years differ only through the smaller balance, never through a different rate
    expect(bad[bad.length - 1].household.netWorthEnd).toBeLessThan(base[base.length - 1].household.netWorthEnd)
  })

  it('every account feels it: REER, TFSA and non-registered all fall in a −15 % year', () => {
    const bad = first(A({ marketPath: path('custom', [-0.15]) }))[0].persons.self!
    const avg = first(A())[0].persons.self!
    for (const k of ['rrsp', 'tfsa', 'nonReg'] as const) expect(bad.balancesEnd[k], k).toBeLessThan(avg.balancesEnd[k] - 1)
    // a −15 % year on a 100 000 $ TFSA that is not drawn: ≈ 85 000 $
    expect(bad.balancesEnd.tfsa).toBeCloseTo(100_000 * 0.85, -2)
  })

  it('the order matters, not only the average: the same returns, bad first or bad last, end differently — bad first is worse for someone drawing', () => {
    const years = 12
    const badFirst = [-0.2, -0.1, 0, 0.05, 0.1, 0.15, 0.15, 0.1]
    const badLast = [...badFirst].reverse()
    const end = (r: number[]) => project(h, A({ marketPath: path('custom', r.concat(Array(years).fill(null)).slice(0, 10)) })).at(-1)!.household.netWorthEnd
    // the custom path holds ten years: take the first eight of each; the average (5 %) fills the rest
    expect(end(badFirst)).toBeLessThan(end(badLast))
  })

  it('the path follows the retirement age tried: retiring later moves the fall with it', () => {
    const young = { ...retiree(65), birth: { year: 1976, month: 6 }, accounts: { rrsp: { balance: 400_000, room: 0, annualContribution: 0 }, tfsa: { balance: 100_000, room: 0, annualContribution: 0 }, nonReg: { balance: 100_000, acb: 100_000, annualContribution: 0 } } }
    const hh = household(young)
    const crash = A({ marketPath: path('custom', [-0.3]) })
    const at = (age: number) => project(hh, crash, everyoneAt(hh, age))
    const rowsAt55 = at(55)
    const rowsAt60 = at(60)
    // in the calendar year the household first retires, balances fall; the year before they do not
    const retire55 = 1976 + 55
    const retire60 = 1976 + 60
    const r = (rows: ReturnType<typeof at>, year: number) => rows.find((x) => x.year === year)!
    const avgRows = project(hh, A(), everyoneAt(hh, 55))
    expect(r(rowsAt55, retire55 - 1).household.netWorthEnd).toBeCloseTo(r(avgRows, retire55 - 1).household.netWorthEnd, 0)
    expect(r(rowsAt55, retire55).household.netWorthEnd).toBeLessThan(r(avgRows, retire55).household.netWorthEnd * 0.9)
    const avg60 = project(hh, A(), everyoneAt(hh, 60))
    expect(r(rowsAt60, retire60 - 1).household.netWorthEnd).toBeCloseTo(r(avg60, retire60 - 1).household.netWorthEnd, 0)
    expect(r(rowsAt60, retire60).household.netWorthEnd).toBeLessThan(r(avg60, retire60).household.netWorthEnd * 0.9)
    // …and retiring at 55 does NOT feel a fall that happens at 60's retirement year (at 55 the fall comes first)
    expect(r(rowsAt55, retire60).household.netWorthEnd).not.toBeCloseTo(r(rowsAt60, retire60).household.netWorthEnd, -2)
  })

  it('a fall can make a plan that worked short; the glance says it', () => {
    const tight = household(retiree(55), 24_000)
    const calm = planGlance(tight, A({ returns: { nonReg: 0.035, rrsp: 0.035, tfsa: 0.035 }, horizonAge: 95 }))
    const harsh = planGlance(tight, A({ returns: { nonReg: 0.035, rrsp: 0.035, tfsa: 0.035 }, horizonAge: 95, marketPath: path('lostDecade') }))
    expect(harsh.netWorthEnd).toBeLessThan(calm.netWorthEnd)
  })
})

describe('over every example', () => {
  it('« lisse » is the golden answer for the household and for each example; a bad start never raises what is left', () => {
    const all: [string, Household, Assumptions][] = [['golden', GOLDEN_HOUSEHOLD, GOLDEN_ASSUMPTIONS], ...EXAMPLE_IDS.map((id): [string, Household, Assumptions] => [id, EXAMPLES[id].household, EXAMPLES[id].assumptions])]
    for (const [name, h, a] of all) {
      expect(project(h, { ...a, marketPath: path('smooth') }), name).toEqual(project(h, a))
      const end = (x: Assumptions) => project(h, x).at(-1)!.household.netWorthEnd
      expect(end({ ...a, marketPath: path('badStart') }), name).toBeLessThanOrEqual(end(a) + 1)
    }
  })
})
