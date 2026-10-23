import { BRACKET_FILL_COPY } from './bracketFillCopy'
import { SPOUSE_BALANCE_COPY } from './spouseBalanceCopy'
import { useDeferredValue, useMemo } from 'react'
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
import { usePrinting } from './usePrinting'
import { useSettled } from './useSettled'
import { useNotice } from './toast'
import { MARKET_COPY } from './marketCopy'
import { LEVERS_COPY } from './leversCopy'
import { formatMoney } from './money'
import { profileGaps } from './profileGaps'
import { MAX_AGE, assumptionsOf, parseSelections, type Selection } from './resultsModel'
import { accuracyOf } from './facts'
import { parseSpend } from './spendModel'
import type { LeverId } from '../engine/levers'
import { CARE_START, parseCare } from './careModel'
import { useProfile } from './store'
import { today } from './today'
import { useResultsAddress } from './useResultsAddress'
import { useResultsComparisons } from './useResultsComparisons'
import { useResultsSearches } from './useResultsSearches'
import { TOUR_STEPS, useResultsTour } from './useResultsTour'

// THE STATE OF THE RESULTS PAGE, in one hook: the settled profile, the searches run off the page’s thread, the address (`?v=&ages=&metric=…`),
// the comparisons the person has chosen, and the values the views read. It holds no JSX: the page (pages/Resultats.tsx) is the shell and each
// view (components/results/views/*) draws from the one object this returns, so a view has no state of its own to keep in step.
//
// It is the JOINT of four hooks that each own a concern and none the others': the address (lib/useResultsAddress.ts — which page, which card, how a link lands), the comparisons
// (useResultsComparisons.ts — the ages put side by side), the searches (useResultsSearches.ts — the workers behind the answer) and the tour (useResultsTour.ts). What stays here is
// what needs more than one of them: the settled profile, THE answer, the page's map and sentence, and the summary copied to the clipboard.

export { ANSWER_BLOCKS, PROOF_BLOCKS, STRATS } from './useResultsAddress'
export type { Essai, Strat, View } from './useResultsAddress'
export { TOUR_STEPS }

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
  const { year, month } = today()
  const slowAssumptions = useMemo(() => assumptionsOf(slow, { year, month }), [slow, year, month])
  // Everybody already stopped working: « when can I retire? » is answered, and what is left to say is whether the money lasts.
  const state = useMemo(() => retirementState(slow.household, slowAssumptions), [slow, slowAssumptions])
  const gaps = profileGaps(profile)
  const retiredNow = state.everyoneRetired && gaps.length === 0

  const address = useResultsAddress(retiredNow)
  const { params, setParams, setParam, view } = address
  const compare = useResultsComparisons(profile, state.everyoneRetired, params, setParam, gaps.length)
  const { selections, picked, names } = compare
  const metric: ChartMetric = params.get('metric') === 'income' ? 'income' : params.get('metric') === 'detail' ? 'detail' : 'netWorth'
  const dollars: Dollars = params.get('dollars') === 'nominal' ? 'nominal' : 'today'
  const assumptions = assumptionsOf(profile, { year, month })
  // A year is always said with the age(s) it comes with: « 2043 (63 ans) ».
  const births = profile.household.persons.map((p) => p.birth.year)
  const at = (y: number) => formatYearAge(y, births, lang)
  const isCouple = profile.household.persons.length === 2
  const accuracy = useMemo(() => accuracyOf(profile), [profile])

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
  const { earliestEachAnswer, range, stress, levers, unconfirmed, firstSearchesIn, impact } = useResultsSearches(slow, slowAssumptions, answered, isCouple, retiredNow)
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

  const headline = got?.headline ?? NO_HEADLINE
  const activePreset = presetOf(assumptions)
  const mc = MARKET_COPY[lang]
  const lc = LEVERS_COPY[lang]
  const pathName = assumptions.marketPath?.preset ?? 'smooth'
  // The change that brings the age forward most (« À faire cette année »): undefined while the levers are worked out, null when none does.
  const bestLever = levers === undefined ? undefined : (levers.levers.filter((l) => l.earliest !== null && (l.yearsGained ?? 0) > 0).sort((x, y) => (y.yearsGained ?? 0) - (x.yearsGained ?? 0))[0] as { id: LeverId; yearsGained: number; earliest: number } | undefined) ?? null
  const prudentGap = prudentDiffers(range?.prudent, headline.age)
  // What the answer's age can fund each month (engine/maxSpending.ts, after tax, today's dollars), and the age put in dates.
  const comfort = got?.comfort
  const stop = got?.stop ?? null

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

  const { tour, setTour, tourTarget } = useResultsTour(params, setParam, answered, retiredNow, headline.kind)

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
    // The answer is a card that « Tout fermer » shuts, and a shut card holds no sentence to read: open it, and read it once it is drawn.
    if (document.querySelector('#verdict .verdict__line') === null) {
      const next = new URLSearchParams(window.location.search)
      if (next.get('cartes') !== null) next.set('cartes', 'verdict')
      setParams(next, { replace: true })
      for (let i = 0; i < 60 && document.querySelector('#verdict .verdict__line') === null; i++) await new Promise((done) => requestAnimationFrame(done))
    }
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
    scrollTo: address.scrollTo,
    openBlock: address.openBlock,
    goTo: address.goTo,
    strat: address.strat,
    setStrat: address.setStrat,
    leversOpen: address.leversOpen,
    setLeversOpen: address.setLeversOpen,
    compareRef: compare.compareRef,
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
    pending: compare.pending,
    commit: compare.commit,
    toggle: compare.toggle,
    names,
    planAges: compare.planAges,
    label: compare.label,
    addSplit: compare.addSplit,
    otherAge: compare.otherAge,
    setOtherAge: compare.setOtherAge,
    addAge: compare.addAge,
    saveAge,
    spend,
    care,
    navLinks,
    essai: address.essai,
    essaiAll: address.essaiAll,
    essaiKeys: address.essaiKeys,
    setEssai: address.setEssai,
    gridsOpen: address.gridsOpen,
    setGridsOpen: address.setGridsOpen,
    sentence,
    sentenceBefore,
    sentenceAfter,
    pct,
    money,
    copySummary,
  }
}

export type ResultsModel = ReturnType<typeof useResultsPage>
