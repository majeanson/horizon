import { lazy, Suspense, useMemo, useState } from 'react'
import type { YearRow } from '../../engine/types'
import { useLang, useT } from '../../i18n'
import { EXPENSE_COLOUR, EXPENSE_SEGMENTS, SOURCE_SEGMENTS, expenseBars, type ExpenseSegment, type Per, type SourceSegment, type sourceBars } from '../../lib/chartData'
import { formatYearAge } from '../../lib/format'
import { FLOW_COPY } from '../../lib/flowCopy'
import { formatCompactMoney, formatMoney } from '../../lib/money'
import { Loading } from '../Loading'
import { Slider } from '../Slider'

// « Où va l’argent » — the second half of the « Détail » view: the household's money by what it is spent on (the budget, the mortgage, tax, what comes off the pay, what is
// saved), drawn the way the sources are, and a reading of ONE year in words under both. A bar is hard to read on a phone, where there is no hover: the year picker says, in
// plain lines, how much comes in a month and from where, and how much goes out and to what. Both are drawn from the same rows as the sources chart above, and the two agree to
// the cent (lib/flowBars.test.ts). It arrives in its own chunk, with its words (lib/flowCopy.ts): the first screen never needs it.

const StackedBarChart = lazy(() => import('../charts').then((m) => ({ default: m.StackedBarChart })))

type Sources = ReturnType<typeof sourceBars>

export function FlowSection({
  rows,
  sources,
  personId,
  births,
  scale,
  agesByYear,
}: {
  rows: readonly YearRow[]
  /** The sources bars of the chart above, in the same unit (a year or a month). */
  sources: Sources
  /** One person's sources, or null for the household. */
  personId: string | null
  births: readonly number[]
  scale: { dollars: 'today' | 'nominal'; todayYear: number; inflation: number; per: Per }
  agesByYear: ReadonlyMap<number, string>
}) {
  const t = useT()
  const { lang } = useLang()
  const c = t.results.chart
  const f = FLOW_COPY[lang]
  const perMonth = scale.per === 'month'
  const household = personId === null
  const spent = useMemo(() => expenseBars(rows, scale), [rows, scale])
  const first = rows[0].year
  const last = rows[rows.length - 1].year
  const money = (n: number) => formatMoney(n, lang)

  // The segments that exist in this plan: a mortgage only when there is one, « not covered » only in a plan that runs out.
  const present = EXPENSE_SEGMENTS.filter((id) => spent.some((b) => b[id] > 0.005))
  const unmetYears = spent.filter((b) => b.unmet > 0.5).length

  // The year the reading opens on: the first year nobody earns (the first year of living on pensions and savings), else the first year.
  const [picked, setPicked] = useState<number | null>(null)
  const retiredYear = sources.find((b) => b.work < 0.5)?.x ?? first
  const year = Math.min(last, Math.max(first, picked ?? retiredYear))
  const at = Math.max(0, year - first)
  const src = sources[at]
  const out = spent[at]

  const comesIn = SOURCE_SEGMENTS.filter((id) => src[id] > 0.5).sort((a, b) => src[b] - src[a])
  const comesInTotal = SOURCE_SEGMENTS.reduce((s, id) => s + src[id], 0)
  const goesOut = (['living', 'children', 'events', 'mortgage', 'tax', 'deductions', 'saved'] as const).filter((id) => out[id] > 0.5).sort((a, b) => out[b] - out[a])
  const goesOutTotal = goesOut.reduce((s, id) => s + out[id], 0)

  return (
    <>
      {household && (
        <>
          <h4 className="chart-detail__heading">{f.title}</h4>
          <p className="field-row__hint">
            {f.hint}
            {perMonth && <> {f.perMonthHint}</>}
          </p>
          <div className="chart-slot">
            <Suspense fallback={<Loading />}>
              <StackedBarChart
                data={spent}
                series={present.map((id: ExpenseSegment) => ({ id, label: f.segment[id], colour: EXPENSE_COLOUR[id] }))}
                yFormat={(y) => formatCompactMoney(y, lang)}
                yDetail={money}
                xTitle={(x) => c.tooltip(x, agesByYear.get(x) ?? '')}
                xTick={(x) => [String(x), agesByYear.get(x) ?? '']}
                markers={[]}
                ariaLabel={f.figure(first, last, perMonth)}
              />
            </Suspense>
          </div>
          {unmetYears > 0 && <p className="field-row__hint">{f.readout.unmet(money(Math.max(...spent.map((b) => b.unmet))), perMonth)}</p>}
        </>
      )}
      {!household && <p className="field-row__hint">{f.personNote}</p>}

      <div className="flow-readout">
        <h4 className="chart-detail__heading">{f.readout.title}</h4>
        <Suspense fallback={<Loading />}>
          <Slider
            label={f.readout.year}
            value={year}
            min={first}
            max={last}
            step={1}
            valueText={(v) => formatYearAge(v, births, lang)}
            onPreview={setPicked}
            onCommit={setPicked}
            describedBy={undefined}
          />
        </Suspense>
        <p className="field-row__hint">{f.readout.hint}</p>
        <div className="flow-readout__cols">
          <section className="flow-readout__col" aria-label={f.readout.comesIn}>
            <h5 className="flow-readout__title">{f.readout.comesIn}</h5>
            <p className="flow-readout__total mono">{comesIn.length === 0 ? f.readout.none : f.readout.total(money(comesInTotal), perMonth)}</p>
            <dl className="flow-readout__list">
              {comesIn.map((id: SourceSegment) => (
                <div key={id} className="flow-readout__row">
                  <dt>{f.readout.source[id]}</dt>
                  <dd className="mono">{money(src[id])}</dd>
                </div>
              ))}
            </dl>
          </section>
          {household && (
            <section className="flow-readout__col" aria-label={f.readout.goesOut}>
              <h5 className="flow-readout__title">{f.readout.goesOut}</h5>
              <p className="flow-readout__total mono">{goesOut.length === 0 ? f.readout.none : f.readout.total(money(goesOutTotal), perMonth)}</p>
              <dl className="flow-readout__list">
                {goesOut.map((id) => (
                  <div key={id} className="flow-readout__row">
                    <dt>{f.segment[id]}</dt>
                    <dd className="mono">{money(out[id])}</dd>
                  </div>
                ))}
              </dl>
              {out.unmet > 0.5 && <p className="flow-readout__unmet">{f.readout.unmet(money(out.unmet), perMonth)}</p>}
            </section>
          )}
        </div>
      </div>
    </>
  )
}
