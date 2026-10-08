import { lazy, Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { BridgeLevers, BridgeView, StrategyCard, StrategyKey } from '../../engine/bridge'
import { leversFor, profileLevers, strategyKeysFor } from '../../engine/bridge'
import type { Assumptions, Household, PersonId } from '../../engine/types'
import { useLang, useT } from '../../i18n'
import { BRIDGE_COPY, type BridgeCopy } from '../../lib/bridgeCopy'
import {
  SEGMENT_COLOUR,
  SEGMENTS,
  barRows,
  bridgeQuery,
  parseBridgeParams,
  shownPlan,
  verdictOf,
  windowRows,
  type BridgeParams,
  type BridgeWindow,
} from '../../lib/bridgeModel'
import { formatPct } from '../../lib/format'
import { formatCompactMoney, formatMoney } from '../../lib/money'
import { mapPerson } from '../../lib/profileEdit'
import { updateProfile } from '../../lib/store'
import { useBridge, useBridgeMatrix } from '../../lib/useBridge'
import { Chip } from '../Chip'
import { Cluster } from '../Layout'
import { Loading } from '../Loading'
import { Skeleton } from '../Skeleton'
import { StatusMessage } from '../StatusMessage'
import { SubTabs } from '../SubTabs'

// « Mes années 60 à 70 » — the strategy view. For the person looked at: the plan year by year across the bridge years
// (what the household spends, what the guaranteed pensions pay, what the nest has to cover and from which account, the tax,
// what is left), the three levers that decide it (retirement age, QPP start, OAS start), and five named ways of starting the
// pensions side by side with a plain-language verdict each. Every choice lives in the address bar (lib/bridgeModel.ts); the
// arithmetic is engine/bridge.ts, run in a worker (lib/useBridge.ts). The picture is optional: the table below it carries the
// same numbers as text.

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
}

