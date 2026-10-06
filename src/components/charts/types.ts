// The chart adapter's own vocabulary. Nothing in here names the chart library: a page builds `ChartSeries` from the
// engine's rows (lib/chartData.ts) and hands them to <LineChart>, and only components/charts/* ever imports the
// library behind it (chartBoundary.test.ts) — so the library can be replaced by editing one folder.

/** The four series colours, as the design tokens they resolve to (never a hex literal: night mode would not follow). */
export type SeriesColour = 'accent' | 'sky' | 'sage' | 'berry'

export interface ChartPoint {
  x: number
  y: number
}

export interface ChartSeries {
  id: string
  label: string
  colour: SeriesColour
  points: readonly ChartPoint[]
}

/** A vertical line at one x, in a series' colour: « the year this scenario retires ». */
export interface ChartMarker {
  x: number
  label: string
  colour: SeriesColour
}

export interface LineChartProps {
  series: readonly ChartSeries[]
  /** How a y value reads on the axis (short: « 1,2 M$ »). */
  yFormat: (y: number) => string
  /** How a y value reads in the tooltip, where there is room for the exact figure. Defaults to `yFormat`. */
  yDetail?: (y: number) => string
  /** How the tooltip's title reads for an x. */
  xTitle: (x: number) => string
  markers?: readonly ChartMarker[]
  /** The accessible name: the chart is a picture, and the per-year table beside it is its text. */
  ariaLabel: string
  height?: number
}
