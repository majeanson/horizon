import { lazy, Suspense, useMemo } from 'react'
import { useLang, useT } from '../../i18n'
import { chartSeries, retirementMarkers, type Dollars, type Metric } from '../../lib/chartData'
import { formatCompactMoney, formatMoney } from '../../lib/money'
import type { Selection } from '../../lib/resultsModel'
import type { AgeResult, Household } from '../../engine/types'
import { Loading } from '../Loading'
import { SubTabs } from '../SubTabs'

// The picture: the scenarios the person chose, drawn against the years, in one of two measures and in today's or
// the year's dollars. The chart library arrives in its own chunk (lazy), only when this page is opened — it is the
// largest thing in the app and the first screen never needs it. The per-year table below carries the same numbers
// as text, which is what makes the picture optional for anyone who cannot use it.

const LineChart = lazy(() => import('../charts').then((m) => ({ default: m.LineChart })))

export function ChartPanel({
  runs,
  household,
  todayYear,
  inflation,
  metric,
  dollars,
  onMetric,
  onDollars,
  label,
}: {
  runs: readonly { selection: Selection; result: AgeResult }[]
  household: Household
  todayYear: number
  inflation: number
  metric: Metric
  dollars: Dollars
  onMetric: (m: Metric) => void
  onDollars: (d: Dollars) => void
  label: (s: Selection) => string
}) {
  const t = useT()
  const { lang } = useLang()
  const c = t.results.chart

  const series = useMemo(() => chartSeries(runs, { metric, dollars, todayYear, inflation, label }), [runs, metric, dollars, todayYear, inflation, label])
  const markers = useMemo(() => retirementMarkers(household, runs, label), [household, runs, label])
  const agesByYear = useMemo(() => {
    const map = new Map<number, string>()
    for (const row of runs[0]?.result.rows ?? []) map.set(row.year, Object.values(row.persons).map((p) => p.age).join(' / '))
    return map
  }, [runs])

  const measure = metric === 'netWorth' ? c.netWorth : c.income
  const years = runs[0]?.result.rows
  const names = runs.map((r) => label(r.selection)).join(', ')

  return (
    <section className="chart-panel surface" aria-label={c.title}>
      <div className="chart-panel__controls">
        <SubTabs
          size="mini"
          ariaLabel={c.metric}
          value={metric}
          onSelect={onMetric}
          options={[
            { key: 'netWorth', label: c.netWorth },
            { key: 'income', label: c.income },
          ]}
        />
        <SubTabs
          size="mini"
          ariaLabel={c.dollars}
          value={dollars}
          onSelect={onDollars}
          options={[
            { key: 'today', label: c.today },
            { key: 'nominal', label: c.nominal },
          ]}
        />
      </div>
      <p className="field-row__hint">
        {metric === 'netWorth' ? c.netWorthHint : c.incomeHint} {dollars === 'today' ? c.todayHint : c.nominalHint}
        {/* The vertical dashed markers carried no key at all — a reader saw coloured lines and had to guess. */}
        {markers.length > 0 && <> {c.markersHint}</>}
      </p>
      <div className="chart-slot">
        <Suspense fallback={<Loading />}>
          {series.length > 0 && years && (
            <LineChart
              series={series}
              markers={markers}
              yFormat={(y) => formatCompactMoney(y, lang)}
              yDetail={(y) => formatMoney(y, lang)}
              xTitle={(x) => c.tooltip(x, agesByYear.get(x) ?? '')}
              ariaLabel={c.figure(measure, years[0].year, years[years.length - 1].year, names)}
            />
          )}
        </Suspense>
      </div>
    </section>
  )
}
