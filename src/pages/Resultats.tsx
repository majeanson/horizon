import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Chip } from '../components/Chip'
import { Cluster, Rail } from '../components/Layout'
import { NextStep } from '../components/NextStep'
import { NumberField } from '../components/NumberField'
import { PageHead } from '../components/PageHead'
import { BridgePanel } from '../components/results/BridgePanel'
import { ChartPanel } from '../components/results/ChartPanel'
import { HowToRead } from '../components/results/HowToRead'
import { TimelineStrip } from '../components/results/TimelineStrip'
import { EarliestEachPanel } from '../components/results/EarliestEachPanel'
import { PlansCompare } from '../components/results/PlansCompare'
import { LedgerPanel } from '../components/results/LedgerPanel'
import { OrderPanel } from '../components/results/OrderPanel'
import { ParamsPanel } from '../components/results/ParamsPanel'
import { SaveView } from '../components/results/SaveView'
import { SpendView } from '../components/results/SpendView'
import { SectionHeader } from '../components/SectionHeader'
import { SectionNav } from '../components/SectionNav'
import { usePinOffset } from '../lib/pinOffset'
import { SubTabs } from '../components/SubTabs'
import { SensitivityPanel } from '../components/results/SensitivityPanel'
import { YearTables } from '../components/results/YearTables'
import { Skeleton } from '../components/Skeleton'
import { StatusMessage } from '../components/StatusMessage'
import { retirementState } from '../engine/ledger'
import { useLang, useT } from '../i18n'
import type { ChartMetric, Dollars } from '../lib/chartData'
import { LEDGER_COPY } from '../lib/ledgerCopy'
import { presetOf } from '../engine/assumptionPresets'
import { formatPct, formatYearAge } from '../lib/format'
import { longDate } from '../lib/months'
import { AGE_TOKEN, RESULTS_COPY } from '../lib/resultsCopy'
import { paramsVintage } from '../lib/vintage'
import { prudentDiffers } from '../lib/headline'
import { NO_HEADLINE } from '../lib/answer'
import { useAnswer } from '../lib/useAnswer'
import { useRuns } from '../lib/useRuns'
import { scrollToSection } from '../lib/motion'
import { usePrinting } from '../lib/usePrinting'
import { useSettled } from '../lib/useSettled'
import { useNotice } from '../lib/toast'
import { usePresetRange } from '../lib/usePresetEarliest'
import { useMarketRange } from '../lib/useMarketRange'
import { STRESS_PRESETS } from '../lib/marketRange'
import { MARKET_COPY } from '../lib/marketCopy'
import { LEVERS_COPY } from '../lib/leversCopy'
import { useLevers } from '../lib/useLevers'
import { formatCompactMoney, formatMoney } from '../lib/money'
import { profileGaps } from '../lib/profileGaps'
import { MAX_AGE, MAX_SELECTIONS, MIN_AGE, assumptionsOf, defaultSelections, formatSelections, isSplit, parseSelections, splitAges, splitOf, toggleSelection, worthAtHorizon, type Selection } from '../lib/resultsModel'
import { accuracyOf, factsOf } from '../lib/facts'
import { GUIDE_COPY } from '../lib/guideCopy'
import { useFactImpact } from '../lib/useFactImpact'
import { parseSpend } from '../lib/spendModel'
import { useEarliestEach } from '../lib/useEarliestEach'
import { useProfile } from '../lib/store'
import { today } from '../lib/today'

// The answer. It comes FIRST on the page — one sentence, the age drawn large, in dates — then what the same answer looks
// like under the three scenarios and a hard market, what would move it most, what would make it more precise, and the
// comparison the person chooses (« my plan », or one age for everyone) as cards and a chart. Behind that, two more
// views: the strategies (when to start the pensions, in which order to draw) and the check (every figure with its
// calculation, the year-by-year table, the sensitivity, the parameters). Nothing is shown until the profile holds
// enough to mean something (profileGaps). Every choice lives in the address (`?v=&ages=&metric=…`), so a view can be
// bookmarked.

type View = 'answer' | 'adjust' | 'strategies' | 'verify'

const SERIES_CLASS = ['accent', 'sky', 'sage', 'berry'] as const

/** The ages offered as one-tap comparisons: the answer's own, the three milestones, and whatever is already chosen. */
function milestoneAges(earliest: number | null, selections: readonly Selection[], firstAge: number): number[] {
  const wanted = [earliest, 60, 65, 70, ...selections.filter((s): s is number => typeof s === 'number')]
  return [...new Set(wanted.filter((a): a is number => a !== null && a >= firstAge && a <= MAX_AGE))].sort((a, b) => a - b)
}

