import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Chip } from '../components/Chip'
import { Cluster, Rail } from '../components/Layout'
import { NextStep } from '../components/NextStep'
import { PageHead } from '../components/PageHead'
import { BridgePanel } from '../components/results/BridgePanel'
import { ChartPanel } from '../components/results/ChartPanel'
import { EarliestEachPanel } from '../components/results/EarliestEachPanel'
import { LedgerPanel } from '../components/results/LedgerPanel'
import { OrderPanel } from '../components/results/OrderPanel'
import { ParamsPanel } from '../components/results/ParamsPanel'
import { SaveView } from '../components/results/SaveView'
import { SpendView } from '../components/results/SpendView'
import { StopView } from '../components/results/StopView'
import { SectionHeader } from '../components/SectionHeader'
import { SectionNav } from '../components/SectionNav'
import { SubTabs } from '../components/SubTabs'
import { SensitivityPanel } from '../components/results/SensitivityPanel'
import { YearTables } from '../components/results/YearTables'
import { StatusMessage } from '../components/StatusMessage'
import { retireAt } from '../engine/retireAt'
import { planGlance, retirementState } from '../engine/ledger'
import { withPreset } from '../engine/assumptionPresets'
import { useLang, useT } from '../i18n'
import type { Dollars, Metric } from '../lib/chartData'
import { LEDGER_COPY } from '../lib/ledgerCopy'
import { presetOf } from '../engine/assumptionPresets'
import { formatYearAge } from '../lib/format'
import { RESULTS_COPY } from '../lib/resultsCopy'
import { headlineOf, prudentDiffers } from '../lib/headline'
import { scrollBehavior } from '../lib/motion'
import { usePresetRange } from '../lib/usePresetEarliest'
import { formatMoney } from '../lib/money'
import { profileGaps } from '../lib/profileGaps'
import { MAX_AGE, MAX_SELECTIONS, MIN_AGE, assumptionsOf, defaultSelections, formatSelections, isSplit, parseSelections, runSelections, splitAges, splitOf, toggleSelection, worthAtHorizon, type Selection } from '../lib/resultsModel'
import { parseSpend } from '../lib/spendModel'
import { stopWorking } from '../lib/stopWorking'
import { useEarliestEach } from '../lib/useEarliestEach'
import { useProfile } from '../lib/store'
import { today } from '../lib/today'

// The answer. A verdict first — the earliest age at which the plan lasts — then the comparison the person chooses
// (« my plan », or one age for everyone) as scenario cards and a chart, and the detail behind it for whoever wants to
// check: the year-by-year table, the parameters, and how fragile the verdict is. Nothing is shown until the profile
// holds enough to mean something (profileGaps). Every choice lives in the address (`?ages=&metric=&dollars=`), so a
// view can be bookmarked and the back button means what it says.

type View = 'answer' | 'strategies' | 'verify'

const SERIES_CLASS = ['accent', 'sky', 'sage', 'berry'] as const

