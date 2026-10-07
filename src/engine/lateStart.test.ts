import { describe, expect, it, vi } from 'vitest'
import { bridgeRun, bridgeView, breakEvenOf, leversFor } from './bridge.ts'

const breakEvenVs = (o: ReadonlyMap<number, number>, b: ReadonlyMap<number, number>) => breakEvenOf(o, b)?.age ?? null
import { deferralView } from './deferral.ts'
import { GOLDEN_ASSUMPTIONS as A, GOLDEN_HOUSEHOLD as H } from './golden/household.fixture.ts'
import { project } from './projection.ts'
import type { Household } from './types.ts'

// A PERSON WHOSE START AGE IS ALREADY BEHIND THEM — the comparison must stay the rule's, not an artefact of where the
// projection begins (today). Before the fix, a 68-year-old retired person read « QPP at 70 : +54 % » (rule: +42 %) with a
// break-even of 74 (the 65 baseline had « lost » its first three years of payments), and the OAS at 70 read +61 %.

vi.setConfig({ testTimeout: 120_000 })

/** A retired person alone, born in `by`, who retired at 60 (or today's age if younger), a lifelong resident, with a flat earnings record up to the retirement year. */
function retiredAlone(by: number): Household {
  const age = 2026 - by
  const retired = Math.min(age, 60)
  const earnings: Record<number, number> = {}
  for (let y = by + 21; y <= Math.min(2025, by + retired); y++) earnings[y] = 55_000
  const p = {
    ...H.persons[0],
    birth: { year: by, month: 3 },
    retirementAge: retired,
    earningsHistory: earnings,
    oas: { startAge: 65, residentSince: by + 18 },
    pensions: [],
  }
  return { livesAlone: true, persons: [p], spending: H.spending }
}

const optionsOf = (by: number) => deferralView(retiredAlone(by), A).persons[0]

describe('the rule\'s percentages hold for a person of any age, not only one whose 65 is in the future', () => {
  for (const [by, label] of [
    [1965, '61 years old (60 behind, 65 ahead)'],
    [1961, '65 years old (65 this year)'],
    [1958, '68 years old (60 and 65 behind)'],
  ] as const) {
    it(`${label}: QPP +42 % at 70, +58.8 % at 72, OAS +36 % at 70`, () => {
      const me = optionsOf(by)
      const rrq = (age: number) => me.rrq.find((o) => o.age === age)!
      expect(rrq(65).versus65).toBe(0)
      expect(rrq(70).versus65).toBeCloseTo(0.42, 2)
      expect(rrq(72).versus65).toBeCloseTo(0.588, 2)
      expect(me.oas.find((o) => o.age === 70)!.versus65).toBeCloseTo(0.36, 2)
    })
  }

  it('the options whose start age is already behind the person are flagged, the others are not', () => {
    const old = optionsOf(1958) // 68
    expect(old.rrq.map((o) => [o.age, o.passed])).toEqual([[60, true], [65, true], [70, false], [72, false]])
    expect(old.oas.map((o) => [o.age, o.passed])).toEqual([[65, true], [70, false]])
    const sixtyFive = optionsOf(1961) // turns 65 in 2026: starts this year, not behind
    expect(sixtyFive.rrq.find((o) => o.age === 65)!.passed).toBe(false)
    expect(sixtyFive.rrq.find((o) => o.age === 60)!.passed).toBe(true)
    const young = deferralView(H, A).persons[0] // born 1978: nothing is behind
    expect([...young.rrq, ...young.oas].some((o) => o.passed)).toBe(false)
  })
})

describe('the break-even counts the payments already made', () => {
  it('a 68-year-old who started the QPP at 65 three years ago: waiting to 70 pays back at ~79, not at 74', () => {
    const o = optionsOf(1958).rrq.find((x) => x.age === 70)!
    expect(o.breakEven).not.toBeNull()
    expect(o.breakEven!).toBeGreaterThanOrEqual(78)
    expect(o.breakEven!).toBeLessThanOrEqual(81)
    const oas = optionsOf(1958).oas.find((x) => x.age === 70)!
    expect(oas.breakEven!).toBeGreaterThanOrEqual(82)
    expect(oas.breakEven!).toBeLessThanOrEqual(85)
  })

  it('the break-even does not depend on how old the person is today: 61, 65 and 68 agree within two years', () => {
    const be = [1965, 1961, 1958].map((by) => optionsOf(by).rrq.find((x) => x.age === 70)!.breakEven!)
    expect(Math.max(...be) - Math.min(...be)).toBeLessThanOrEqual(2)
  })
})

