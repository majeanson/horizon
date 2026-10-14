import { describe, expect, it } from 'vitest'
import { agesLedger, planGlance } from '../engine/ledger.ts'
import { EXAMPLES } from '../engine/golden/examples.ts'
import { project } from '../engine/projection.ts'
import { moments, nearestMoment, type MomentInputs } from './chartMoments.ts'

// The chart's moments, read off two example households the way the page reads them off its own model.

function inputsOf(id: 'golden' | 'retired' | 'behind'): MomentInputs {
  const { household, assumptions } = EXAMPLES[id]
  const rows = project(household, assumptions)
  return {
    ledger: agesLedger(household, assumptions),
    births: household.persons.map((p) => p.birth.year),
    firstYear: rows[0].year,
    lastYear: rows[rows.length - 1].year,
    firstShortfallYear: planGlance(household, assumptions).firstShortfallYear,
  }
}

describe('moments', () => {
  it('golden: the pension starts to come, each with its year AND its age, then the end of the plan; every door is one the page has', () => {
    const i = inputsOf('golden')
    const ms = moments(i)
    expect(ms.length).toBeGreaterThan(1)
    expect(ms.some((m) => m.labelKey === 'rrq' || m.labelKey === 'oas' || m.labelKey === 'pension')).toBe(true)
    expect(ms.map((m) => m.x)).toEqual([...ms.map((m) => m.x)].sort((a, b) => a - b))
    expect(new Set(ms.map((m) => m.x)).size).toBe(ms.length) // one moment per year
    for (const m of ms) {
      expect(Number.isInteger(m.year)).toBe(true)
      expect(m.year).toBe(m.x)
      expect(m.age, m.id).not.toBeNull()
      expect(m.age).toBe(m.year - i.births[m.who[0] ?? 0])
      expect(['rentes', 'essayer', 'tableau']).toContain(m.section)
      expect(m.view).toBe(m.section === 'tableau' ? 'proof' : 'decide')
    }
    const end = ms[ms.length - 1]
    expect(end.labelKey).toBe('end')
    expect(end.x).toBe(i.lastYear)
  })

  it('retired: both pensions are behind them and the money lasts, so there is nothing to start and no moment at all', () => {
    const i = inputsOf('retired')
    expect(i.firstShortfallYear).toBeNull()
    expect(moments(i)).toEqual([])
  })

  it('behind: the first year the money falls short is a door to « Essayer »', () => {
    const i = inputsOf('behind')
    const s = moments(i).find((m) => m.labelKey === 'shortfall')
    expect(s?.x).toBe(i.firstShortfallYear)
    expect([s?.view, s?.section]).toEqual(['decide', 'essayer'])
  })

  const couple = (rrq: [number, number], oas: [number, number]): MomentInputs => ({
    ledger: [
      { rrq: { start: { year: rrq[0] }, done: false }, oas: { start: { year: oas[0] }, done: false } },
      { rrq: { start: { year: rrq[1] }, done: false }, oas: { start: { year: oas[1] }, done: false } },
    ],
    births: [1970, 1972],
    firstYear: 2026,
    lastYear: 2060,
    firstShortfallYear: null,
  })

  it('dedupe: two pensions of two people on one year are ONE moment naming both kinds; the household’s when everybody is in it', () => {
    const ms = moments(couple([2035, 2035], [2040, 2042])).filter((m) => m.labelKey !== 'end')
    expect(ms.map((m) => [m.x, m.labelKey, m.who])).toEqual([
      [2035, 'rrq', []],
      [2040, 'oas', [0]],
      [2042, 'oas', [1]],
    ])
    const one = moments(couple([2035, 2037], [2035, 2042]))
    expect(one.find((m) => m.x === 2035)).toMatchObject({ labelKey: 'pension', who: [0] })
    expect(one.filter((m) => m.x === 2035)).toHaveLength(1)
  })

  it('dedupe: a different kind on a taken year yields to the shortfall, and the end of the plan is dropped when the shortfall IS the last year', () => {
    const base = couple([2035, 2037], [2040, 2042])
    expect(moments({ ...base, firstShortfallYear: 2035 }).find((m) => m.x === 2035)?.labelKey).toBe('shortfall')
    const last = moments({ ...base, firstShortfallYear: 2060 })
    expect(last.filter((m) => m.x === 2060).map((m) => m.labelKey)).toEqual(['shortfall'])
  })

  it('a pension already started, or outside the chart, is not a moment', () => {
    const i = couple([2035, 2037], [2040, 2042])
    i.ledger = i.ledger.map((l) => ({ ...l, rrq: { ...l.rrq, done: true } }))
    expect(moments(i).map((m) => m.labelKey)).toEqual(['oas', 'oas', 'end'])
    expect(moments({ ...i, firstYear: 2043 }).map((m) => m.labelKey)).toEqual([])
  })
})

describe('nearestMoment', () => {
  const ms = moments({
    ledger: [{ rrq: { start: { year: 2035 }, done: false }, oas: { start: { year: 2040 }, done: false } }],
    births: [1970],
    firstYear: 2026,
    lastYear: 2060,
    firstShortfallYear: null,
  })

  it('snaps a tap to the nearest moment within two years, and does nothing farther', () => {
    expect(nearestMoment(ms, 2036.4)?.x).toBe(2035)
    expect(nearestMoment(ms, 2038)?.x).toBe(2040)
    expect(nearestMoment(ms, 2037)?.x).toBe(2035)
    expect(nearestMoment(ms, 2037.4)).toBeNull() // 2,4 years from the nearest
    expect(nearestMoment(ms, 2030)).toBeNull()
    expect(nearestMoment(ms, 2058.5)?.labelKey).toBe('end')
    expect(nearestMoment(ms, Number.NaN)).toBeNull()
    expect(nearestMoment([], 2035)).toBeNull()
  })
})
