import { SCHEMA_VERSION, validateProfile, type Profile, type ProfileProblem } from './schema.ts'

// OLD FILES STAY OPEN. Each entry lifts a saved profile ONE version: MIGRATIONS[0] turns a version-1 file into a
// version-2 one, and so on. A file is run through every step from its own version up to SCHEMA_VERSION, then
// validated like any other. When schema.ts changes: raise SCHEMA_VERSION, append a step here, and add an example
// of the OLD shape to src/lib/fixtures/ — `schemaVersion.test.ts` fails until all three are done.

type Raw = Record<string, unknown>
export const MIGRATIONS: readonly ((profile: Raw) => Raw)[] = [
  // v1 → v2: Québec's living-alone amount became a stated fact (`household.livesAlone`) instead of an inference from
  // the head count. A v1 file was always computed as « one adult lives alone », so that is what it is given. A household
  // that is not an object is left for the validator to report.
  (profile) => {
    const household = profile.household
    if (typeof household !== 'object' || household === null || Array.isArray(household)) return profile
    const persons = (household as Raw).persons
    return { ...profile, household: { ...(household as Raw), livesAlone: Array.isArray(persons) && persons.length === 1 } }
  },
  // v2 → v3: an employer pension may carry `inPay` (a pension already being paid). It is optional and absent from every
  // older file, which means « still to be calculated » — exactly what those files always were. Nothing to rewrite.
  (profile) => profile,
  // v3 → v4: an employer pension may carry `deferred` (the plan's rule for a member who leaves before being eligible). It is
  // optional; absent means « the plan has no such rule », which is what every older file's pension was calculated as.
  (profile) => profile,
  // v4 → v5: a pension in pay may carry `since` (the month it began, which pro-rates its first January indexation). It is
  // optional; absent means « it already had its first indexation », which is how every older file's pension in pay was calculated.
  (profile) => profile,
  // v5 → v6: an employer pension may carry `memberContribution` (the member's own contributions out of pay while working). A
  // RREGOP pension that is not in pay is given the 2026 plan rule — every such file was missing it, and its working-years
  // cash was overstated by it. The match is on the frozen RREGOP accrual, coordination and earliest age, not on the label.
  (profile) => {
    const household = profile.household
    if (typeof household !== 'object' || household === null || Array.isArray(household)) return profile
    const persons = (household as Raw).persons
    if (!Array.isArray(persons)) return profile
    const rule = { rate: 0.0863, exemptionShare: 0.25, reductionFactor: 0.0153 }
    const isRregop = (d: Raw) => d.accrualRate === 0.02 && d.earliestAge === 55 && typeof d.coordination === 'object' && d.coordination !== null && (d.coordination as Raw).rate === 0.007
    const fix = (d: unknown) => (typeof d === 'object' && d !== null && !Array.isArray(d) && !(d as Raw).inPay && !(d as Raw).memberContribution && isRregop(d as Raw) ? { ...(d as Raw), memberContribution: rule } : d)
    const fixPerson = (p: unknown) => (typeof p === 'object' && p !== null && Array.isArray((p as Raw).pensions) ? { ...(p as Raw), pensions: ((p as Raw).pensions as unknown[]).map(fix) } : p)
    return { ...profile, household: { ...(household as Raw), persons: persons.map(fixPerson) } }
  },
  // v6 → v7: the hand-typed « Personnalisé » scenario may be kept aside (`customScenario`) while a ready-made one is chosen.
  // Every older file kept none: null.
  (profile) => ({ ...profile, customScenario: null }),
  // v7 → v8: the household may own a principal residence (`household.home`: its value, its mortgage, an optional sale). Every
  // older file owned none as far as the plan knew: null.
  (profile) => {
    const household = profile.household
    if (typeof household !== 'object' || household === null || Array.isArray(household)) return profile
    return { ...profile, household: { ...(household as Raw), home: null } }
  },
  // v8 → v9: the figures the person has CONFIRMED against a document are remembered (`confirmed`, ids like « self:rrspBalance »).
  // Every older file confirmed none: every figure is an estimate until said otherwise.
  (profile) => ({ ...profile, confirmed: [] }),
  // v9 → v10: the REER may carry a locked-in part (`lockedIn`: a LIRA / LIF, the employer share of a VRSP) and an employer's yearly VRSP
  // contribution (`employerContribution`). Every older file had neither as far as the plan knew: 0 and 0, written out so the file is whole.
  (profile) => {
    const household = profile.household
    if (typeof household !== 'object' || household === null || Array.isArray(household)) return profile
    const persons = (household as Raw).persons
    if (!Array.isArray(persons)) return profile
    const isObj = (x: unknown): x is Raw => typeof x === 'object' && x !== null && !Array.isArray(x)
    const fixPerson = (p: unknown) => {
      if (!isObj(p) || !isObj(p.accounts) || !isObj(p.accounts.rrsp)) return p
      return { ...p, accounts: { ...p.accounts, rrsp: { lockedIn: 0, employerContribution: 0, ...p.accounts.rrsp } } }
    }
    return { ...profile, household: { ...(household as Raw), persons: persons.map(fixPerson) } }
  },
]

export type ReadResult =
  | { ok: true; profile: Profile }
  // `json`: not JSON at all · `newer`: written by a later version of the app · `invalid`: JSON, but not a valid profile.
  | { ok: false; reason: 'json' | 'newer' | 'invalid'; problems: ProfileProblem[] }

/** Reads a profile from a JSON string: parse, migrate to the current schema, validate. */
export function readProfileJson(text: string): ReadResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'json', problems: [] }
  }
  return migrateProfile(raw)
}

export function migrateProfile(raw: unknown, migrations: readonly ((profile: Raw) => Raw)[] = MIGRATIONS): ReadResult {
  let current = raw
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const from = (raw as Raw).version
    if (typeof from === 'number' && Number.isInteger(from) && from > SCHEMA_VERSION) {
      return { ok: false, reason: 'newer', problems: [{ path: 'version', problem: 'range' }] }
    }
    if (typeof from === 'number' && Number.isInteger(from) && from >= 1) {
      // A step runs on RAW, unvalidated input. One that throws on a shape nobody foresaw must not take the app down:
      // load() runs this at module start, so a throw here is a white screen with the person's profile held hostage.
      try {
        let step = raw as Raw
        for (let v = from; v < SCHEMA_VERSION; v++) step = { ...migrations[v - 1](step), version: v + 1 }
        current = step
      } catch {
        return { ok: false, reason: 'invalid', problems: [{ path: 'profile', problem: 'type' }] }
      }
    }
  }
  const result = validateProfile(current)
  return result.ok ? result : { ok: false, reason: 'invalid', problems: result.problems }
}
