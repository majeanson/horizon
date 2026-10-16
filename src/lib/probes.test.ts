import { describe, expect, it } from 'vitest'
import { project } from '../engine/projection.ts'
import type { Assumptions, Household, Person, YearRow } from '../engine/types.ts'
import { genCases, type GenCase } from './householdGen.ts'

// DISCONTINUITY PROBES. A calculation that is right at each of a hundred hand-picked inputs can still jump between two of them: a threshold in the wrong place, a step in a search that was meant
// to be smooth (the split's 5 % steps, the withdrawal solver's scan), a year counted in or out. So each probe sweeps ONE input in small steps and reads one output; a plan's money is
// not a straight line in anything, but it has no cliffs, and a step many times the size of its neighbours is where to look. « Many times » is measured against the sweep's own median step, so the
// rule needs no guess at what the right slope is. A kink is allowed (the plan fails and the figure stops moving: steps of zero are never a jump); a cliff is not.

const CASES = genCases(31, 40).filter((c) => c.household.persons.every((p) => p.retirementAge >= 52)).slice(0, 8)
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)]

/**
 * Indexes of the steps of `ys` more than `factor` × the sweep's median step (and more than `floor` dollars): a figure that suddenly moves far. A subtler rule — a SPIKE, a step standing out
 * against both its neighbours — was tried and dropped: a plan's money compounds over fifty years, so one more year of work, or a plan tipping from failing to lasting, is already 2.4× its
 * neighbours, the size of a real cliff. What this catches is a LARGE cliff in a rule's interaction with the rest; the exact rules are pinned at their own level (verified/, oracle).
 */
export function cliffs(ys: readonly number[], factor = 6, floor = 2_000): number[] {
  const steps = ys.slice(1).map((y, i) => Math.abs(y - ys[i]))
  const m = Math.max(median(steps.filter((s) => s > 0)) ?? 0, 1)
  return steps.flatMap((s, i) => (s > factor * m && s > floor ? [i] : []))
}

const last = (rows: readonly YearRow[]) => rows[rows.length - 1].household.netWorthEnd
const shortfall = (rows: readonly YearRow[]) => rows.reduce((s, r) => s + r.household.shortfall, 0)

function report(label: string, c: GenCase, xs: readonly number[], ys: readonly number[], bad: number[]): string[] {
  return bad.map((i) => `${label}: seed ${c.seed} case ${c.index}: between ${xs[i]} and ${xs[i + 1]} the figure goes ${ys[i].toFixed(0)} → ${ys[i + 1].toFixed(0)} (median step ${median(ys.slice(1).map((y, k) => Math.abs(y - ys[k])).filter((s) => s > 0)).toFixed(0)})`)
}

function sweep(label: string, c: GenCase, xs: readonly number[], make: (x: number) => { h: Household; a: Assumptions }, read: (rows: YearRow[]) => number): string[] {
  const ys = xs.map((x) => {
    const { h, a } = make(x)
    return read(project(h, a))
  })
  return report(label, c, xs, ys, cliffs(ys))
}

const withPerson = (h: Household, i: number, f: (p: Person) => Person): Household => ({ ...h, persons: h.persons.map((p, k) => (k === i ? f(p) : p)) })
const steps = (from: number, to: number, n: number) => Array.from({ length: n + 1 }, (_, i) => from + ((to - from) * i) / n)

