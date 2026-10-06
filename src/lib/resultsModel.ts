import { everyoneAt, runScenario } from '../engine/retireAt.ts'
import type { AgeResult, Assumptions, Household, Scenario } from '../engine/types.ts'
import type { Profile } from './schema.ts'

// What the results page asks of the engine, kept out of the page so it can be tested without a browser: how a
// stored profile becomes the engine's inputs, what the chips on the page mean, and what each one costs to run.

/** A comparison the person has switched on: « my plan » (each retires at their own age) or one age for everyone. */
export type Selection = 'plan' | number

export const MIN_AGE = 50
export const MAX_AGE = 70
export const MAX_SELECTIONS = 4

/**
 * What the page opens on when the address names no comparison: the household's OWN plan, beside one common
 * alternative — 65, or 60 when the plan already is 65 (two identical cards compare nothing). It used to open on
 * « 60 and 65 » whatever the profile said, so a household planning to retire at 55 saw neither its plan nor its date.
 */
export const defaultSelections = (household: Household): Selection[] => ['plan', household.persons[0].retirementAge === 65 ? 60 : 65]

export const assumptionsOf = (profile: Profile, today: { year: number; month: number }): Assumptions => ({ ...profile.assumptions, today })

export function scenarioOf(household: Household, selection: Selection): Scenario {
  return selection === 'plan' ? {} : everyoneAt(household, selection)
}

/** The age a selection stands for on the chart's axis: the profile's own, for « my plan » (the first person's). */
export const selectionAge = (household: Household, selection: Selection): number =>
  selection === 'plan' ? household.persons[0].retirementAge : selection

/** Run every selection in full (rows included): what the chart and the table draw. */
export function runSelections(profile: Profile, today: { year: number; month: number }, selections: readonly Selection[]): { selection: Selection; result: AgeResult }[] {
  const assumptions = assumptionsOf(profile, today)
  return selections.map((selection) => ({
    selection,
    result: runScenario(profile.household, assumptions, scenarioOf(profile.household, selection), selectionAge(profile.household, selection)),
  }))
}

/** `?ages=plan,60,65` → selections. Anything unreadable is dropped; no address at all → `fallback` (the household's defaults). */
export function parseSelections(text: string | null, fallback: readonly Selection[]): Selection[] {
  if (text === null) return [...fallback]
  const out: Selection[] = []
  for (const token of text.split(',')) {
    const sel: Selection | null = token === 'plan' ? 'plan' : /^\d{2}$/.test(token) && Number(token) >= MIN_AGE && Number(token) <= MAX_AGE ? Number(token) : null
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
