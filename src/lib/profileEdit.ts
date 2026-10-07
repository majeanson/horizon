import { presetOf, withPreset, type PresetKey } from '../engine/assumptionPresets.ts'
import { rregopPension } from '../engine/presets.ts'
import type { AccountKind, DbPension, Person, PersonId } from '../engine/types.ts'
import { blankPerson, type Profile, type StoredAssumptions } from './schema.ts'

// Every way the pages change a profile, as a pure function from profile to profile. A page never builds a new
// profile by hand: it calls one of these, which is why each can be tested without a browser and why the pages
// stay thin. They return the SAME object when nothing changes, so the store can skip the render and the write.

export function mapPerson(p: Profile, id: PersonId, change: (person: Person) => Person): Profile {
  let touched = false
  const persons = p.household.persons.map((x) => {
    if (x.id !== id) return x
    const next = change(x)
    if (next !== x) touched = true
    return next
  })
  return touched ? { ...p, household: { ...p.household, persons } } : p
}

export function setSpending(p: Profile, patch: Partial<Profile['household']['spending']>): Profile {
  return { ...p, household: { ...p.household, spending: { ...p.household.spending, ...patch } } }
}

export function setAssumptions(p: Profile, patch: Partial<StoredAssumptions>): Profile {
  return { ...p, assumptions: { ...p.assumptions, ...patch } }
}

/** Lay a ready-made set of assumptions over the profile's; the same object back when it is already exactly that set. */
export function applyPreset(p: Profile, key: PresetKey): Profile {
  if (presetOf(p.assumptions) === key) return p
  return { ...p, assumptions: withPreset(p.assumptions, key) }
}

export function setReturn(p: Profile, kind: AccountKind, value: number): Profile {
  return setAssumptions(p, { returns: { ...p.assumptions.returns, [kind]: value } })
}

// ── Household members ───────────────────────────────────────────────────────────────────────────────

export const hasSpouse = (p: Profile): boolean => p.household.persons.some((x) => x.id === 'spouse')

// A couple never « lives alone »; when the spouse goes, the household is a person living alone again — the default,
// which the person can untick (a roommate disqualifies them from Québec's living-alone amount).
export function addSpouse(p: Profile, today: { year: number }): Profile {
  if (hasSpouse(p)) return p
  return { ...p, household: { ...p.household, livesAlone: false, persons: [...p.household.persons, blankPerson('spouse', today)] } }
}

export function removeSpouse(p: Profile): Profile {
  if (!hasSpouse(p)) return p
  return { ...p, household: { ...p.household, livesAlone: true, persons: p.household.persons.filter((x) => x.id !== 'spouse') } }
}

/** Whether a one-adult household lives alone (Québec's living-alone amount). A couple is unaffected. */
export function setLivesAlone(p: Profile, value: boolean): Profile {
  return p.household.livesAlone === value ? p : { ...p, household: { ...p.household, livesAlone: value } }
}

export function addChild(p: Profile, birthYear: number): Profile {
  if (p.children.length >= 12) return p
  return { ...p, children: [...p.children, birthYear].sort((a, b) => a - b) }
}

export function removeChild(p: Profile, index: number): Profile {
  if (index < 0 || index >= p.children.length) return p
  return { ...p, children: p.children.filter((_, i) => i !== index) }
}

// ── The withdrawal order ────────────────────────────────────────────────────────────────────────────

/** Move one account up (−1) or down (+1) in the order savings are drawn from. */
export function moveInOrder(order: readonly AccountKind[], index: number, direction: -1 | 1): AccountKind[] {
  const to = index + direction
  if (index < 0 || index >= order.length || to < 0 || to >= order.length) return [...order]
  const next = [...order]
  ;[next[index], next[to]] = [next[to], next[index]]
  return next
}

// ── Earnings history ────────────────────────────────────────────────────────────────────────────────

/** Set (or, with null, clear) one year of pensionable earnings. */
export function setEarning(person: Person, year: number, value: number | null): Person {
  const history = { ...person.earningsHistory }
  if (value === null) {
    if (!(year in history)) return person
    delete history[year]
  } else {
    if (history[year] === value) return person
    history[year] = value
  }
  return { ...person, earningsHistory: history }
}

// ── Employer pensions ───────────────────────────────────────────────────────────────────────────────

/** A plan the person enters by hand: a typical final-average-salary shape with nothing assumed beyond it. */
export const blankPension = (): DbPension => ({
  label: '',
  accrualRate: 0.02,
  maxServiceYears: null,
  serviceYearsToDate: 0,
  serviceRatePerYear: 1,
  averagingYears: 5,
  coordination: null,
  earliestAge: 55,
  unreduced: { age: 65, serviceYears: null, factor: null },
  earlyReductionPerYear: 0.06,
  bridge: null,
  indexation: { share: 1, minus: 0 },
  startAge: 65,
})

/** A pension the person is ALREADY receiving: one stated annual amount (today's dollars) and how it is indexed — no formula. */
export const inPayPension = (): DbPension => ({ ...blankPension(), inPay: { annual: 0 } })

/**
 * A RREGOP pension saved before the plan's DEFERRED rule existed (schema v4) is still calculated the old way: reduced from
 * the earliest unreduced date, with no full indexation while waiting. It matters only to a member who leaves BEFORE the
 * plan's earliest age. This says when the rule is missing for that person; `applyDeferredRule` adds it. Never done silently:
 * the page asks first, because the figure changes.
 */
export const needsDeferredRule = (leavingAge: number, p: DbPension): boolean => p.label === 'RREGOP' && !p.inPay && !p.deferred && leavingAge < p.earliestAge

/** The same pension with the RREGOP deferred rule added — the SAME object when it is not a RREGOP pension, is in pay, or already has the rule. */
export const applyDeferredRule = (p: DbPension): DbPension =>
  p.label !== 'RREGOP' || p.inPay || p.deferred ? p : { ...p, deferred: rregopPension({ serviceYearsToDate: p.serviceYearsToDate, startAge: p.startAge }).deferred }

export function addPension(person: Person, pension: DbPension): Person {
  return person.pensions.length >= 8 ? person : { ...person, pensions: [...person.pensions, pension] }
}

export function updatePension(person: Person, index: number, change: (p: DbPension) => DbPension): Person {
  if (index < 0 || index >= person.pensions.length) return person
  const next = change(person.pensions[index])
  if (next === person.pensions[index]) return person
  return { ...person, pensions: person.pensions.map((p, i) => (i === index ? next : p)) }
}

export function removePension(person: Person, index: number): Person {
  if (index < 0 || index >= person.pensions.length) return person
  return { ...person, pensions: person.pensions.filter((_, i) => i !== index) }
}
