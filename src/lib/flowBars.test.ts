import { describe, expect, it } from 'vitest'
import { EXAMPLES, type ExampleId } from '../engine/golden/examples.ts'
import { project } from '../engine/projection.ts'
import { EXPENSE_COLOUR, EXPENSE_SEGMENTS, SOURCE_SEGMENTS, expenseBars, sourceBars } from './chartData.ts'

// « WHERE THE MONEY COMES FROM » AND « WHERE IT GOES », year by year — and by the month. The two charts are drawn from the engine's own rows and must agree: what comes in
// (work, pensions, the OAS and the GIS, what is drawn from savings) is exactly what goes out (the budget, the mortgage, tax, what comes off the pay, what is saved) —
// the engine's cash identity, held here to the cent for every example household, and with the part of the budget a plan cannot pay shown as its own segment.

const IDS = Object.keys(EXAMPLES) as ExampleId[]
const rowsOf = (id: ExampleId) => project(EXAMPLES[id].household, EXAMPLES[id].assumptions)
const nominal = (id: ExampleId, per?: 'year' | 'month') => ({ dollars: 'nominal' as const, todayYear: EXAMPLES[id].assumptions.today.year, inflation: EXAMPLES[id].assumptions.inflation, per })
const OUT = ['living', 'children', 'events', 'mortgage', 'tax', 'deductions', 'saved'] as const
const NEED = ['living', 'children', 'events', 'mortgage', 'tax', 'unmet'] as const
const sum = (o: Record<string, number>, keys: readonly string[]) => keys.reduce((s, k) => s + o[k], 0)

// Eleven households, each a full projection: a slow CI runner needs more than the default five seconds.
describe('what comes in is what goes out', { timeout: 120_000 }, () => {
  it('every year of every example: the sources equal the budget paid, the mortgage, tax, deductions and savings, to the cent', () => {
    for (const id of IDS) {
      const rows = rowsOf(id)
      const s = nominal(id)
      const sources = sourceBars(rows, null, s)
      const spent = expenseBars(rows, s)
      expect(sources.length).toBe(spent.length)
      sources.forEach((src, i) => {
        const out = sum(spent[i], OUT)
        expect(sum(src, SOURCE_SEGMENTS), `${id} ${src.x}`).toBeCloseTo(out, 1)
      })
    }
  })

  it('the dashed « need » line is the budget plus tax: the first three segments and what could not be paid', () => {
    for (const id of IDS) {
      const rows = rowsOf(id)
      const s = nominal(id)
      const sources = sourceBars(rows, null, s)
      const spent = expenseBars(rows, s)
      sources.forEach((src, i) => expect(src.need, `${id} ${src.x}`).toBeCloseTo(sum(spent[i], NEED), 1))
    }
  })

  it('no segment is ever negative, and the mortgage never counts for more than was paid', () => {
    for (const id of IDS) {
      for (const bar of expenseBars(rowsOf(id), nominal(id))) for (const seg of EXPENSE_SEGMENTS) expect(bar[seg], `${id} ${bar.x} ${seg}`).toBeGreaterThanOrEqual(-1e-6)
    }
  })
})

describe('the children and the dated expenses are drawn apart', { timeout: 120_000 }, () => {
  it('the family example shows its children while they are at home, none once they have left, and the care it plans for', () => {
    const rows = rowsOf('family')
    const spent = expenseBars(rows, nominal('family'))
    expect(spent.some((b) => b.children > 1_000)).toBe(true)
    expect(spent[spent.length - 1].children).toBe(0)
    // the parts never exceed the budget they ride in, and the living costs are what is left — never negative
    for (const b of spent) expect(b.living).toBeGreaterThanOrEqual(-1e-6)
  })

  it('a household that states none of them has no such segment', () => {
    for (const id of IDS) {
      const h = EXAMPLES[id].household
      if ((h.children ?? []).length > 0 || (h.flows ?? []).some((x) => x.kind === 'expense')) continue
      const spent = expenseBars(rowsOf(id), nominal(id))
      for (const b of spent) expect(b.children + b.events).toBe(0)
    }
  })
})

describe('a plan that runs out says so in the chart', { timeout: 120_000 }, () => {
  it('« behind » has an unmet part from the year the money ends, and the examples that hold have none', () => {
    const unmet = (id: ExampleId) => expenseBars(rowsOf(id), nominal(id)).filter((b) => b.unmet > 0.5)
    expect(unmet('behind').length).toBeGreaterThan(0)
    expect(unmet('behind')[0].x).toBeGreaterThan(EXAMPLES.behind.assumptions.today.year)
    for (const id of ['golden', 'average', 'rich', 'family', 'planner'] as const) expect(unmet(id), id).toEqual([])
  })

  it('and the part that was paid still adds up with what came in: the unmet part is outside the identity', () => {
    const rows = rowsOf('behind')
    const s = nominal('behind')
    const bars = expenseBars(rows, s)
    const sources = sourceBars(rows, null, s)
    const bad = bars.findIndex((b) => b.unmet > 0.5)
    expect(sum(sources[bad], SOURCE_SEGMENTS)).toBeCloseTo(sum(bars[bad], OUT), 1)
    expect(sum(bars[bad], NEED)).toBeCloseTo(sources[bad].need, 1)
  })
})

describe('by the month', { timeout: 120_000 }, () => {
  it('a month is exactly a twelfth of a year, in both charts, in either kind of dollar', () => {
    for (const id of ['golden', 'family', 'retired'] as const) {
      const rows = rowsOf(id)
      for (const dollars of ['nominal', 'today'] as const) {
        const base = { dollars, todayYear: EXAMPLES[id].assumptions.today.year, inflation: EXAMPLES[id].assumptions.inflation }
        const year = sourceBars(rows, null, { ...base, per: 'year' })
        const month = sourceBars(rows, null, { ...base, per: 'month' })
        year.forEach((y, i) => {
          for (const seg of [...SOURCE_SEGMENTS, 'need'] as const) expect(month[i][seg] * 12, `${id} ${y.x} ${seg}`).toBeCloseTo(y[seg], 6)
        })
        const ey = expenseBars(rows, { ...base, per: 'year' })
        const em = expenseBars(rows, { ...base, per: 'month' })
        ey.forEach((y, i) => {
          for (const seg of EXPENSE_SEGMENTS) expect(em[i][seg] * 12, `${id} ${y.x} ${seg}`).toBeCloseTo(y[seg], 6)
        })
      }
    }
  })

  it('leaves the default alone: a bar with no unit is a year', () => {
    const rows = rowsOf('golden')
    const s = nominal('golden')
    expect(sourceBars(rows, null, s)).toEqual(sourceBars(rows, null, { ...s, per: 'year' }))
  })
})

describe('the colours of the second chart', () => {
  it('give every segment its own colour, and the unmet part the warm one that nothing else uses', () => {
    const colours = EXPENSE_SEGMENTS.map((s) => EXPENSE_COLOUR[s])
    expect(new Set(colours).size).toBe(EXPENSE_SEGMENTS.length)
    expect(EXPENSE_COLOUR.unmet).toBe('clay')
  })
})
