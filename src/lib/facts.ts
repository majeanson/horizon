import type { PersonId } from '../engine/types.ts'
import type { InfoId } from '../i18n.ts'
import type { Profile } from './schema.ts'

// WHICH NUMBERS ARE REAL. Every figure a profile stands on is either something the person read off a document (« confirmed »)
// or something they typed from memory, or let an estimate fill in (« estimated »). The profile remembers which, per FACT — a
// fact being one figure the person has to find (their salary, their RRSP balance, the mortgage…), not one box: the earnings
// history is one fact however many years it has. A fact is confirmed only when the person says so (the check beside the field,
// or the end of a step in the guide): nothing is ever assumed real.
//
// This file is the one list of the facts, the document that holds each, and when each applies to a household. The meter, the
// checklist, the guide and the results' note all read it, so « 12 of 20 » means the same everywhere.

export type FactKind =
  | 'salary'
  | 'earnings'
  | 'residence'
  | 'rrspBalance'
  | 'rrspRoom'
  | 'rrspLocked'
  | 'tfsaBalance'
  | 'tfsaRoom'
  | 'nonRegBalance'
  | 'nonRegAcb'
  | 'pension'
  | 'spendingWorking'
  | 'spendingRetired'
  | 'homeValue'
  | 'mortgage'

export type DocId = 'rrq' | 'tax' | 'bank' | 'employer' | 'home' | 'budget' | 'residence'
/**
 * The documents that hold the real numbers, MOST IMPORTANT FIRST: the order of the checklist, of the entry by document and of the panel. Measured on the nine
 * example households (engine/factImpact.ts: each figure nudged 15 % each way, how many years the answer moves, summed per document): the spending
 * budget moves it most (about 4 years), then the tax notice — the salary and the room (about 2) — then the account balances (about 1), then the QPP
 * statement (about ½). The home, the employer pension and the proof of residence matter little on average and a great deal to whoever has them, so they
 * come last, the more common first.
 */
export const DOC_IDS: readonly DocId[] = ['budget', 'tax', 'bank', 'rrq', 'home', 'employer', 'residence']

export type FactOwner = PersonId | 'household'

interface FactDef {
  kind: FactKind
  doc: DocId
  owner: 'person' | 'household'
  /** The ⓘ entry that already says where the figure is (null: none — the guide's own note says it). */
  info: InfoId | null
  /** Is this figure one the household has? (A mortgage needs a mortgage; a pension plan, a plan.) */
  applies: (p: Profile, owner: FactOwner) => boolean
}

const person = (p: Profile, owner: FactOwner) => p.household.persons.find((x) => x.id === owner)

const FACTS: readonly FactDef[] = [
  { kind: 'salary', doc: 'tax', owner: 'person', info: 'salary', applies: (p, o) => (person(p, o)?.salaryToday ?? 0) > 0 },
  { kind: 'earnings', doc: 'rrq', owner: 'person', info: 'earnings', applies: () => true },
  // Only for someone who lived elsewhere after 18 (a residence that began later): for everyone else the OAS counts the years from 18, and nothing is asked.
  { kind: 'residence', doc: 'residence', owner: 'person', info: 'oasResidence', applies: (p, o) => { const x = person(p, o); return x !== undefined && x.oas.residentSince > x.birth.year + 18 } },
  { kind: 'rrspBalance', doc: 'bank', owner: 'person', info: 'rrspBalance', applies: () => true },
  { kind: 'rrspRoom', doc: 'tax', owner: 'person', info: 'rrspRoom', applies: () => true },
  // Only for someone who has a locked-in part: nothing is asked of anyone else.
  { kind: 'rrspLocked', doc: 'bank', owner: 'person', info: 'rrspLocked', applies: (p, o) => (person(p, o)?.accounts.rrsp.lockedIn ?? 0) > 0 },
  { kind: 'tfsaBalance', doc: 'bank', owner: 'person', info: 'tfsaBalance', applies: () => true },
  { kind: 'tfsaRoom', doc: 'tax', owner: 'person', info: 'tfsaRoom', applies: () => true },
  // Only for someone who holds money outside the REER and the CELI (« Ma situation »): nothing is asked of anyone else.
  { kind: 'nonRegBalance', doc: 'bank', owner: 'person', info: 'nonRegBalance', applies: (p, o) => { const a = person(p, o)?.accounts.nonReg; return a !== undefined && (a.balance > 0 || a.acb > 0 || a.annualContribution > 0) } },
  { kind: 'nonRegAcb', doc: 'bank', owner: 'person', info: 'nonRegAcb', applies: (p, o) => (person(p, o)?.accounts.nonReg.balance ?? 0) > 0 },
  { kind: 'pension', doc: 'employer', owner: 'person', info: 'dbService', applies: (p, o) => (person(p, o)?.pensions.length ?? 0) > 0 },
  { kind: 'spendingWorking', doc: 'budget', owner: 'household', info: 'spendingWorking', applies: () => true },
  { kind: 'spendingRetired', doc: 'budget', owner: 'household', info: 'spendingRetired', applies: () => true },
  { kind: 'homeValue', doc: 'home', owner: 'household', info: null, applies: (p) => !!p.household.home },
  { kind: 'mortgage', doc: 'home', owner: 'household', info: null, applies: (p) => (p.household.home?.mortgage.balance ?? 0) > 0 },
]

/** What a document holds: the figures (kinds) that name it, and whether each person has their own or the household has one. */
export function docFigures(doc: DocId): { kinds: FactKind[]; owner: 'person' | 'household' } {
  const own = FACTS.filter((f) => f.doc === doc)
  return { kinds: own.map((f) => f.kind), owner: own[0]?.owner ?? 'household' }
}

export const factId = (owner: FactOwner, kind: FactKind): string => `${owner}:${kind}`
/** What the saved profile may hold in `confirmed`: an owner and a kind, nothing else. */
export const FACT_ID_PATTERN = /^(self|spouse|household):[a-zA-Z]{3,20}$/

export interface Fact {
  id: string
  kind: FactKind
  doc: DocId
  owner: FactOwner
  info: InfoId | null
  confirmed: boolean
}

/** Every fact this household has, in the order of the form (the first person's, the second's, then the household's). */
export function factsOf(p: Profile): Fact[] {
  const confirmed = new Set(p.confirmed)
  const out: Fact[] = []
  const add = (owner: FactOwner, def: FactDef) => {
    if (!def.applies(p, owner)) return
    const id = factId(owner, def.kind)
    out.push({ id, kind: def.kind, doc: def.doc, owner, info: def.info, confirmed: confirmed.has(id) })
  }
  for (const who of p.household.persons) for (const def of FACTS.filter((d) => d.owner === 'person')) add(who.id, def)
  for (const def of FACTS.filter((d) => d.owner === 'household')) add('household', def)
  return out
}

export interface Accuracy {
  confirmed: number
  total: number
  /** Per document: what it would confirm, and how much already is. */
  byDoc: Record<DocId, { confirmed: number; total: number }>
}

export function accuracyOf(p: Profile): Accuracy {
  const facts = factsOf(p)
  const byDoc = Object.fromEntries(DOC_IDS.map((d) => [d, { confirmed: 0, total: 0 }])) as Accuracy['byDoc']
  for (const f of facts) {
    byDoc[f.doc].total++
    if (f.confirmed) byDoc[f.doc].confirmed++
  }
  return { confirmed: facts.filter((f) => f.confirmed).length, total: facts.length, byDoc }
}