describe('no cliff in the plan when one input moves a little at a time', { timeout: 300_000 }, () => {
  it('there are households to sweep', () => expect(CASES.length).toBeGreaterThanOrEqual(8))

  it('the budget, from 50 % to 150 % of what it is: the money left at the end of the plan', () => {
    const found = CASES.flatMap((c) => sweep('budget', c, steps(0.5, 1.5, 40), (k) => ({ h: { ...c.household, spending: { workingToday: c.household.spending.workingToday * k, retiredToday: c.household.spending.retiredToday * k } }, a: c.assumptions }), last))
    expect(found).toEqual([])
  })

  it('the budget, same sweep: the unpaid part of the plan only ever grows', () => {
    const bad = CASES.flatMap((c) => {
      const ys = steps(0.5, 1.5, 40).map((k) => shortfall(project({ ...c.household, spending: { workingToday: c.household.spending.workingToday * k, retiredToday: c.household.spending.retiredToday * k } }, c.assumptions)))
      return ys.flatMap((y, i) => (i > 0 && y < ys[i - 1] - 1 - 0.0001 * ys[i - 1] ? [`seed ${c.seed} case ${c.index}: unpaid ${ys[i - 1].toFixed(0)} → ${y.toFixed(0)} as the budget rose`] : []))
    })
    expect(bad).toEqual([])
  })

  it('the RRSP at the start, from nothing to $1 500 000: the money left at the end', () => {
    const found = CASES.flatMap((c) => sweep('RRSP', c, steps(0, 1_500_000, 30), (x) => ({ h: withPerson(c.household, 0, (p) => ({ ...p, accounts: { ...p.accounts, rrsp: { ...p.accounts.rrsp, balance: x, lockedIn: 0 } } })), a: c.assumptions }), last))
    expect(found).toEqual([])
  })

  // The same sweep read by what a cliff in a RULE moves directly: the biggest forced RRIF minimum of the plan, and the tax paid. (The money left at the end hardly moves when a
  // minimum is mis-sized — it is only drawn earlier and taxed — so it passed a planted 1.5 × minimum above $800 000; these two do not.)
  it('the RRSP at the start, same sweep: the largest forced minimum, and the lifetime tax, move smoothly', () => {
    const real = (a: Assumptions, y: number) => (1 + a.inflation) ** (y - a.today.year)
    const largestMinimum = (rows: YearRow[]) => Math.max(...rows.map((r) => Object.values(r.persons).reduce((s, p) => s + (p?.rrifMinimum ?? 0), 0)))
    const make = (c: GenCase) => (x: number) => ({ h: withPerson(c.household, 0, (p) => ({ ...p, accounts: { ...p.accounts, rrsp: { ...p.accounts.rrsp, balance: x, lockedIn: 0 } } })), a: c.assumptions })
    const xs = steps(0, 1_500_000, 30)
    const found = CASES.flatMap((c) => {
      // one projection per point, read twice
      const runs = xs.map((x) => {
        const { h, a } = make(c)(x)
        return project(h, a)
      })
      const tax = runs.map((rows) => rows.reduce((s, r) => s + r.household.tax / real(c.assumptions, r.year), 0))
      const minimum = runs.map(largestMinimum)
      return [...report('largest minimum', c, xs, minimum, cliffs(minimum)), ...report('lifetime tax', c, xs, tax, cliffs(tax))]
    })
    expect(found).toEqual([])
  })

  it('the first person’s retirement age, one year at a time from 55 to 70: the money left at the end', () => {
    const found = CASES.flatMap((c) => {
      const p = c.household.persons[0]
      const age = c.assumptions.today.year - p.birth.year
      const from = Math.max(55, age + 1)
      return from >= 69 ? [] : sweep('retirement age', c, steps(from, 70, 70 - from), (x) => ({ h: withPerson(c.household, 0, (q) => ({ ...q, retirementAge: x })), a: c.assumptions }), last)
    })
    expect(found).toEqual([])
  })

  it('the OAS line, with the household’s savings sliding: the lifetime tax of a plan that fills to the line', () => {
    const real = (a: Assumptions, y: number) => (1 + a.inflation) ** (y - a.today.year)
    const found = CASES.flatMap((c) =>
      sweep('tax with a fill', c, steps(0, 1_200_000, 24), (x) => ({ h: withPerson(c.household, 0, (p) => ({ ...p, accounts: { ...p.accounts, rrsp: { ...p.accounts.rrsp, balance: x, lockedIn: 0 } } })), a: { ...c.assumptions, bracketFill: 'oas' } }), (rows) => rows.reduce((s, r) => s + r.household.tax / real(c.assumptions, r.year), 0)),
    )
    expect(found).toEqual([])
  })
})

describe('the probe itself finds a cliff and ignores a kink', () => {
  it('a smooth line has none; a line with a jump has it at the jump; a figure that stops moving is not a jump', () => {
    expect(cliffs(Array.from({ length: 30 }, (_, i) => i * 10_000))).toEqual([])
    const jumpy = Array.from({ length: 30 }, (_, i) => i * 10_000 + (i >= 15 ? 400_000 : 0))
    expect(cliffs(jumpy)).toEqual([14])
    expect(cliffs([...Array.from({ length: 20 }, (_, i) => i * 10_000), ...Array.from({ length: 10 }, () => 190_000)])).toEqual([])
  })

  it('a jump smaller than the dollar floor is noise, however large next to a tiny median', () => {
    expect(cliffs([0, 1, 2, 3, 400, 401, 402], 6, 5_000)).toEqual([])
  })
})
