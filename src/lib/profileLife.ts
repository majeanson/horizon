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

/** The same event, with its figure its own: no longer an estimate. (The key is dropped, not set to undefined: a saved profile never carries it.) */
function owned(f: Flow): Flow {
  const { estimate: _estimate, ...rest } = f
  return rest
}

/**
 * Change an event. Typing another AMOUNT makes the figure the person's own, so it stops being an estimate; any other change (the name, the years) leaves the estimate
 * as it was, because the amount it rests on has not moved.
 */
export function updateFlow(p: Profile, index: number, change: (f: Flow) => Flow): Profile {
  const flows = p.household.flows ?? []
  if (index < 0 || index >= flows.length) return p
  const before = flows[index]
  const changed = change(before)
  if (changed === before) return p
  const next = normalFlow(p, changed.amount !== before.amount ? owned(changed) : changed)
  return { ...p, household: { ...p.household, flows: flows.map((f, i) => (i === index ? next : f)) } }
}

/** « Confirmer ce montant »: the person has checked the estimate and keeps it. The figure is unchanged; it is no longer an estimate. The same profile when it already was theirs. */
export function confirmFlow(p: Profile, index: number): Profile {
  const flows = p.household.flows ?? []
  if (index < 0 || index >= flows.length || flows[index].estimate === undefined) return p
  return { ...p, household: { ...p.household, flows: flows.map((f, i) => (i === index ? owned(f) : f)) } }
}

export function removeFlow(p: Profile, index: number): Profile {
  const flows = p.household.flows ?? []
  if (index < 0 || index >= flows.length) return p
  return { ...p, household: { ...p.household, flows: flows.filter((_, i) => i !== index) } }
}

// ── The budget entered by account (schema v20) ──────────────────────────────────────────────────────

type Split = NonNullable<Profile['household']['spendingSplit']>
const cents = (n: number) => Math.round(n * 100) / 100
const columnSum = (s: Split, k: 'working' | 'retired') => cents(s.rows.reduce((a, r) => a + r[k], 0))
/** The largest budget the profile keeps, a year (schema.ts: `household.spending`). */
const MAX_SPENDING = 1e8

/** A couple starts entering the budget by account: the joint account holds today's figures, each person's own spending starts at 0 — the total does not move. */
export function startSplit(p: Profile): Profile {
  if (p.household.spendingSplit || p.household.persons.length < 2) return p
  const { workingToday: working, retiredToday: retired } = p.household.spending
  const rows: Split['rows'] = [{ id: 'joint', working, retired }, ...p.household.persons.map((x) => ({ id: x.id, working: 0, retired: 0 }))]
  return { ...p, household: { ...p.household, spendingSplit: { rows } } }
}

/** Back to one figure: the total stays as it is, the parts are forgotten. */
export function stopSplit(p: Profile): Profile {
  if (!p.household.spendingSplit) return p
  const { spendingSplit: _gone, ...household } = p.household
  return { ...p, household }
}

/** One part of the split (the joint account, or a person's own spending), in either column; the two totals follow. */
export function setSplitRow(p: Profile, id: Split['rows'][number]['id'], patch: { working?: number; retired?: number }): Profile {
  const split = p.household.spendingSplit
  if (!split || !split.rows.some((r) => r.id === id)) return p
  // Each part is held so the TOTAL stays within what the profile keeps (1e8, schema.ts): three parts each at their own maximum would sum past it, and a
  // refused total stops every save after it.
  const fit = (k: 'working' | 'retired', v: number | undefined): number | undefined => (v === undefined ? undefined : Math.max(0, Math.min(v, MAX_SPENDING - split.rows.reduce((a, r) => a + (r.id === id ? 0 : r[k]), 0))))
  const w = fit('working', patch.working)
  const t = fit('retired', patch.retired)
  const row = split.rows.find((r) => r.id === id)!
  if ((w === undefined || w === row.working) && (t === undefined || t === row.retired)) return p
  const rows = split.rows.map((r) => (r.id === id ? { ...r, ...(w === undefined ? {} : { working: w }), ...(t === undefined ? {} : { retired: t }) } : r))
  return { ...p, household: { ...p.household, spendingSplit: { rows }, spending: { workingToday: columnSum({ rows }, 'working'), retiredToday: columnSum({ rows }, 'retired') } } }
}


/**
 * « Garder » for a care period tried on the results page: the household's plan gets ONE care expense under that label — a second « Garder » (the
 * sliders reset after the first, so the chip is live again) REPLACES the one kept, never adds a twin that counts the care twice. Matched by its label, as
 * the page's « déjà là » note matches it.
 */
export function keepFlowByLabel(p: Profile, flow: Flow): Profile {
  const index = (p.household.flows ?? []).findIndex((f) => f.kind === flow.kind && f.label === flow.label)
  return index < 0 ? addFlow(p, flow) : updateFlow(p, index, () => flow)
}

/**
 * The age part-time work is first offered to run until, when the person turns it on: three years past their retirement age — held within the
 * 50 to 80 the profile keeps (schema.ts `partTime.untilAge`), so someone who retires at 45 starts at 50, not at a 48 the schema refuses.
 */
export const partTimeSeed = (retirementAge: number): number => Math.min(80, Math.max(50, retirementAge + 3))
