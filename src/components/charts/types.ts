// The chart adapter's own vocabulary. Nothing in here names the chart library: a page builds `ChartSeries` from the
// engine's rows (lib/chartData.ts) and hands them to <LineChart>, and only components/charts/* ever imports the
// library behind it (chartBoundary.test.ts) — so the library can be replaced by editing one folder.

/** The four series colours, as the design tokens they resolve to (never a hex literal: night mode would not follow). */
export type SeriesColour = 'accent' | 'sky' | 'sage' | 'berry' | 'ink' | 'clay' | 'sun' | 'coral'

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
  /** Write the label on the plot beside the line (a short one: « RRQ »). Default: the legend and the table carry it. */
  named?: boolean
}

export interface LineChartProps {
  series: readonly ChartSeries[]
  /** How a y value reads on the axis (short: « 1,2 M$ »). */
  yFormat: (y: number) => string
  /** How a y value reads in the tooltip, where there is room for the exact figure. Defaults to `yFormat`. */
  yDetail?: (y: number) => string
  /** How the tooltip's title reads for an x. */
  xTitle: (x: number) => string
  /** How an x reads on the axis, as up to two lines (« 2043 » over « 63 ans »): a year is always said with its age. Default: the x itself. */
  xTick?: (x: number) => readonly string[]
  markers?: readonly ChartMarker[]
  /** The accessible name: the chart is a picture, and the per-year table beside it is its text. */
  ariaLabel: string
  height?: number
}

/** One year of a stacked bar chart: the x (a year) and one value per segment id. */
export type StackedBarDatum = { x: number } & Record<string, number>

export interface StackedBarChartProps {
  data: readonly StackedBarDatum[]
  /** The segments, bottom to top, each in a colour token. */
  series: readonly Pick<ChartSeries, 'id' | 'label' | 'colour'>[]
  /** One more value per year drawn as a dashed line across the bars (the year's spending plus tax). */
  line?: { id: string; label: string }
  yFormat: (y: number) => string
  yDetail?: (y: number) => string
  xTitle: (x: number) => string
  xTick?: (x: number) => readonly string[]
  markers?: readonly ChartMarker[]
  ariaLabel: string
  height?: number
}
