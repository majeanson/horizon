import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { chartSeries, deflator, metricValue, retirementMarkers, SERIES_COLOURS } from './chartData.ts'
import { runSelections } from './resultsModel.ts'
import type { Profile } from './schema.ts'

const dir = dirname(fileURLToPath(import.meta.url))
const profile: Profile = JSON.parse(readFileSync(join(dir, 'fixtures', 'profile.v1.json'), 'utf8'))
const TODAY = { year: 2026, month: 10 }
const runs = runSelections(profile, TODAY, [60, 65])
const label = (s: number | string) => `${s} ans`

describe('what the chart draws is what the table says', () => {
  it('net worth is the row’s own year-end figure, point for point', () => {
    const [s60] = chartSeries(runs, { metric: 'netWorth', dollars: 'nominal', todayYear: 2026, inflation: 0.02, label })
    runs[0].result.rows.forEach((row, i) => {
      expect(s60.points[i]).toEqual({ x: row.year, y: row.household.netWorthEnd })
    })
  })

  it('guaranteed income is work + plan pension + RRQ + OAS + GIS, summed over the household, before tax and without withdrawals', () => {
    const row = runs[0].result.rows.find((r) => r.year === 2046)!
    const expected = Object.values(row.persons).reduce((s, p) => s + p.employment + p.db + p.rrq + p.oas + p.gis, 0)
    expect(metricValue(row, 'income')).toBe(expected)
    expect(expected).toBeGreaterThan(0)
    // …and it is NOT gross income: that one includes what was drawn from savings.
    expect(metricValue(row, 'income')).toBeLessThanOrEqual(row.household.grossIncome)
  })

  it('« today’s dollars » deflates each year by the inflation since now; the first year is untouched', () => {
    const nominal = chartSeries(runs, { metric: 'netWorth', dollars: 'nominal', todayYear: 2026, inflation: 0.02, label })[1]
    const real = chartSeries(runs, { metric: 'netWorth', dollars: 'today', todayYear: 2026, inflation: 0.02, label })[1]
    expect(real.points[0].y).toBe(nominal.points[0].y)
    for (const i of [10, 25, 50]) expect(real.points[i].y).toBeCloseTo(nominal.points[i].y / 1.02 ** (nominal.points[i].x - 2026), 6)
    expect(deflator(2036, 2026, 0.02)).toBeCloseTo(1.02 ** 10, 12)
  })

  it('one series per scenario, in order, each with its own colour, id and label', () => {
    const series = chartSeries(runs, { metric: 'netWorth', dollars: 'today', todayYear: 2026, inflation: 0.02, label })
    expect(series.map((s) => s.id)).toEqual(['60', '65'])
    expect(series.map((s) => s.label)).toEqual(['60 ans', '65 ans'])
    expect(series.map((s) => s.colour)).toEqual(SERIES_COLOURS.slice(0, 2))
    expect(series[0].points).toHaveLength(runs[0].result.rows.length)
  })

  it('a marker sits at the year the first person stops working, in the series’ colour', () => {
    const markers = retirementMarkers(profile.household, runs, label)
    expect(markers.map((m) => m.x)).toEqual([1978 + 60, 1978 + 65])
    expect(markers.map((m) => m.colour)).toEqual(SERIES_COLOURS.slice(0, 2))
  })
})
