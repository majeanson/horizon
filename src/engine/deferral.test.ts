import { describe, expect, it, vi } from 'vitest'
import { deferralView, OAS_START_AGES, RRQ_START_AGES } from './deferral.ts'
import { GOLDEN_ASSUMPTIONS as A, GOLDEN_HOUSEHOLD as H } from './golden/household.fixture.ts'
import { project } from './projection.ts'
import { retireAt } from './retireAt.ts'
import type { Household, Person, YearRow } from './types.ts'

// « WHEN SHOULD I START MY PENSION? » — the deferral comparison, checked against the rules it must reproduce (+0.7 %
// a month on the QPP after 65, +0.6 % on the OAS) and against the projection it is built from.

// A full comparison is a few seconds of projections (5.5 s on a loaded machine) — over vitest's 5 s default, so it flaked.
vi.setConfig({ testTimeout: 60_000 })

const camille = H.persons[0]
const alone: Household = { livesAlone: true, persons: [camille], spending: H.spending }
const inflate = (year: number) => (1 + A.inflation) ** (year - A.today.year)

const view = deferralView(alone, A)
const me = view.persons[0]
const rrq = (age: number) => me.rrq.find((o) => o.age === age)!
const oas = (age: number) => me.oas.find((o) => o.age === age)!

/** Cumulative pension received, in today's dollars, up to each year — computed here from a fresh projection. */
function cumulativeOf(rows: YearRow[], kind: 'rrq' | 'oas'): Map<number, number> {
  const out = new Map<number, number>()
  let sum = 0
  for (const r of rows) {
    sum += r.persons.self![kind] / inflate(r.year)
    out.set(r.year, sum)
  }
  return out
}

describe('the options are the ones the rules allow', () => {
  it('QPP at 60, 65, 70 and 72; OAS at 65 and 70 — never an age the law does not offer', () => {
    expect(me.rrq.map((o) => o.age)).toEqual([...RRQ_START_AGES])
    expect(me.oas.map((o) => o.age)).toEqual([...OAS_START_AGES])
    expect(Math.min(...RRQ_START_AGES)).toBeGreaterThanOrEqual(60)
    expect(Math.max(...RRQ_START_AGES)).toBeLessThanOrEqual(72)
    expect(Math.min(...OAS_START_AGES)).toBeGreaterThanOrEqual(65)
    expect(Math.max(...OAS_START_AGES)).toBeLessThanOrEqual(70)
  })

  it('the person\'s current start ages are reported, so the page can say « your plan »', () => {
    expect(me.current).toEqual({ rrq: camille.rrq.startAge, oas: camille.oas.startAge })
  })
})

describe('the adjustment is the cited rule, month by month', () => {
  it('the OAS: +0.6 % for each month after 65 — 36 % at 70', () => {
    expect(oas(65).versus65).toBe(0)
    expect(oas(70).versus65).toBeCloseTo(0.36, 3)
    expect(view.facts.oasLateMax).toBeCloseTo(0.36, 6)
  })

  it('the QPP: +0.7 % for each month after 65 — 42 % at 70, 58.8 % at 72 — and a reduction before 65 of 0.5 % to 0.6 % a month', () => {
    expect(rrq(65).versus65).toBe(0)
    expect(rrq(70).versus65).toBeCloseTo(0.42, 2)
    expect(rrq(72).versus65).toBeCloseTo(0.588, 2)
    expect(view.facts.rrqLateMax).toBeCloseTo(0.588, 6)
    // 60 months early: between −30 % (0.5 %/month) and −36 % (0.6 %/month).
    expect(rrq(60).versus65).toBeGreaterThanOrEqual(-0.36)
    expect(rrq(60).versus65).toBeLessThanOrEqual(-0.3)
  })

  it('the monthly pension in today\'s dollars rises with the start age, for each of them', () => {
    for (const list of [me.rrq, me.oas]) for (let i = 1; i < list.length; i++) expect(list[i].monthly, `${list[i].age}`).toBeGreaterThan(list[i - 1].monthly)
  })

  it('at 65 the OAS is the published 2026 amount (under 1 000 $ a month: a figure in the hundreds)', () => {
    expect(oas(65).monthly).toBeGreaterThan(700)
    expect(oas(65).monthly).toBeLessThan(800)
  })
})

