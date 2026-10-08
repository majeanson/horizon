import { presetOf, withPreset, type PresetKey } from '../engine/assumptionPresets.ts'
import { rregopPension } from '../engine/presets.ts'
import type { AccountKind, DbPension, Home, Person, PersonId } from '../engine/types.ts'
import { blankPerson, type CustomScenario, type Profile, type StoredAssumptions } from './schema.ts'

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

// ── The principal residence ─────────────────────────────────────────────────────────────────────────

/** A home with nothing in it yet: a typical rate (the person types the rest), no sale planned. */
export const blankHome = (): Home => ({ value: 0, mortgage: { balance: 0, rate: 0.05, monthlyPayment: 0 }, sale: null })

export const addHome = (p: Profile): Profile => (p.household.home ? p : { ...p, household: { ...p.household, home: blankHome() } })
export const removeHome = (p: Profile): Profile => (p.household.home ? { ...p, household: { ...p.household, home: null } } : p)

/** Change the home; the same profile back when nothing changes (or there is no home to change). */
export function updateHome(p: Profile, change: (home: Home) => Home): Profile {
  const home = p.household.home
  if (!home) return p
  const next = change(home)
  return next === home ? p : { ...p, household: { ...p.household, home: next } }
}

/** The four figures that make a scenario (what the three ready-made sets also fix). */
export const scenarioOf = (a: Profile['assumptions']): CustomScenario => ({ inflation: a.inflation, wageGrowth: a.wageGrowth, returns: { ...a.returns }, horizonAge: a.horizonAge })

/** Do these two scenarios hold the same figures (a typed « 3,1 » is 3.1 / 100, not always bit-equal)? */
export function sameScenario(x: CustomScenario, y: CustomScenario): boolean {
  const same = (a: number, b: number) => Math.abs(a - b) < 1e-9
  return same(x.inflation, y.inflation) && same(x.wageGrowth, y.wageGrowth) && x.horizonAge === y.horizonAge && same(x.returns.rrsp, y.returns.rrsp) && same(x.returns.tfsa, y.returns.tfsa) && same(x.returns.nonReg, y.returns.nonReg)
}

/**
 * Lay a ready-made set of assumptions over the profile's; the same object back when it is already exactly that set.
 * When what is being replaced is the person's OWN scenario (it matches none of the three), it is kept aside in
 * `customScenario` first — « Personnalisé » can then be taken back with `restoreCustom`, so choosing « Prudent » to look
 * never costs the figures a person spent time typing.
 */
export function applyPreset(p: Profile, key: PresetKey): Profile {
  if (presetOf(p.assumptions) === key) return p
  const custom = presetOf(p.assumptions) === null ? scenarioOf(p.assumptions) : p.customScenario
  return { ...p, assumptions: withPreset(p.assumptions, key), customScenario: custom }
}

/** Take the kept « Personnalisé » scenario back; the same object when none is kept or it is already what is in use. */
export function restoreCustom(p: Profile): Profile {
  const kept = p.customScenario
  if (kept === null || sameScenario(kept, scenarioOf(p.assumptions))) return p
  return { ...p, assumptions: { ...p.assumptions, inflation: kept.inflation, wageGrowth: kept.wageGrowth, returns: { ...kept.returns }, horizonAge: kept.horizonAge } }
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
 * Is this pension built on RREGOP's rules? Read from the RULES themselves (the accrual, the best-5 average, the coordination,
 * the unreduced routes, the early reduction, the indexation) — NOT from the label, which is free text: renaming the plan
 * must not lose the notice, and a hand-entered plan that merely carries the word « RREGOP » must not be given RREGOP's rule.
 * The person's own figures (service years, start age, the in-pay amount) are not part of it.
 */
export const isRregopRules = (p: DbPension): boolean => {
  const r = rregopPension({ serviceYearsToDate: 0, startAge: 60 })
  const rules = (x: DbPension) => JSON.stringify([x.accrualRate, x.maxServiceYears, x.averagingYears, x.coordination, x.earliestAge, x.unreduced, x.earlyReductionPerYear, x.bridge, x.indexation])
  return rules(p) === rules(r)
}

/**
 * A RREGOP pension saved before the plan's DEFERRED rule existed (schema v4) is still calculated the old way: reduced from
 * the earliest unreduced date, with no full indexation while waiting. It matters only to a member who leaves BEFORE the
 * plan's earliest age. This says when the rule is missing for that person; `applyDeferredRule` adds it. Never done silently:
 * the page asks first, because the figure changes.
 */
export const needsDeferredRule = (leavingAge: number, p: DbPension): boolean => isRregopRules(p) && !p.inPay && !p.deferred && leavingAge < p.earliestAge

/** The same pension with the RREGOP deferred rule added — the SAME object when it is not a RREGOP pension, is in pay, or already has the rule. */
export const applyDeferredRule = (p: DbPension): DbPension =>
  !isRregopRules(p) || p.inPay || p.deferred ? p : { ...p, deferred: rregopPension({ serviceYearsToDate: p.serviceYearsToDate, startAge: p.startAge }).deferred }

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