export function Resultats() {
  const t = useT()
  const { lang } = useLang()
  const r = t.results
  const rc = RESULTS_COPY[lang]
  const profile = useProfile()
  const [params, setParams] = useSearchParams()
  const { year, month } = today()
  // Everybody already stopped working: « when can I retire? » is answered, and what is left to say is whether the money lasts.
  const state = useMemo(() => retirementState(profile.household, assumptionsOf(profile, { year, month })), [profile, year, month])
  const retiredNow = state.everyoneRetired && profileGaps(profile).length === 0
  const retiredGlance = useMemo(() => {
    if (!retiredNow) return null
    const a = assumptionsOf(profile, { year, month })
    return { now: planGlance(profile.household, a), prudent: planGlance(profile.household, withPreset(a, 'prudent')) }
  }, [retiredNow, profile, year, month])
  // A « chacun son âge » split names two people: on a one-person household it would only duplicate a plain age.
  const selections = parseSelections(params.get('ages'), defaultSelections(profile.household, state.everyoneRetired)).filter((s) => !isSplit(s) || profile.household.persons.length > 1)
  const metric: Metric = params.get('metric') === 'income' ? 'income' : 'netWorth'
  const dollars: Dollars = params.get('dollars') === 'nominal' ? 'nominal' : 'today'
  const gaps = profileGaps(profile)
  const assumptions = assumptionsOf(profile, { year, month })
  // A year is always said with the age(s) it comes with: « 2043 (63 ans) ».
  const births = profile.household.persons.map((p) => p.birth.year)
  const at = (y: number) => formatYearAge(y, births, lang)
  const isCouple = profile.household.persons.length === 2
  const earliestEachAnswer = useEarliestEach(profile.household, assumptions, isCouple && gaps.length === 0 && !retiredNow)

  const setParam = useCallback(
    (key: string, value: string | null) =>
      setParams(
        () => {
          // Built from the address bar as it is NOW, not from the render's copy: a second click that lands before the
          // heavy re-render of the first would otherwise start again from the old address and silently undo it.
          const next = new URLSearchParams(window.location.search)
          if (value === null) next.delete(key)
          else next.set(key, value)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  const earliest = useMemo(
    () => (gaps.length > 0 ? null : retireAt(profile.household, assumptionsOf(profile, { year, month }), { stopAtFirstOk: true }).earliestOk),
    [profile, gaps.length, year, month],
  )
  const picked = formatSelections(selections)
  const runs = useMemo(
    () => (gaps.length > 0 ? [] : runSelections(profile, { year, month }, parseSelections(picked, []))),
    [profile, gaps.length, year, month, picked],
  )

  // Old deep links chose one question (`?q=save|stop`); the three answers share the page now, so
  // the link becomes a scroll to that section, and the key is dropped from the address. Read once,
  // at mount: stripping the key must not re-run (and so cancel) the settling scroll below.
  const [legacyQ] = useState(() => params.get('q'))
  useEffect(() => {
    if (legacyQ !== 'save' && legacyQ !== 'stop') return
    setParam('q', null)
    const go = () => document.getElementById(legacyQ === 'save' ? 'epargner' : 'arreter')?.scrollIntoView({ block: 'start' })
    go()
    // The sections above stream in (workers, lazy charts) and would push the target off screen:
    // hold the anchor while the layout settles, and give the scroll back at the reader's first move.
    const observer = new ResizeObserver(go)
    observer.observe(document.body)
    const release = () => observer.disconnect()
    const timer = setTimeout(release, 3000)
    for (const ev of ['wheel', 'touchstart', 'keydown'] as const) window.addEventListener(ev, release, { once: true, passive: true })
    return () => {
      clearTimeout(timer)
      release()
      for (const ev of ['wheel', 'touchstart', 'keydown'] as const) window.removeEventListener(ev, release)
    }
  }, [legacyQ, setParam])

  // On a phone the rail shows only its first chips: bring the ones already switched on into view, once, so the page
  // never opens looking as if nothing were selected.
  const compareRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    compareRef.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest' })
  }, [gaps.length])

  const oldest = Math.max(...profile.household.persons.map((p) => year - p.birth.year))
  const youngest = Math.min(...profile.household.persons.map((p) => year - p.birth.year))
  // Clamped on BOTH sides: someone past 70 and still working used to leave firstAge above MAX_AGE —
  // an empty compare rail and an age box whose min sat over its max.
  const firstAge = Math.min(MAX_AGE, Math.max(MIN_AGE, oldest))
  const headline = useMemo(
    () => (gaps.length > 0 ? headlineOf(profile.household, assumptionsOf(profile, { year, month }), null, firstAge, youngest) : headlineOf(profile.household, assumptionsOf(profile, { year, month }), earliest, firstAge, youngest)),
    [profile, gaps.length, earliest, firstAge, youngest, year, month],
  )
  // The answer under each ready-made scenario (off the page's thread): the verdict's own range line, and the
  // figure the sensitivity grids detail. ONE home for these three ages — nothing else restates them.
  const activePreset = presetOf(assumptions)
  const range = usePresetRange(profile.household, assumptions, gaps.length === 0)
  const prudentGap = prudentDiffers(range?.prudent, headline.age)
  // The verdict's age, put in dates: one cheap main-thread projection.
  const stop = useMemo(
    () => (gaps.length > 0 || headline.age === null ? null : stopWorking(profile.household, assumptionsOf(profile, { year, month }), headline.age)),
    [profile, gaps.length, headline.age, year, month],
  )
  const ages = Array.from({ length: MAX_AGE - firstAge + 1 }, (_, i) => firstAge + i)
  // The comparisons as the LAST click left them: the URL (and so `selections`) only catches up when the page has
  // re-rendered, and a quick second tap must build on the first, not on the stale list.
  const pending = useRef<{ text: string; at: number } | null>(null)
  const agesNow = params.get('ages')
  useEffect(() => {
    if (pending.current && agesNow === pending.current.text) pending.current = null
  }, [agesNow])
  const latest = (): Selection[] =>
    pending.current && Date.now() - pending.current.at < 2000 ? parseSelections(pending.current.text, []) : selections
  const commit = (next: Selection[]) => {
    const text = formatSelections(next)
    pending.current = { text, at: Date.now() }
    setParam('ages', text)
  }
  const toggle = (s: Selection) => commit(toggleSelection(latest(), s))
  // A person with no name is « Moi » / « Conjoint·e », as on the profile page.
  const names = profile.household.persons.map((p, i) => p.name.trim() || (i === 0 ? t.profile.self : t.profile.spouse))
  const label = useCallback(
    (s: Selection) => {
      if (s === 'plan') return r.compare.plan
      if (!isSplit(s)) return r.compare.age(s)
      const [a, b] = splitAges(s)
      return r.compare.split(names[0] ?? '', a, names[1] ?? '', b)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [r, names.join('|')],
  )
  const addSplit = (first: number, second: number) => {
    const s = splitOf(first, second)
    const cur = latest()
    if (!cur.includes(s)) commit(toggleSelection(cur, s))
  }

  // Three jobs, one at a time (the address keeps it: `?v=strategies|verify`): get the answer · choose how to carry it out · check it.
  const view: View = params.get('v') === 'strategies' ? 'strategies' : params.get('v') === 'verify' ? 'verify' : 'answer'

  if (gaps.length > 0) {
    return (
      <section className="page-body">
        <PageHead title={r.title} />
        <div className="surface results-gaps">
          <StatusMessage tone="info">{r.gaps.lead}</StatusMessage>
          <ul>
            {gaps.map((g) => (
              <li key={g}>{r.gaps[g]}</li>
            ))}
          </ul>
          <Link className="btn btn--sm" to="/">
            {r.gaps.toProfile}
          </Link>{' '}
          <Link className="btn btn--sm btn--ghost" to="/hypotheses">
            {r.gaps.toAssumptions}
          </Link>
        </div>
      </section>
    )
  }

  // « Combien épargner ? » keeps its own age in the address (`?age=`), independent of the comparisons.
  const wantedSaveAge = Number(params.get('age'))
  const saveAge = Number.isFinite(wantedSaveAge) && wantedSaveAge >= firstAge && wantedSaveAge <= MAX_AGE ? Math.round(wantedSaveAge) : Math.min(MAX_AGE, Math.max(firstAge, profile.household.persons[0].retirementAge))
  // « Et si je dépensais moins ? » keeps its what-if amount in the address (`?spend=`) too; absent, the slider sits on the profile's own.
  const spend = parseSpend(params.get('spend')) ?? profile.household.spending.retiredToday
  const toSpend = () => document.getElementById('depenser')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })

  // What would make the verdict more faithful — detectable absences only, never a guess about what the household owns.
  const refine = [
    ...(profile.household.persons.some((p) => p.salaryToday > 0 && Object.keys(p.earningsHistory).length === 0) ? (['statement'] as const) : []),
    ...(profile.household.persons.every((p) => p.accounts.rrsp.balance + p.accounts.tfsa.balance + p.accounts.nonReg.balance === 0) ? (['accounts'] as const) : []),
    ...(profile.household.spending.workingToday <= 0 && !retiredNow ? (['spendingWork'] as const) : []),
  ]

  // The page's map, in reading order, grouped into its three arcs; a section that is not on the page has no chip.
  const navLinks =
    view === 'answer'
      ? [
          { id: 'verdict', label: rc.nav.verdict },
          { id: 'comparer', label: rc.nav.comparer },
          { id: 'epargner', label: rc.nav.epargner },
          ...(retiredNow ? [] : [{ id: 'depenser', label: rc.nav.depenser }]),
          ...(stop !== null ? [{ id: 'arreter', label: rc.nav.arreter }] : []),
        ]
      : view === 'strategies'
        ? [...(state.pensionsOpen ? [{ id: 'rentes', label: rc.nav.rentes }] : []), { id: 'ordre', label: rc.nav.ordre }]
        : [
            { id: 'donnees-calcul', label: rc.nav.donneesCalcul },
            { id: 'tableau', label: rc.nav.tableau },
            { id: 'sensibilite', label: rc.nav.sensibilite },
            { id: 'parametres', label: rc.nav.parametres },
          ]

  return (
    <section className="page-body">
      <PageHead title={r.title} subtitle={r.verdict.explain(assumptions.horizonAge)} />
      <SubTabs
        ariaLabel={rc.tabs.label}
        value={view}
        onSelect={(v) => setParam('v', v === 'answer' ? null : v)}
        options={[
          { key: 'answer' as const, label: rc.tabs.answer },
          { key: 'strategies' as const, label: rc.tabs.strategies },
          { key: 'verify' as const, label: rc.tabs.verify },
        ]}
      />
      <SectionNav links={navLinks} ariaLabel={rc.nav.label} />
      {/* Paper is how a plan leaves the device without a network: print.css already makes the page a clean flow. */}
      <Cluster className="no-print">
        <Chip icon="printer-bold" onClick={() => window.print()}>
          {rc.out.print}
        </Chip>
      </Cluster>

      {/* 1 — what you asked: the verdict, and the same answer compared, costed and dated. */}
      {view === 'answer' && (
      <section className="arc" aria-label={rc.tabs.answer}>

      <div id="verdict" className="verdict surface results-section" aria-live="polite">
        <p className="verdict__line">
          {retiredGlance ? rc.headline.retired(isCouple) : headline.kind === 'none' ? rc.headline.none(MAX_AGE) : headline.kind === 'now' ? rc.headline.now : rc.headline.at(headline.age!, isCouple)}
        </p>
        {retiredGlance ? (
          <>
            <p className="verdict__note">
              {retiredGlance.now.ok ? rc.headline.holds(assumptions.horizonAge) : rc.headline.runsOut(at(retiredGlance.now.firstShortfallYear!))}{' '}
              {activePreset ? rc.headline.scenario(t.assumptions.presets[activePreset]) : rc.headline.scenarioCustom}
            </p>
            {activePreset !== 'prudent' && (retiredGlance.prudent.ok !== retiredGlance.now.ok || retiredGlance.prudent.firstShortfallYear !== retiredGlance.now.firstShortfallYear) && (
              <p className="verdict__note">{rc.headline.retiredPrudent(t.assumptions.presets.prudent, retiredGlance.prudent.ok, retiredGlance.prudent.firstShortfallYear === null ? null : at(retiredGlance.prudent.firstShortfallYear))}</p>
            )}
          </>
        ) : headline.kind === 'none' ? (
          <>
            {/* The WORST verdict must be the most actionable one: the nudge carries its two doors. */}
            <p className="verdict__note">{rc.headline.tryThis}</p>
            <Cluster>
              <Chip icon="caret-down-bold" onClick={toSpend}>{rc.headline.trySpend}</Chip>
              <Chip to="/hypotheses">{rc.refine.toAssumptions}</Chip>
              <Chip onClick={() => document.getElementById('donnees-calcul')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })}>{rc.headline.tryLedger}</Chip>
            </Cluster>
          </>
        ) : (
          <>
            <p className="verdict__note">
              {rc.headline.holds(assumptions.horizonAge)} {activePreset ? rc.headline.scenario(t.assumptions.presets[activePreset]) : rc.headline.scenarioCustom}
            </p>
            {headline.earlierAge !== null && headline.earlierShortfallYear !== null && (
              <p className="verdict__note">{rc.headline.earlier(headline.earlierAge, at(headline.earlierShortfallYear))}</p>
            )}
            {/* The one lever a reader reaches for first (« could we live on less? ») is a section away: a door to it, on the card. */}
            <Cluster>
              <Chip icon="caret-down-bold" onClick={toSpend}>{rc.headline.trySpend}</Chip>
            </Cluster>
          </>
        )}
        {/* The answer's own range — the ONE place the three scenarios' ages are written: three labelled figures,
            not a joined sentence. The row is on the card from the first paint (… while the worker runs), so the
            late answer fills boxes that already exist instead of growing the card under the reader. */}
        {!retiredGlance && (
          <div className="verdict__range">
            <p className="verdict__range-title">{rc.headline.rangeTitle}</p>
            <dl className="verdict__range-list">
              {(['prudent', 'neutral', 'bold'] as const).map((k) => (
                <div key={k} className={'verdict__range-item' + (activePreset === k ? ' is-on' : '')}>
                  <dt>{t.assumptions.presets[k]}</dt>
                  <dd className="mono">{range === undefined ? '…' : range[k] === null ? rc.headline.rangeNone(MAX_AGE) : rc.headline.rangeAge(range[k]!)}</dd>
                </div>
              ))}
            </dl>
            {range !== undefined && prudentGap && <p className="verdict__note">{rc.headline.rangeGap}</p>}
          </div>
        )}
        {/* The verdict is an estimate under stated assumptions, and it says so where it is read — quietly: it must
            be present, not compete with the answer. */}
        <p className="verdict__note verdict__note--caveat">{r.verdict.caveat}</p>
      </div>

      {/* The refinement loop: the verdict stands on three numbers; these would sharpen it, each a link to its field. */}
      {refine.length > 0 && (
        <div className="surface results-section refine" aria-label={rc.refine.title}>
          <SectionHeader title={rc.refine.title} subtitle={headline.kind === 'none' && !retiredGlance ? rc.refine.hintNone : rc.refine.hint} />
          <ul className="refine__list">
            {refine.map((k) => (
              <li key={k}>
                {rc.refine[k]} <Chip to={k === 'spendingWork' ? '/hypotheses' : '/'}>{k === 'spendingWork' ? rc.refine.toAssumptions : rc.refine.toProfile}</Chip>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Every departure-age comparison — the chips, the cards, the chart and (for a couple) « Chacun de son côté » —
          is ONE section: the same runs, seen as cards, as a picture, and per person. */}
      <section id="comparer" className="results-section" aria-label={r.compare.label}>
      <SectionHeader title={r.compare.label} />
      {!retiredNow && (
        <div className="compare" ref={compareRef}>
          <Rail role="group" aria-label={r.compare.label}>
            <Chip selected={selections.includes('plan')} onClick={() => toggle('plan')}>
              {r.compare.plan}
            </Chip>
            {ages.map((age) => (
              // The verdict's own age wears a quiet accent dot: among ~20 look-alike chips, the one
              // number the reader most wants to compare against must not be indistinguishable at #12.
              <Chip
                key={age}
                selected={selections.includes(age)}
                onClick={() => toggle(age)}
                className={age === earliest ? 'chip--earliest' : undefined}
                ariaLabel={age === earliest ? `${r.compare.age(age)} — ${rc.headline.earliestChip}` : undefined}
                title={age === earliest ? rc.headline.earliestChip : undefined}
              >
                {r.compare.age(age)}
              </Chip>
            ))}
            {selections.filter(isSplit).map((s) => (
              <Chip key={s} selected onClick={() => toggle(s)}>
                {label(s)}
              </Chip>
            ))}
          </Rail>
          {selections.length >= MAX_SELECTIONS && <p className="field-row__hint">{r.compare.max}</p>}
          {selections.includes('plan') && <p className="field-row__hint">{r.compare.planHint}</p>}
        </div>
      )}

      <ul className="scenarios">
        {runs.map(({ selection, result }, i) => (
          <li key={String(selection)} className={`scenario scenario--${SERIES_CLASS[i]} surface`}>
            <p className="scenario__title">
              <span className="scenario__swatch" aria-hidden="true" />
              {r.scenario.retireAt(label(selection))}
            </p>
            <p className={'scenario__verdict' + (result.ok ? '' : ' scenario__verdict--short')}>{result.ok ? r.scenario.works : r.scenario.fails(at(result.firstShortfallYear!))}</p>
            <p className="scenario__worth mono">{r.scenario.endWorth(formatMoney(worthAtHorizon(result, dollars, assumptions), lang), dollars === 'today' ? r.chart.today : r.chart.nominal)}</p>
          </li>
        ))}
      </ul>

      {runs.length > 0 && (
        <ChartPanel
          runs={runs}
          household={profile.household}
          todayYear={year}
          inflation={assumptions.inflation}
          metric={metric}
          dollars={dollars}
          onMetric={(m) => setParam('metric', m === 'netWorth' ? null : m)}
          label={label}
        />
      )}

      {isCouple && !retiredNow && (
        <div className="surface">
          <EarliestEachPanel household={profile.household} names={names} answer={earliestEachAnswer} maxAge={MAX_AGE} onCompare={addSplit} compareDisabled={selections.length >= MAX_SELECTIONS} />
        </div>
      )}
      </section>

      {/* The two other questions, answered in the same arc: views over the same profile and assumptions. */}
      <section id="epargner" className="results-section" aria-label={rc.questions.tabs.save}>
        <SectionHeader title={rc.questions.tabs.save} />
        <SaveView household={profile.household} assumptions={assumptions} age={saveAge} onAge={(a) => setParam('age', String(a))} minAge={firstAge} maxAge={MAX_AGE} />
      </section>
      {!retiredNow && (
        <section id="depenser" className="results-section" aria-label={rc.questions.tabs.spend}>
          <SectionHeader title={rc.questions.tabs.spend} />
          <SpendView household={profile.household} assumptions={assumptions} spend={spend} onSpend={(v) => setParam('spend', v === null ? null : String(v))} earliest={earliest} maxAge={MAX_AGE} />
        </section>
      )}
      {stop !== null && (
        <section id="arreter" className="results-section" aria-label={rc.questions.tabs.stop}>
          <SectionHeader title={rc.questions.tabs.stop} subtitle={rc.questions.stop.hint} />
          <StopView names={names} births={births} stop={stop} />
        </section>
      )}
      </section>
      )}

      {/* 2 — ONE decision (when to start the QPP and the OAS), two views of it: the strategies' effect on the
          whole plan, then the rule, pension by pension. Once every start is behind the household, nothing to choose. */}
      {view === 'strategies' && (
        <section className="arc" aria-label={rc.tabs.strategies}>
          {state.pensionsOpen && <section id="rentes" className="results-section" aria-label={rc.pensions.title}>
            <SectionHeader title={rc.pensions.title} subtitle={rc.pensions.hint} />
            <BridgePanel household={profile.household} assumptions={assumptions} names={names} />
          </section>}
          <section id="ordre" className="results-section" aria-label={rc.orders.title}>
            <SectionHeader title={rc.orders.title} />
            <OrderPanel household={profile.household} assumptions={assumptions} age={earliest ?? saveAge} firstAge={firstAge} />
          </section>
        </section>
      )}

      {view === 'verify' && (
      <section className="arc" aria-label={rc.tabs.verify}>

      {/* The ages and figures that set the answer, with their calculation and a slider each. */}
      <section id="donnees-calcul" className="results-section" aria-label={LEDGER_COPY[lang].title}>
        <SectionHeader title={LEDGER_COPY[lang].title} />
        <LedgerPanel household={profile.household} assumptions={assumptions} names={names} />
      </section>

      <section id="tableau" className="results-section" aria-label={r.table.title}>
        <SectionHeader title={r.table.title} />
        <YearTables runs={runs} label={label} dollars={dollars} todayYear={year} inflation={assumptions.inflation} />
      </section>

      <section id="sensibilite" className="results-section" aria-label={r.sensitivity.title}>
        <SectionHeader title={r.sensitivity.title} subtitle={rc.headline.sensitivityDetail} />
        <SensitivityPanel household={profile.household} assumptions={assumptions} />
      </section>

      <section id="parametres" className="results-section" aria-label={r.params.title}>
        <SectionHeader title={r.params.title} />
        <ParamsPanel />
      </section>
      </section>
      )}

      <NextStep to="/donnees" label={t.next.toData}>
        <p>{t.next.resultsHint}</p>
      </NextStep>
    </section>
  )
}
