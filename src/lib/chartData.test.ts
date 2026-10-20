import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { balanceBars, chartSeries, deflator, fanBasis, idleStretch, metricValue, retirementMarkers, SERIES_COLOURS, SOURCE_SEGMENTS, sourceBars, stopCoverageSeries } from './chartData.ts'
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

  it('the market fan reads the household’s OWN plan for its axis AND its marker, wherever « Mon plan » sits in the comparison', () => {
    const planLast = runSelections(profile, TODAY, [65, 'plan'])
    const { rows, markers } = fanBasis(profile.household, planLast, label)
    expect(rows).toBe(planLast[1].result.rows)
    const planAge = profile.household.persons[0].retirementAge
    expect(planAge).not.toBe(65) // the case: the plan is not the first age compared
    expect(markers.map((m) => m.x)).toEqual([1978 + planAge])
    expect(markers.map((m) => m.label)).toEqual(['plan ans'])
    // the plan not compared: the first run, for both
    expect(fanBasis(profile.household, runs, label).markers.map((m) => m.x)).toEqual([1978 + 60])
    expect(fanBasis(profile.household, [], label)).toEqual({ rows: undefined, markers: [] })
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

describe('a stretch of years with no bar for one person', () => {
  const bar = (x: number, nest = 0) => ({ x, work: 0, db: 0, rrq: 0, oas: 0, nest })
  it('is found between two years that have bars, two years or more', () => {
    const bars = [bar(2050, 10), bar(2051), bar(2052), bar(2053), bar(2054, 5)]
    expect(idleStretch(bars)).toEqual({ from: 2051, to: 2053 })
  })
  it('is not a gap when it is one year, leads the plan, or runs to the end (after a death)', () => {
    expect(idleStretch([bar(2050, 1), bar(2051), bar(2052, 1)])).toBeNull()
    expect(idleStretch([bar(2050), bar(2051), bar(2052, 1)])).toBeNull()
    expect(idleStretch([bar(2050, 1), bar(2051), bar(2052), bar(2053)])).toBeNull()
  })
  it('keeps the longest of several', () => {
    const bars = [bar(2050, 1), bar(2051), bar(2052), bar(2053, 1), bar(2054), bar(2055), bar(2056), bar(2057, 1)]
    expect(idleStretch(bars)).toEqual({ from: 2054, to: 2056 })
  })
})

describe('« Quand arrêter »: the pensions and the spending, in the page’s dollars', () => {
  const coverage = [
    { year: 2040, pensions: 30_000, spending: 50_000 },
    { year: 2041, pensions: 52_000, spending: 51_000 },
  ]
  const labels = { pensions: 'P', spending: 'S' }
  it('each year’s dollars are the figures as they are', () => {
    const [p, sp] = stopCoverageSeries(coverage, { dollars: 'nominal', todayYear: 2026, inflation: 0.02, labels })
    expect(p.points).toEqual([{ x: 2040, y: 30_000 }, { x: 2041, y: 52_000 }])
    expect(sp.points).toEqual([{ x: 2040, y: 50_000 }, { x: 2041, y: 51_000 }])
    expect([p.label, sp.label]).toEqual(['P', 'S'])
  })
  it('today’s dollars are each figure over the year’s deflator, both lines alike (so where they cross does not move)', () => {
    const [p, sp] = stopCoverageSeries(coverage, { dollars: 'today', todayYear: 2026, inflation: 0.02, labels })
    expect(p.points[0].y).toBeCloseTo(30_000 / deflator(2040, 2026, 0.02), 6)
    expect(sp.points[1].y).toBeCloseTo(51_000 / deflator(2041, 2026, 0.02), 6)
    expect(p.points[0].y < sp.points[0].y && p.points[1].y > sp.points[1].y).toBe(true)
  })
})
