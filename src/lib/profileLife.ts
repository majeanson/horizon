import type { Flow, KidsEffects } from '../engine/types.ts'
import { addChild } from './profileEdit.ts'
import { MAX_FLOWS, type Profile } from './schema.ts'

// THE EDITS OF A LIFE BEYOND THE BUDGET (schema v16): what a child costs, and the dated flows. Pure functions from profile to profile like
// every edit in profileEdit.ts, kept in their own module because only the profile page ever calls them — the store (and so every page) reads
// profileEdit.ts, and these would ride in the shell for nothing.

type ChildSpending = NonNullable<Profile['household']['childSpending']>

const sameBands = (a: ChildSpending['byAge'], b: ChildSpending['byAge']) => (a ?? null) === (b ?? null) || (!!a && !!b && a.every((x, i) => x === b[i]))

/** What a child costs inside the budget until they leave home (null: it is not counted). */
export function setChildSpending(p: Profile, value: ChildSpending | null): Profile {
  const cur = p.household.childSpending ?? null
  const same = cur === value || (value !== null && cur !== null && cur.perChild === value.perChild && cur.untilAge === value.untilAge && (cur.onTop ?? false) === (value.onTop ?? false) && sameBands(cur.byAge, value.byAge))
  return same ? p : { ...p, household: { ...p.household, childSpending: value } }
}

/**
 * Change ONE part of what a child costs, leaving the rest as it is: the flat amount, the age they leave, the amounts by age band. What is left with no cost at
 * all (a flat 0 and no bands) is not counted (null). A part given as `null` is taken away (the bands).
 */
export function patchChildSpending(p: Profile, patch: { perChild?: number; untilAge?: number; byAge?: ChildSpending['byAge']; onTop?: boolean }): Profile {
  const cur: ChildSpending = p.household.childSpending ?? { perChild: 0, untilAge: 23 }
  const next: ChildSpending = { perChild: patch.perChild ?? cur.perChild, untilAge: patch.untilAge ?? cur.untilAge }
  const byAge = patch.byAge === undefined ? cur.byAge : patch.byAge
  if (byAge) next.byAge = byAge
  const onTop = patch.onTop === undefined ? cur.onTop : patch.onTop
  if (onTop) next.onTop = true
  return setChildSpending(p, next.perChild <= 0 && !next.byAge ? null : next)
}

/**
 * Change ONE part of what the household counts about its children (the benefits, the QPP exclusion, a parental leave), leaving the rest. Nothing counted at all is
 * null: a household that never says so projects as before.
 */
export function patchKidsEffects(p: Profile, patch: Partial<KidsEffects>): Profile {
  const cur: KidsEffects = p.household.kidsEffects ?? { benefits: false, qppExclusion: false, leave: null }
  const next: KidsEffects = { ...cur, ...patch }
  const value = !next.benefits && !next.qppExclusion && next.leave === null ? null : next
  const same = (p.household.kidsEffects ?? null) === value || (value !== null && p.household.kidsEffects != null && JSON.stringify(p.household.kidsEffects) === JSON.stringify(value))
  return same ? p : { ...p, household: { ...p.household, kidsEffects: value } }
}

/**
 * A child added through the family card: the child, and — if the household had not said anything yet — the benefits and the QPP exclusion counted (visible
 * switches beside the children turn them off). A household that already chose, either way, keeps its choice.
 */
export function addChildCounted(p: Profile, born: number): Profile {
  const added = addChild(p, born)
  return added === p || added.household.kidsEffects != null ? added : patchKidsEffects(added, { benefits: true, qppExclusion: true })
}

/** A flow as the page may hold it: a windfall is once and tax-free, an expense is not income, and an owner is someone who is in the household. */
function normalFlow(p: Profile, f: Flow): Flow {
  const fromYear = Math.min(2150, Math.max(2000, Math.round(f.fromYear)))
  const toYear = f.kind === 'windfall' ? fromYear : Math.min(2150, Math.max(fromYear, Math.round(f.toYear)))
  const owner = f.owner === 'spouse' && p.household.persons.length < 2 ? 'self' : f.owner
  return { ...f, fromYear, toYear, owner, taxable: f.kind === 'income' ? f.taxable : false }
}

export function addFlow(p: Profile, flow: Flow): Profile {
  const flows = p.household.flows ?? []
  if (flows.length >= MAX_FLOWS) return p
  return { ...p, household: { ...p.household, flows: [...flows, normalFlow(p, flow)] } }
}

export function updateFlow(p: Profile, index: number, change: (f: Flow) => Flow): Profile {
  const flows = p.household.flows ?? []
  if (index < 0 || index >= flows.length) return p
  const next = normalFlow(p, change(flows[index]))
  return { ...p, household: { ...p.household, flows: flows.map((f, i) => (i === index ? next : f)) } }
}

export function removeFlow(p: Profile, index: number): Profile {
  const flows = p.household.flows ?? []
  if (index < 0 || index >= flows.length) return p
  return { ...p, household: { ...p.household, flows: flows.filter((_, i) => i !== index) } }
}
