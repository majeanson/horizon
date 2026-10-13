import { lazy, Suspense } from 'react'
import type { FillChoice, FillOutcome } from '../../engine/bracketFillCompare'
import type { Assumptions, Household } from '../../engine/types'
import { useLang } from '../../i18n'
import { BRACKET_FILL_COPY } from '../../lib/bracketFillCopy'
import { choiceOf, tabOf } from '../../lib/bracketFillNudge'
import { formatCompactMoney, formatMoney } from '../../lib/money'
import { setAssumptions } from '../../lib/profileEdit'
import { updateProfile } from '../../lib/store'
import { useBracketFill } from '../../lib/useBracketFill'
import { useParamChoice } from '../../lib/useParamChoice'
import { Chip } from '../Chip'
import { Fold } from '../Fold'
import { Loading } from '../Loading'
import { Skeleton } from '../Skeleton'
import { SubTabs } from '../SubTabs'

const LineChart = lazy(() => import('../charts').then((m) => ({ default: m.LineChart })))

// « How far to melt down the RRSP? » — the household's plan with no meltdown, drawn up to the top of the first bracket, and drawn up to the OAS recovery line
// (engine/bracketFillCompare.ts), one tab each. Read top to bottom: which way is ahead; the tab and what it does; WHAT IT DOES TO THE PLAN against « no meltdown »
// (the answer, in a sentence, before any chart); the income against the line, with where and why it leaves it; what is left in the RRSP and the TFSA; and the
// three ways side by side. The household's own way is marked; the one on screen can be adopted in a tap. Computed in a worker, behind the first paint.

const TABS = ['none', 'bracket1', 'oas'] as const

/** Money differences under this are « the same »: a sentence about 40 $ is noise. */
const SAME = 500

