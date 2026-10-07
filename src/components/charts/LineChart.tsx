import { CartesianGrid, Line, LineChart as RLineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { ChartSeries, LineChartProps, SeriesColour } from './types'

// The ONE line chart. A thin adapter over the chart library: it takes plain series, draws them in the app's own
// colours, and keeps everything a reader can misread — the legend, the units, the tooltip's words — in HTML that
// the page's CSS and the person's text size already govern, rather than inside the SVG.
//
// It is a PICTURE: role="img" with an accessible name, and the per-year table next to it carries the same
// numbers as text. Colours are CSS variables (`var(--sky-deep)`), so day, night and high contrast all follow.

const COLOUR: Record<SeriesColour, string> = {
  accent: 'var(--marigold-deep)',
  sky: 'var(--sky-deep)',
  sage: 'var(--sage-deep)',
  berry: 'var(--berry-deep)',
  ink: 'var(--ink-faint)',
}

// One dash pattern per series position (undefined = solid, for the first).
const DASHES: (string | undefined)[] = [undefined, '7 3', '2 3', '9 3 2 3']

// One row per x, one key per series: the shape the library wants, built from series that may start and stop apart.
function merge(series: readonly ChartSeries[]): Record<string, number>[] {
  const byX = new Map<number, Record<string, number>>()
  for (const s of series) {
    for (const p of s.points) {
      const row = byX.get(p.x) ?? { x: p.x }
      row[s.id] = p.y
      byX.set(p.x, row)
    }
  }
  return [...byX.values()].sort((a, b) => a.x - b.x)
}

export function LineChart({ series, yFormat, yDetail = yFormat, xTitle, markers = [], ariaLabel, height = 300 }: LineChartProps) {
  const data = merge(series)
  return (
    <figure className="chart" role="img" aria-label={ariaLabel}>
      <ul className="chart__legend" aria-hidden="true">
        {series.map((s) => (
          <li key={s.id} className="chart__legend-item">
            <span className="chart__swatch" style={{ background: COLOUR[s.colour] }} />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="chart__plot" style={{ height }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          {/* accessibilityLayer is OFF on purpose: it makes the SVG focusable, and the plot is aria-hidden (a picture — its
              text is the per-year table), so a focusable node inside it is an axe « aria-hidden-focus » violation. */}
          <RLineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }} accessibilityLayer={false}>
            <CartesianGrid stroke="var(--hairline)" vertical={false} />
            <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tickLine={false} axisLine={{ stroke: 'var(--line-strong)' }} tick={{ fill: 'var(--ink-soft)', fontSize: '0.78rem' }} tickFormatter={(x: number) => String(x)} minTickGap={24} />
            <YAxis width={64} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-soft)', fontSize: '0.78rem' }} tickFormatter={(y: number) => yFormat(y)} />
            <Tooltip
              cursor={{ stroke: 'var(--ink-faint)', strokeDasharray: '3 3' }}
              content={({ active, label, payload }) =>
                active && payload && payload.length > 0 ? (
                  <div className="chart-tip">
                    <p className="chart-tip__title">{xTitle(Number(label))}</p>
                    {payload.map((p) => (
                      <p key={String(p.dataKey)} className="chart-tip__row">
                        <span className="chart__swatch" style={{ background: String(p.color) }} />
                        {series.find((s) => s.id === p.dataKey)?.label}: <strong>{yDetail(Number(p.value))}</strong>
                      </p>
                    ))}
                  </div>
                ) : null
              }
            />
            {markers.map((m) => (
              <ReferenceLine
                key={`${m.colour}-${m.x}-${m.label}`}
                x={m.x}
                stroke={COLOUR[m.colour]}
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                // A marker that asks for it (`named`: « RRQ », « PSV ») names itself on the plot; the results chart's
                // markers are carried by its legend and table instead.
                label={m.named ? { value: m.label, position: 'insideTopRight', fill: 'var(--ink-soft)', fontSize: '0.78rem' } : undefined}
              />
            ))}
            {series.map((s, i) => (
              // Colour is never the ONLY difference between lines: from the second series on,
              // each wears its own dash pattern, so « 60 vs 65 » survives colour-blindness and
              // greyscale print at zero cost. The first (the reader's own plan) stays solid.
              <Line key={s.id} type="monotone" dataKey={s.id} stroke={COLOUR[s.colour]} strokeWidth={2.5} strokeDasharray={DASHES[i % DASHES.length]} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
            ))}
          </RLineChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
