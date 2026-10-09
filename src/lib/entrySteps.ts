import { DOC_IDS, factsOf, type DocId } from './facts.ts'
import type { Profile } from './schema.ts'
import { docApplies } from './situation.ts'

// « SAISIE PAR DOCUMENT » — the order a person types a full profile in when they hold the documents: first who they are, then ONE DOCUMENT AT A TIME,
// each step showing only the figures that document holds. The steps are the profile's own documents (facts.ts), so a step can never ask for a figure the
// profile does not use, and a figure the profile uses is always in some step (e2e/saisie.spec.ts walks them all against the full form).

export type StepId = 'you' | DocId

export interface Step {
  id: StepId
  /** The document the step is read from; null for the first step (who the household is). */
  doc: DocId | null
}

/** The first step, then the documents in the order a person is likely to have them to hand (the checklist's own order). */
export const ENTRY_STEPS: readonly Step[] = [{ id: 'you', doc: null }, ...DOC_IDS.map((doc): Step => ({ id: doc, doc }))]

/** The steps this household walks: the first, then the documents it has use for (the one it stands on is always kept, so a link never strands it). */
export function stepsFor(profile: Profile, yes: ReadonlySet<string>, current?: StepId): Step[] {
  const people = profile.household.persons
  return ENTRY_STEPS.filter((s) => {
    if (s.doc === null || s.id === current) return true
    const doc = s.doc
    return doc === 'home' || doc === 'budget' ? docApplies(profile, yes, doc) : people.some((p) => docApplies(profile, yes, doc, p.id))
  })
}

export const stepById = (id: string | null): Step => ENTRY_STEPS.find((s) => s.id === id) ?? ENTRY_STEPS[0]

/** The figures of this step the household has (a mortgage only with a mortgage…), as the ids the profile confirms. */
export function stepFactIds(step: Step, profile: Profile): string[] {
  return step.doc === null ? [] : factsOf(profile).filter((f) => f.doc === step.doc).map((f) => f.id)
}

/** How many of them are confirmed, and how many there are. */
export function stepProgress(step: Step, profile: Profile): { confirmed: number; total: number } {
  const ids = stepFactIds(step, profile)
  const done = new Set(profile.confirmed)
  return { confirmed: ids.filter((id) => done.has(id)).length, total: ids.length }
}

const KEY = 'horizon-entry-step'

/** Where the person stopped last time, kept on this device like the checklist's ticks; null when never or when nothing can be kept. */
export function lastStep(): StepId | null {
  try {
    const v = localStorage.getItem(KEY)
    return ENTRY_STEPS.some((s) => s.id === v) ? (v as StepId) : null
  } catch {
    return null
  }
}

export function rememberStep(id: StepId): void {
  try {
    localStorage.setItem(KEY, id)
  } catch {
    /* nothing kept: the address still says where the person is */
  }
}