export function BracketFillPanel({ household, assumptions, firstAge }: { household: Household; assumptions: Assumptions; firstAge: number }) {
  const { lang } = useLang()
  const c = BRACKET_FILL_COPY[lang]
  const [tab, setTab] = useParamChoice('bf', TABS, 'bracket1')
  const { value, busy } = useBracketFill(household, assumptions, firstAge)
  if (value === null) return <Skeleton count={4} />
  const shown = value.outcomes.find((o) => tabOf(o.choice) === tab) ?? value.outcomes[0]
  const off = value.outcomes[0]
  const own = value.outcomes[value.current]
  const best = value.outcomes[value.best]
  const name = (choice: FillChoice) => c.names[tabOf(choice)]
  const adopt = (choice: FillChoice) => updateProfile((p) => setAssumptions(p, { bracketFill: choice }))
  const birthYear = household.persons[0].birth.year
  // From the first retired year: before it there is pay, nothing is melted, and a line drawn there would only confuse.
  const years = shown.years.filter((y) => y.year >= value.retiredFrom)
  const first = years[0]?.age ?? 0
  const last = years[years.length - 1]?.age ?? 0
  const money = (y: number) => formatCompactMoney(y, lang)
  const detail = (y: number) => formatMoney(y, lang)
  const yearTick = (year: number) => [String(year), c.age(year - birthYear)]

  // What the way on screen does to the plan, against no meltdown — said before any chart.
  const taxDiff = shown.lifetimeTax - off.lifetimeTax
  const tfsaDiff = shown.tfsaLeft - off.tfsaLeft
  const peakDiff = shown.peakMinimum - off.peakMinimum
  const effect =
    shown.choice === null
      ? null
      : c.effect({
          tax: Math.abs(taxDiff) < SAME ? null : formatMoney(Math.abs(taxDiff), lang),
          taxLess: taxDiff < 0,
          peak: Math.max(shown.peakMinimum, off.peakMinimum) < SAME ? null : { now: formatMoney(shown.peakMinimum, lang), off: formatMoney(off.peakMinimum, lang), smaller: peakDiff <= 0 },
          tfsa: Math.abs(tfsaDiff) < SAME ? null : { diff: formatMoney(Math.abs(tfsaDiff), lang), more: tfsaDiff >= 0 },
          pays: Math.abs(taxDiff) < SAME ? null : taxDiff < 0,
        })

  // Where the income leaves the line (the pensions and the forced minimum, which nobody chooses) — said under the chart and marked on it.
  const leftAt = shown.choice === null ? undefined : years.find((y) => y.ceiling !== null && y.income > y.ceiling + 1)
  const markers = leftAt ? [{ x: leftAt.year, label: c.markerForced, colour: 'accent' as const, named: true }] : []
  // The two reasons income can sit BELOW the line while the RRSP is not yet used up: the RRSP is empty, or the GIS is paid (melting stops, so as not to lose it).
  const emptiedAt = shown.choice === null ? undefined : years.find((y) => y.rrsp < 1_000)
  const paused = shown.choice === null ? [] : years.filter((y) => y.year > value.retiredFrom && y.ceiling !== null && y.income < y.ceiling * 0.98 && y.rrsp >= 1_000 && y.gis > 0)
  const pausedFrom = paused[0]?.year
  const pausedTo = paused[paused.length - 1]?.year

  return (
    <div className="orders" aria-busy={busy}>
      <p className="field-row__hint">{c.hint(value.age)}</p>
      {busy && (
        <p className="bridge__updating" role="status">
          {c.updating}
        </p>
      )}
      <p className="answer__note" aria-live={busy ? 'off' : 'polite'}>
        {value.best === value.current ? c.keep : c.better(name(best.choice), best.earliestOk, own.earliestOk, formatMoney(own.lifetimeTax - best.lifetimeTax, lang))}
      </p>

      <SubTabs size="mini" ariaLabel={c.switchLabel} value={tab} onSelect={setTab} options={TABS.map((k) => ({ key: k, label: c.tabs[k], ariaLabel: c.names[k] }))} />
      <p className="field-row__hint">{c.line[tab]}</p>
      {effect !== null && (
        <p className="verdict__note" aria-live="polite">
          {effect}
        </p>
      )}
      <p className="field-row__hint">
        {c.current(name(own.choice))}{' '}
        {tab !== tabOf(own.choice) && (
          <Chip onClick={() => adopt(choiceOf(tab))} ariaLabel={`${c.use} — ${c.names[tab]}`}>
            {c.use}
          </Chip>
        )}
      </p>

      <h3 className="bridge__heading">{c.incomeTitle}</h3>
      <p className="field-row__hint">{c.incomeHint}</p>
      <div className="chart-slot">
        <Suspense fallback={<Loading />}>
          <LineChart
            series={[
              { id: 'income', label: c.seriesIncome, colour: 'accent' as const, points: years.map((y) => ({ x: y.year, y: y.income })) },
              ...(shown.choice === null ? [] : [{ id: 'line', label: c.seriesLine, colour: 'berry' as const, points: years.map((y) => ({ x: y.year, y: y.ceiling ?? 0 })) }]),
            ]}
            markers={markers}
            yFormat={money}
            yDetail={detail}
            xTitle={(year) => c.tooltip(year - birthYear, year)}
            xTick={yearTick}
            ariaLabel={c.incomeFigure(first, last)}
          />
        </Suspense>
      </div>
      {shown.choice !== null && (
        <>
          <p className="field-row__hint">{leftAt ? c.leaves(leftAt.year, leftAt.age) : emptiedAt ? c.emptied(emptiedAt.year, emptiedAt.age) : c.staysUnder}</p>
          {pausedFrom !== undefined && pausedTo !== undefined && <p className="field-row__hint">{c.pausedGis(pausedFrom, pausedTo)}</p>}
        </>
      )}

      <h3 className="bridge__heading">{c.balancesTitle}</h3>
      <p className="field-row__hint">{c.balancesHint}</p>
      <div className="chart-slot">
        <Suspense fallback={<Loading />}>
          <LineChart
            series={[
              { id: 'rrsp', label: c.seriesRrsp, colour: 'sky' as const, points: years.map((y) => ({ x: y.year, y: y.rrsp })) },
              { id: 'tfsa', label: c.seriesTfsa, colour: 'sage' as const, points: years.map((y) => ({ x: y.year, y: y.tfsa })) },
            ]}
            yFormat={money}
            yDetail={detail}
            xTitle={(year) => c.tooltip(year - birthYear, year)}
            xTick={yearTick}
            ariaLabel={c.balancesFigure(first, last)}
          />
        </Suspense>
      </div>

      <div className="table-wrap" role="region" aria-label={c.title} tabIndex={0}>
        <table>
          <thead>
            <tr>
              <th scope="col">{c.way}</th>
              <th scope="col">{c.earliest}</th>
              <th scope="col">{c.tax}</th>
              <th scope="col">{c.recovery}</th>
              <th scope="col">{c.peak}</th>
              <th scope="col">{c.rrspLeft}</th>
            </tr>
          </thead>
          <tbody>
            {value.outcomes.map((x: FillOutcome, i) => (
              <tr key={tabOf(x.choice)} className={i === value.current ? 'is-own' : undefined}>
                <th scope="row">
                  {name(x.choice)}
                  {i === value.current && <span className="projected mono"> {c.yours}</span>}
                  {i === value.best && i !== value.current && <span className="projected mono"> {c.ahead}</span>}
                </th>
                <td>{x.earliestOk === null ? '—' : c.age(x.earliestOk)}</td>
                <td>{formatMoney(x.lifetimeTax, lang)}</td>
                <td>{formatMoney(x.recoveryTotal, lang)}</td>
                <td>{formatMoney(x.peakMinimum, lang)}</td>
                <td>{formatMoney(x.rrspLeft, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Fold summary={c.howTitle}>
        <p className="field-row__hint">{c.how}</p>
      </Fold>
      <p className="answer__note">{c.caveat}</p>
    </div>
  )
}
