import type { ChartSeries } from '../components/charts/types.ts'
import { seriesFor } from './chartData.ts'
import type { FillOutcome, FillYear } from '../engine/bracketFillCompare.ts'

// WHAT THE « HOW FAR TO MELT » PANEL SAYS, DECIDED WITHOUT A SCREEN. The words of the panel (« moins », « plus gros », « de plus ») are chosen by booleans computed from the three ways' figures, and
// the two marks on the chart (where the income leaves the line, where the RRSP is empty) from the rows. They lived inside the component, where only a browser could see them: a sign swapped there
// would print « 289 058 $ de moins » for money that costs more. Here they are plain functions of the outcomes, held by lib/fillView.test.ts.

/** Money differences under this are « the same »: a sentence about 40 $ is noise. */
export const SAME = 500

/** What the way on screen does to the plan, against no meltdown, as figures and signs (the panel formats the money and picks the words). */
export interface FillEffect {
  /** The lifetime tax difference, absolute; null when it is the same. */
  tax: number | null
  /** The way on screen costs LESS lifetime tax than no meltdown. */
  taxLess: boolean
  /** The largest forced RRIF minimum, now and with no meltdown; null when neither is worth a sentence. `smaller`: the way on screen forces no more than no meltdown does. */
  peak: { now: number; off: number; smaller: boolean } | null
  /** What is left in the TFSA at the end, the difference; null when the same. `more`: the way on screen leaves at least as much. */
  tfsa: { diff: number; more: boolean } | null
  /** Does it pay (less tax)? null when the tax is the same, so there is nothing to say. */
  pays: boolean | null
}

/** The effect of `shown` against `off` (no meltdown); null for no meltdown itself. */
export function fillEffect(shown: Pick<FillOutcome, 'choice' | 'lifetimeTax' | 'tfsaLeft' | 'peakMinimum'>, off: Pick<FillOutcome, 'lifetimeTax' | 'tfsaLeft' | 'peakMinimum'>): FillEffect | null {
  if (shown.choice === null) return null
  const taxDiff = shown.lifetimeTax - off.lifetimeTax
  const tfsaDiff = shown.tfsaLeft - off.tfsaLeft
  const peakDiff = shown.peakMinimum - off.peakMinimum
  return {
    tax: Math.abs(taxDiff) < SAME ? null : Math.abs(taxDiff),
    taxLess: taxDiff < 0,
    peak: Math.max(shown.peakMinimum, off.peakMinimum) < SAME ? null : { now: shown.peakMinimum, off: off.peakMinimum, smaller: peakDiff <= 0 },
    tfsa: Math.abs(tfsaDiff) < SAME ? null : { diff: Math.abs(tfsaDiff), more: tfsaDiff >= 0 },
    pays: Math.abs(taxDiff) < SAME ? null : taxDiff < 0,
  }
}

export interface FillMarkers {
  /** The first year the income is above the line (the pensions and the forced minimum, which nobody chooses). */
  leftAt: FillYear | undefined
  /** The first year the RRSP is used up. */
  emptiedAt: FillYear | undefined
  /** The years the income sits below the line while the RRSP is not used up, because the GIS is paid (melting stops, so as not to lose it). */
  paused: FillYear[]
}

/** The two reasons for a gap, and the one mark, from the years the chart draws (from the first retired year). `retiredFrom` is the first year anyone is retired. */
export function fillMarkers(shown: Pick<FillOutcome, 'choice'>, years: readonly FillYear[], retiredFrom: number): FillMarkers {
  if (shown.choice === null) return { leftAt: undefined, emptiedAt: undefined, paused: [] }
  return {
    leftAt: years.find((y) => y.ceiling !== null && y.income > y.ceiling + 1),
    emptiedAt: years.find((y) => y.rrsp < 1_000),
    paused: years.filter((y) => y.year > retiredFrom && y.ceiling !== null && y.income < y.ceiling * 0.98 && y.rrsp >= 1_000 && y.gis > 0),
  }
}

// The lines the panel draws, built here so that what is tested is what is drawn.

/** The income, and — for a way that melts — the line it is held to. `choice` null is « no meltdown »: only the income. */
export function fillIncomeSeries(years: readonly FillYear[], choice: FillOutcome['choice'], labels: { income: string; line: string }): ChartSeries[] {
  return [
    { id: 'income', label: labels.income, colour: seriesFor('impot', 'mid'), concept: 'impot', points: years.map((y) => ({ x: y.year, y: y.income })) },
    ...(choice === null ? [] : [{ id: 'line', label: labels.line, colour: seriesFor('tranche'), concept: 'tranche' as const, points: years.map((y) => ({ x: y.year, y: y.ceiling ?? 0 })) }]),
  ]
}

/** What is left in the RRSP and in the TFSA, year by year. */
export function fillBalanceSeries(years: readonly FillYear[], labels: { rrsp: string; tfsa: string }): ChartSeries[] {
  return [
    { id: 'rrsp', label: labels.rrsp, colour: seriesFor('reer'), concept: 'reer', points: years.map((y) => ({ x: y.year, y: y.rrsp })) },
    { id: 'tfsa', label: labels.tfsa, colour: seriesFor('celi', 'mid'), concept: 'celi', points: years.map((y) => ({ x: y.year, y: y.tfsa })) },
  ]
}
