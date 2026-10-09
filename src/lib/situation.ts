import { useSyncExternalStore } from 'react'
import type { PersonId } from '../engine/types.ts'
import type { DocId } from './facts.ts'
import { removeHome } from './profileEdit.ts'
import type { Profile } from './schema.ts'

// « MA SITUATION » — a few plain questions that decide what the form shows. A household with no employer pension has no use for the page of pension
// rules; one that has always lived here has no use for a residence year; one with no children, no cost per child. So each topic is either
// ANSWERED (the person said yes, kept on this device) or already HAS DATA in the profile — and the form shows a section only then. The profile itself
// never carries the answer: « yes » with nothing typed yet is a note to oneself, like the ticks of the documents list, kept under its own key.
// A « no » over data asks first, and says what is lost.

export type Topic = 'kids' | 'home' | 'events' | 'pension' | 'abroad' | 'partTime'

/** The topics asked once for the household, and the ones asked for each person. */
export const HOUSEHOLD_TOPICS: readonly Topic[] = ['kids', 'home', 'events']
export const PERSON_TOPICS: readonly Topic[] = ['pension', 'abroad', 'partTime']

const person = (p: Profile, owner: PersonId | undefined) => p.household.persons.find((x) => x.id === owner)

/** Does the profile already hold something for this topic? */
export function hasData(p: Profile, topic: Topic, owner?: PersonId): boolean {
  const h = p.household
  switch (topic) {
    case 'kids':
      return (h.children ?? []).length > 0 || (h.childSpending ?? null) !== null
    case 'home':
      return (h.home ?? null) !== null
    case 'events':
      return (h.flows ?? []).length > 0
    case 'pension':
      return (person(p, owner)?.pensions.length ?? 0) > 0
    case 'abroad': {
      // Residence counts from the later of the year of birth + 18 and the year it began: a later one is a life partly lived elsewhere.
      const x = person(p, owner)
      return x !== undefined && x.oas.residentSince > x.birth.year + 18
    }
    case 'partTime':
      return (person(p, owner)?.partTime ?? null) !== null
  }
}

const keyOf = (topic: Topic, owner?: PersonId) => (owner === undefined ? topic : `${topic}:${owner}`)

/** Does the form show this topic: the person said yes, or there is already something in the profile? */
export function applies(p: Profile, yes: ReadonlySet<string>, topic: Topic, owner?: PersonId): boolean {
  return hasData(p, topic, owner) || yes.has(keyOf(topic, owner))
}

/** What a « no » would erase, as a count of things (0: nothing is lost, no question to ask). */
export function lostBy(p: Profile, topic: Topic, owner?: PersonId): number {
  const h = p.household
  switch (topic) {
    case 'kids':
      return (h.children ?? []).length + ((h.childSpending ?? null) !== null ? 1 : 0)
    case 'home':
      return h.home ? 1 : 0
    case 'events':
      return (h.flows ?? []).length
    case 'pension':
      return person(p, owner)?.pensions.length ?? 0
    case 'abroad':
      return hasData(p, 'abroad', owner) ? 1 : 0
    case 'partTime':
      return (person(p, owner)?.partTime ?? null) !== null ? 1 : 0
  }
}

/** The profile with this topic emptied: no children, no home, no dated flows, no plan, a lifelong residence, no work kept after retiring. */
export function clearTopic(p: Profile, topic: Topic, owner?: PersonId): Profile {
  if (lostBy(p, topic, owner) === 0) return p
  const h = p.household
  const mapOwner = (change: (x: (typeof h.persons)[number]) => (typeof h.persons)[number]): Profile => ({ ...p, household: { ...h, persons: h.persons.map((x) => (x.id === owner ? change(x) : x)) } })
  switch (topic) {
    case 'kids':
      return { ...p, household: { ...h, children: [], childSpending: null } }
    case 'home':
      return removeHome(p)
    case 'events':
      return { ...p, household: { ...h, flows: [] } }
    case 'pension':
      return mapOwner((x) => ({ ...x, pensions: [] }))
    case 'abroad':
      return mapOwner((x) => ({ ...x, oas: { ...x.oas, residentSince: x.birth.year + 18 } }))
    case 'partTime':
      return mapOwner((x) => ({ ...x, partTime: null }))
  }
}

/**
 * Does a document matter to this household? The budget, the tax notice, the account statements and the QPP statement are for everyone; the
 * home's papers, the employer's statement and the proof of residence only for those who have the thing (or said they do).
 */
export function docApplies(p: Profile, yes: ReadonlySet<string>, doc: DocId, owner?: PersonId): boolean {
  switch (doc) {
    case 'home':
      return applies(p, yes, 'home')
    case 'employer':
      return applies(p, yes, 'pension', owner)
    case 'residence':
      return applies(p, yes, 'abroad', owner)
    default:
      return true
  }
}

// ── The answers kept on this device ──────────────────────────────────────────

const KEY = 'horizon-situation'
const listeners = new Set<() => void>()
let cache: { raw: string | null; set: ReadonlySet<string> } | null = null

function read(): ReadonlySet<string> {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    /* nothing kept */
  }
  if (cache !== null && cache.raw === raw) return cache.set
  let ids: string[] = []
  try {
    const parsed: unknown = raw === null ? [] : JSON.parse(raw)
    ids = Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string' && /^[a-zA-Z]{3,12}(:[a-z]{3,8})?$/.test(x)).slice(0, 20) : []
  } catch {
    ids = []
  }
  cache = { raw, set: new Set(ids) }
  return cache.set
}

function write(next: ReadonlySet<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...next]))
  } catch {
    /* nothing kept: the answer lives until the page closes */
  }
  cache = null
  listeners.forEach((l) => l())
}

/** Say yes (or take it back) for a topic: the form shows its section, or stops. */
export function answer(topic: Topic, yes: boolean, owner?: PersonId): void {
  const next = new Set(read())
  if (yes) next.add(keyOf(topic, owner))
  else next.delete(keyOf(topic, owner))
  write(next)
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
/** The topics the person said yes to, on this device. */
export const useYes = (): ReadonlySet<string> => useSyncExternalStore(subscribe, read, read)
