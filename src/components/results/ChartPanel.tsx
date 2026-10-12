import { lazy, Suspense, useMemo, useState } from 'react'
import type { AgeResult, Household } from '../../engine/types'
import { useLang, useT } from '../../i18n'
import {
  BALANCE_COLOUR,
  type BalanceBarSegment,
  SOURCE_COLOUR,
  SOURCE_SEGMENTS,
  balanceBars,
  chartSeries,
  retirementMarkers,
  hasDatedIncome,
  idleStretch,
  survivorJump,
  sourceBars,
  type ChartMetric,
  type Dollars,
  type Per,
} from '../../lib/chartData'
import { formatYearAge } from '../../lib/format'
import { formatCompactMoney, formatMoney } from '../../lib/money'
import { RESULTS_COPY } from '../../lib/resultsCopy'
import type { Selection } from '../../lib/resultsModel'
import { Loading } from '../Loading'
import { SubTabs } from '../SubTabs'

// The picture: the retirement ages the person chose, drawn against the years, in one of three views and in today's or
// the year's dollars. Two are single lines (net worth, income without drawing on savings); the third, « Détail », shows
// where each year's money comes from and what the accounts hold — for the household or for each person. (The same plan
// under the three scenarios is NOT drawn here: the answer card already says the three ages, and the strategy cards mark
// each way of starting under each scenario — one more line chart of it was a third way of seeing one figure.) The chart
// library arrives in its own chunk (lazy), only when this page is opened — it is the largest thing in the app and the
// first screen never needs it. The per-year table below carries the same numbers as text, which is what makes the
// picture optional for anyone who cannot use it.

const LineChart = lazy(() => import('../charts').then((m) => ({ default: m.LineChart })))
const StackedBarChart = lazy(() => import('../charts').then((m) => ({ default: m.StackedBarChart })))
// « Où va l'argent » and the year-by-year reading: their own chunk, with their words — the first screen never needs them.
const FlowSection = lazy(() => import('./FlowSection').then((m) => ({ default: m.FlowSection })))

