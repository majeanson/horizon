import { lazy, Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { BridgeLevers, BridgeSummary, BridgeView, StrategyKey } from '../../engine/bridge'
import { leversFor, profileLevers, strategyKeysFor } from '../../engine/bridge'
import type { Assumptions, Household, PersonId } from '../../engine/types'
import { useLang } from '../../i18n'
import { BRIDGE_COPY, type BridgeCopy } from '../../lib/bridgeCopy'
import { startMarkers } from '../../lib/chartMarks'
import {
  SEGMENT_COLOUR,
  SEGMENT_CONCEPT,
  SEGMENTS,
  barRows,
  bridgeLines,
  bridgeQuery,
  parseBridgeParams,
  shownPlan,
  strategyMoves,
  windowRows,
  type BridgeParams,
  type BridgeWindow,
} from '../../lib/bridgeModel'
import { formatPct } from '../../lib/format'
import { formatCompactMoney, formatMoney } from '../../lib/money'
import { withStartAges, type StartMove } from '../../lib/profileEdit'
import { updateProfile } from '../../lib/store'
import { useBridge, useBridgeMatrix } from '../../lib/useBridge'
import { useDeathSweep } from '../../lib/useDeathSweep'
import { useParamChoice } from '../../lib/useParamChoice'
import { Chip } from '../Chip'
import { Cluster } from '../Layout'
import { Fold } from '../Fold'
import { SkeletonStatus } from '../Skeleton'
import { SkeletonFill, SkeletonGhost, SkeletonText } from '../SkeletonShapes'
import { DeathSweepPanel } from './DeathSweepPanel'
import { StrategyViews, type StrategyLayout } from './StrategyViews'
import { StatusMessage } from '../StatusMessage'
import { SubTabs } from '../SubTabs'

// « Mes années 60 à 70 » — the strategy view. For the person looked at: the plan year by year across the bridge years
// (what the household spends, what the guaranteed pensions pay, what the nest has to cover and from which account, the tax,
// what is left), the three levers that decide it (retirement age, QPP start, OAS start), and five named ways of starting the
// pensions side by side with a plain-language verdict each — and, on each card, whether that way lasts under each of the
// three scenarios (the former « matrix », folded into the cards it qualified). Every choice lives in the address bar
// (lib/bridgeModel.ts); the arithmetic is engine/bridge.ts, run in a worker (lib/useBridge.ts). The picture is optional:
// the table below it carries the same numbers as text.

const LineChart = lazy(() => import('../charts').then((m) => ({ default: m.LineChart })))
const StackedBarChart = lazy(() => import('../charts').then((m) => ({ default: m.StackedBarChart })))

const STATUS_MARK = { covered: '✓', drawing: '↓', short: '!' } as const

// What the last card tap wrote into the profile, kept so the line under the cards can say it
// happened — a card looks like a view toggle, but it IS a profile edit — and take it back.
interface AppliedChange {
  id: PersonId
  prevRrq: number
  prevOas: number
  prevBoth: boolean
  rrq: number
  oas: number
  both: boolean
  /** Every person whose ages the tap wrote (with « both », the other person too), to take each back. */
  moves: StartMove[]
}

function BridgeCharts({ view, span, household, params, copy }: { view: BridgeView; span: BridgeWindow; household: Household; params: BridgeParams; copy: BridgeCopy }) {
  const { lang } = useLang()
  const person = household.persons.find((p) => p.id === params.levers.id) ?? household.persons[0]
  const rows = windowRows(view.selected.rows, span)
  const bars = barRows(rows)
  const yearOf = (age: number) => person.birth.year + age
  const first = rows[0]?.age ?? 0
  const last = rows[rows.length - 1]?.age ?? 0
  const inWindow = (age: number) => age >= first && age <= last
  // The same four lines twice: the nest over the window (what the bridge costs), and what the pensions PAY a year over the rest of the plan (what waiting buys).
  const lines = (of: 'total' | 'guaranteed') => bridgeLines(view, of, { first, last }, { selected: copy.selectedName, asap: copy.strategyName.asap, standard: copy.strategyName.standard, max: copy.strategyName.max })
  const nestSeries = lines('total')
  // One marker per start age; when both pensions start the same year they share one line and one label.
  const starts = (at: (age: number) => number) => startMarkers({ rrq: params.levers.rrqStartAge, oas: params.levers.oasStartAge }, inWindow, { rrq: copy.markerRrq, oas: copy.markerOas }, at)
  const markers = starts(yearOf)
  const barMarkers = starts((age) => age)
  // Both pictures say the year AND the age on their axis, the same way round: the bars are keyed by age, the lines by year.
  const ageTick = (age: number) => [copy.age(age), String(yearOf(age))]
  const yearTick = (year: number) => [String(year), copy.age(year - person.birth.year)]
  if (rows.length === 0) return null
  return (
    <div className="bridge__charts">
      <h3 className="bridge__heading">{copy.barsTitle}</h3>
      <p className="field-row__hint">{copy.barsHint}</p>
      <div className="chart-slot">
        <Suspense fallback={<SkeletonFill />}>
          <StackedBarChart
            data={bars}
            series={SEGMENTS.map((id) => ({ id, label: id === 'work' && rows.some((r) => r.dated > 0) ? copy.segment.workOther : copy.segment[id], colour: SEGMENT_COLOUR[id], concept: SEGMENT_CONCEPT[id] }))}
            line={{ id: 'need', label: copy.needLine }}
            yFormat={(y) => formatCompactMoney(y, lang)}
            yDetail={(y) => formatMoney(y, lang)}
            xTitle={(age) => copy.tooltip(age, yearOf(age))}
            xTick={ageTick}
            markers={barMarkers}
            ariaLabel={copy.barsFigure(first, last)}
          />
        </Suspense>
      </div>
      <h3 className="bridge__heading">{copy.nestTitle}</h3>
      <p className="field-row__hint">{copy.nestHint(params.levers.rrqStartAge, params.levers.oasStartAge)}</p>
      <div className="chart-slot">
        <Suspense fallback={<SkeletonFill />}>
          <LineChart
            series={nestSeries}
            markers={markers}
            yFormat={(y) => formatCompactMoney(y, lang)}
            yDetail={(y) => formatMoney(y, lang)}
            xTitle={(year) => copy.tooltip(year - person.birth.year, year)}
            xTick={yearTick}
            ariaLabel={copy.nestFigure(first, last)}
          />
        </Suspense>
      </div>
      <h3 className="bridge__heading">{copy.incomeTitle}</h3>
      <p className="field-row__hint">{copy.incomeHint}</p>
      <div className="chart-slot">
        <Suspense fallback={<SkeletonFill />}>
          <LineChart
            series={lines('guaranteed')}
            markers={markers}
            yFormat={(y) => formatCompactMoney(y, lang)}
            yDetail={(y) => formatMoney(y, lang)}
            xTitle={(year) => copy.tooltip(year - person.birth.year, year)}
            xTick={yearTick}
            ariaLabel={copy.incomeFigure(first, rows.length > 0 ? Math.max(...view.selected.rows.map((r) => r.age)) : last)}
          />
        </Suspense>
      </div>
    </div>
  )
}

function YearTable({ view, span, levers, copy }: { view: BridgeView; span: BridgeWindow; levers: BridgeLevers; copy: BridgeCopy }) {
  const { lang } = useLang()
  const rows = windowRows(view.selected.rows, span)
  const money = (n: number) => formatMoney(n, lang)
  // A column that is zero in every year shown (no pay after retirement, no GIS) is left out: fewer columns, same facts.
  const some = (f: (r: (typeof rows)[number]) => number) => rows.some((r) => f(r) > 0.5)
  const showWork = some((r) => r.employment)
  const showDb = some((r) => r.db)
  const showRrq = some((r) => r.rrq)
  const showOas = some((r) => r.oas)
  const showGis = some((r) => r.gis)
  const showNonReg = some((r) => r.draws.nonReg)
  const showRrsp = some((r) => r.draws.rrsp)
  const showTfsa = some((r) => r.draws.tfsa)
  return (
    <div className="table-wrap table-wrap--pinned bridge__table" role="region" aria-label={copy.tableTitle} tabIndex={0}>
      <table>
        <caption className="sensitivity__caption">{copy.tableTitle}</caption>
        <thead>
          <tr>
            <th scope="col">{copy.colAge}</th>
            <th scope="col">{copy.colNeed}</th>
            {showWork && <th scope="col">{rows.some((r) => r.dated > 0) ? copy.colWorkOther : copy.colWork}</th>}
            {showDb && <th scope="col">{copy.colDb}</th>}
            {showRrq && <th scope="col">{copy.colRrq}</th>}
            {showOas && <th scope="col">{copy.colOas}</th>}
            {showGis && <th scope="col">{copy.colGis}</th>}
            <th scope="col">{copy.colDraw}</th>
            {showNonReg && <th scope="col">{copy.colNonReg}</th>}
            {showRrsp && <th scope="col">{copy.colRrsp}</th>}
            {showTfsa && <th scope="col">{copy.colTfsa}</th>}
            <th scope="col">{copy.colTax}</th>
            <th scope="col">{copy.colNest}</th>
            <th scope="col">{copy.colStatus}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.year} className={r.status === 'short' ? 'is-short' : r.status === 'covered' ? 'bridge__row--covered' : undefined}>
              <th scope="row">
                {r.age}
                {r.age === levers.rrqStartAge && <span className="mono bridge__tag"> {copy.markerRrq}</span>}
                {r.age === levers.oasStartAge && <span className="mono bridge__tag"> {copy.markerOas}</span>}
                <span className="mono bridge__year"> {r.year}</span>
              </th>
              <td>{money(r.spending)}</td>
              {showWork && <td>{money(r.employment)}</td>}
              {showDb && <td>{money(r.db)}</td>}
              {showRrq && <td>{money(r.rrq)}</td>}
              {showOas && <td>{money(r.oas)}</td>}
              {showGis && <td>{money(r.gis)}</td>}
              <td>{money(r.drawn)}</td>
              {showNonReg && <td>{money(r.draws.nonReg)}</td>}
              {showRrsp && <td>{money(r.draws.rrsp)}</td>}
              {showTfsa && <td>{money(r.draws.tfsa)}</td>}
              <td>{money(r.tax)}</td>
              <td>{money(r.nest.total)}</td>
              <td>
                <span aria-hidden="true">{STATUS_MARK[r.status]} </span>
                {copy.status[r.status]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}


export function BridgePanel({ household, assumptions, names }: { household: Household; assumptions: Assumptions; names: readonly string[] }) {
  const { lang } = useLang()
  const copy = BRIDGE_COPY[lang]
  const [params, setParams] = useSearchParams()
  const state = useMemo(() => parseBridgeParams(params, household), [params, household])
  const { levers } = state
  const { value: view, busy } = useBridge(household, assumptions, levers)
  // The three scenarios per strategy: fifteen more projections, started once the page is idle, marked on the cards as they land.
  // While it is being worked out again (a strategy picked, a figure changed) the last one is NOT the answer: shown as pending, never as final dots beside
  // fresh cards — `sturdiest` mixing the new summaries with the old cells could crown a way from the previous ages — and the death sweep waits for it.
  const { value: matrixValue, busy: matrixBusy } = useBridgeMatrix(household, assumptions, levers)
  const matrix = matrixBusy ? null : matrixValue
  // Four views of the one question « when do I start my pensions? », one on screen at a time (they were four blocks stacked: the charts, the ways, a short life, the reasons). The address keeps it (`?bv=`).
  const VIEWS = ['ways', 'years', 'death', 'why'] as const
  const [bridgeView, setBridgeView] = useParamChoice('bv', VIEWS, 'ways')
  // « Et si l'un de nous décède plus tôt ? »: thirty projections — asked only when that view is open, and after the cards' scenarios are in.
  const sweep = useDeathSweep(household, assumptions, levers, matrix !== null && bridgeView === 'death')
  const ownerName = names[Math.max(0, household.persons.findIndex((p) => p.id === levers.id))] ?? ''
  // The ages under « dure jusqu'à » are this person's; in a couple that is not the youngest, so the verdict names them.
  const who = household.persons.length > 1 ? ownerName : null

  // Every change is built from the address bar as it is NOW (like the comparison chips): two quick taps must compose.
  const write = (next: BridgeParams) => {
    const base = new URLSearchParams(window.location.search)
    for (const [k, v] of Object.entries(bridgeQuery(next, household))) {
      if (v === null) base.delete(k)
      else base.set(k, v)
    }
    setParams(base, { replace: true })
  }
  // The ages are the PROFILE's (« Mes chiffres » and Profil edit the same ones): only the other-person toggle and the window live in the address.
  const change = (patch: Partial<Pick<BridgeLevers, 'both'>>, win?: BridgeWindow) => {
    const cur = parseBridgeParams(new URLSearchParams(window.location.search), household)
    write({ levers: { ...cur.levers, ...patch }, window: win ?? cur.window })
  }
  // `bt=cards|table`: how the ways of starting are compared. Absent: the screen's width chooses (StrategyViews).
  const askedLayout = params.get('bt')
  const layout: StrategyLayout | null = askedLayout === 'cards' || askedLayout === 'table' ? askedLayout : null
  const setLayout = (next: StrategyLayout | null) => {
    const base = new URLSearchParams(window.location.search)
    if (next === null) base.delete('bt')
    else base.set('bt', next)
    setParams(base, { replace: true })
  }
  const [applied, setApplied] = useState<AppliedChange | null>(null)
  const pickPerson = (id: PersonId) => {
    setApplied(null)
    write({ levers: profileLevers(household, id), window: parseBridgeParams(new URLSearchParams(window.location.search), household).window })
  }
  const apply = (key: StrategyKey) => {
    const cur = parseBridgeParams(new URLSearchParams(window.location.search), household).levers
    const picked = strategyMoves(key, household, assumptions, cur)
    if (picked === null) return // a way no longer open: its card compares, it never stores a start the person can no longer take
    const { levers: l, moves } = picked
    updateProfile((p) => withStartAges(p, moves))
    change({ both: l.both === true })
    // A card tap edits the stored profile (the house rule: the ages live in ONE place). The part a
    // comparison control must not do silently is the edit — so remember what changed, say so, and
    // keep a way back on screen until the next tap.
    const next: AppliedChange = { id: cur.id, prevRrq: cur.rrqStartAge, prevOas: cur.oasStartAge, prevBoth: cur.both === true, rrq: l.rrqStartAge, oas: l.oasStartAge, both: l.both === true, moves }
    // Nothing to say only when NO ONE's ages moved (with « both », the other person's can move while this one's stay).
    setApplied(moves.every((m) => m.rrq === m.prevRrq && m.oas === m.prevOas) && next.both === next.prevBoth ? null : next)
  }
  const undoApply = () => {
    if (applied === null) return
    const a = applied
    updateProfile((p) => withStartAges(p, a.moves, true))
    change({ both: a.prevBoth })
    setApplied(null)
  }

  // Everything below the controls describes the levers the data was computed FOR (lib/bridgeModel.ts, shownPlan).
  const { shown, pressed, endAge, verdict } = shownPlan(view, levers, household, assumptions.horizonAge)
  const standard = view?.strategies.find((s) => s.key === 'standard')
  const mineStrategy = view?.strategies.find((s) => s.key === 'mine')
  // When the person's own start ages ARE the standard, the standard's row says so and « Mon plan » is not shown twice.
  const mineIsStandard = standard !== undefined && mineStrategy !== undefined && mineStrategy.levers.rrqStartAge === standard.levers.rrqStartAge && mineStrategy.levers.oasStartAge === standard.levers.oasStartAge
  const windowShown: BridgeWindow = view && windowRows(view.selected.rows, state.window).length === 0 ? 'plan' : state.window
  const money = (n: number) => formatMoney(n, lang)

  return (
    <div className="bridge" aria-busy={busy}>
      <p className="field-row__hint">{copy.hint}</p>
      {busy && view !== null && (
        <p className="bridge__updating" role="status">
          {copy.updating}
        </p>
      )}
      {household.persons.length > 1 && (
        <SubTabs ariaLabel={copy.person} value={levers.id} onSelect={pickPerson} options={household.persons.map((p, i) => ({ key: p.id, label: names[i] ?? '', who: Math.min(i, 1) as 0 | 1 }))} />
      )}

      <div className={'bridge__levers' + (household.persons.length > 1 ? ` who who--${Math.min(Math.max(0, household.persons.findIndex((p) => p.id === levers.id)), 1)}` : '')}>
        <p className="field-row__hint">{copy.agesLine(copy.age(levers.retirementAge), copy.age(levers.rrqStartAge), copy.age(levers.oasStartAge))}</p>
        {household.persons.length > 1 && (
          <Cluster>
            <Chip selected={levers.both === true} onClick={() => change({ both: levers.both !== true })}>
              {copy.bothLabel}
            </Chip>
          </Cluster>
        )}
        {household.persons.length > 1 && <p className="field-row__hint">{copy.bothHint}</p>}
      </div>

      {view === null || verdict === null ? (
        // The first answer is seconds away on a phone: the panel waits as a ghost of itself (components/Skeleton.tsx SkeletonGhost) — the verdict's sentence, the
        // views' tabs and the ways of starting drawn by their own components with stand-in figures — so it opens at the size it will have, cards or table.
        <>
          <SkeletonStatus />
          <p className="skeleton__bridge-verdict">
            <SkeletonText>{copy.verdict({ kind: 'holds', defers: false, horizonAge: endAge }, who)}</SkeletonText>
          </p>
          <SkeletonGhost>
            <SubTabs size="mini" ariaLabel={copy.views.label} value={bridgeView} onSelect={() => {}} options={VIEWS.map((key) => ({ key, label: copy.views[key] }))} />
            {bridgeView === 'ways' && (
              <>
                <h3 className="bridge__heading">{copy.strategyTitle}</h3>
                <StrategyViews view={ghostView(household, levers)} pressed={[]} copy={copy} onPick={() => {}} horizonAge={endAge} who={who} matrix={null} layout={layout} onLayout={() => {}} />
              </>
            )}
          </SkeletonGhost>
        </>
      ) : (
        <>
          <p className={'bridge__verdict' + (view.selected.summary.ok ? '' : ' bridge__verdict--short')} aria-live={busy ? 'off' : 'polite'}>
            {copy.verdict(verdict, who)}
          </p>

          <SubTabs
            size="mini"
            ariaLabel={copy.views.label}
            value={bridgeView}
            onSelect={setBridgeView}
            options={[
              { key: 'ways' as const, label: copy.views.ways },
              { key: 'years' as const, label: copy.views.years },
              { key: 'death' as const, label: copy.views.death },
              { key: 'why' as const, label: copy.views.why },
            ]}
          />

          {bridgeView === 'ways' && (
            <>
              <h3 className="bridge__heading">{copy.strategyTitle}</h3>
              {pressed.length === 0 && <p className="field-row__hint">{copy.custom}</p>}
              <StrategyViews view={view} pressed={pressed} copy={copy} onPick={apply} horizonAge={endAge} who={who} matrix={matrix} layout={layout} onLayout={setLayout} />
              {applied !== null && (
                <Cluster className="bridge__applied">
                  <StatusMessage tone="success">
                    {copy.applied({
                      name: household.persons.length > 1 ? (names[Math.max(0, household.persons.findIndex((p) => p.id === applied.id))] ?? null) : null,
                      rrq: copy.age(applied.rrq),
                      oas: copy.age(applied.oas),
                      prevRrq: copy.age(applied.prevRrq),
                      prevOas: copy.age(applied.prevOas),
                      both: applied.both,
                    })}
                  </StatusMessage>
                  <Chip onClick={undoApply}>{copy.appliedUndo}</Chip>
                </Cluster>
              )}
              <Fold summary={copy.howToRead}>
                <p className="field-row__hint">{copy.marksHint(ownerName)}</p>
              </Fold>
              <p className="field-row__hint">{copy.todayNote}</p>
            </>
          )}

          {bridgeView === 'years' && (
            <>
              <div className="bridge__window">
                <SubTabs
                  size="mini"
                  ariaLabel={copy.windowLabel}
                  value={windowShown}
                  onSelect={(w) => change({}, w)}
                  options={[
                    { key: 'bridge', label: copy.windowBridge },
                    { key: 'plan', label: copy.windowPlan },
                  ]}
                />
              </div>
              <BridgeCharts view={view} span={windowShown} household={household} params={{ levers: shown, window: windowShown }} copy={copy} />
              {/* The reference at the end: the year-by-year table. */}
              <YearTable view={view} span={windowShown} levers={shown} copy={copy} />
              <p className="field-row__hint">{copy.householdNote}</p>
            </>
          )}

          {bridgeView === 'death' && (
            <DeathSweepPanel
              sweep={sweep}
              copy={copy}
              who={who}
              couple={household.persons.length > 1}
              hideMine={mineIsStandard}
              label={(k) => (k === 'standard' && mineIsStandard ? copy.standardIsMine : k === 'mine' ? `${copy.strategyName.mine} (${copy.age(levers.retirementAge)})` : copy.strategyName[k])}
            />
          )}

          {bridgeView === 'why' && (
            <>
              <h3 className="bridge__heading">{copy.whyTitle}</h3>
              <ul className="bridge__list">
                <li>{standard && view.selected.summary.drawn6070 - standard.summary.drawn6070 > 50 ? copy.whyCost(money(view.selected.summary.drawn6070 - standard.summary.drawn6070)) : copy.whyCostNone}</li>
                <li>{copy.whyGis(money(view.selected.summary.gisTotal), money(view.selected.summary.oasRecoveryTotal))}</li>
                {copy.why({ rrqPerMonth: formatPct(view.facts.rrqPerMonth, lang, 1), rrqMax: formatPct(view.facts.rrqLateMax, lang, 1), oasPerMonth: formatPct(view.facts.oasPerMonth, lang, 1), oasMax: formatPct(view.facts.oasLateMax, lang, 0), rrqCancel: view.facts.rrqCancelMonths, oasCancel: view.facts.oasCancelMonths }).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>

              <h3 className="bridge__heading">{copy.caveatTitle}</h3>
              <ul className="bridge__list">
                {copy.caveats.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  )
}

/** The ways of starting as the waiting panel draws them: this household's own strategies (their names, their ages), each with the same stand-in figures — the ghost
 *  needs their SHAPE, never their answer. Only `strategies` is read by the views. */
function ghostView(household: Household, levers: BridgeLevers): BridgeView {
  const summary: BridgeSummary = { ok: true, firstShortfallYear: null, firstShortfallAge: null, netWorth85: 600000, netWorth95: 400000, lowestNest: { amount: 250000, age: 66 }, lifetimeAfterTax: 2500000, taxTotal: 400000, gisTotal: 0, oasRecoveryTotal: 0, drawn6070: 300000 }
  const strategies = strategyKeysFor(household).map((key) => ({ key, levers: leversFor(key, household, levers.id, levers.retirementAge), summary, nest: [], extraDrawn6070: 50000, breakEven: 80, breakEvenKind: 'later' as const, passed: false }))
  return { strategies } as unknown as BridgeView
}
