import { leversFor, leversPassed, profileLevers, strategyKeysFor, type BridgeLevers, type BridgeSummary, type BridgeView, type BridgeYear, type StrategyKey } from '../engine/bridge.ts'
import type { ChartSeries } from '../components/charts/types.ts'
import type { Assumptions, Household, PersonId } from '../engine/types.ts'
import { SOURCE_COLOUR, SOURCE_CONCEPT } from './chartData.ts'
import type { StartMove } from './profileEdit.ts'
import { MAX_AGE, MIN_AGE } from './resultsModel.ts'

// What the « Mes années 60 à 70 » view keeps in the address bar, and the pure helpers around it: which strategy a set of
// levers is, the rows a window shows, and the one-sentence verdict. Like the comparison chips, every choice lives in the
// URL (`?bp=&bb=&bw=`) so a view can be bookmarked and the back button means what it says; nothing is hidden state. The AGES
// (retirement, QPP start, OAS start) are not in it: they are the profile's, edited in « Mes données » and Profil, and a
// strategy card writes them there.
//
//   bp  the person looked at (self | spouse)
//   bb  « 1 » when the other person starts their pensions at the same ages (a couple only)
//   bw  « plan » to show every year to the horizon (absent: the bridge years, 60 to 70)

export const RETIRE_RANGE = { min: MIN_AGE, max: MAX_AGE } as const

export type BridgeWindow = 'bridge' | 'plan'

export interface BridgeParams {
  levers: BridgeLevers
  window: BridgeWindow
}

/** The view's choices: who is looked at, the window and the other-person toggle from the address bar; the ages from the profile. */
export function parseBridgeParams(search: URLSearchParams, household: Household): BridgeParams {
  const asked = search.get('bp')
  const id: PersonId = household.persons.find((p) => p.id === asked)?.id ?? household.persons[0].id
  const own = profileLevers(household, id)
  return {
    levers: {
      id,
      retirementAge: Math.min(RETIRE_RANGE.max, Math.max(RETIRE_RANGE.min, own.retirementAge)),
      rrqStartAge: own.rrqStartAge,
      oasStartAge: own.oasStartAge,
      ...(search.get('bb') === '1' && household.persons.length > 1 ? { both: true } : {}),
    },
    window: search.get('bw') === 'plan' ? 'plan' : 'bridge',
  }
}

/** The address-bar keys for a set of levers: only what differs from the profile's own is written, so a link stays short. */
export function bridgeQuery(params: BridgeParams, household: Household): Record<string, string | null> {
  const l = params.levers
  return {
    bp: l.id === household.persons[0].id ? null : l.id,
    bb: l.both && household.persons.length > 1 ? '1' : null,
    bw: params.window === 'plan' ? 'plan' : null,
  }
}

/** The strategies the levers equal: the start ages AND whether the other person follows (the retirement age is the one being tested in every strategy). */
export function strategiesOf(levers: BridgeLevers, household: Household): StrategyKey[] {
  return strategyKeysFor(household).filter((key) => {
    const l = leversFor(key, household, levers.id, levers.retirementAge)
    return l.rrqStartAge === levers.rrqStartAge && l.oasStartAge === levers.oasStartAge && !!l.both === !!levers.both
  })
}

/**
 * What a tap on a way of starting writes to the profile: the start ages of EVERYONE the way moves — the person looked at, and with
 * « both defer to 70 » the other person too (the rest of the app reads the profile, never the address: a deferral kept only in `bb=`
 * was a plan the household believed it had stored) — each with the ages held before. null for a way no longer open (an age behind
 * someone, a pension already being paid: the engine's own `leversPassed`): its card is there to compare, and a tap must never store
 * a start the law no longer allows.
 */