export function Resultats() {
  const pinned = usePinOffset()
  const printing = usePrinting()
  const notice = useNotice()
  const vintage = useMemo(paramsVintage, [])
  const t = useT()
  const { lang } = useLang()
  const r = t.results
  const rc = RESULTS_COPY[lang]
  const profile = useProfile()
  // The ANSWER is derived from a SETTLED copy of the profile: a slider held on the arrow key or a figure typed digit by
  // digit writes the profile at every step, and the thirty-odd projections behind the answer (the earliest age, the
  // monthly comfort, the comparisons, the dates) used to run again on EVERY write, on the page's own thread — a second
  // per step on a slow machine, for the length of the gesture. They now run once the hand has rested 300 ms (useSettled),
  // and deferred, so a tap that lands while they run is painted first. The controls themselves read the live profile.
  const slow = useDeferredValue(useSettled(profile))
  const [params, setParams] = useSearchParams()
  const { year, month } = today()
  const slowAssumptions = useMemo(() => assumptionsOf(slow, { year, month }), [slow, year, month])
  // Everybody already stopped working: « when can I retire? » is answered, and what is left to say is whether the money lasts.
  const state = useMemo(() => retirementState(slow.household, slowAssumptions), [slow, slowAssumptions])
  const retiredNow = state.everyoneRetired && profileGaps(profile).length === 0
  // A « chacun son âge » split names two people: on a one-person household it would only duplicate a plain age.
  const selections = parseSelections(params.get('ages'), defaultSelections(profile.household, state.everyoneRetired)).filter((s) => !isSplit(s) || profile.household.persons.length > 1)
  const metric: ChartMetric = params.get('metric') === 'income' ? 'income' : params.get('metric') === 'detail' ? 'detail' : 'netWorth'
  const dollars: Dollars = params.get('dollars') === 'nominal' ? 'nominal' : 'today'
  const gaps = profileGaps(profile)
  const assumptions = assumptionsOf(profile, { year, month })
  // A year is always said with the age(s) it comes with: « 2043 (63 ans) ».
  const births = profile.household.persons.map((p) => p.birth.year)
  const at = (y: number) => formatYearAge(y, births, lang)
  const isCouple = profile.household.persons.length === 2
  const accuracy = useMemo(() => accuracyOf(profile), [profile])

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

  const oldest = Math.max(...profile.household.persons.map((p) => year - p.birth.year))
  const youngest = Math.min(...profile.household.persons.map((p) => year - p.birth.year))
  // Clamped on BOTH sides: someone past 70 and still working used to leave firstAge above MAX_AGE —
  // an empty compare rail and an age box whose min sat over its max.
  const firstAge = Math.min(MAX_AGE, Math.max(MIN_AGE, oldest))
  // THE answer — the earliest age, « dès maintenant », the headline, the monthly comfort, the dates — is one job worked out
  // off the page's thread (lib/answer.ts): null until the first one is in (the card shows a skeleton), then the LAST one
  // while a re-asked question runs (the card says it is busy). Forty projections never again run between two taps.
  const answer = useAnswer(slow.household, slowAssumptions, firstAge, youngest, state.everyoneRetired, gaps.length === 0)
  const got = gaps.length === 0 ? answer.value : null
  const answerPending = gaps.length === 0 && got === null
  const earliest = got?.earliest ?? null
  const nowOk = got?.nowOk ?? false
  // A household that has already stopped working reads its plan at a glance instead of an age (it comes with the answer).
  const retiredGlance = retiredNow ? (got?.glance ?? null) : null
  // THE ANSWER FIRST: the other workers (the range under the three scenarios, the market stress, the levers, each person's
  // own earliest) wait for the first answer to land, so that on a two-core machine six searches do not race the one the
  // page opens with. Afterwards they re-ask alongside it — the last answer stays on screen meanwhile.
  const answered = gaps.length === 0 && got !== null
  const earliestEachAnswer = useEarliestEach(slow.household, slowAssumptions, answered && isCouple && !retiredNow)
  const picked = formatSelections(selections)
  // The comparisons — one full projection per chosen age — off the page's thread as well (lib/useRuns.ts): null until the
  // first ones are in (the cards, the chart and the tables show a skeleton), then the LAST ones while a re-ask runs.
  const runsAnswer = useRuns(slow, { year, month }, parseSelections(picked, []), gaps.length === 0)
  const runs = gaps.length > 0 ? [] : (runsAnswer.value ?? [])
  const runsPending = gaps.length === 0 && runsAnswer.value === null

  // Three jobs, one at a time (the address keeps it: `?v=strategies|verify`): get the answer · choose how to carry it out · check it.
  const view: View = params.get('v') === 'strategies' ? 'strategies' : params.get('v') === 'verify' ? 'verify' : params.get('v') === 'adjust' ? 'adjust' : 'answer'
  // A view this page does not have (a typo, an old link) lands on the answer — and the ADDRESS follows, as the router's catch-all
  // does for a path: leaving `?v=verifier` up would bookmark a link that only works by accident.
  const rawView = params.get('v')
  useEffect(() => {
    if (rawView !== null && rawView !== view) setParam('v', null)
  }, [rawView, view, setParam])

  // A link to a section of ANOTHER view switches the view first, then scrolls once that view's sections exist: a plain
  // scroll to an id that is not on the page did nothing, on the one screen (« no age works ») where the reader most needs it.
  const pendingScroll = useRef<string | null>(null)
  const scrollTo = (id: string) => scrollToSection(id)
  const goTo = (target: View, id: string) => {
    if (target === view) return scrollTo(id)
    pendingScroll.current = id
    setParam('v', target === 'answer' ? null : target)
  }
  useEffect(() => {
    const id = pendingScroll.current
    if (id === null) return
    pendingScroll.current = null
    requestAnimationFrame(() => scrollTo(id))
  }, [view])

  // Old deep links chose one question (`?q=save|stop`); the answers share the page now, so the link becomes a scroll
  // to its section, and the key is dropped from the address. Read once, at mount: stripping the key must not re-run
  // (and so cancel) the settling scroll below.
  const [legacyQ] = useState(() => params.get('q'))
  useEffect(() => {
    if (legacyQ !== 'save' && legacyQ !== 'stop') return
    setParam('q', null)
    if (legacyQ === 'save') setParam('v', 'adjust')
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

  // On a phone the rail may show only its first chips: bring the ones already switched on into view, once. SIDEWAYS
  // INSIDE THE RAIL ONLY — `scrollIntoView` scrolls every ancestor too, and with the rail below the fold it used to
  // scroll the whole page down by the height of the answer, so the page opened with its first sentence hidden.
  const compareRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const rail = compareRef.current?.querySelector<HTMLElement>('.rail')
    const chip = rail?.querySelector<HTMLElement>('[aria-pressed="true"]')
    if (!rail || !chip) return
    const c = chip.getBoundingClientRect()
    const box = rail.getBoundingClientRect()
    if (c.left < box.left || c.right > box.right) rail.scrollTo({ left: Math.max(0, rail.scrollLeft + (c.left - box.left) - (box.width - c.width) / 2) })
  }, [gaps.length])

  const headline = got?.headline ?? NO_HEADLINE
  // The answer under each ready-made scenario (off the page's thread): the answer's own range line, and the
  // figure the sensitivity grids detail. ONE home for these three ages — nothing else restates them.
  const activePreset = presetOf(assumptions)
  const range = usePresetRange(slow.household, slowAssumptions, answered)
  const stress = useMarketRange(slow.household, slowAssumptions, answered)
  const mc = MARKET_COPY[lang]
  const lc = LEVERS_COPY[lang]
  const levers = useLevers(slow.household, slowAssumptions, answered)
  // The figures not yet read off a document, and how far the answer moves if each were off: idle work, after everything above it.
  const unconfirmed = useMemo(() => factsOf(slow).filter((f) => !f.confirmed).map((f) => ({ id: f.id, owner: f.owner, kind: f.kind })), [slow])
  // The heaviest searches of the page (two walks of projections for EVERY unconfirmed figure, one answer per kept plan) come LAST: on a two-core
  // machine they would otherwise run beside the range, the stress and the levers and slow the very figures the reader is waiting for.
  const firstSearchesIn = range !== undefined && stress !== undefined && levers !== undefined
  const impact = useFactImpact(slow.household, slowAssumptions, unconfirmed, answered && firstSearchesIn && !retiredNow)
  const gc = GUIDE_COPY[lang]
  const factName = (id: string): string => {
    const f = unconfirmed.find((x) => x.id === id)!
    const who = f.owner === 'household' ? gc.guide.householdOwner : gc.guide.owner(profile.household.persons.find((p) => p.id === f.owner)?.name.trim() || (f.owner === 'self' ? t.profile.self : t.profile.spouse))
    return `${gc.kind[f.kind]} — ${who}`
  }
  const movers = impact === undefined ? [] : unconfirmed.filter((f) => (impact.swings[f.id]?.years ?? 0) > 0).sort((x, y) => impact.swings[y.id].years - impact.swings[x.id].years).slice(0, 4)
  const pathName = assumptions.marketPath?.preset ?? 'smooth'
  const prudentGap = prudentDiffers(range?.prudent, headline.age)
  // What the answer's age can fund each month (engine/maxSpending.ts, after tax, today's dollars), and the age put in dates.
  const comfort = got?.comfort
  const stop = got?.stop ?? null
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
  // A person with no name is « Moi » / « Partenaire », as on the profile page.
  const names = profile.household.persons.map((p, i) => p.name.trim() || (i === 0 ? t.profile.self : t.profile.spouse))
  // « Mon plan » always says the age: each person's own retirement age, once when they agree (« 60 »), else « 60 / 62 ».
  const planAges = [...new Set(profile.household.persons.map((p) => p.retirementAge))].join(' / ')
  const label = useCallback(
    (s: Selection) => {
      if (s === 'plan') return r.compare.planAt(planAges)
      if (!isSplit(s)) return r.compare.age(s)
      const [a, b] = splitAges(s)
      return r.compare.split(names[0] ?? '', a, names[1] ?? '', b)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [r, names.join('|'), planAges],
  )
  const addSplit = (first: number, second: number) => {
    const s = splitOf(first, second)
    const cur = latest()
    if (!cur.includes(s)) commit(toggleSelection(cur, s))
  }
  // Any other age is typed: a box instead of one chip per age from today's to 70 — twenty look-alike pills were the page's
  // loudest row, and the three milestones plus the answer's own age are what people actually compare against.
  const [otherAge, setOtherAge] = useState<number | null>(null)
  const addAge = (age: number | null) => {
    setOtherAge(null)
    if (age === null) return
    const cur = latest()
    if (!cur.includes(age)) commit(toggleSelection(cur, age))
  }

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
          <Link className="btn btn--primary btn--sm" to="/">
            {r.gaps.toProfile}
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

  // What would make the answer more precise — detectable absences only, never a guess about what the household owns.
  const refine = [
    ...(profile.household.persons.some((p) => p.salaryToday > 0 && Object.keys(p.earningsHistory).length === 0) ? (['statement'] as const) : []),
    ...(profile.household.persons.every((p) => p.accounts.rrsp.balance + p.accounts.tfsa.balance + p.accounts.nonReg.balance === 0) ? (['accounts'] as const) : []),
    ...(profile.household.spending.workingToday <= 0 && !retiredNow ? (['spendingWork'] as const) : []),
  ]

  // The page's map, in reading order, one view at a time; a section that is not on the page has no chip.
  const navLinks =
    view === 'answer'
      ? [{ id: 'verdict', label: rc.nav.reponse }, ...(retiredNow ? [] : [{ id: 'solidite', label: rc.nav.solidite }]), { id: 'comparer', label: rc.nav.comparer }, ...(refine.length > 0 || accuracy.total > 0 ? [{ id: 'preciser', label: rc.nav.preciser }] : [])]
      : view === 'adjust'
        ? [...(retiredNow ? [] : [{ id: 'ajuster', label: rc.nav.ajuster }]), { id: 'epargner', label: rc.nav.epargner }, ...(retiredNow ? [] : [{ id: 'depenser', label: rc.nav.depenser }])]
      : view === 'strategies'
        ? [...(state.pensionsOpen ? [{ id: 'rentes', label: rc.nav.rentes }] : []), { id: 'ordre', label: rc.nav.ordre }]
        : [
            { id: 'donnees-calcul', label: rc.nav.chiffres },
            { id: 'tableau', label: rc.nav.tableau },
            { id: 'sensibilite', label: rc.nav.sensibilite },
            { id: 'parametres', label: rc.nav.parametres },
          ]

  // The headline sentence with its age drawn large: the copy marks where the age sits, the page splits it there.
  const sentence = retiredGlance ? rc.headline.retired(isCouple) : headline.kind === 'none' ? rc.headline.none(MAX_AGE) : headline.kind === 'now' ? rc.headline.now : rc.headline.at(AGE_TOKEN, isCouple)
  const [sentenceBefore, sentenceAfter] = sentence.split(AGE_TOKEN)
  const pct = (share: number) => formatPct(Math.min(1, share), lang, 0)
  const money = (n: number) => formatMoney(n, lang)
  // The answer as plain text, for a message or an email: read from the card as it is on screen, so it says exactly what the screen says, in
  // the reader's language, with the assumptions beside it. Handed to the browser's clipboard; nothing is sent anywhere.
  const copySummary = async () => {
    const card = document.getElementById('verdict')
    if (!card) return
    const text = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()
    const lines = [
      rc.out.printTitle,
      rc.out.summaryMade(month, year),
      names.join(' · '),
      '',
      ...[...card.querySelectorAll('.verdict__line, .verdict__note:not(.verdict__note--caveat), .verdict__dates-list li')].map((el) => (el.tagName === 'LI' ? '- ' : '') + text(el)),
      '',
      t.assumptions.presets.summary(formatPct(assumptions.inflation, lang, 1), formatPct(assumptions.wageGrowth, lang, 1), [assumptions.returns.rrsp, assumptions.returns.tfsa, assumptions.returns.nonReg].map((x) => formatPct(x, lang, 1)).join(' / '), assumptions.horizonAge),
      rc.out.summaryFoot,
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      notice(rc.out.copied)
    } catch {
      notice(rc.out.copyFailed, 'error')
    }
  }
  const confidenceLine = accuracy.total > 0 && (
    <p className="verdict__note refine__confidence">
      {accuracy.confirmed === accuracy.total ? rc.headline.confidenceAll : rc.headline.confidence(accuracy.confirmed, accuracy.total)}{' '}
      <Link className="info-note__link" to="/">
        {rc.headline.confidenceLink}
      </Link>
    </p>
  )

  return (
    <section className="page-body results-page" ref={pinned}>
      {printing && (
        <header className="print-head">
          <p className="print-head__title">{rc.out.printTitle}</p>
          <p>{rc.out.printedOn(month, year)} · {names.join(' · ')}</p>
        </header>
      )}
      <PageHead title={r.title} />
      {/* The three views stay pinned under the top bar while the page scrolls; the map of the open view pins under them from 860 px (usePinOffset measures both). */}
      <div className="results-pin">
        <SubTabs
          ariaLabel={rc.tabs.label}
          value={view}
          onSelect={(v) => setParam('v', v === 'answer' ? null : v)}
          options={[
            { key: 'answer' as const, label: rc.tabs.answer },
            { key: 'adjust' as const, label: rc.tabs.adjust },
            { key: 'strategies' as const, label: rc.tabs.strategies },
            { key: 'verify' as const, label: rc.tabs.verify },
          ]}
        />
      </div>
      <SectionNav links={navLinks} ariaLabel={rc.nav.label} />

      {/* 1 — what you asked: the answer, then the same answer compared, costed and dated. */}
      {view === 'answer' && (
        <section className="arc" aria-label={rc.tabs.answer}>
          <div id="verdict" className={'verdict surface results-section' + (answer.busy ? ' is-busy' : '')} aria-live="polite" aria-busy={answer.busy || undefined}>
            {answerPending ? (
              <Skeleton count={3} className="skeleton--verdict" />
            ) : (
              <>
              <p className="verdict__line">
                {sentenceAfter === undefined ? (
                  sentenceBefore
                ) : (
                  <>
                    <span className="verdict__lead">{sentenceBefore}</span>
                    <span className="verdict__big">
                      <strong className="verdict__age">{rc.headline.ageText(headline.age!)}</strong>
                      {sentenceAfter}
                    </span>
                  </>
                )}
              </p>
              {retiredGlance ? (
                <>
                  <p className="verdict__note">
                    {retiredGlance.now.ok ? rc.headline.holds(assumptions.horizonAge) : rc.headline.runsOut(at(retiredGlance.now.firstShortfallYear! - 1))}{' '}
                    {activePreset ? rc.headline.scenario(t.assumptions.presets[activePreset]) : rc.headline.scenarioCustom}
                  </p>
                  {activePreset !== 'prudent' && (retiredGlance.prudent.ok !== retiredGlance.now.ok || retiredGlance.prudent.firstShortfallYear !== retiredGlance.now.firstShortfallYear) && (
                    <p className="verdict__note">{rc.headline.retiredPrudent(t.assumptions.presets.prudent, retiredGlance.prudent.ok, retiredGlance.prudent.firstShortfallYear === null ? null : at(retiredGlance.prudent.firstShortfallYear - 1))}</p>
                  )}
                </>
              ) : headline.kind === 'none' ? (
                <>
                  {/* The WORST answer must be the most actionable one: the nudge carries its doors, and each door opens. */}
                  <p className="verdict__note">{rc.headline.tryThis}</p>
                  <Cluster>
                    <Chip icon="caret-down-bold" onClick={() => goTo('adjust', 'depenser')}>{rc.headline.trySpend}</Chip>
                    <Chip to="/hypotheses">{rc.refine.toAssumptions}</Chip>
                    <Chip onClick={() => goTo('verify', 'donnees-calcul')}>{rc.headline.tryLedger}</Chip>
                  </Cluster>
                </>
              ) : (
                <>
                  <p className="verdict__note">
                    {rc.headline.holds(assumptions.horizonAge)} {activePreset ? rc.headline.scenario(t.assumptions.presets[activePreset]) : rc.headline.scenarioCustom}
                  </p>
                  {/* The answer in dates: the year each person reaches the age, and when the pensions carry the spending by themselves. */}
                  {stop !== null && (
                    <div id="arreter" className="verdict__dates">
                      <p className="verdict__range-title">{rc.questions.stop.title}</p>
                      <ul className="verdict__dates-list">
                        {stop.years.map((y, i) => (
                          <li key={y.id}>{rc.questions.stop.when(names[i] ?? '', formatYearAge(y.year, births[i] === undefined ? [] : [births[i]], lang))}</li>
                        ))}
                        <li>{stop.pensionsStarted ? rc.questions.stop.share(pct(stop.pensionShare), at(stop.firstYear)) : rc.questions.stop.shareNone(at(stop.firstYear))}</li>
                        {stop.allStarted !== null && <li>{rc.questions.stop.shareAll(pct(stop.allStarted.share), at(stop.allStarted.year))}</li>}
                        <li>{stop.pensionsCoverFrom === null ? rc.questions.stop.neverCovers : rc.questions.stop.coversFrom(at(stop.pensionsCoverFrom))}</li>
                      </ul>
                    </div>
                  )}
                  {/* The one lever a reader reaches for first (« could we live on less? ») is a section away: a door to it, on the card. */}
                  <Cluster>
                    <Chip icon="caret-down-bold" onClick={() => goTo('adjust', 'depenser')}>{rc.headline.trySpend}</Chip>
                  </Cluster>
                </>
              )}
              </>
            )}
            {headline.age !== null && !retiredNow && comfort !== undefined && (
              <p className="verdict__note">
                {comfort === null ? mc.income.none(headline.age) : mc.income.line(headline.age, money(Math.round(comfort / 12 / 10) * 10), money(Math.round(profile.household.spending.retiredToday / 12 / 10) * 10))} {mc.income.note}
              </p>
            )}
            {/* The answer is an estimate under stated assumptions, and it says so where it is read — quietly: it must
                be present, not compete with the answer. */}
            <p className="verdict__note verdict__note--caveat">{r.verdict.caveat}</p>
            <p className="verdict__note">{rc.out.vintage(vintage.year, longDate(vintage.newestRead, lang))}{year > vintage.year ? ' ' + rc.out.vintageProjected(vintage.year, year) : ''}</p>
          </div>

          {!answerPending && gaps.length === 0 && <TimelineStrip household={profile.household} names={names} todayYear={year} horizonAge={assumptions.horizonAge} />}
          {!answerPending && gaps.length === 0 && <HowToRead />}

          {/* How firm the answer is: the same plan under the three scenarios and a hard market side by side, then what would move it. Rows from the first paint. */}
          {!retiredNow && (
            <div id="solidite" className="surface results-section firm" aria-label={rc.headline.firmTitle}>
              <SectionHeader title={rc.headline.firmTitle} />
              <div className="firm__pair">
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
                {range !== undefined && prudentGap && (
                  <Cluster className="verdict__gap">
                    <p className="verdict__note">{rc.headline.rangeGap}</p>
                    <Chip onClick={() => goTo('verify', 'sensibilite')}>{rc.headline.trySensitivity}</Chip>
                  </Cluster>
                )}
              </div>
              {/* The same plan under a hard stretch of markets: the order of the years, said where the answer is read. */}
              <div className="verdict__range">
                <p className="verdict__range-title">{mc.stress.title}</p>
                <dl className="verdict__range-list">
                  {(['smooth', ...STRESS_PRESETS] as const).map((k) => (
                    <div key={k} className={'verdict__range-item' + (pathName === k ? ' is-on' : '')}>
                      <dt>{mc.path.names[k]}</dt>
                      <dd className="mono">{stress === undefined ? '…' : stress[k] === null ? mc.stress.none(MAX_AGE) : mc.stress.age(stress[k]!)}</dd>
                    </div>
                  ))}
                </dl>
                <p className="verdict__note">
                  {pathName !== 'smooth' && <>{mc.stress.active(mc.path.names[pathName])} </>}
                  {mc.stress.hint}{' '}
                  <Link className="info-note__link" to="/hypotheses">
                    {mc.stress.link}
                  </Link>
                </p>
              </div>
                </div>
            </div>
          )}

          {/* Every departure-age comparison — the chips, the cards, the chart and (for a couple) « Chacun de son côté » —
              is ONE section: the same runs, seen as cards, as a picture, and per person. */}
          <section id="comparer" className="results-section" aria-label={r.compare.label}>
            <SectionHeader title={r.compare.label} subtitle={headline.earlierAge !== null && headline.earlierShortfallYear !== null ? rc.headline.earlier(headline.earlierAge, at(headline.earlierShortfallYear - 1)) : undefined} />
            {!retiredNow && (
              <div className="compare" ref={compareRef}>
                <Rail role="group" aria-label={r.compare.label}>
                  <Chip selected={selections.includes('plan')} onClick={() => toggle('plan')}>
                    {r.compare.planAt(planAges)}
                  </Chip>
                  {milestoneAges(earliest, selections, firstAge).map((age) => (
                    // The answer's own age wears a quiet accent dot: the one number the reader most wants to compare against.
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
                <div className="compare__other">
                  <label className="field-row__label" htmlFor="compare-other-age">
                    {r.compare.otherAge}
                  </label>
                  <NumberField kind="int" allowEmpty min={firstAge} max={MAX_AGE} unit={t.fields.years} value={otherAge} onChange={addAge} id="compare-other-age" disabled={selections.length >= MAX_SELECTIONS} />
                </div>
                {selections.length >= MAX_SELECTIONS && <p className="field-row__hint">{r.compare.max}</p>}
                {selections.includes('plan') && <p className="field-row__hint">{r.compare.planHint}</p>}
              </div>
            )}

            {runsPending && <Skeleton count={2} variant="card" />}
            <ul className="scenarios">
              {runs.map(({ selection, result }, i) => (
                <li key={String(selection)} className={`scenario scenario--${SERIES_CLASS[i]} surface`}>
                  <p className="scenario__title">
                    <span className="scenario__swatch" aria-hidden="true" />
                    {r.scenario.retireAt(label(selection))}
                  </p>
                  <p className={'scenario__verdict' + (result.ok ? '' : ' scenario__verdict--short')}>{result.ok ? r.scenario.works(assumptions.horizonAge) : r.scenario.lastsUntil(at(result.firstShortfallYear! - 1))}</p>
                  <p className="scenario__worth mono">{r.scenario.endWorth(money(worthAtHorizon(result, dollars, assumptions)))}</p>
                </li>
              ))}
            </ul>
            {/* The unit of every figure of the comparison, said once. */}
            <p className="field-row__hint">{dollars === 'today' ? r.chart.todayHint : r.chart.nominalHint}</p>

            {runs.length > 0 && (
              <ChartPanel
                runs={runs}
                household={profile.household}
                names={names}
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
            {!retiredNow && profile.plans.length > 0 && (
              <div className="surface">
                <PlansCompare profile={slow} enabled={answered && firstSearchesIn} />
              </div>
            )}
          </section>

          {/* The refinement loop: how much of the answer stands on the person's own documents, and the figures that would sharpen it — one block, not two. */}
          {(refine.length > 0 || accuracy.total > 0) && (
            <div id="preciser" className="surface results-section refine" aria-label={rc.refine.title}>
              <SectionHeader title={rc.refine.title} subtitle={refine.length === 0 ? undefined : headline.kind === 'none' && !retiredGlance ? rc.refine.hintNone : rc.refine.hint} />
              {confidenceLine}
              {movers.length > 0 && (
                <div className="refine__moves">
                  <p className="verdict__range-title">{rc.refine.moves}</p>
                  <ul className="refine__list">
                    {movers.map((f) => (
                      <li key={f.id}>
                        <span>{factName(f.id)}</span> <span className="mono">{rc.refine.swing(impact!.swings[f.id].years)}</span> <Chip to={`/?fact=${encodeURIComponent(f.id)}`}>{rc.refine.find}</Chip>
                      </li>
                    ))}
                  </ul>
                  <p className="verdict__note">{rc.refine.movesHint}</p>
                </div>
              )}
              {refine.length > 0 && (
                <ul className="refine__list">
                  {refine.map((k) => (
                    <li key={k}>
                      {rc.refine[k]} <Chip to="/">{rc.refine.toProfile}</Chip>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

        </section>
      )}

      {/* 2 — what to change: the changes ranked, the saving an age needs, the spending that moves it. Inputs of the plan, not of the future (those live on Hypothèses). */}
      {view === 'adjust' && (
        <section className="arc" aria-label={rc.tabs.adjust}>
          {/* What the household could DO about it — three ways of changing the plan, none of them an assumption (those live on Hypothèses): the changes ranked by the years they gain, the saving needed for an age, and the spending that moves it. */}
          <section id="ajuster" className="results-section ajuster" aria-label={rc.headline.adjustTitle}>
            <SectionHeader title={rc.headline.adjustTitle} />
            {!retiredNow && (
              <div className="surface">
                {/* The changes a household could make, each tried alone and ranked by the years it gains. */}
                <div className="verdict__range ajuster__levers">
                  <p className="verdict__range-title">{lc.title}</p>
                  <ul className="levers__list">
                    {(levers?.levers ?? (['spend10', 'save500', 'returns1', 'pensions70'] as const).map((id) => ({ id, earliest: null, yearsGained: null, endGain: null }))).map((l) => (
                      <li key={l.id} className="levers__item">
                        <span>{lc.names[l.id]}</span>
                        <span className="mono levers__result">
                          {levers === undefined
                            ? lc.pending
                            : l.earliest === null
                              ? lc.none
                              : l.yearsGained === null
                                ? lc.found(l.earliest)
                                : l.yearsGained > 0
                                  ? lc.gain(l.yearsGained, l.earliest)
                                  : l.yearsGained === 0
                                    ? lc.same
                                    : lc.later(-l.yearsGained, l.earliest)}
                          {levers !== undefined && l.endGain !== null && Math.abs(l.endGain) >= 1000 && (
                            <span className="levers__end">{lc.end((l.endGain > 0 ? '+' : '−') + formatCompactMoney(Math.abs(l.endGain), lang))}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="verdict__note">{lc.hint}</p>
                </div>
              </div>
            )}
          </section>

            <section id="epargner" className="results-section" aria-label={rc.questions.tabs.save}>
              <SectionHeader title={rc.questions.tabs.save} />
              <SaveView household={profile.household} assumptions={assumptions} age={saveAge} onAge={(a) => setParam('age', String(a))} minAge={firstAge} maxAge={MAX_AGE} />
            </section>
            {!retiredNow && (
              <section id="depenser" className="results-section" aria-label={rc.questions.tabs.spend}>
                <SectionHeader title={rc.questions.tabs.spend} />
                <SpendView household={profile.household} assumptions={assumptions} spend={spend} onSpend={(v) => setParam('spend', v === null ? null : String(v))} earliest={earliest} now={nowOk} maxAge={MAX_AGE} />
              </section>
            )}
        </section>
      )}

      {/* 2 — two decisions: when to start the QPP and the OAS, and in which order to draw the accounts. Once every start is behind the household, nothing to choose. */}
      {view === 'strategies' && (
        <section className="arc" aria-label={rc.tabs.strategies}>
          {state.pensionsOpen && (
            <section id="rentes" className="results-section" aria-label={rc.pensions.title}>
              <SectionHeader title={rc.pensions.title} subtitle={rc.pensions.hint} />
              <BridgePanel household={profile.household} assumptions={assumptions} names={names} />
            </section>
          )}
          <section id="ordre" className="results-section" aria-label={rc.orders.title}>
            <SectionHeader title={rc.orders.title} />
            {/* The age is the answer's; when no age works, the plan's own. Never the « Combien épargner ? » box from another view. */}
            <OrderPanel household={profile.household} assumptions={assumptions} age={earliest ?? Math.min(MAX_AGE, Math.max(firstAge, profile.household.persons[0].retirementAge))} firstAge={firstAge} />
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
            {runsPending && <Skeleton count={6} />}
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

      {/* On paper the plan is the open view AND what a reader checks it against, whichever view that is: the year by year and the cited figures. */}
      {printing && view !== 'verify' && (
        <section className="arc print-appendix" aria-label={rc.tabs.verify}>
          <section className="results-section" aria-label={r.table.title}>
            <SectionHeader title={r.table.title} />
            <YearTables runs={runs} label={label} dollars={dollars} todayYear={year} inflation={assumptions.inflation} />
          </section>
          <section className="results-section" aria-label={r.params.title}>
            <SectionHeader title={r.params.title} />
            <ParamsPanel />
          </section>
        </section>
      )}
      {printing && <p className="print-foot">{rc.out.printFoot}</p>}

      {/* Paper is how a plan leaves the device without a network: print.css already makes the page a clean flow. */}
      <Cluster className="no-print">
        {view === 'answer' && !answerPending && gaps.length === 0 && <Chip onClick={copySummary}>{rc.out.copy}</Chip>}
        <Chip icon="printer-bold" onClick={() => window.print()}>
          {rc.out.print}
        </Chip>
      </Cluster>
      <NextStep to="/hypotheses" label={t.next.adjustAssumptions}>
        <p>{t.next.resultsHint}</p>
      </NextStep>
    </section>
  )
}
