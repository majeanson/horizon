import { BRACKET_FILL_COPY } from './bracketFillCopy'
import { SPOUSE_BALANCE_COPY } from './spouseBalanceCopy'
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
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
import { answerRequest } from './answerRequest'
import { useRuns } from './useRuns'
import { scrollToSection, scrollToSectionWhenThere } from './motion'
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
import { MAX_AGE, assumptionsOf, defaultSelections, formatSelections, anchorOf, isSplit, pairSelection, parseSelections, splitAges, toggleSelection, type Selection } from './resultsModel'
import { accuracyOf, factsOf } from './facts'
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

export type View = 'answer' | 'decide' | 'proof'

/** The steps of the guided tour (`?visite=`). */
export const TOUR_STEPS = 2

/** The addresses of the days when the results had four views: each lands on the view that holds its content now. */
const LEGACY_VIEW: Readonly<Record<string, View>> = { adjust: 'decide', strategies: 'decide', future: 'decide', verify: 'proof' }

/** The what-ifs under « Décider » that open one at a time (an accordion, kept in the address): the age to aim at · the saving · the spending · a late-life care. The ranked changes are always on the page. */
export type Essai = 'target' | 'save' | 'spend' | 'care'

/** Which what-if a section id of the page belongs to (the ids stay the page's anchors; a link to one opens it). */
const ESSAI_OF: Readonly<Record<string, Essai>> = { viser: 'target', epargner: 'save', depenser: 'spend', soins: 'care' }

/** The strategies of « Décider », read one at a time (components/Accordion.tsx; the address keeps which, `?strat=`): the pensions · the order · the melting · the balance. */
export const STRATS = ['rentes', 'ordre', 'fonte', 'equilibre'] as const
export type Strat = (typeof STRATS)[number]
/** The blocks of « Preuve », the same way (`?bloc=`). */
/** The two cards under the answer's sentence (`?cartes=`): the comparison of departure ages and « À faire cette année ». */
export const ANSWER_BLOCKS = ['comparer', 'annee'] as const
export const PROOF_BLOCKS = ['solidite', 'donnees-calcul', 'tableau', 'precision', 'parametres'] as const

export const SERIES_CLASS = ['accent', 'sky', 'sage', 'berry'] as const

/** The ages offered as one-tap comparisons: the answer's own, the three milestones, and whatever is already chosen. */
export function milestoneAges(earliest: number | null, selections: readonly Selection[], firstAge: number): number[] {
  const wanted = [earliest, 60, 65, 70, ...selections.filter((s): s is number => typeof s === 'number')]
  return [...new Set(wanted.filter((a): a is number => a !== null && a >= firstAge && a <= MAX_AGE))].sort((a, b) => a - b)
}

