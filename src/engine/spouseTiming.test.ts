import { describe, expect, it, vi } from 'vitest'
import { EXAMPLES } from './golden/examples.ts'
import { project } from './projection.ts'
import { EARLY_DEATH_AGE, START_AGES, spouseTiming, timingCell } from './spouseTiming.ts'

// WHO SHOULD START THE QPP FIRST: nine combinations, each the same projection run three times (both alive, each spouse dying early), scored by the worst. Pinned: the grid is
// what it says, the household's own ages run the same way as a grid cell, a death really ends a life in the run, and the best is the best of those that work.

vi.setConfig({ testTimeout: 120_000 })

const G = EXAMPLES.golden
const M = EXAMPLES.modest
const T = spouseTiming(G.household, G.assumptions)!

describe('the grid', () => {
  it('is nine combinations, the first person down and the second across', () => {
    expect(T.cells).toHaveLength(9)
    expect(T.cells.map((c) => c.starts)).toEqual(START_AGES.flatMap((a) => START_AGES.map((b) => [a, b])))
  })

  it('scores each by the smallest of its three end worths, and works only if all three runs do', () => {
    for (const c of T.cells) {
      expect(c.worst).toBe(Math.min(c.endWorth.bothAlive, c.endWorth.firstDies, c.endWorth.secondDies))
    }
    expect(T.cells.some((c) => c.ok), 'the golden couple has combinations that work').toBe(true)
  })

  it('both alive is the plain projection with those two start ages, in today\'s dollars', () => {
    const c = T.cells[4] // 65 / 65
    const h = { ...G.household, persons: G.household.persons.map((p) => ({ ...p, rrq: { ...p.rrq, startAge: 65 } })) }
    const rows = project(h, G.assumptions, {})
    const last = rows[rows.length - 1]
    expect(c.endWorth.bothAlive).toBeCloseTo(last.household.netWorthEnd / (1 + G.assumptions.inflation) ** (last.year - G.assumptions.today.year), 4)
  })

  it('an early death changes the run: the plan does not end the same way as with both alive', () => {
    const differs = T.cells.some((c) => Math.abs(c.endWorth.firstDies - c.endWorth.bothAlive) > 1 || Math.abs(c.endWorth.secondDies - c.endWorth.bothAlive) > 1)
    expect(differs).toBe(true)
    expect(EARLY_DEATH_AGE).toBeGreaterThan(60)
  })
})

describe('the household\'s own ages', () => {
  it('are run the same way as a cell: the cell with those very ages equals `current`', () => {
    const own: [number, number] = [G.household.persons[0].rrq.startAge, G.household.persons[1].rrq.startAge]
    expect(T.current.starts).toEqual(own)
    expect(timingCell(G.household, G.assumptions, own)).toEqual(T.current)
    const inGrid = T.cells.find((c) => c.starts[0] === own[0] && c.starts[1] === own[1])
    if (inGrid) expect(inGrid).toEqual(T.current)
  })
})

describe('the best', () => {
  it('is the highest worst case among the combinations that work, and one of the grid', () => {
    const working = T.cells.filter((c) => c.ok)
    if (T.best === null) return expect(working).toHaveLength(0)
    const best = T.cells.find((c) => c.starts[0] === T.best![0] && c.starts[1] === T.best![1])!
    expect(best.ok).toBe(true)
    for (const c of working) expect(c.worst).toBeLessThanOrEqual(best.worst)
  })

  it('is null when no combination works', () => {
    const broke = { ...G.household, spending: { ...G.household.spending, workingToday: 900_000, retiredToday: 900_000 } }
    expect(spouseTiming(broke, G.assumptions)!.best).toBeNull()
  })
})

describe('who it is for', () => {
  it('a household of one has nobody to order', () => {
    expect(spouseTiming(M.household, M.assumptions)).toBeNull()
  })

  it('never mutates the household', () => {
    const h = structuredClone(G.household)
    spouseTiming(h, G.assumptions)
    expect(h).toEqual(G.household)
  })
})
