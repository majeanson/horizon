import { everyoneAt, runScenario } from '../engine/retireAt.ts'
import type { AgeResult, Assumptions, Household, Scenario } from '../engine/types.ts'
import type { Profile } from './schema.ts'

// What the results page asks of the engine, kept out of the page so it can be tested without a browser: how a
// stored profile becomes the engine's inputs, what the chips on the page mean, and what each one costs to run.

/**
 * A comparison the person has switched on: « my plan » (each retires at their own age), one age for everyone, or — for a
 * couple — a SPLIT: the first person at one age, the second at another, written `60-65` (profile order).
 */
export type Split = `${number}-${number}`
export type Selection = 'plan' | number | Split

export const MIN_AGE = 50
export const MAX_AGE = 70
export const MAX_SELECTIONS = 4

/**
 * What the page opens on when the address names no comparison: the household's OWN plan, beside one common
 * alternative — 65, or 60 when the plan already is 65 (two identical cards compare nothing). It used to open on
 * « 60 and 65 » whatever the profile said, so a household planning to retire at 55 saw neither its plan nor its date.
 */
export const defaultSelections = (household: Household, retired = false): Selection[] => (retired ? ['plan'] : ['plan', household.persons[0].retirementAge === 65 ? 60 : 65])

export const assumptionsOf = (profile: Profile, today: { year: number; month: number }): Assumptions => ({ ...profile.assumptions, today })

export const isSplit = (s: Selection): s is Split => typeof s === 'string' && s !== 'plan'
const inRange = (n: number) => n >= MIN_AGE && n <= MAX_AGE
export const splitOf = (first: number, second: number): Split => `${first}-${second}`
export const splitAges = (s: Split): [number, number] => {
  const [a, b] = s.split('-')
  return [Number(a), Number(b)]
}

export function scenarioOf(household: Household, selection: Selection): Scenario {
  if (selection === 'plan') return {}
  if (!isSplit(selection)) return everyoneAt(household, selection)
  const [first, second] = splitAges(selection)
  const [a, b] = household.persons
  // A split only means something for two people; for anyone else it falls back to « everyone at the first age ».
  return b ? { retirementAge: { [a.id]: first, [b.id]: second } } : everyoneAt(household, first)
}

/**
 * The age a selection stands for on the chart's axis: the profile's own, for « my plan » (the first person's retirement age),
 * and for a « chacun son âge » split the FIRST person's age — whichever of the two stops working earlier, so two selections
 * can share a marker.
 */
export const selectionAge = (household: Household, selection: Selection): number =>
  selection === 'plan' ? household.persons[0].retirementAge : isSplit(selection) ? splitAges(selection)[0] : selection

/** Run every selection in full (rows included): what the chart and the table draw. */
export function runSelections(profile: Profile, today: { year: number; month: number }, selections: readonly Selection[]): { selection: Selection; result: AgeResult }[] {
  const assumptions = assumptionsOf(profile, today)
  return selections.map((selection) => ({
    selection,
    result: runScenario(profile.household, assumptions, scenarioOf(profile.household, selection), selectionAge(profile.household, selection)),
  }))
}

/** `?ages=plan,60,60-65` → selections (`60-65`: the first person at 60, the second at 65). Anything unreadable is dropped; no address at all → `fallback` (the household's defaults). */
export function parseSelections(text: string | null, fallback: readonly Selection[]): Selection[] {
  if (text === null) return [...fallback]
  const out: Selection[] = []
  for (const token of text.split(',')) {
    const pair = /^(\d{2})-(\d{2})$/.exec(token)
    const sel: Selection | null =
      token === 'plan'
        ? 'plan'
        : /^\d{2}$/.test(token) && inRange(Number(token))
          ? Number(token)
          : pair && inRange(Number(pair[1])) && inRange(Number(pair[2])) && pair[1] !== pair[2]
            ? splitOf(Number(pair[1]), Number(pair[2]))
            : null
    if (sel !== null && !out.includes(sel)) out.push(sel)
  }
  return out.slice(0, MAX_SELECTIONS)
}

export const formatSelections = (selections: readonly Selection[]): string => selections.join(',')

/** Turn one selection on or off, never past the cap; order is kept (the chart's colours follow it). */
export function toggleSelection(selections: readonly Selection[], selection: Selection): Selection[] {
  if (selections.includes(selection)) return selections.filter((s) => s !== selection)
  return selections.length >= MAX_SELECTIONS ? [...selections] : [...selections, selection]
}

/**
 * The net worth at the end of a run, in the dollars the page is showing. The engine's own figure is NOMINAL (the dollars of
 * the last year, 2076 or so); the page defaults to today's dollars, and a card that quoted the nominal one beside a chart in
 * today's dollars showed the same plan as 1,5 M$ and 0,56 M$.
 */
export function worthAtHorizon(result: Pick<AgeResult, 'netWorthAtHorizon' | 'rows'>, dollars: 'today' | 'nominal', assumptions: Pick<Assumptions, 'inflation' | 'today'>): number {
  if (dollars === 'nominal') return result.netWorthAtHorizon
  const last = result.rows[result.rows.length - 1]
  return last ? result.netWorthAtHorizon / (1 + assumptions.inflation) ** (last.year - assumptions.today.year) : result.netWorthAtHorizon
}