function StrategyCards({
  view,
  pressed,
  copy,
  onPick,
  horizonAge,
  who,
}: {
  view: BridgeView
  pressed: readonly StrategyKey[]
  copy: BridgeCopy
  onPick: (key: StrategyKey) => void
  horizonAge: number
  /** The person `horizonAge` is counted for, named in a couple; null for a person alone. */
  who: string | null
}) {
  const { lang } = useLang()
  const standard = view.strategies.find((s) => s.key === 'standard')!
  // When the person's own start ages ARE the standard, one card says so instead of two identical ones (and « Mon plan » is never compared with itself).
  const mine = view.strategies.find((s) => s.key === 'mine')!
  const mineIsStandard = mine.levers.rrqStartAge === standard.levers.rrqStartAge && mine.levers.oasStartAge === standard.levers.oasStartAge
  const money = (n: number | null) => (n === null ? copy.noWorth : formatMoney(n, lang))
  const card = (s: StrategyCard) => {
    const v = verdictOf(s.levers, s.summary, standard.summary, horizonAge)
    const extra = s.extraDrawn6070
    return (
      <li key={s.key} className={'bridge-card surface' + (pressed.includes(s.key) ? ' bridge-card--on' : '') + (s.summary.ok ? '' : ' bridge-card--short')}>
        <Chip radio selected={pressed.includes(s.key)} onClick={() => onPick(s.key)}>
          {s.key === 'standard' && mineIsStandard ? copy.standardIsMine : copy.strategyName[s.key]}
        </Chip>
        <p className="bridge-card__line">{copy.strategyLine[s.key]}</p>
        <p className={'bridge-card__verdict' + (s.summary.ok ? '' : ' bridge-card__verdict--short')}>{copy.verdict(v, who)}</p>
        <dl className="bridge-card__facts">
          <div>
            <dt>{copy.worth85}</dt>
            <dd className="mono">{money(s.summary.netWorth85)}</dd>
          </div>
          <div>
            <dt>{copy.worth95}</dt>
            <dd className="mono">{money(s.summary.netWorth95)}</dd>
          </div>
          <div>
            <dt>{copy.lowestNestLabel}</dt>
            <dd className="mono">{s.summary.lowestNest ? `${formatMoney(s.summary.lowestNest.amount, lang)} · ${copy.age(s.summary.lowestNest.age)}` : copy.noWorth}</dd>
          </div>
          <div>
            <dt>{copy.lifetime}</dt>
            <dd className="mono">{formatMoney(s.summary.lifetimeAfterTax, lang)}</dd>
          </div>
        </dl>
        <p className="field-row__hint">
          {s.key === 'standard' ? copy.breakEvenSelf : extra > 50 ? copy.extraDrawn(formatMoney(extra, lang)) : extra < -50 ? copy.lessDrawn(formatMoney(-extra, lang)) : copy.sameDrawn}
          {s.key !== 'standard' && ' · ' + (s.breakEven === null || s.breakEvenKind === null ? copy.breakEvenNone : s.breakEvenKind === 'later' ? copy.breakEvenLater(s.breakEven) : copy.breakEvenEarlier(s.breakEven))}
        </p>
      </li>
    )
  }
  return (
    <div role="radiogroup" aria-label={copy.strategyTitle}>
      <ul className="bridge-cards">{view.strategies.filter((s) => !(s.key === 'mine' && mineIsStandard)).map(card)}</ul>
    </div>
  )
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
  const nestSeries = [
    { id: 'selected', label: copy.selectedName, colour: 'accent' as const, key: null },
    { id: 'asap', label: copy.strategyName.asap, colour: 'sky' as const, key: 'asap' as const },
    { id: 'standard', label: copy.strategyName.standard, colour: 'sage' as const, key: 'standard' as const },
    { id: 'max', label: copy.strategyName.max, colour: 'berry' as const, key: 'max' as const },
  ].map((s) => ({
    id: s.id,
    label: s.label,
    colour: s.colour,
    points: (s.key === null ? view.selected.rows.map((r) => ({ year: r.year, age: r.age, total: r.nest.total })) : view.strategies.find((c) => c.key === s.key)!.nest)
      .filter((p) => inWindow(p.age))
      .map((p) => ({ x: p.year, y: p.total })),
  }))
  // One marker per start age; when both pensions start the same year they share one line and one label.
  const starts = (at: (age: number) => number) => {
    const { rrqStartAge: q, oasStartAge: o } = params.levers
    const mark = (x: number, label: string) => ({ x, label, colour: 'accent' as const, named: true })
    if (q === o) return inWindow(q) ? [mark(at(q), `${copy.markerRrq} + ${copy.markerOas}`)] : []
    return [...(inWindow(q) ? [mark(at(q), copy.markerRrq)] : []), ...(inWindow(o) ? [mark(at(o), copy.markerOas)] : [])]
  }
  const markers = starts(yearOf)
  const barMarkers = starts((age) => age)
  if (rows.length === 0) return null
  return (
    <div className="bridge__charts">
      <h3 className="bridge__heading">{copy.barsTitle}</h3>
      <p className="field-row__hint">{copy.barsHint}</p>
      <div className="chart-slot">
        <Suspense fallback={<Loading />}>
          <StackedBarChart
            data={bars}
            series={SEGMENTS.map((id) => ({ id, label: copy.segment[id], colour: SEGMENT_COLOUR[id] }))}
            line={{ id: 'need', label: copy.needLine }}
            yFormat={(y) => formatCompactMoney(y, lang)}
            yDetail={(y) => formatMoney(y, lang)}
            xTitle={(age) => copy.tooltip(age, yearOf(age))}
            markers={barMarkers}
            ariaLabel={copy.barsFigure(first, last)}
          />
        </Suspense>
      </div>
      <h3 className="bridge__heading">{copy.nestTitle}</h3>
      <p className="field-row__hint">{copy.nestHint(params.levers.rrqStartAge, params.levers.oasStartAge)}</p>
      <div className="chart-slot">
        <Suspense fallback={<Loading />}>
          <LineChart
            series={nestSeries}
            markers={markers}
            yFormat={(y) => formatCompactMoney(y, lang)}
            yDetail={(y) => formatMoney(y, lang)}
            xTitle={(year) => copy.tooltip(year - person.birth.year, year)}
            ariaLabel={copy.nestFigure(first, last)}
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
    <div className="table-wrap bridge__table" role="region" aria-label={copy.tableTitle} tabIndex={0}>
      <table>
        <caption className="sensitivity__caption">{copy.tableTitle}</caption>
        <thead>
          <tr>
            <th scope="col">{copy.colAge}</th>
            <th scope="col">{copy.colNeed}</th>
            {showWork && <th scope="col">{copy.colWork}</th>}
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

function MatrixSection({ household, assumptions, levers, copy, ownerName }: { household: Household; assumptions: Assumptions; levers: BridgeLevers; copy: BridgeCopy; ownerName: string }) {
  const t = useT()
  const { value, busy } = useBridgeMatrix(household, assumptions, levers)
  if (value === null) return <Skeleton count={3} />
  return (
    <div className="table-wrap" role="region" aria-label={copy.matrixTitle} tabIndex={0} aria-busy={busy}>
      <p className="field-row__hint">{copy.matrixHint(ownerName)}</p>
      {busy && (
        <p className="bridge__updating" role="status">
          {copy.updating}
        </p>
      )}
      <table>
        <thead>
          <tr>
            <th scope="col">{copy.strategyCol}</th>
            {(['prudent', 'neutral', 'bold'] as const).map((k) => (
              <th key={k} scope="col">
                {t.assumptions.presets[k]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {strategyKeysFor(household).map((key) => (
            <tr key={key}>
              <th scope="row">{copy.strategyName[key]}</th>
              {(['prudent', 'neutral', 'bold'] as const).map((k) => {
                const cell = value[key][k]
                return (
                  <td key={k} className={cell.ok ? undefined : 'bridge__cell--short'}>
                    <span aria-hidden="true">{cell.ok ? '✓' : '!'} </span>
                    {cell.ok ? copy.matrixHolds : copy.matrixFails(cell.firstShortfallAge ?? 0)}
                  </td>
                )
              })}
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
  const ownerName = names[Math.max(0, household.persons.findIndex((p) => p.id === levers.id))] ?? ''
  // The ages under « tient jusqu'à » are this person's; in a couple that is not the youngest, so the verdict names them.
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
  // The ages are the PROFILE's (« Mes données » and Profil edit the same ones): only the other-person toggle and the window live in the address.
  const change = (patch: Partial<Pick<BridgeLevers, 'both'>>, win?: BridgeWindow) => {
    const cur = parseBridgeParams(new URLSearchParams(window.location.search), household)
    write({ levers: { ...cur.levers, ...patch }, window: win ?? cur.window })
  }
  const [applied, setApplied] = useState<AppliedChange | null>(null)
  const pickPerson = (id: PersonId) => {
    setApplied(null)
    write({ levers: profileLevers(household, id), window: parseBridgeParams(new URLSearchParams(window.location.search), household).window })
  }
  const apply = (key: StrategyKey) => {
    const cur = parseBridgeParams(new URLSearchParams(window.location.search), household).levers
    const l = leversFor(key, household, cur.id, cur.retirementAge)
    updateProfile((p) => mapPerson(p, cur.id, (x) => (x.rrq.startAge === l.rrqStartAge && x.oas.startAge === l.oasStartAge ? x : { ...x, rrq: { ...x.rrq, startAge: l.rrqStartAge }, oas: { ...x.oas, startAge: l.oasStartAge } })))
    change({ both: l.both === true })
    // A card tap edits the stored profile (the house rule: the ages live in ONE place). The part a
    // comparison control must not do silently is the edit — so remember what changed, say so, and
    // keep a way back on screen until the next tap.
    const next: AppliedChange = { id: cur.id, prevRrq: cur.rrqStartAge, prevOas: cur.oasStartAge, prevBoth: cur.both === true, rrq: l.rrqStartAge, oas: l.oasStartAge, both: l.both === true }
    setApplied(next.rrq === next.prevRrq && next.oas === next.prevOas && next.both === next.prevBoth ? null : next)
  }
  const undoApply = () => {
    if (applied === null) return
    const a = applied
    updateProfile((p) => mapPerson(p, a.id, (x) => (x.rrq.startAge === a.prevRrq && x.oas.startAge === a.prevOas ? x : { ...x, rrq: { ...x.rrq, startAge: a.prevRrq }, oas: { ...x.oas, startAge: a.prevOas } })))
    change({ both: a.prevBoth })
    setApplied(null)
  }

  // Everything below the controls describes the levers the data was computed FOR (lib/bridgeModel.ts, shownPlan).
  const { shown, pressed, endAge, verdict } = shownPlan(view, levers, household, assumptions.horizonAge)
  const standard = view?.strategies.find((s) => s.key === 'standard')
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
        <SubTabs ariaLabel={copy.person} value={levers.id} onSelect={pickPerson} options={household.persons.map((p, i) => ({ key: p.id, label: names[i] ?? '' }))} />
      )}

      <div className="bridge__levers">
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
        <Skeleton count={4} />
      ) : (
        <>
          <p className={'bridge__verdict' + (view.selected.summary.ok ? '' : ' bridge__verdict--short')} aria-live={busy ? 'off' : 'polite'}>
            {copy.verdict(verdict, who)}
          </p>

          <h3 className="bridge__heading">{copy.strategyTitle}</h3>
          {pressed.length === 0 && <p className="field-row__hint">{copy.custom}</p>}
          <StrategyCards view={view} pressed={pressed} copy={copy} onPick={apply} horizonAge={endAge} who={who} />
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
          <p className="field-row__hint">{copy.todayNote}</p>

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
          <YearTable view={view} span={windowShown} levers={shown} copy={copy} />
          <p className="field-row__hint">{copy.householdNote}</p>

          <h3 className="bridge__heading">{copy.whyTitle}</h3>
          <ul className="bridge__list">
            <li>{standard && view.selected.summary.drawn6070 - standard.summary.drawn6070 > 50 ? copy.whyCost(money(view.selected.summary.drawn6070 - standard.summary.drawn6070)) : copy.whyCostNone}</li>
            <li>{copy.whyGis(money(view.selected.summary.gisTotal), money(view.selected.summary.oasRecoveryTotal))}</li>
            {copy.why({ rrqPerMonth: formatPct(view.facts.rrqPerMonth, lang, 1), rrqMax: formatPct(view.facts.rrqLateMax, lang, 1), oasPerMonth: formatPct(view.facts.oasPerMonth, lang, 1), oasMax: formatPct(view.facts.oasLateMax, lang, 0) }).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          <h3 className="bridge__heading">{copy.matrixTitle}</h3>
          <MatrixSection household={household} assumptions={assumptions} levers={levers} copy={copy} ownerName={ownerName} />

          <h3 className="bridge__heading">{copy.caveatTitle}</h3>
          <ul className="bridge__list">
            {copy.caveats.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