export function strategyMoves(key: StrategyKey, household: Household, assumptions: Assumptions, cur: BridgeLevers): { levers: BridgeLevers; moves: StartMove[] } | null {
  const levers = leversFor(key, household, cur.id, cur.retirementAge)
  if (leversPassed(household, assumptions, levers)) return null
  const moved = levers.both ? household.persons : household.persons.filter((p) => p.id === levers.id)
  return { levers, moves: moved.map((p) => ({ id: p.id, rrq: levers.rrqStartAge, oas: levers.oasStartAge, prevRrq: p.rrq.startAge, prevOas: p.oas.startAge })) }
}

/** The years a window shows: the bridge years are the person's 60th to 70th year; the plan is every year to the horizon. */
export function windowRows(rows: readonly BridgeYear[], window: BridgeWindow): BridgeYear[] {
  return window === 'plan' ? [...rows] : rows.filter((r) => r.age >= 60 && r.age <= 70)
}

/** What the one-sentence verdict says, before any words: the copy turns it into a sentence in either language. */
export type Verdict =
  | { kind: 'holds'; defers: boolean; horizonAge: number }
  | { kind: 'fails'; defers: boolean; age: number; standardHolds: boolean; standardAge: number | null }

/** Does the strategy start a pension later than 65? */
export const defers = (l: BridgeLevers): boolean => l.rrqStartAge > 65 || l.oasStartAge > 65

export function verdictOf(l: BridgeLevers, summary: BridgeSummary, standard: BridgeSummary, horizonAge: number): Verdict {
  if (summary.ok) return { kind: 'holds', defers: defers(l), horizonAge }
  return { kind: 'fails', defers: defers(l), age: summary.firstShortfallAge ?? 0, standardHolds: standard.ok, standardAge: standard.firstShortfallAge }
}

/** The bar chart's rows: each year's sources (and the nest drawn), as plain numbers keyed by the segment ids below. */
export const SEGMENTS = ['work', 'db', 'rrq', 'oas', 'credits', 'nest'] as const
export type SegmentId = (typeof SEGMENTS)[number]
/** The bars of these years are the sources chart's own (lib/chartData.ts): one colour per kind of money, whichever page draws it. */
export const SEGMENT_COLOUR: Record<SegmentId, (typeof SOURCE_COLOUR)[SegmentId]> = SOURCE_COLOUR
export const SEGMENT_CONCEPT: Record<SegmentId, (typeof SOURCE_CONCEPT)[SegmentId]> = SOURCE_CONCEPT

export function barRows(rows: readonly BridgeYear[]): ({ x: number; need: number } & Record<SegmentId, number>)[] {
  return rows.map((r) => ({ x: r.age, need: r.spending + r.tax, work: r.employment, db: r.db, rrq: r.rrq, oas: r.oas + r.gis, credits: r.credits, nest: r.drawn }))
}

/**
 * What the view says about itself, from the answer that is ON SCREEN. While a new answer is being worked out the old one
 * stays visible (a tap must not blank the page), so the sentence, the pressed strategy and the markers must be read from
 * the levers that answer was computed FOR (`view.selected.levers`), never from the controls, which already hold the new ones.
 */
export function shownPlan(
  view: { selected: { levers: BridgeLevers; rows: readonly BridgeYear[]; summary: BridgeSummary }; strategies: readonly { key: StrategyKey; summary: BridgeSummary }[] } | null,
  levers: BridgeLevers,
  household: Household,
  horizonAge: number,
): { shown: BridgeLevers; pressed: StrategyKey[]; endAge: number; verdict: Verdict | null } {
  const shown = view ? view.selected.levers : levers
  const standard = view?.strategies.find((s) => s.key === 'standard')
  // The plan's last year as the age of the person looked at: the age the table, the matrix and « tient jusqu'à » all use.
  const endAge = view?.selected.rows[view.selected.rows.length - 1]?.age ?? horizonAge
  return { shown, pressed: strategiesOf(shown, household), endAge, verdict: view && standard ? verdictOf(shown, view.selected.summary, standard.summary, endAge) : null }
}

/** The scenarios a strategy is held to, in the order the cards mark them. */
const HELD_UNDER = ['prudent', 'neutral', 'bold'] as const

