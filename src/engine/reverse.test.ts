import { describe, expect, it, vi } from 'vitest'
import { EXAMPLES } from './golden/examples.ts'
import { kneeAge, regretCurve } from './regret.ts'
import { MAX_EXTRA_RETURN, RETURN_STEP, requiredReturn, reverseTarget, withExtraReturn } from './reverse.ts'
import { everyoneAt, retireAt, runScenario } from './retireAt.ts'
import { withExtraSavings } from './savingsNeeded.ts'
import { IDENTITY, sweepRow } from './sweep.ts'

// « I WANT TO STOP AT X » is the plan turned round, so every lever it names is held to the plain test: the change it states makes the plan work at X, and a little less of it does not.
// And the regret curve is a read of the sweep, so it is held to the sweep: it never invents a number the projection did not give.

vi.setConfig({ testTimeout: 120_000 })

const G = EXAMPLES.golden
const M = EXAMPLES.modest
const works = (h: typeof G.household, a: typeof G.assumptions, age: number) => runScenario(h, a, everyoneAt(h, age), age).ok

describe('stopping before the earliest age that works', () => {
  const earliest = retireAt(G.household, G.assumptions, { stopAtFirstOk: true }).earliestOk!
  const age = earliest - 3
  const r = reverseTarget(G.household, G.assumptions, age)

  it('is a plan that does not work as it stands', () => {
    expect(earliest).toBeGreaterThan(age)
    expect(r.works).toBe(false)
    expect(r.earliest).toBe(earliest)
  })

  it('spending: the most stated works and a little more does not', () => {
    expect(r.spend.current).toBe(G.household.spending.retiredToday)
    expect(r.spend.max).not.toBeNull()
    expect(r.spend.max!).toBeLessThan(r.spend.current)
    const at = (retiredToday: number) => works({ ...G.household, spending: { ...G.household.spending, retiredToday } }, G.assumptions, age)
    expect(at(r.spend.max!)).toBe(true)
    expect(at(r.spend.max! + 500)).toBe(false)
  })

  it('saving: the extra stated works and a clearly smaller one does not', () => {
    expect(r.save).not.toBeNull()
    expect(r.save!).toBeGreaterThan(0)
    expect(works(withExtraSavings(G.household, r.save!), G.assumptions, age)).toBe(true)
    if (r.save! > 200) expect(works(withExtraSavings(G.household, r.save! - 200), G.assumptions, age)).toBe(false)
  })

  it('returns: the rise stated works and a hair less does not', () => {
    expect(r.returns).not.toBeNull()
    expect(r.returns!).toBeGreaterThan(0)
    expect(works(G.household, withExtraReturn(G.assumptions, r.returns!), age)).toBe(true)
    expect(works(G.household, withExtraReturn(G.assumptions, r.returns! - 2 * RETURN_STEP), age)).toBe(false)
  })

  it('work longer: the age stated is the first that works (the sweep says the same)', () => {
    const row = sweepRow(G.household, G.assumptions, IDENTITY, { from: age, to: 70 })
    expect(row.earliestOk).toBe(r.earliest)
  })
})

describe('an age that already works', () => {
  const earliest = retireAt(G.household, G.assumptions, { stopAtFirstOk: true }).earliestOk!
  const r = reverseTarget(G.household, G.assumptions, earliest + 1)

  it('asks for no change: nothing to save, no return to find', () => {
    expect(r.works).toBe(true)
    expect(r.save).toBe(0)
    expect(r.returns).toBe(0)
  })

  it('still says how much MORE could be spent', () => {
    expect(r.spend.max).not.toBeNull()
    expect(r.spend.max!).toBeGreaterThanOrEqual(r.spend.current - 100)
  })
})

describe('what returns alone cannot do', () => {
  it('is null when even the largest rise falls short — and the largest rise really does fall short', () => {
    const h = { ...M.household, spending: { ...M.household.spending, retiredToday: 400_000 } }
    const oldest = Math.max(...h.persons.map((p) => M.assumptions.today.year - p.birth.year))
    expect(requiredReturn(h, M.assumptions, oldest)).toBeNull()
    expect(works(h, withExtraReturn(M.assumptions, MAX_EXTRA_RETURN), oldest)).toBe(false)
  })

  it('a rise is a multiple of the step, never above the cap', () => {
    const r = requiredReturn(G.household, G.assumptions, retireAt(G.household, G.assumptions, { stopAtFirstOk: true }).earliestOk! - 2)
    expect(r).not.toBeNull()
    expect(Math.abs(r! / RETURN_STEP - Math.round(r! / RETURN_STEP))).toBeLessThan(1e-6)
    expect(r!).toBeLessThanOrEqual(MAX_EXTRA_RETURN)
  })
})

describe('the regret curve', () => {
  const row = sweepRow(M.household, M.assumptions, IDENTITY, { from: 50, to: 70 })
  const points = regretCurve(row, M.assumptions)

  it('has one point per age, in the sweep\'s order, and a gain only between two ages that work', () => {
    expect(points.map((p) => p.age)).toEqual(row.cells.map((c) => c.age))
    points.forEach((p, i) => {
      const bothOk = i > 0 && p.ok && points[i - 1].ok
      expect(p.gain === null, `age ${p.age}`).toBe(!bothOk)
      if (p.gain !== null) expect(p.gain).toBeCloseTo(p.endWorth - points[i - 1].endWorth, 6)
    })
  })

  it('what is left, in today\'s dollars, is the sweep\'s own figure taken back by inflation', () => {
    const c = row.cells[row.cells.length - 1]
    expect(points[points.length - 1].endWorth).toBeCloseTo(c.netWorthAtHorizon / (1 + M.assumptions.inflation) ** (c.lastYear - M.assumptions.today.year), 4)
  })

  it('an extra year of work, once the plan works, never leaves less at the end', () => {
    for (const p of points) if (p.gain !== null) expect(p.gain, `age ${p.age}`).toBeGreaterThan(-1)
  })

  it('the knee is the first working age whose next year adds less than the threshold', () => {
    const gains = points.filter((p) => p.gain !== null)
    expect(gains.length).toBeGreaterThan(2)
    expect(kneeAge(points, -Infinity)).toBeNull()
    const huge = kneeAge(points, Infinity)
    expect(huge).toBe(points.find((p, i) => p.ok && points[i + 1]?.ok)!.age)
    const t = gains[1].gain! + 1
    const k = kneeAge(points, t)!
    const next = points[points.findIndex((p) => p.age === k) + 1]
    expect(next.gain!).toBeLessThan(t)
    for (const p of points) if (p.age < k && p.gain !== null && p.age > points.find((q) => q.ok)!.age) expect(p.gain).toBeGreaterThanOrEqual(t)
  })

  it('a household that never works has no knee', () => {
    const none = regretCurve({ id: 'x', earliestOk: null, cells: row.cells.map((c) => ({ ...c, ok: false })) }, M.assumptions)
    expect(kneeAge(none, Infinity)).toBeNull()
  })
})