describe('the bridge strategies keep the same honesty', () => {
  it('« bridge to 70 » against standard, for a 68-year-old: the break-even is in the late 70s, with the missed years counted', () => {
    const h = retiredAlone(1958)
    const view = bridgeView(h, A, { id: 'self', retirementAge: 60, rrqStartAge: 65, oasStartAge: 65 })
    const bridge = view.strategies.find((s) => s.key === 'bridge')!
    expect(bridge.breakEven).not.toBeNull()
    expect(bridge.breakEven!).toBeGreaterThanOrEqual(77)
    expect(bridge.breakEven!).toBeLessThanOrEqual(82)
  })
})

describe('the break-even direction comes from the cumulatives, not from a sum of start ages', () => {
  const cum = (xs: number[]) => new Map(xs.map((v, i) => [60 + i, v]))
  it('later start: caught up when the option\'s total reaches the baseline\'s', () => {
    expect(breakEvenVs(cum([0, 0, 0, 0, 0, 0, 10, 20, 40]), cum([0, 0, 0, 0, 0, 10, 20, 30, 35]))).toBe(68)
  })
  it('earlier start: overtaken when the baseline reaches the option\'s total', () => {
    expect(breakEvenVs(cum([10, 20, 30, 40, 50, 60, 70, 80]), cum([0, 0, 0, 0, 0, 30, 60, 90]))).toBe(67)
  })
  it('a MIXED strategy (QPP at 60, OAS at 70) is neither « later » nor « earlier » by a sum of ages — it still has an answer', () => {
    // ahead first (QPP from 60), behind later (no OAS until 70): the baseline overtakes.
    expect(breakEvenVs(cum([5, 10, 15, 20, 25, 30, 35, 40]), cum([0, 0, 0, 0, 0, 25, 50, 75]))).toBe(66)
  })
  it('identical totals have no break-even', () => {
    expect(breakEvenVs(cum([1, 2, 3]), cum([1, 2, 3]))).toBeNull()
  })

  it('the real mixed strategy (QPP 60 + OAS 70) gets a break-even from the engine', () => {
    const h = structuredClone(H)
    h.persons[0].rrq.startAge = 60
    h.persons[0].oas.startAge = 70
    const view = bridgeView(h, A, { id: 'self', retirementAge: 60, rrqStartAge: 60, oasStartAge: 70 })
    const mine = view.strategies.find((s) => s.key === 'mine')!
    expect(mine.levers).toMatchObject({ rrqStartAge: 60, oasStartAge: 70 })
    expect(mine.breakEven).not.toBeNull()
  })
})

describe('the bridge and the verdict agree on « does the money last »', () => {
  const rows = (h: Household, l: ReturnType<typeof leversFor>) =>
    project(h, A, { retirementAge: { [l.id]: l.retirementAge }, rrqStartAge: { [l.id]: l.rrqStartAge }, oasStartAge: { [l.id]: l.oasStartAge } })

  it('summary.ok is exactly « no year has any shortfall » in the projection, for every strategy, retirement age and nest size', () => {
    for (const factor of [0.4, 0.7, 1]) {
      const h = structuredClone(H)
      for (const p of h.persons) for (const k of ['rrsp', 'tfsa', 'nonReg'] as const) p.accounts[k].balance *= factor
      for (const age of [55, 58, 62]) {
        for (const key of ['asap', 'standard', 'max'] as const) {
          const l = leversFor(key, h, 'self', age)
          const verdict = rows(h, l).every((r) => r.household.shortfall <= 0)
          expect(bridgeRun(h, A, l).summary.ok, `${factor} ${age} ${key}`).toBe(verdict)
        }
      }
    }
  })

  it('a year the projection calls short is « short » in the table, however small the gap', () => {
    const h = structuredClone(H)
    for (const p of h.persons) for (const k of ['rrsp', 'tfsa', 'nonReg'] as const) p.accounts[k].balance *= 0.4
    const l = leversFor('max', h, 'self', 55)
    const raw = rows(h, l)
    const table = bridgeRun(h, A, l).rows
    raw.forEach((r, i) => expect(table[i].status === 'short', String(r.year)).toBe(r.household.shortfall > 0))
  })
})

describe('the lowest nest of the bridge years is a year the plan covers', () => {
  it('never reports a year in which the household ran short', () => {
    const h = structuredClone(H)
    for (const p of h.persons) for (const k of ['rrsp', 'tfsa', 'nonReg'] as const) p.accounts[k].balance *= 0.4
    const run = bridgeRun(h, A, leversFor('max', h, 'self', 55))
    expect(run.rows.some((r) => r.age >= 60 && r.age <= 70 && r.status === 'short')).toBe(true) // the case is a real one
    if (run.summary.lowestNest) {
      const row = run.rows.find((r) => r.age === run.summary.lowestNest!.age)!
      expect(row.status).not.toBe('short')
      expect(row.age).toBeGreaterThanOrEqual(60)
      expect(row.age).toBeLessThanOrEqual(70)
    }
  })
})
