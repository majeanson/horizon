import type { ChartMarker, ChartSeries, StackedBarDatum } from '../components/charts/types.ts'

// WHAT EVERY PICTURE THE APP DRAWS MUST SATISFY, ONE FUNCTION FOR ALL OF THEM. The pictures are built in several places (the main chart, the melt panel, the bridge panel, the flow bars); each was
// checked for the numbers it holds, none for its SHAPE. A series whose years go back, a legend with two lines of the same name, a marker on a year the axis does not reach, a colour used twice: none of
// them is a wrong number, and every one of them draws a wrong picture. These return what is wrong with a picture (empty when nothing is), for a test to hold every builder to.

const finite = (x: number) => Number.isFinite(x)

/** What is wrong with a set of lines and the markers drawn on them. */
export function seriesProblems(series: readonly ChartSeries[], markers: readonly ChartMarker[] = []): string[] {
  const out: string[] = []
  if (series.length === 0) return ['no series']
  const ids = series.map((s) => s.id)
  if (new Set(ids).size !== ids.length) out.push(`two series share an id: ${ids.join(', ')}`)
  const labels = series.map((s) => s.label)
  if (new Set(labels).size !== labels.length) out.push(`two series share a label (the legend would read the same twice): ${labels.join(', ')}`)
  const colours = series.map((s) => s.colour)
  if (new Set(colours).size !== colours.length) out.push(`two series share a colour: ${colours.join(', ')}`)
  for (const s of series) {
    if (s.label.trim() === '') out.push(`${s.id}: an empty label`)
    if (s.points.length === 0) out.push(`${s.id}: no points`)
    s.points.forEach((p, i) => {
      if (!finite(p.x) || !finite(p.y)) out.push(`${s.id}: point ${i} is (${p.x}, ${p.y})`)
      if (i > 0 && !(p.x > s.points[i - 1].x)) out.push(`${s.id}: x does not rise at point ${i} (${s.points[i - 1].x} then ${p.x})`)
    })
  }
  const xs = series.flatMap((s) => s.points.map((p) => p.x))
  if (xs.length > 0) {
    const [lo, hi] = [Math.min(...xs), Math.max(...xs)]
    for (const m of markers) if (!finite(m.x) || m.x < lo || m.x > hi) out.push(`marker « ${m.label} » at ${m.x} is off the axis (${lo} to ${hi})`)
  }
  const named = markers.map((m) => `${m.x}|${m.label}`)
  if (new Set(named).size !== named.length) out.push('two identical markers')
  return out
}

/** What is wrong with a stacked bar chart: years that rise, every segment a finite, non-negative figure, the line (when there is one) a finite figure. */
export function barProblems(data: readonly StackedBarDatum[], segments: readonly string[], line?: string, markers: readonly ChartMarker[] = []): string[] {
  const out: string[] = []
  if (data.length === 0) return ['no bars']
  if (new Set(segments).size !== segments.length) out.push(`two segments share an id: ${segments.join(', ')}`)
  data.forEach((d, i) => {
    if (!finite(d.x)) out.push(`bar ${i}: x is ${d.x}`)
    if (i > 0 && !(d.x > data[i - 1].x)) out.push(`bar ${i}: x does not rise (${data[i - 1].x} then ${d.x})`)
    for (const s of segments) {
      const v = d[s]
      if (typeof v !== 'number' || !finite(v)) out.push(`bar ${d.x}: segment ${s} is ${v}`)
      else if (v < -0.005) out.push(`bar ${d.x}: segment ${s} is negative (${v})`)
    }
    if (line !== undefined && (typeof d[line] !== 'number' || !finite(d[line]))) out.push(`bar ${d.x}: the line ${line} is ${d[line]}`)
  })
  const xs = data.map((d) => d.x)
  for (const m of markers) if (m.x < xs[0] || m.x > xs[xs.length - 1]) out.push(`marker « ${m.label} » at ${m.x} is off the axis (${xs[0]} to ${xs[xs.length - 1]})`)
  return out
}