describe('the break-even is where the cumulative pensions cross, computed independently', () => {
  for (const [kind, age] of [['rrq', 70], ['rrq', 72], ['oas', 70], ['rrq', 60]] as const) {
    it(`${kind.toUpperCase()} at ${age}: the year the two running totals cross is the answer, and not a year earlier`, () => {
      const scenario = (a: number) => (kind === 'rrq' ? { rrqStartAge: { self: a } } : { oasStartAge: { self: a } })
      const option = cumulativeOf(project(alone, A, scenario(age)), kind)
      const baseline = cumulativeOf(project(alone, A, scenario(65)), kind)
      const be = (kind === 'rrq' ? rrq(age) : oas(age)).breakEven
      expect(be).not.toBeNull()
      const year = camille.birth.year + be!
      if (age > 65) {
        expect(option.get(year)!, 'at the break-even the later start has caught up').toBeGreaterThanOrEqual(baseline.get(year)!)
        expect(option.get(year - 1)!, 'the year before it had not').toBeLessThan(baseline.get(year - 1)!)
      } else {
        expect(baseline.get(year)!, 'at the break-even starting at 65 has caught up with starting early').toBeGreaterThanOrEqual(option.get(year)!)
        expect(baseline.get(year - 1)!, 'the year before it had not').toBeLessThan(option.get(year - 1)!)
      }
    })
  }

  it('a later start takes longer to pay back; starting at 65 has no break-even against itself', () => {
    expect(rrq(65).breakEven).toBeNull()
    expect(oas(65).breakEven).toBeNull()
    expect(rrq(72).breakEven!).toBeGreaterThan(rrq(70).breakEven!)
    for (const o of [rrq(70), rrq(72), oas(70)]) {
      expect(o.breakEven!, `${o.age}`).toBeGreaterThan(75) // never before the late seventies
      expect(o.breakEven!, `${o.age}`).toBeLessThan(90)
    }
    expect(rrq(60).breakEven!).toBeGreaterThan(65)
    expect(rrq(60).breakEven!).toBeLessThan(80)
  })
})

describe('the effect on the plan is the projection\'s own', () => {
  it('the option that IS the profile\'s start age reproduces the plain verdict and the plain net worth', () => {
    const plain = project(alone, A, {})
    const row95 = plain.find((r) => r.year === camille.birth.year + 95)!
    const same = rrq(camille.rrq.startAge)
    expect(same.plan.ok).toBe(plain.every((r) => r.household.shortfall === 0))
    expect(same.plan.netWorth95!).toBeCloseTo(row95.household.netWorthEnd / inflate(row95.year), 2)
    expect(same.plan.earliestOk).toBe(retireAt(alone, A, { stopAtFirstOk: true }).earliestOk)
  })

  it('deferring to 70 changes the net worth at 95 exactly as re-running the projection with that start does', () => {
    const rows = project(alone, A, { rrqStartAge: { self: 70 } })
    const row85 = rows.find((r) => r.year === camille.birth.year + 85)!
    const row95 = rows.find((r) => r.year === camille.birth.year + 95)!
    expect(rrq(70).plan.netWorth85!).toBeCloseTo(row85.household.netWorthEnd / inflate(row85.year), 2)
    expect(rrq(70).plan.netWorth95!).toBeCloseTo(row95.household.netWorthEnd / inflate(row95.year), 2)
  })

  it('for the golden couple, starting the QPP at 60 leaves less at 95 than starting at 70 — the longevity argument, in the plan\'s own numbers', () => {
    const own = deferralView(H, A).persons[0]
    const at = (age: number) => own.rrq.find((o) => o.age === age)!.plan.netWorth95!
    expect(at(70)).toBeGreaterThan(at(65))
    expect(at(65)).toBeGreaterThan(at(60))
  })

  it('a net worth past the plan\'s horizon is null, never a made-up figure', () => {
    const short = deferralView(alone, { ...A, horizonAge: 90 }).persons[0]
    expect(short.rrq[0].plan.netWorth85).not.toBeNull()
    expect(short.rrq[0].plan.netWorth95).toBeNull()
  })
})

describe('edge cases', () => {
  const noEarnings: Person = { ...camille, id: 'self', earningsHistory: {}, salaryToday: 0, retirementAge: 55 }
  const nobody: Household = { livesAlone: true, persons: [noEarnings], spending: { workingToday: 30_000, retiredToday: 30_000 } }
  const empty = deferralView(nobody, A).persons[0]

  it('a QPP of zero (no earnings) stays zero: no division by zero, no break-even, no NaN anywhere', () => {
    for (const o of empty.rrq) {
      expect(o.monthly, `${o.age}`).toBe(0)
      expect(o.versus65).toBe(0)
      expect(o.breakEven).toBeNull()
      expect(Number.isFinite(o.plan.netWorth95 ?? 0)).toBe(true)
    }
  })

  it('a couple gets one comparison per person, each changing only that person\'s start', () => {
    const couple = deferralView(H, A)
    expect(couple.persons.map((p) => p.id)).toEqual(['self', 'spouse'])
    const spouse = couple.persons[1]
    expect(spouse.rrq[0].monthly).toBeGreaterThan(0)
    expect(spouse.rrq.map((o) => o.monthly)).not.toEqual(couple.persons[0].rrq.map((o) => o.monthly))
  })
}, 60_000)
