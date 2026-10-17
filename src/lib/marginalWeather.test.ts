import { describe, expect, it } from 'vitest'
import { EXAMPLES } from '../engine/golden/examples.ts'
import { project } from '../engine/projection.ts'
import { marginalWeather, weatherSummary } from './marginalWeather.ts'
import { retiredRates } from './retiredRates.ts'

// THE WEATHER OF A DOLLAR is the year table's « cost of one more RRSP dollar », asked of every retired year instead of the first. Pinned against that sentence's own function, and against what a rate may be.

const cases = Object.values(EXAMPLES).map((e) => ({ id: e.id, h: e.household, a: e.assumptions }))

describe('every example household', () => {
  for (const { id, h, a } of cases) {
    it(`${id}: points are retired years in order, and the first is exactly the table's sentence`, () => {
      const rows = project(h, a)
      const first = h.persons[0].id
      const points = marginalWeather(rows, a, first, h.livesAlone)
      const own = retiredRates(rows, a, h.livesAlone)
      if (own === null) return expect(points).toHaveLength(0)
      expect(points.length).toBeGreaterThan(0)
      expect(points[0].year).toBe(own.year)
      expect(points[0].rate).toBeCloseTo(Math.max(0, own.marginal.rate), 12)
      for (let i = 1; i < points.length; i++) expect(points[i].year).toBeGreaterThan(points[i - 1].year)
      for (const p of points) {
        expect(p.rate).toBeGreaterThanOrEqual(0)
        expect(p.rate, `${id} ${p.year}`).toBeLessThan(1.5)
        expect(p.age).toBe(p.year - h.persons[0].birth.year)
        expect(p.rate).toBeCloseTo(p.tax + p.oasRecovery + p.gisLost, 1)
      }
    })
  }

  it('a year when somebody still earns a salary has no point', () => {
    const { h, a } = cases.find((c) => c.id === 'golden')!
    const rows = project(h, a)
    const points = marginalWeather(rows, a, h.persons[0].id, h.livesAlone)
    const working = rows.filter((r) => Object.values(r.persons).some((p) => p !== undefined && p.employment > 0)).map((r) => r.year)
    expect(working.length).toBeGreaterThan(0)
    for (const y of working) expect(points.some((p) => p.year === y)).toBe(false)
  })
})

describe('the summary', () => {
  const pt = (year: number, rate: number) => ({ year, age: year - 1960, rate, tax: rate, oasRecovery: 0, gisLost: 0 })
  it('names the cheapest and the dearest year, the earlier on a tie', () => {
    const s = weatherSummary([pt(2030, 0.3), pt(2031, 0.2), pt(2032, 0.2), pt(2033, 0.5), pt(2034, 0.5)])!
    expect(s.lowest.year).toBe(2031)
    expect(s.highest.year).toBe(2033)
  })
  it('has none for no points', () => {
    expect(weatherSummary([])).toBeNull()
  })
})
