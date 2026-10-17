import { describe, expect, it, vi } from 'vitest'
import { fan, fanAssumptions, fanLine, FAN_IDS, SHIFT } from './fan.ts'
import { EXAMPLES } from './golden/examples.ts'
import { project } from './projection.ts'

// THE FAN IS THE SAME PROJECTION, ASKED SEVERAL TIMES. Pinned: the « average » line is the projection on a smooth path, point for point; the lines differ from it only by what they
// name (the returns, the path); lower returns never leave more at the end than higher ones; the person's own market path never leaks into the yardstick; the inputs are untouched.

vi.setConfig({ testTimeout: 60_000 })

const G = EXAMPLES.golden

describe('the fan', () => {
  it('has one line per id, from this year to the end of the plan', () => {
    const lines = fan(G.household, G.assumptions)
    expect(lines.map((l) => l.id)).toEqual([...FAN_IDS])
    const years = project(G.household, fanAssumptions(G.assumptions, 'average'), {}).map((r) => r.year)
    for (const l of lines) expect(l.points.map((p) => p.year)).toEqual(years)
  })

  it('the average line is the projection on a smooth path, year for year — even when the profile chose a hard market', () => {
    const hard = { ...G.assumptions, marketPath: { preset: 'badStart', custom: [] } } as typeof G.assumptions
    const line = fanLine(G.household, hard, 'average')
    const direct = project(G.household, { ...G.assumptions, marketPath: { preset: 'smooth', custom: [] } }, {})
    line.points.forEach((p, i) => expect(p.netWorth).toBeCloseTo(direct[i].household.netWorthEnd, 6))
    expect(line.end).toBeCloseTo(direct[direct.length - 1].household.netWorthEnd, 6)
  })

  it('lower returns end below the average and higher ones above it', () => {
    const [average, lower, higher] = fan(G.household, G.assumptions)
    expect(lower.end).toBeLessThan(average.end)
    expect(higher.end).toBeGreaterThan(average.end)
  })

  it('moves every account\'s return by the shift, and only the returns', () => {
    const a = fanAssumptions(G.assumptions, 'lower')
    for (const k of ['nonReg', 'rrsp', 'tfsa'] as const) expect(a.returns[k]).toBeCloseTo(G.assumptions.returns[k] - SHIFT, 12)
    expect(a.inflation).toBe(G.assumptions.inflation)
    expect(a.marketPath).toEqual({ preset: 'smooth', custom: [] })
  })

  it('a hard start ends below the average', () => {
    const lines = fan(G.household, G.assumptions)
    expect(lines.find((l) => l.id === 'badStart')!.end).toBeLessThan(lines.find((l) => l.id === 'average')!.end)
  })

  it('reports the first shortfall year of a plan that runs out, and none for one that holds', () => {
    const behind = EXAMPLES.behind
    const line = fanLine(behind.household, behind.assumptions, 'average')
    expect(line.ok).toBe(false)
    expect(line.firstShortfallYear).not.toBeNull()
    const holding = fanLine(EXAMPLES.rich.household, EXAMPLES.rich.assumptions, 'average')
    expect(holding.ok).toBe(true)
    expect(holding.firstShortfallYear).toBeNull()
  })

  it('does not touch what it was given', () => {
    const before = JSON.stringify([G.household, G.assumptions])
    fan(G.household, G.assumptions)
    expect(JSON.stringify([G.household, G.assumptions])).toBe(before)
  })
})