export function useResultsPage() {
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
  const gaps = profileGaps(profile)
  const retiredNow = state.everyoneRetired && gaps.length === 0
  // A « chacun son âge » split names two people: on a one-person household it would only duplicate a plain age.
  const selections = parseSelections(params.get('ages'), defaultSelections(profile.household, state.everyoneRetired)).filter((s) => !isSplit(s) || profile.household.persons.length > 1)
  const metric: ChartMetric = params.get('metric') === 'income' ? 'income' : params.get('metric') === 'detail' ? 'detail' : 'netWorth'
  const dollars: Dollars = params.get('dollars') === 'nominal' ? 'nominal' : 'today'
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

  // The question put to the answer worker (the ages it starts from, whether everybody has stopped) is worked out in ONE place: lib/answerRequest.ts.
  const request = useMemo(() => answerRequest(slow, { year, month }), [slow, year, month])
  const { firstAge, youngest } = request
  // THE answer — the earliest age, « dès maintenant », the headline, the monthly comfort, the dates — is one job worked out
  // off the page's thread (lib/answer.ts): null until the first one is in (the card shows a skeleton), then the LAST one
  // while a re-asked question runs (the card says it is busy). Forty projections never again run between two taps.
  const answer = useAnswer(request, gaps.length === 0)
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
  // The profile the runs on screen were PROJECTED from, and its assumptions: what every figure read off them is deflated and marked with (useRuns `basis`)
  // — the live profile's inflation on rows projected under another said a « today's dollars » that matched neither plan while a new answer was worked out.
  const runsProfile = runsAnswer.basis ?? slow
  const runsAssumptions = useMemo(() => assumptionsOf(runsProfile, { year, month }), [runsProfile, year, month])
  const runsBirths = useMemo(() => runsProfile.household.persons.map((p) => p.birth.year), [runsProfile])

  // TWO PAGES, ONE LEVEL EACH (Marc, 2026-10-19: Profil and Hypothèses have no level above their cards, so Résultats has none either): « Résultats » (/resultats)
  // is the answer and, under it, its proof; « Décider » (/decider) is what to try and how to start and draw — a tab of its own. `view` is the page this hook
  // serves: 'answer' on /resultats (whose cards include the proof's), 'decide' on /decider. A link to a section of the OTHER page goes there (`goTo`).
  const { pathname, hash } = useLocation()
  const navigate = useNavigate()
  const view: View = pathname === '/decider' ? 'decide' : 'answer'
  // The days of the three views in one page left `?v=` in bookmarks (and four views before that): on /resultats, a deciding view goes to /decider with the rest of
  // its address, and a proof view stays here and lands on its section — and the ADDRESS follows, as the router's catch-all does for a path.
  const rawView = view === 'answer' ? params.get('v') : null
  const legacyTarget: View | null = rawView === null ? null : rawView === 'decide' || rawView === 'proof' || rawView === 'answer' ? rawView : (LEGACY_VIEW[rawView] ?? 'answer')
  // The what-ifs of « Décider » open one at a time. The address keeps it (`?essai=`; `none` is « all closed »); an address that carries one of their own keys (an old link with `?care=`,
  // `?spend=` or `?age=`) opens the matching one; a household that has stopped working has no spending to try, so it is offered the other two.
  const essaiKeys: Essai[] = retiredNow ? ['save', 'care'] : ['target', 'save', 'spend', 'care']
  const rawEssai = params.get('essai')
  const inferred: Essai | null = params.get('care') !== null ? 'care' : params.get('spend') !== null ? 'spend' : params.get('age') !== null ? 'save' : null
  // `?essai=all`: every what-if open at once (the same « Tout ouvrir » as the other pages); the view keeps which the reader shut since.
  const essaiAll = rawEssai === 'all'
  const essai: Essai | null = rawEssai === 'none' || essaiAll ? null : (essaiKeys.find((k) => k === rawEssai) ?? (inferred !== null && essaiKeys.includes(inferred) ? inferred : null))
  const setEssai = (next: Essai | null) => setParam('essai', next ?? 'none')
  // « Solidité »: the scenarios and a hard market are on the page; the 3 × 3 grids behind them open on request (a household that has stopped working has no age to range over: only the grids, open). The address keeps it (`?solidite=grids`).
  const gridsOpen = retiredNow || params.get('solidite') === 'grids'
  const setGridsOpen = (open: boolean) => setParam('solidite', open ? 'grids' : null)
  // The strategy open on « Décider » (`?strat=`; « none » is all closed; no key — undefined — lets the view open its first one). A link to one opens it (goTo below).
  const rawStrat = params.get('strat')
  const strat: Strat | null | undefined = rawStrat === null ? undefined : rawStrat === 'none' ? null : STRATS.find((k) => k === rawStrat)
  const setStrat = (next: Strat | null) => setParam('strat', next ?? 'none')
  // « Ce qui change le plus », the first card on « Décider »: open unless the address shut it (`?leviers=none`), so « Tout fermer » closes it with the rest (Marc,
  // 2026-10-20: it was a bare surface the switch never reached, and read as « the first one stayed open »). A household that has stopped working has no levers.
  const leversOpen = !retiredNow && params.get('leviers') !== 'none'
  const setLeversOpen = (open: boolean) => setParam('leviers', open ? null : 'none')
  // A what-if that came from one of its own keys is written down at once: when that key goes (« L'ajouter à mes événements » clears `?care=`), the reader stays where they are.
  useEffect(() => {
    if (view === 'decide' && essai !== null && rawEssai !== essai) setParam('essai', essai)
  }, [view, rawEssai, essai, setParam])
  useEffect(() => {
    if (legacyTarget === null) return
    const next = new URLSearchParams(window.location.search)
    next.delete('v')
    if (legacyTarget === 'decide') {
      // « Avenir » (`?v=future`) is gone: its care what-if is a thing to try under « Décider ».
      if (rawView === 'future') next.set('essai', 'care')
      navigate({ pathname: '/decider', search: next.toString() }, { replace: true })
      return
    }
    setParams(next, { replace: true })
    if (legacyTarget === 'proof') land(next.get('bloc') ?? 'solidite')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacyTarget])

  // The landing in progress (a wait for the anchor, then the hold): a new link or leaving the page cancels it, so two landings never fight over the scroll.
  const landing = useRef<() => void>(() => {})
  const land = (id: string) => {
    landing.current()
    landing.current = scrollToSectionWhenThere(id)
  }
  useEffect(() => () => landing.current(), [])
  const scrollTo = (id: string) => scrollToSection(id)
  /** What opening a section takes, written into an address: the block it sits in (accordions mount nothing while closed), and the « D’où vient l’argent »
   *  chart's card, ages view and « Détail » tab. Pure on the address, so a link to the OTHER page carries it there. */
  const opening = (target: View, id: string, next: URLSearchParams): void => {
    // The what-ifs and the 3 × 3 grids are folds that open on request.
    const wanted = target === 'decide' ? ESSAI_OF[id] : undefined
    if (wanted !== undefined && next.get('essai') !== 'all') next.set('essai', wanted)
    if (target === 'decide' && (STRATS as readonly string[]).includes(id)) next.set('strat', id)
    if (target === 'decide' && id === 'ajuster') next.delete('leviers')
    // Réponse's cards are all open unless the address closed some (`?cartes=`): a link to one opens it when it is shut.
    if (target === 'answer' && (ANSWER_BLOCKS as readonly string[]).includes(id) && next.get('cartes') !== null) next.set('cartes', id)
    if (target === 'answer' && id === 'graphique') {
      if (next.get('cartes') !== null) next.set('cartes', 'comparer')
      next.delete('cv')
      next.set('metric', 'detail')
    }
    if (target === 'proof') {
      if (id === 'sensibilite') next.set('solidite', 'grids')
      const block = id === 'sensibilite' ? 'solidite' : id
      if ((PROOF_BLOCKS as readonly string[]).includes(block) && next.get('bloc') !== 'tout') next.set('bloc', block)
    }
  }
  const pageOf = (target: View): View => (target === 'decide' ? 'decide' : 'answer')
  // A chip of the section map opens the block it names before the map scrolls to it. The proof's sections share Résultats with the answer's.
  // It lands the section itself (`true` to the map): ONE landing at a time for the page, the map's and a door's alike.
  const openBlock = (id: string): true => {
    const next = new URLSearchParams(window.location.search)
    opening(view === 'decide' ? 'decide' : (PROOF_BLOCKS as readonly string[]).includes(id) ? 'proof' : 'answer', id, next)
    setParams(next, { replace: true })
    // « D’où vient l’argent »: three taps deep is one tap from the map — its bars appear only once the card, the view and the tab are open, and the landing is
    // on the bars' title: the panel's top is three rows of pickers, a phone's whole screen.
    land(id === 'graphique' ? 'graphique-sources' : id)
    return true
  }
  // A link to a section: open what holds it, then land — on this page, or on the other one (the section in the address's # , landed on arrival below).
  const goTo = (target: View, wantedId: string) => {
    const next = new URLSearchParams(window.location.search)
    opening(target, wantedId, next)
    if (pageOf(target) === view) {
      setParams(next, { replace: true })
      return void land(wantedId)
    }
    navigate({ pathname: pageOf(target) === 'decide' ? '/decider' : '/resultats', search: next.toString(), hash: wantedId })
  }
  // Arriving with a section in the # (a link from the other page): land on it once it exists (the views are lazy chunks; ≤ 5 s).
  const [arrivedAt] = useState(() => anchorOf(hash))
  useEffect(() => {
    if (arrivedAt !== null) land(arrivedAt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivedAt])

  // Old deep links chose one question (`?q=save|stop`); the answers share the page now, so the link becomes a scroll
  // to its section, and the key is dropped from the address. Read once, at mount: stripping the key must not re-run
  // (and so cancel) the settling scroll below.
  const [legacyQ] = useState(() => params.get('q'))
  useEffect(() => {
    if (legacyQ !== 'save' && legacyQ !== 'stop') return
    setParam('q', null)
    // « Combien épargner ? » is a what-if of Décider (another page now); « Quand arrêter » stays here. The same landing as any link.
    if (legacyQ === 'save') goTo('decide', 'epargner')
    else land('arreter')
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  /** Add a couple's pair to the comparison; false when the pair is no selection (resultsModel `pairSelection`), so the caller does not switch to a view it did not change. */
  const addSplit = (first: number, second: number): boolean => {
    const s = pairSelection(first, second)
    if (s === null) return false
    const cur = latest()
    if (!cur.includes(s)) commit(toggleSelection(cur, s))
    return true
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

  // The answer's range while figures are estimates, replacing the plain count — only on a real answer (never retired, never « none »); the big age stays the base.
  // ONE home: the answer card words it, and the guided tour (components/results/TourBar.tsx) says the same numbers.
  const impactRange = impact?.range
  const showRange = !!impactRange && impactRange.low !== null && impactRange.low !== impactRange.high && !retiredNow && !retiredGlance && (headline.kind === 'at' || headline.kind === 'now') && accuracy.confirmed < accuracy.total
  const confidenceRange = showRange ? { low: impactRange.low!, high: impactRange.high } : null

  // THE GUIDED TOUR (`?visite=1..2`): two steps over THIS reader's own answer, each scrolling to a section of the answer view. The address keeps the step, so a reload resumes it
  // and a link shares it; any other value is no tour. It is offered only on a real answer ('at' / 'now') for a household still working: several steps speak of departure ages, and
  // a household that has already stopped (retiredNow) or whose money never lasts (« none ») has no age to walk through. Nothing opens it by itself.
  const tourRaw = params.get('visite')
  const tourStep = tourRaw !== null && new RegExp(`^[1-${TOUR_STEPS}]$`).test(tourRaw) ? Number(tourRaw) : 0
  const tourAvailable = answered && !retiredNow && headline.kind !== 'none'
  const tour = tourAvailable ? tourStep : 0
  const setTour = (step: number) => setParam('visite', step >= 1 && step <= TOUR_STEPS ? String(step) : null)
  // The section each step lands on.
  const tourTarget = (step: number): string => (step === 1 ? 'verdict' : 'comparer')
  // An unreadable step is dropped from the address at once; a tour that cannot apply (the answer arrived and it is « none », or everyone has stopped) is dropped once the answer is known.
  useEffect(() => {
    if (tourRaw !== null && (tourStep === 0 || (answered && !tourAvailable))) setParam('visite', null)
  }, [tourRaw, tourStep, answered, tourAvailable, setParam])

  // The page's map, in reading order; a section that is not on the page has no chip. On Résultats the proof follows the answer, its first chip under a « Preuve » label.
  const proofLinks = [
    { id: 'solidite', label: rc.nav.solidite, concept: 'solidite' as const, arc: rc.tabs.proof },
    { id: 'donnees-calcul', label: rc.nav.chiffres, concept: 'documents' as const },
    { id: 'tableau', label: rc.nav.tableau, concept: 'annee' as const },
    { id: 'precision', label: rc.nav.precision, concept: 'precision' as const },
    { id: 'parametres', label: rc.nav.parametres, concept: 'officiel' as const },
  ]
  const navLinks =
    view === 'answer'
      ? [{ id: 'verdict', label: rc.nav.reponse, concept: 'reponse' as const }, { id: 'comparer', label: rc.nav.comparer, concept: 'depart' as const }, { id: 'graphique', label: rc.nav.argent, concept: 'dollars' as const }, { id: 'annee', label: rc.nav.annee, concept: 'annee' as const }, ...proofLinks]
      : [{ id: 'essayer', label: rc.nav.essayer, concept: 'essayer' as const }, ...(state.pensionsOpen ? [{ id: 'rentes', label: rc.nav.rentes, concept: 'rrq' as const }] : []), { id: 'ordre', label: rc.nav.ordre, concept: 'ordre' as const }, { id: 'fonte', label: BRACKET_FILL_COPY[lang].nav, concept: 'fonte' as const }, ...(profile.household.persons.length > 1 ? [{ id: 'equilibre', label: SPOUSE_BALANCE_COPY[lang].nav, concept: 'reer' as const }] : [])]

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
    runsProfile,
    runsAssumptions,
    runsBirths,
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
    runs,
    runsPending,
    view,
    scrollTo,
    openBlock,
    goTo,
    strat,
    setStrat,
    leversOpen,
    setLeversOpen,
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
    confidenceRange,
    tour,
    setTour,
    tourTarget,
    pathName,
    bestLever,
    prudentGap,
    comfort,
    stop,
    pending,
    commit,
    toggle,
    names,
    planAges,
    label,
    addSplit,
    otherAge,
    setOtherAge,
    addAge,
    saveAge,
    spend,
    care,
    navLinks,
    essai,
    essaiAll,
    essaiKeys,
    setEssai,
    gridsOpen,
    setGridsOpen,
    sentence,
    sentenceBefore,
    sentenceAfter,
    pct,
    money,
    copySummary,
  }
}

export type ResultsModel = ReturnType<typeof useResultsPage>
