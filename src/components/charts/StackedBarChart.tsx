import { Bar, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { StackedBarChartProps, SeriesColour } from './types'

// The ONE stacked bar chart: where each year's money comes from — plain bars, one segment per source, in the app's own
// colour tokens. Like the line chart it is a thin adapter: only this folder imports the library, the legend and the
// tooltip's words live in HTML the page's CSS and the text size govern, and it is a PICTURE (role="img" with a name) —
// the per-year table beside it carries the same numbers as text.
//
// `line` draws one more thing across the bars: a single value per year (the page passes the year's spending plus tax), so
// a reader sees at a glance whether the segments reach it (the year is covered) or stop short.

const COLOUR: Record<SeriesColour, string> = {
  accent: 'var(--marigold-deep)',
  sky: 'var(--sky-deep)',
  sage: 'var(--sage-deep)',
  berry: 'var(--berry-deep)',
  ink: 'var(--ink-faint)',
}

export function StackedBarChart({ data, series, line, yFormat, yDetail = yFormat, xTitle, markers = [], ariaLabel, height = 300 }: StackedBarChartProps) {
  return (
    <figure className="chart" role="img" aria-label={ariaLabel}>
      <ul className="chart__legend" aria-hidden="true">
        {series.map((s) => (
          <li key={s.id} className="chart__legend-item">
            <span className="chart__swatch" style={{ background: COLOUR[s.colour] }} />
            {s.label}
          </li>
        ))}
        {line && (
          <li className="chart__legend-item">
            <span className="chart__swatch chart__swatch--line" />
            {line.label}
          </li>
        )}
      </ul>
      <div className="chart__plot" style={{ height }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data as unknown as Record<string, number>[]} margin={{ top: 8, right: 12, bottom: 4, left: 0 }} accessibilityLayer={false}>
            <CartesianGrid stroke="var(--hairline)" vertical={false} />
            <XAxis dataKey="x" type="category" tickLine={false} axisLine={{ stroke: 'var(--line-strong)' }} tick={{ fill: 'var(--ink-soft)', fontSize: 12 }} interval="preserveStartEnd" minTickGap={16} />
            <YAxis width={64} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-soft)', fontSize: 12 }} tickFormatter={(y: number) => yFormat(y)} />
            <Tooltip
              cursor={{ fill: 'var(--hairline)', opacity: 0.5 }}
              content={({ active, label, payload }) =>
                active && payload && payload.length > 0 ? (
                  <div className="chart-tip">
                    <p className="chart-tip__title">{xTitle(Number(label))}</p>
                    {payload
                      .filter((p) => Number(p.value) > 0)
                      .map((p) => (
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
              <ReferenceLine key={`${m.colour}-${m.x}-${m.label}`} x={m.x} stroke={COLOUR[m.colour]} strokeDasharray="4 4" strokeOpacity={0.8} label={m.named ? { value: m.label, position: "insideTopRight", fill: "var(--ink-soft)", fontSize: 11 } : undefined} />
            ))}
            {series.map((s) => (
              <Bar key={s.id} dataKey={s.id} stackId="year" fill={COLOUR[s.colour]} isAnimationActive={false} />
            ))}
            {line && <Line type="monotone" dataKey={line.id} name={line.label} stroke="var(--ink)" strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
