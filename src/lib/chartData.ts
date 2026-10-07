import type { ChartMarker, ChartSeries, SeriesColour } from '../components/charts/types.ts'
import type { AgeResult, Household, YearRow } from '../engine/types.ts'
import { selectionAge, type Selection } from './resultsModel.ts'

// From the engine's year rows to what the chart draws: which number, in which dollars, for which scenario.
// Pure, so « the chart says what the table says » is a test and not a hope.

/** `netWorth`: everything the household owns at year end · `income`: guaranteed income (work, pensions, RRQ, OAS, GIS) before tax, without drawing on savings. */
export type Metric = 'netWorth' | 'income'

/** `today`: deflated to today's purchasing power (what a reader can feel) · `nominal`: the dollars of each year. */
export type Dollars = 'today' | 'nominal'

export const SERIES_COLOURS: readonly SeriesColour[] = ['accent', 'sky', 'sage', 'berry']

export function metricValue(row: YearRow, metric: Metric): number {
  if (metric === 'netWorth') return row.household.netWorthEnd
  let sum = 0
  for (const p of Object.values(row.persons)) sum += p.employment + p.db + p.rrq + p.oas + p.allowance + p.gis
  return sum
}

/** The factor that turns a dollar of `year` into a dollar of `todayYear`. */
export const deflator = (year: number, todayYear: number, inflation: number): number => (1 + inflation) ** (year - todayYear)

export function chartSeries(
  runs: readonly { selection: Selection; result: AgeResult }[],
  options: { metric: Metric; dollars: Dollars; todayYear: number; inflation: number; label: (s: Selection) => string },
): ChartSeries[] {
  return runs.map(({ selection, result }, i) => ({
    id: String(selection),
    label: options.label(selection),
    colour: SERIES_COLOURS[i % SERIES_COLOURS.length],
    points: result.rows.map((row) => ({
      x: row.year,
      y: metricValue(row, options.metric) / (options.dollars === 'today' ? deflator(row.year, options.todayYear, options.inflation) : 1),
    })),
  }))
}

/** One vertical line per scenario at the year its FIRST person stops working. */
export function retirementMarkers(
  household: Household,
  runs: readonly { selection: Selection }[],
  label: (s: Selection) => string,
): ChartMarker[] {
  return runs.map(({ selection }, i) => ({
    x: household.persons[0].birth.year + selectionAge(household, selection),
    label: label(selection),
    colour: SERIES_COLOURS[i % SERIES_COLOURS.length],
  }))
}
