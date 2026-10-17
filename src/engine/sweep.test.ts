import { describe, expect, it, vi } from 'vitest'
import { EXAMPLES } from './golden/examples.ts'
import { project } from './projection.ts'
import { everyoneAt, retireAt } from './retireAt.ts'
import { IDENTITY, sweep, sweepAges, sweepRow, sweepRows, type Variant } from './sweep.ts'

// THE SWEEP IS THE SAME PROJECTION, ASKED MANY TIMES. Pinned: the identity variant's row is `retireAt`'s (cell for cell), a cell's totals are the projection's own,
// a variant changes only what it names, the grid's ages are the ones `retireAt` tries, a coarse step keeps a subset of the fine grid, and the inputs are never touched.

vi.setConfig({ testTimeout: 60_000 })

const G = EXAMPLES.golden // a couple
const M = EXAMPLES.modest // one person

const spendLess: Variant = {
  id: 'spend-less',
  apply: (h, a) => [{ ...h, spending: { ...h.spending, retiredToday: h.spending.retiredToday * 0.8 } }, a],
}

describe('the identity variant is retireAt', () => {
  for (const [name, ex] of [['a couple', G], ['one person', M]] as const) {
    it(`matches cell for cell — ${name}`, () => {
      const row = sweepRow(ex.household, ex.assumptions, IDENTITY)
      const direct = retireAt(ex.household, ex.assumptions)
      expect(row.id).toBe('plan')
      expect(row.cells.map((c) => c.age)).toEqual(direct.byAge.map((r) => r.age))
      expect(row.cells.map((c) => c.ok)).toEqual(direct.byAge.map((r) => r.ok))
      expect(row.cells.map((c) => c.firstShortfallYear)).toEqual(direct.byAge.map((r) => r.firstShortfallYear))
      row.cells.forEach((c, i) => expect(c.netWorthAtHorizon).toBeCloseTo(direct.byAge[i].netWorthAtHorizon, 6))
      expect(row.earliestOk).toBe(direct.earliestOk)
    })
  }
})

describe('a cell', () => {
  it('carries the projection\'s own totals', () => {
    const age = G.household.persons[0].retirementAge
    const row = sweepRow(G.household, G.assumptions, IDENTITY, { from: age, to: age })
    expect(row.cells).toHaveLength(1)
    const rows = project(G.household, G.assumptions, everyoneAt(G.household, age))
    expect(row.cells[0].lifetimeTax).toBeCloseTo(rows.reduce((s, r) => s + r.household.tax, 0), 6)
    expect(row.cells[0].shortfallTotal).toBeCloseTo(rows.reduce((s, r) => s + r.household.shortfall, 0), 6)
    expect(row.cells[0].netWorthAtHorizon).toBeCloseTo(rows[rows.length - 1].household.netWorthEnd, 6)
  })

  it('has no shortfall in a year that works and some in the first that does not', () => {
    const row = sweepRow(M.household, M.assumptions, IDENTITY)
    for (const c of row.cells) {
      expect(c.ok).toBe(c.firstShortfallYear === null)
      expect(c.ok).toBe(c.shortfallTotal === 0)
    }
    expect(row.cells.some((c) => !c.ok), 'the modest household has an age that fails').toBe(true)
  })
})

describe('a variant', () => {
  it('changes only what it names: spending less never makes the earliest age later', () => {
    const [base, less] = sweep(G.household, G.assumptions, [IDENTITY, spendLess])
    expect(less.id).toBe('spend-less')
    if (base.earliestOk !== null) expect(less.earliestOk).not.toBeNull()
    if (base.earliestOk !== null && less.earliestOk !== null) expect(less.earliestOk).toBeLessThanOrEqual(base.earliestOk)
  })

  it('is given the household it produced to build its scenario from', () => {
    const seen: number[] = []
    const row = sweepRow(M.household, M.assumptions, spendLess, {
      from: 60,
      to: 61,
      scenario: (age, h) => {
        seen.push(h.spending.retiredToday)
        return everyoneAt(h, age)
      },
    })
    expect(row.cells).toHaveLength(2)
    expect(seen).toEqual([M.household.spending.retiredToday * 0.8, M.household.spending.retiredToday * 0.8])
  })

  it('never mutates the household or the assumptions', () => {
    const h = structuredClone(G.household)
    const a = structuredClone(G.assumptions)
    sweep(h, a, [IDENTITY, spendLess], { from: 58, to: 60 })
    expect(h).toEqual(G.household)
    expect(a).toEqual(G.assumptions)
  })
})

describe('the ages', () => {
  it('start at the oldest person\'s age today, like retireAt, however low `from` is', () => {
    const oldest = Math.max(...G.household.persons.map((p) => G.assumptions.today.year - p.birth.year))
    expect(sweepAges(G.household, G.assumptions, { from: 18 })[0]).toBe(oldest)
    expect(sweepAges(G.household, G.assumptions, { from: oldest + 3 })[0]).toBe(oldest + 3)
  })

  it('end at `to`, or at `from` when `to` is below it', () => {
    expect(sweepAges(G.household, G.assumptions, { from: 60, to: 64 })).toEqual([60, 61, 62, 63, 64])
    expect(sweepAges(G.household, G.assumptions, { from: 60, to: 40 })).toEqual([60])
  })

  it('a coarse step keeps a subset of the fine grid, with the same verdicts', () => {
    const fine = sweepRow(M.household, M.assumptions, IDENTITY, { from: 55, to: 65 })
    const coarse = sweepRow(M.household, M.assumptions, IDENTITY, { from: 55, to: 65, step: 5 })
    expect(coarse.cells.map((c) => c.age)).toEqual([55, 60, 65])
    for (const c of coarse.cells) expect(fine.cells.find((f) => f.age === c.age)).toEqual(c)
  })

  it('a step below one means one', () => {
    expect(sweepAges(G.household, G.assumptions, { from: 60, to: 62, step: 0 })).toEqual([60, 61, 62])
  })
})

describe('streaming', () => {
  it('yields one row per variant, in order, equal to the whole grid', () => {
    const options = { from: 58, to: 60 }
    const streamed = [...sweepRows(G.household, G.assumptions, [IDENTITY, spendLess], options)]
    expect(streamed.map((r) => r.id)).toEqual(['plan', 'spend-less'])
    expect(streamed).toEqual(sweep(G.household, G.assumptions, [IDENTITY, spendLess], options))
  })

  it('does no work for a variant until its row is asked for', () => {
    let applied = 0
    const counted: Variant = { id: 'x', apply: (h, a) => (applied++, [h, a]) }
    const it = sweepRows(M.household, M.assumptions, [counted, counted], { from: 60, to: 60 })
    expect(applied).toBe(0)
    it.next()
    expect(applied).toBe(1)
  })
})
