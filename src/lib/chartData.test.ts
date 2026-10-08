import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { balanceBars, chartSeries, deflator, metricValue, retirementMarkers, SERIES_COLOURS, SOURCE_SEGMENTS, sourceBars } from './chartData.ts'
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

describe('the detail view says what the rows say', () => {
  const scale = { dollars: 'nominal' as const, todayYear: 2026, inflation: 0.02 }
  const rows = runs[0].result.rows
  const [first, second] = profile.household.persons

  it('the sources of a household year add up to the household’s gross income less nothing it did not receive', () => {
    const bars = sourceBars(rows, null, scale)
    rows.forEach((row, i) => {
      const b = bars[i]
      const received = b.work + b.db + b.rrq + b.oas + b.nest
      // Gross income also counts a few small taxable items the bars fold into those five; it can never be LESS than them.
      expect(received).toBeLessThanOrEqual(row.household.grossIncome + 1)
      expect(b.need).toBeCloseTo(row.household.spending + row.household.tax, 6)
    })
  })

  it('the two people’s bars add up to the household’s, year by year', () => {
    const all = sourceBars(rows, null, scale)
    const a = sourceBars(rows, first.id, scale)
    const b = second ? sourceBars(rows, second.id, scale) : null
    rows.forEach((_, i) => {
      for (const k of SOURCE_SEGMENTS) expect(a[i][k] + (b ? b[i][k] : 0)).toBeCloseTo(all[i][k], 6)
    })
  })

  it('the account bars add up to the net worth the line chart draws', () => {
    const bars = balanceBars(rows, null, scale)
    rows.forEach((row, i) => expect(bars[i].rrsp + bars[i].tfsa + bars[i].nonReg).toBeCloseTo(row.household.netWorthEnd, 4))
  })

  it('today’s dollars deflate the bars like the lines', () => {
    const today = balanceBars(rows, null, { ...scale, dollars: 'today' })
    const k = deflator(rows[10].year, 2026, 0.02)
    expect(today[10].rrsp).toBeCloseTo(balanceBars(rows, null, scale)[10].rrsp / k, 6)
  })
})
