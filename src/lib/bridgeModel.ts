import { leversFor, profileLevers, strategyKeysFor, type BridgeLevers, type BridgeSummary, type BridgeYear, type StrategyKey } from '../engine/bridge.ts'
import type { Household, PersonId } from '../engine/types.ts'
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
export const SEGMENTS = ['work', 'db', 'rrq', 'oas', 'nest'] as const
export type SegmentId = (typeof SEGMENTS)[number]
export const SEGMENT_COLOUR = { work: 'ink', db: 'sky', rrq: 'sage', oas: 'berry', nest: 'accent' } as const

export function barRows(rows: readonly BridgeYear[]): ({ x: number; need: number } & Record<SegmentId, number>)[] {
  return rows.map((r) => ({ x: r.age, need: r.spending + r.tax, work: r.employment, db: r.db, rrq: r.rrq, oas: r.oas + r.gis, nest: r.drawn }))
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
