import type { ChartMarker, ChartSeries, SeriesColour } from '../components/charts/types.ts'
import { PRESET_KEYS, withPreset, type PresetKey } from '../engine/assumptionPresets.ts'
import { project } from '../engine/projection.ts'
import type { AgeResult, Assumptions, Household, Scenario, YearRow } from '../engine/types.ts'
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

// ── The whole picture, not only the net worth ────────────────────────────────────────────────────────────────────────
// « Détail »: where each year's money comes from (work, pension plan, RRQ, OAS and its supplements, savings drawn), what the
// accounts hold, and the same plan under the three sets of hypotheses. Everything is read from the engine's rows, for the
// household or for one person, so the bars and the per-year table can never disagree.

/** The chart's choices: the two single-line measures, or the detail (bars). */
export type ChartMetric = Metric | 'detail'

export const SOURCE_SEGMENTS = ['work', 'db', 'rrq', 'oas', 'nest'] as const
export type SourceSegment = (typeof SOURCE_SEGMENTS)[number]
export const SOURCE_COLOUR: Record<SourceSegment, SeriesColour> = { work: 'ink', db: 'sky', rrq: 'sage', oas: 'berry', nest: 'accent' }

export const BALANCE_SEGMENTS = ['rrsp', 'tfsa', 'nonReg'] as const
export type BalanceSegment = (typeof BALANCE_SEGMENTS)[number]
/** The house's equity: wealth beside the accounts, never drawn on — a segment only for the household, and only when it has a home. */
export type BalanceBarSegment = BalanceSegment | 'home'
export const BALANCE_COLOUR: Record<BalanceBarSegment, SeriesColour> = { rrsp: 'accent', tfsa: 'sage', nonReg: 'sky', home: 'berry' }

interface Scale {
  dollars: Dollars
  todayYear: number
  inflation: number
}
const scaleOf = (row: YearRow, s: Scale): number => (s.dollars === 'today' ? deflator(row.year, s.todayYear, s.inflation) : 1)
const peopleOf = (row: YearRow, who: string | null) => Object.entries(row.persons).filter(([id]) => who === null || id === who).map(([, p]) => p)

/** One bar per year: the sources of the year's money, for the household (`who` null) or one person. `need` (spending + tax) is the household's only. */
export function sourceBars(rows: readonly YearRow[], who: string | null, s: Scale): ({ x: number; need: number } & Record<SourceSegment, number>)[] {
  return rows.map((row) => {
    const k = scaleOf(row, s)
    let work = 0, db = 0, rrq = 0, oas = 0, nest = 0
    for (const p of peopleOf(row, who)) {
      work += p.employment
      db += p.db
      rrq += p.rrq
      oas += p.oas + p.allowance + p.gis
      nest += p.withdrawals.rrsp + p.withdrawals.tfsa + p.withdrawals.nonReg
    }
    return { x: row.year, need: who === null ? (row.household.spending + row.household.tax) / k : 0, work: work / k, db: db / k, rrq: rrq / k, oas: oas / k, nest: nest / k }
  })
}

/** One bar per year: what each kind of account holds at year end. */
export function balanceBars(rows: readonly YearRow[], who: string | null, s: Scale): ({ x: number } & Record<BalanceBarSegment, number>)[] {
  return rows.map((row) => {
    const k = scaleOf(row, s)
    // The home belongs to the household, not to a person: it is in the household's bars only.
    const out = { x: row.year, rrsp: 0, tfsa: 0, nonReg: 0, home: who === null ? (row.household.homeValueEnd - row.household.mortgageBalanceEnd) / k : 0 }
    for (const p of peopleOf(row, who)) for (const a of BALANCE_SEGMENTS) out[a] += p.balancesEnd[a] / k
    return out
  })
}

/** The same scenario's net worth under each set of hypotheses, one line each. */
export function hypothesisSeries(
  household: Household,
  assumptions: Assumptions,
  scenario: Scenario,
  s: Scale,
  labels: Record<PresetKey, string>,
): ChartSeries[] {
  const colour: Record<PresetKey, SeriesColour> = { prudent: 'sky', neutral: 'accent', bold: 'sage' }
  return PRESET_KEYS.map((key) => {
    const a = withPreset(assumptions, key)
    const rows = project(household, a, scenario)
    return { id: key, label: labels[key], colour: colour[key], points: rows.map((row) => ({ x: row.year, y: row.household.netWorthEnd / (s.dollars === 'today' ? deflator(row.year, s.todayYear, a.inflation) : 1) })) }
  })
}
