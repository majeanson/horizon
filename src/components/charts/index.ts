// The only door to the chart library. Import from here, never from the library: chartBoundary.test.ts fails the
// build on a `recharts` import anywhere else, so replacing the library means editing this folder and nothing else.
export { LineChart } from './LineChart'
export { StackedBarChart } from './StackedBarChart'
// Only the type a caller outside lib/ still takes from here; lib/ reads the rest straight from ./types (a type-only
// import never pulls the chart library), and knip fails a re-export nobody reads.
export type { SeriesColour } from './types'
