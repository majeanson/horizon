import { lazy, Suspense, useMemo, useState } from 'react'
import type { AgeResult, Assumptions, Household } from '../../engine/types'
import { useLang, useT } from '../../i18n'
import {
  BALANCE_COLOUR,
  BALANCE_SEGMENTS,
  SOURCE_COLOUR,
  SOURCE_SEGMENTS,
  balanceBars,
  chartSeries,
  hypothesisSeries,
  retirementMarkers,
  sourceBars,
  type ChartMetric,
  type Dollars,
} from '../../lib/chartData'
import { formatCompactMoney, formatMoney } from '../../lib/money'
import { scenarioOf, type Selection } from '../../lib/resultsModel'
import { Loading } from '../Loading'
import { SubTabs } from '../SubTabs'

// The picture: the scenarios the person chose, drawn against the years, in one of three views and in today's or
// the year's dollars. Two are single lines (net worth, guaranteed income); the third, « Détail », shows the whole
// picture — where each year's money comes from, what the accounts hold, and the same plan under the three sets of
// hypotheses — for the household or for each person. The chart library arrives in its own chunk (lazy), only when
// this page is opened — it is the largest thing in the app and the first screen never needs it. The per-year table
// below carries the same numbers as text, which is what makes the picture optional for anyone who cannot use it.

const LineChart = lazy(() => import('../charts').then((m) => ({ default: m.LineChart })))
const StackedBarChart = lazy(() => import('../charts').then((m) => ({ default: m.StackedBarChart })))

export function ChartPanel({
  runs,
  household,
  assumptions,
  names,
  todayYear,
  inflation,
  metric,
  dollars,
  onMetric,
  label,
}: {
  runs: readonly { selection: Selection; result: AgeResult }[]
  household: Household
  assumptions: Assumptions
  /** Each person's display name, in household order. */
  names: readonly string[]
  todayYear: number
  inflation: number
  metric: ChartMetric
  dollars: Dollars
  onMetric: (m: ChartMetric) => void
  label: (s: Selection) => string
}) {
  const t = useT()
  const { lang } = useLang()
  const c = t.results.chart
  const detail = metric === 'detail'

  const series = useMemo(() => (metric === 'detail' ? [] : chartSeries(runs, { metric, dollars, todayYear, inflation, label })), [runs, metric, dollars, todayYear, inflation, label])
  const markers = useMemo(() => retirementMarkers(household, runs, label), [household, runs, label])
  const agesByYear = useMemo(() => {
    const map = new Map<number, string>()
    for (const row of runs[0]?.result.rows ?? []) map.set(row.year, Object.values(row.persons).map((p) => p.age).join(' / '))
    return map
  }, [runs])

  const measure = metric === 'income' ? c.income : c.netWorth
  const years = runs[0]?.result.rows
  const scenarioNames = runs.map((r) => label(r.selection)).join(', ')

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
            { key: 'detail', label: c.detail },
          ]}
        />
      </div>
      {detail ? (
        runs.length > 0 && <DetailView runs={runs} household={household} assumptions={assumptions} names={names} todayYear={todayYear} inflation={inflation} dollars={dollars} label={label} agesByYear={agesByYear} />
      ) : (
        <>
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
                  ariaLabel={c.figure(measure, years[0].year, years[years.length - 1].year, scenarioNames)}
                />
              )}
            </Suspense>
          </div>
        </>
      )}
    </section>
  )
}

