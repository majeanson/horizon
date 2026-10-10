import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePinOffset } from './pinOffset'
import { retirementState } from '../engine/ledger'
import { useLang, useT } from '../i18n'
import type { ChartMetric, Dollars } from './chartData'
import { presetOf } from '../engine/assumptionPresets'
import { formatPct, formatYearAge } from './format'
import { AGE_TOKEN, RESULTS_COPY } from './resultsCopy'
import { paramsVintage } from './vintage'
import { prudentDiffers } from './headline'
import { NO_HEADLINE } from './answer'
import { useAnswer } from './useAnswer'
import { useRuns } from './useRuns'
import { scrollToSection } from './motion'
import { usePrinting } from './usePrinting'
import { useSettled } from './useSettled'
import { useNotice } from './toast'
import { usePresetRange } from './usePresetEarliest'
import { useMarketRange } from './useMarketRange'
import { MARKET_COPY } from './marketCopy'
import { LEVERS_COPY } from './leversCopy'
import { useLevers } from './useLevers'
import { formatMoney } from './money'
import { profileGaps } from './profileGaps'
import { MAX_AGE, MIN_AGE, assumptionsOf, defaultSelections, formatSelections, isSplit, parseSelections, splitAges, splitOf, toggleSelection, type Selection } from './resultsModel'
import { accuracyOf, factsOf } from './facts'
import { GUIDE_COPY } from './guideCopy'
import { useFactImpact } from './useFactImpact'
import { parseSpend } from './spendModel'
import type { LeverId } from '../engine/levers'
import { CARE_START, parseCare } from './careModel'
import { useEarliestEach } from './useEarliestEach'
import { useProfile } from './store'
import { today } from './today'

// THE STATE OF THE RESULTS PAGE, in one hook: the settled profile, the searches run off the page’s thread, the address (`?v=&ages=&metric=…`),
// the comparisons the person has chosen, and the values the views read. It holds no JSX: the page (pages/Resultats.tsx) is the shell and each
// view (components/results/views/*) draws from the one object this returns, so a view has no state of its own to keep in step.

export type View = 'answer' | 'adjust' | 'strategies' | 'future' | 'verify'

export const SERIES_CLASS = ['accent', 'sky', 'sage', 'berry'] as const

/** The ages offered as one-tap comparisons: the answer's own, the three milestones, and whatever is already chosen. */
export function milestoneAges(earliest: number | null, selections: readonly Selection[], firstAge: number): number[] {
  const wanted = [earliest, 60, 65, 70, ...selections.filter((s): s is number => typeof s === 'number')]
  return [...new Set(wanted.filter((a): a is number => a !== null && a >= firstAge && a <= MAX_AGE))].sort((a, b) => a - b)
}

export function useResultsPage() {
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
  const view: View = params.get('v') === 'strategies' ? 'strategies' : params.get('v') === 'verify' ? 'verify' : params.get('v') === 'adjust' ? 'adjust' : params.get('v') === 'future' ? 'future' : 'answer'
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
  // The change that brings the age forward most (« À faire cette année »): undefined while the levers are worked out, null when none does.
  const bestLever = levers === undefined ? undefined : (levers.levers.filter((l) => l.earliest !== null && (l.yearsGained ?? 0) > 0).sort((x, y) => (y.yearsGained ?? 0) - (x.yearsGained ?? 0))[0] as { id: LeverId; yearsGained: number; earliest: number } | undefined) ?? null
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


  // « Combien épargner ? » keeps its own age in the address (`?age=`), independent of the comparisons.
  const wantedSaveAge = Number(params.get('age'))
  const saveAge = Number.isFinite(wantedSaveAge) && wantedSaveAge >= firstAge && wantedSaveAge <= MAX_AGE ? Math.round(wantedSaveAge) : Math.min(MAX_AGE, Math.max(firstAge, profile.household.persons[0].retirementAge))
  // « Et si je dépensais moins ? » keeps its what-if amount in the address (`?spend=`) too; absent, the slider sits on the profile's own.
  const spend = parseSpend(params.get('spend')) ?? profile.household.spending.retiredToday
  // « Et si les dernières années coûtaient plus cher ? » too (`?care=amount,age,years`); absent, the sliders sit on the starting figures.
  const care = parseCare(params.get('care')) ?? CARE_START

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
        : view === 'future'
          ? [{ id: 'soins', label: rc.nav.soins }, { id: 'annee', label: rc.nav.annee }]
        : [
            { id: 'precision', label: rc.nav.precision },
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


  return {
    pinned,
    printing,
    notice,
    vintage,
    t,
    lang,
    r,
    rc,
    profile,
    slow,
    params,
    setParams,
    year,
    month,
    slowAssumptions,
    state,
    retiredNow,
    selections,
    metric,
    dollars,
    gaps,
    assumptions,
    births,
    at,
    isCouple,
    accuracy,
    setParam,
    oldest,
    youngest,
    firstAge,
    answer,
    got,
    answerPending,
    earliest,
    nowOk,
    retiredGlance,
    answered,
    earliestEachAnswer,
    picked,
    runsAnswer,
    runs,
    runsPending,
    view,
    rawView,
    pendingScroll,
    scrollTo,
    goTo,
    legacyQ,
    compareRef,
    headline,
    activePreset,
    range,
    stress,
    mc,
    lc,
    levers,
    unconfirmed,
    firstSearchesIn,
    impact,
    gc,
    factName,
    movers,
    pathName,
    bestLever,
    prudentGap,
    comfort,
    stop,
    pending,
    agesNow,
    latest,
    commit,
    toggle,
    names,
    planAges,
    label,
    addSplit,
    otherAge,
    setOtherAge,
    addAge,
    wantedSaveAge,
    saveAge,
    spend,
    care,
    refine,
    navLinks,
    sentence,
    sentenceBefore,
    sentenceAfter,
    pct,
    money,
    copySummary,
  }
}

export type ResultsModel = ReturnType<typeof useResultsPage>
