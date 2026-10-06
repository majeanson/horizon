import { SCHEMA_VERSION, validateProfile, type Profile, type ProfileProblem } from './schema.ts'

// OLD FILES STAY OPEN. Each entry lifts a saved profile ONE version: MIGRATIONS[0] turns a version-1 file into a
// version-2 one, and so on. A file is run through every step from its own version up to SCHEMA_VERSION, then
// validated like any other. When schema.ts changes: raise SCHEMA_VERSION, append a step here, and add an example
// of the OLD shape to src/lib/fixtures/ — `schemaVersion.test.ts` fails until all three are done.

type Raw = Record<string, unknown>
export const MIGRATIONS: readonly ((profile: Raw) => Raw)[] = []

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

export function migrateProfile(raw: unknown): ReadResult {
  let current = raw
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const from = (raw as Raw).version
    if (typeof from === 'number' && Number.isInteger(from) && from > SCHEMA_VERSION) {
      return { ok: false, reason: 'newer', problems: [{ path: 'version', problem: 'range' }] }
    }
    if (typeof from === 'number' && Number.isInteger(from) && from >= 1) {
      let step = raw as Raw
      for (let v = from; v < SCHEMA_VERSION; v++) step = { ...MIGRATIONS[v - 1](step), version: v + 1 }
      current = step
    }
  }
  const result = validateProfile(current)
  return result.ok ? result : { ok: false, reason: 'invalid', problems: result.problems }
}
