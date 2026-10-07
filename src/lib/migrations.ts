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
