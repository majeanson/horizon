import { useId } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { SERIES_CSS } from './palette'
import { TwoLineTick } from './tick'
import type { ChartSeries, LineChartProps } from './types'
import { ConceptPip } from '../ConceptPip'

// The ONE line chart. A thin adapter over the chart library: it takes plain series, draws them in the app's own
// colours, and keeps everything a reader can misread — the legend, the units, the tooltip's words — in HTML that
// the page's CSS and the person's text size already govern, rather than inside the SVG.
//
// It is a PICTURE: role="img" with an accessible name, and the per-year table next to it carries the same
// numbers as text. Colours are CSS variables (`var(--sky-deep)`), so day, night and high contrast all follow.
//
// The first series — the reader's own plan — stands on a soft wash of its colour (a gradient that fades to nothing at the axis): it gives the eye a body to read the
// height of, and the dashed comparison lines above or beside it stay lines. The wash is decoration (it carries no figure, the tooltip skips it).

const COLOUR = SERIES_CSS

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

// The x a tap landed on. `activeLabel` is absent on a touch tap that came without a move first (nothing was hovered yet): then there is no x, and nothing happens.
function tapped(label: string | number | undefined, onXTap: (x: number) => void): void {
  if (label === undefined) return
  const x = Number(label)
  if (Number.isFinite(x)) onXTap(x)
}

export function LineChart({ series, yFormat, yDetail = yFormat, xTitle, xTick, markers = [], ariaLabel, height = 300, onXTap }: LineChartProps) {
  const data = merge(series)
  const washId = 'wash' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const lead = series[0]
  // A two-line tick (the year, then the age) wants more room under the plot than the library's one-line default.
  const bottom = xTick ? 18 : 4
  return (
    <figure className="chart" role="img" aria-label={ariaLabel}>
      <ul className="chart__legend" aria-hidden="true">
        {series.map((s) => (
          <li key={s.id} className="chart__legend-item">
            <span className="chart__swatch" style={{ background: COLOUR[s.colour] }} />
            {s.concept && <ConceptPip id={s.concept} size="sm" />}
            {s.label}
          </li>
        ))}
      </ul>
      <div className="chart__plot" style={{ height, cursor: onXTap ? 'pointer' : undefined }} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          {/* accessibilityLayer is OFF on purpose: it makes the SVG focusable, and the plot is aria-hidden (a picture — its
              text is the per-year table), so a focusable node inside it is an axe « aria-hidden-focus » violation. */}
          <ComposedChart data={data} margin={{ top: 8, right: 12, bottom, left: 0 }} accessibilityLayer={false} onClick={onXTap ? (state) => tapped(state.activeLabel, onXTap) : undefined}>
            {lead && (
              <defs>
                <linearGradient id={washId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" style={{ stopColor: COLOUR[lead.colour], stopOpacity: 0.26 }} />
                  <stop offset="100%" style={{ stopColor: COLOUR[lead.colour], stopOpacity: 0 }} />
                </linearGradient>
              </defs>
            )}
            <CartesianGrid stroke="var(--hairline)" vertical={false} />
            <XAxis
              dataKey="x"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickLine={false}
              axisLine={{ stroke: 'var(--line-strong)' }}
              tick={xTick ? <TwoLineTick lines={xTick} /> : { fill: 'var(--ink-soft)', fontSize: '0.78rem' }}
              tickFormatter={(x: number) => String(x)}
              minTickGap={xTick ? 40 : 24}
            />
            <YAxis width={64} tickLine={false} axisLine={false} tick={{ fill: 'var(--ink-soft)', fontSize: '0.78rem' }} tickFormatter={(y: number) => yFormat(y)} />
            <Tooltip
              cursor={{ stroke: 'var(--ink-soft)', strokeWidth: 1.5, strokeDasharray: '3 3' }}
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
            {lead && <Area type="monotone" dataKey={lead.id} stroke="none" fill={`url(#${washId})`} tooltipType="none" activeDot={false} isAnimationActive={false} legendType="none" />}
            {series.map((s, i) => (
              // Colour is never the ONLY difference between lines: from the second series on,
              // each wears its own dash pattern, so « 60 vs 65 » survives colour-blindness and
              // greyscale print at zero cost. The first (the reader's own plan) stays solid.
              <Line key={s.id} type="monotone" dataKey={s.id} stroke={COLOUR[s.colour]} strokeWidth={2.5} strokeDasharray={DASHES[i % DASHES.length]} dot={false} activeDot={{ r: 5, stroke: 'var(--card)', strokeWidth: 2 }} isAnimationActive={false} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  )
}