export function ChartPanel({
  runs,
  household,
  names,
  todayYear,
  inflation,
  horizonAge,
  metric,
  dollars,
  onMetric,
  label,
}: {
  runs: readonly { selection: Selection; result: AgeResult }[]
  household: Household
  /** Each person's display name, in household order. */
  names: readonly string[]
  todayYear: number
  inflation: number
  /** The age the plan runs to unless a person set their own: where one person's bars end and the other's jump. */
  horizonAge: number
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
  // The axis says the year AND the age(s): a hover tooltip is the wrong place for the age on a touch screen.
  const xTick = (x: number) => [String(x), agesByYear.get(x) ?? '']

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
        runs.length > 0 && <DetailView runs={runs} household={household} names={names} todayYear={todayYear} inflation={inflation} horizonAge={horizonAge} dollars={dollars} label={label} agesByYear={agesByYear} />
      ) : (
        <>
          <p className="field-row__hint">
            {metric === 'netWorth' ? c.netWorthHint : c.incomeHint}
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
                  xTick={xTick}
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

// « Détail »: one retirement age at a time (the pickers appear only when there is a choice), for the whole household or
// one person. The same two pickers are the same shape for one person or two: with one person the « who » row simply has
// nothing to choose, and the person's name still heads the bars in their colour.
function DetailView({
  runs,
  household,
  names,
  todayYear,
  inflation,
  horizonAge,
  dollars,
  label,
  agesByYear,
}: {
  runs: readonly { selection: Selection; result: AgeResult }[]
  household: Household
  names: readonly string[]
  todayYear: number
  inflation: number
  horizonAge: number
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
  // « Par année » or « Par mois »: the flows (what comes in, what goes out) are said either way; what the accounts hold at year end never is.
  const [per, setPer] = useState<Per>('year')
  const flowScale = useMemo(() => ({ dollars, todayYear, inflation, per }), [dollars, todayYear, inflation, per])
  const rows = run.result.rows
  const personId = who === 'all' ? null : who

  const sources = useMemo(() => sourceBars(rows, personId, flowScale), [rows, personId, flowScale])
  const balances = useMemo(() => balanceBars(rows, personId, scale), [rows, personId, scale])
  // The house's equity is a segment of the household's bars when the plan has a home.
  const balanceSegments: BalanceBarSegment[] = ['rrsp', 'tfsa', 'nonReg']
  if (rows.some((r) => Object.values(r.persons).some((p) => p.rrspLockedEnd > 0))) balanceSegments.splice(1, 0, 'rrspLocked') // right above the free REER
  if (personId === null && rows.some((r) => r.household.homeValueEnd > 0)) balanceSegments.push('home')
  const first = rows[0].year
  const last = rows[rows.length - 1].year
  const xTitle = (x: number) => c.tooltip(x, agesByYear.get(x) ?? '')
  const xTick = (x: number) => [String(x), agesByYear.get(x) ?? '']
  const yFormat = (y: number) => formatCompactMoney(y, lang)
  const yDetail = (y: number) => formatMoney(y, lang)
  // One person's bars can be EMPTY for years (a pension that starts at 70 while the other person's accounts pay): say so, so the gap does not read as missing data.
  const idle = useMemo(() => (personId === null ? null : idleStretch(sources)), [personId, sources])
  const birth = household.persons[whoIndex]?.birth.year
  // When two lives end in different years, the first one's bars stop and the other's jump (their accounts pass over): said on either person's view, so neither reads as a mistake.
  const jump = useMemo(() => (personId === null ? null : survivorJump(household, horizonAge)), [household, horizonAge, personId])
  const goneIndex = jump === null ? -1 : household.persons.findIndex((p) => p.id === jump.goneId)
  const otherIndex = jump === null ? -1 : household.persons.findIndex((p) => p.id === jump.otherId)

  return (
    <div className="chart-detail">
      <p className="field-row__hint">{c.detailHint}</p>
      <SubTabs size="mini" ariaLabel={c.per} value={per} onSelect={setPer} options={[{ key: 'year', label: c.perYear }, { key: 'month', label: c.perMonth }]} />
      {runs.length > 1 && (
        <SubTabs size="mini" ariaLabel={c.scenarioPick} value={String(Math.min(pickedRun, runs.length - 1))} onSelect={(k) => setPickedRun(Number(k))} options={runs.map((r, i) => ({ key: String(i), label: label(r.selection) }))} />
      )}
      {household.persons.length > 1 && (
        <SubTabs
          size="mini"
          ariaLabel={c.who}
          value={who}
          onSelect={setPickedWho}
          options={[{ key: 'all', label: c.everyone }, ...household.persons.map((p, i) => ({ key: p.id as string, label: names[i] ?? '', who: Math.min(i, 1) as 0 | 1 }))]}
        />
      )}
      {/* The same heading shape for one person or two: the person (or « both »), in their colour. */}
      <h3 className={'chart-detail__who who ' + (whoIndex >= 0 ? `who--${Math.min(whoIndex, 1)}` : 'who--all')}>{whoIndex >= 0 ? (names[whoIndex] ?? '') : household.persons.length > 1 ? c.everyone : (names[0] ?? '')}</h3>

      <h4 className="chart-detail__heading">{c.sourcesTitle}</h4>
      <p className="field-row__hint">{personId === null ? `${c.sourcesHint} ${c.needHint}` : c.sourcesHint}</p>
      {jump !== null && goneIndex >= 0 && otherIndex >= 0 && (personId === jump.goneId || personId === jump.otherId) && (
        <p className="field-row__hint">{RESULTS_COPY[lang].lifeEnd(names[goneIndex] ?? '', formatYearAge(jump.lastYear, [household.persons[goneIndex].birth.year], lang), names[otherIndex] ?? '', personId === jump.goneId)}</p>
      )}
      {idle !== null && birth !== undefined && <p className="field-row__hint">{RESULTS_COPY[lang].idle(names[whoIndex] ?? '', formatYearAge(idle.from, [birth], lang), formatYearAge(idle.to, [birth], lang))}</p>}
      <div className="chart-slot">
        <Suspense fallback={<Loading />}>
          <StackedBarChart
            data={sources}
            series={SOURCE_SEGMENTS.map((id) => ({ id, label: id === 'work' && hasDatedIncome(rows) ? c.source.workOther : c.source[id], colour: SOURCE_COLOUR[id] }))}
            line={personId === null ? { id: 'need', label: c.need } : undefined}
            yFormat={yFormat}
            yDetail={yDetail}
            xTitle={xTitle}
            xTick={xTick}
            markers={[]}
            ariaLabel={c.sourcesFigure(first, last)}
          />
        </Suspense>
      </div>

      <Suspense fallback={<Loading />}>
        <FlowSection rows={rows} sources={sources} personId={personId} births={household.persons.map((p) => p.birth.year)} scale={flowScale} agesByYear={agesByYear} />
      </Suspense>

      <h4 className="chart-detail__heading">{c.balancesTitle}</h4>
      <p className="field-row__hint">{c.balancesHint}</p>
      {balanceSegments.includes('home') && <p className="field-row__hint">{c.balancesHomeHint}</p>}
      <div className="chart-slot">
        <Suspense fallback={<Loading />}>
          <StackedBarChart
            data={balances}
            series={balanceSegments.map((id) => ({ id, label: c.balance[id], colour: BALANCE_COLOUR[id] }))}
            yFormat={yFormat}
            yDetail={yDetail}
            xTitle={xTitle}
            xTick={xTick}
            markers={[]}
            ariaLabel={c.balancesFigure(first, last)}
          />
        </Suspense>
      </div>
    </div>
  )
}