// « Détail »: one scenario at a time (the pickers appear only when there is a choice), for the whole household or one
// person. The same two pickers are the same shape for one person or two: with one person the « who » row simply has
// nothing to choose, and the person's name still heads the bars in their colour.
function DetailView({
  runs,
  household,
  assumptions,
  names,
  todayYear,
  inflation,
  dollars,
  label,
  agesByYear,
}: {
  runs: readonly { selection: Selection; result: AgeResult }[]
  household: Household
  assumptions: Assumptions
  names: readonly string[]
  todayYear: number
  inflation: number
  dollars: Dollars
  label: (s: Selection) => string
  agesByYear: ReadonlyMap<number, string>
}) {
  const t = useT()
  const { lang } = useLang()
  const c = t.results.chart
  const [pickedRun, setPickedRun] = useState(0)
  const [pickedWho, setPickedWho] = useState<string>('all')
  const run = runs[Math.min(pickedRun, runs.length - 1)]
  const who = household.persons.some((p) => p.id === pickedWho) ? pickedWho : 'all'
  const whoIndex = household.persons.findIndex((p) => p.id === who)
  const scale = useMemo(() => ({ dollars, todayYear, inflation }), [dollars, todayYear, inflation])
  const rows = run.result.rows
  const personId = who === 'all' ? null : who

  const sources = useMemo(() => sourceBars(rows, personId, scale), [rows, personId, scale])
  const balances = useMemo(() => balanceBars(rows, personId, scale), [rows, personId, scale])
  const hypotheses = useMemo(
    () => hypothesisSeries(household, assumptions, scenarioOf(household, run.selection), scale, c.hyp),
    [household, assumptions, run.selection, scale, c.hyp],
  )
  const first = rows[0].year
  const last = rows[rows.length - 1].year
  const xTitle = (x: number) => c.tooltip(x, agesByYear.get(x) ?? '')
  const yFormat = (y: number) => formatCompactMoney(y, lang)
  const yDetail = (y: number) => formatMoney(y, lang)
  const retireMarkers = retirementMarkers(household, [run], label)

  return (
    <div className="chart-detail">
      <p className="field-row__hint">
        {c.detailHint} {dollars === 'today' ? c.todayHint : c.nominalHint}
      </p>
      {runs.length > 1 && (
        <SubTabs size="mini" ariaLabel={c.scenarioPick} value={String(Math.min(pickedRun, runs.length - 1))} onSelect={(k) => setPickedRun(Number(k))} options={runs.map((r, i) => ({ key: String(i), label: label(r.selection) }))} />
      )}
      {household.persons.length > 1 && (
        <SubTabs
          size="mini"
          ariaLabel={c.who}
          value={who}
          onSelect={setPickedWho}
          options={[{ key: 'all', label: c.everyone }, ...household.persons.map((p, i) => ({ key: p.id as string, label: names[i] ?? '' }))]}
        />
      )}
      {/* The same heading shape for one person or two: the person (or « both »), in their colour. */}
      <h3 className={'chart-detail__who who ' + (whoIndex >= 0 ? `who--${Math.min(whoIndex, 1)}` : 'who--all')}>{whoIndex >= 0 ? (names[whoIndex] ?? '') : household.persons.length > 1 ? c.everyone : (names[0] ?? '')}</h3>

      <h4 className="chart-detail__heading">{c.sourcesTitle}</h4>
      <p className="field-row__hint">{personId === null ? `${c.sourcesHint} ${c.needHint}` : c.sourcesHint}</p>
      <div className="chart-slot">
        <Suspense fallback={<Loading />}>
          <StackedBarChart
            data={sources}
            series={SOURCE_SEGMENTS.map((id) => ({ id, label: c.source[id], colour: SOURCE_COLOUR[id] }))}
            line={personId === null ? { id: 'need', label: c.need } : undefined}
            yFormat={yFormat}
            yDetail={yDetail}
            xTitle={xTitle}
            markers={[]}
            ariaLabel={c.sourcesFigure(first, last)}
          />
        </Suspense>
      </div>

      <h4 className="chart-detail__heading">{c.balancesTitle}</h4>
      <p className="field-row__hint">{c.balancesHint}</p>
      <div className="chart-slot">
        <Suspense fallback={<Loading />}>
          <StackedBarChart
            data={balances}
            series={BALANCE_SEGMENTS.map((id) => ({ id, label: c.balance[id], colour: BALANCE_COLOUR[id] }))}
            yFormat={yFormat}
            yDetail={yDetail}
            xTitle={xTitle}
            markers={[]}
            ariaLabel={c.balancesFigure(first, last)}
          />
        </Suspense>
      </div>

      <h4 className="chart-detail__heading">{c.hypTitle}</h4>
      <p className="field-row__hint">{c.hypHint}</p>
      <div className="chart-slot">
        <Suspense fallback={<Loading />}>
          <LineChart series={hypotheses} markers={retireMarkers} yFormat={yFormat} yDetail={yDetail} xTitle={xTitle} ariaLabel={c.hypFigure(first, last)} />
        </Suspense>
      </div>
    </div>
  )
}
