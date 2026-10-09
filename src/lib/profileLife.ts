import type { Flow } from '../engine/types.ts'
import { MAX_FLOWS, type Profile } from './schema.ts'

// THE EDITS OF A LIFE BEYOND THE BUDGET (schema v16): what a child costs, and the dated flows. Pure functions from profile to profile like
// every edit in profileEdit.ts, kept in their own module because only the profile page ever calls them — the store (and so every page) reads
// profileEdit.ts, and these would ride in the shell for nothing.

/** What a child costs inside the budget until they leave home (null: it is not counted). */
export function setChildSpending(p: Profile, value: { perChild: number; untilAge: number } | null): Profile {
  const same = (p.household.childSpending ?? null) === value || (value !== null && p.household.childSpending?.perChild === value.perChild && p.household.childSpending?.untilAge === value.untilAge)
  return same ? p : { ...p, household: { ...p.household, childSpending: value } }
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