interface Sturdiest {
  key: StrategyKey
  /** How many of the three scenarios its money lasts under (0–3). */
  holds: number
  /** The runner-up's count — the reason says « in all three, where the next one holds in two ». */
  next: number
}

/**
 * THE STURDIEST WAY TO START, by a rule anyone can check on the cards: the one whose money lasts under the MOST of the three
 * scenarios, then the one that leaves the most at the end of the plan (the 95-year figure the card prints; the lowest nest of the
 * bridge years when the plan ends before it), then the standard way, then the person's own. It is a sturdiness, not a payout: a way
 * that leaves more at 95 has not paid more over a life (the card's « encaissé » says that). null when nothing sets one apart — every
 * way equal under every scenario and in what it leaves — or while the scenarios are still being worked out. A way no longer open to the
 * person (`passed`: an age behind them, or a pension already paid) is never crowned, whatever its figures: it is not a way to start.
 */
export function sturdiest(all: readonly { key: StrategyKey; summary: BridgeSummary; passed?: boolean }[], matrix: Record<StrategyKey, Record<'prudent' | 'neutral' | 'bold', { ok: boolean }>> | null): Sturdiest | null {
  const strategies = all.filter((s) => !s.passed)
  if (matrix === null || strategies.length < 2) return null
  const left = (s: BridgeSummary): number => s.netWorth95 ?? s.lowestNest?.amount ?? -1e15
  const holds = (k: StrategyKey): number => HELD_UNDER.filter((p) => matrix[k]?.[p]?.ok).length
  const order: StrategyKey[] = ['standard', 'mine']
  const rank = (k: StrategyKey): number => (order.includes(k) ? order.indexOf(k) : order.length)
  const sorted = [...strategies].sort((a, b) => holds(b.key) - holds(a.key) || left(b.summary) - left(a.summary) || rank(a.key) - rank(b.key))
  const [best, second] = sorted
  const same = (a: { key: StrategyKey; summary: BridgeSummary }, b: { key: StrategyKey; summary: BridgeSummary }): boolean =>
    holds(a.key) === holds(b.key) && Math.abs(left(a.summary) - left(b.summary)) < 1
  if (same(best, second) && sorted.every((s) => same(best, s))) return null
  // A way that lasts under no scenario is not « sturdy »: say nothing rather than crown the least bad.
  if (holds(best.key) === 0) return null
  return { key: best.key, holds: holds(best.key), next: holds(second.key) }
}

/**
 * The four lines of the bridge pictures: the plan on screen and the three ways of starting the pensions. `total` is the nest at the end of each year, over the years on screen (`first` to `last`);
 * `guaranteed` is what the pensions pay a year without drawing on it, from `first` to the END of the plan (what waiting buys is seen over the rest of the plan).
 */
export function bridgeLines(
  view: Pick<BridgeView, 'selected' | 'strategies'>,
  of: 'total' | 'guaranteed',
  window: { first: number; last: number },
  labels: { selected: string; asap: string; standard: string; max: string },
): ChartSeries[] {
  const inWindow = (age: number) => age >= window.first && age <= window.last
  return [
    { id: 'selected', label: labels.selected, colour: 'accent' as const, key: null },
    { id: 'asap', label: labels.asap, colour: 'sky' as const, key: 'asap' as const },
    { id: 'standard', label: labels.standard, colour: 'sage' as const, key: 'standard' as const },
    { id: 'max', label: labels.max, colour: 'berry' as const, key: 'max' as const },
  ].map((s) => ({
    id: s.id,
    label: s.label,
    colour: s.colour,
    points: (s.key === null ? view.selected.rows.map((r) => ({ year: r.year, age: r.age, total: r.nest.total, guaranteed: r.guaranteed })) : view.strategies.find((c) => c.key === s.key)!.nest)
      .filter((p) => (of === 'total' ? inWindow(p.age) : p.age >= window.first))
      .map((p) => ({ x: p.year, y: p[of] })),
  }))
}
