import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { project } from '../engine/projection.ts'
import { bookProblems } from './identities.ts'
import { assumptionsOf } from './resultsModel.ts'
import { SCHEMA_VERSION, validateProfile, type Profile } from './schema.ts'

// THE LARGEST NUMBER THE SCHEMA ACCEPTS IS A NUMBER THE ENGINE MUST SURVIVE. numberFieldBounds.test.ts holds that every box has a `max`, so a typed figure cannot pass what the saved profile
// would refuse; importFuzz.test.ts throws random evil values at a profile. This one is systematic: for EVERY numeric field of a real profile it finds, by search, the largest and the smallest
// value the validator lets through, puts that value in, and runs the plan — the books must hold and every figure must be a number. A schema that is more generous than the calculation can bear
// is a typo that blanks a plan at the next launch; a schema that is stingier than life (a plausible figure refused) is found by profileSafety.test.ts.

const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const base = JSON.parse(readFileSync(join(dir, `profile.v${SCHEMA_VERSION}.json`), 'utf8')) as Record<string, unknown>
const TODAY = { year: 2026, month: 10 }

type Path = (string | number)[]
function numericLeaves(v: unknown, path: Path = [], out: Path[] = []): Path[] {
  if (typeof v === 'number') out.push(path)
  else if (v !== null && typeof v === 'object') for (const [k, x] of Object.entries(v)) numericLeaves(x, [...path, Array.isArray(v) ? Number(k) : k], out)
  return out
}
function withValue(path: Path, value: number): Profile {
  const doc = structuredClone(base)
  let node = doc as Record<string, unknown>
  for (const k of path.slice(0, -1)) node = node[k as string] as Record<string, unknown>
  node[path[path.length - 1] as string] = value
  return doc as unknown as Profile
}
const accepted = (path: Path, value: number) => validateProfile(withValue(path, value)).ok

/** The largest value the validator accepts for this field (searched up from the current one), or the cap of the search. */
function largestAccepted(path: Path, current: number): number {
  let lo = current
  let hi = Math.max(current * 2, 10)
  const CAP = 1e15
  while (accepted(path, hi) && hi < CAP) {
    lo = hi
    hi *= 10
  }
  if (accepted(path, hi)) return hi // no upper bound found below the cap
  // a whole-number field refuses every in-between value, so the search must stay on whole numbers or it concludes the bound is lower than it is
  const whole = Number.isInteger(current)
  for (let i = 0; i < 80 && (whole ? hi - lo > 1 : hi - lo > 1e-9 * Math.abs(hi)); i++) {
    const mid = whole ? Math.floor((lo + hi) / 2) : (lo + hi) / 2
    if (accepted(path, mid)) lo = mid
    else hi = mid
  }
  return lo
}
/** The smallest value accepted (searched down from the current one). */
function smallestAccepted(path: Path, current: number): number {
  let hi = current
  let lo = Math.min(current - Math.max(Math.abs(current), 1) * 2, -10)
  const CAP = -1e15
  while (accepted(path, lo) && lo > CAP) {
    hi = lo
    lo *= 10
  }
  if (accepted(path, lo)) return lo
  const whole = Number.isInteger(current)
  for (let i = 0; i < 80 && (whole ? hi - lo > 1 : hi - lo > 1e-9 * Math.abs(lo)); i++) {
    const mid = whole ? Math.ceil((lo + hi) / 2) : (lo + hi) / 2
    if (accepted(path, mid)) hi = mid
    else lo = mid
  }
  return hi
}

// the fields that are not quantities the plan reads as figures: a version, a year of birth already pinned by the validator's own checks, an index into a list
const SKIP = new Set(['version'])

describe('every numeric field, at the largest and the smallest value the validator accepts', { timeout: 600_000 }, () => {
  const leaves = numericLeaves(base).filter((p) => !SKIP.has(String(p[p.length - 1])) && p[0] !== 'version')

  it('there are many fields to try (a floor)', () => expect(leaves.length).toBeGreaterThan(60))

  it('at the largest accepted value of each: the plan runs, its books hold, and every figure is a number', () => {
    const wrong: string[] = []
    for (const path of leaves) {
      const current = path.reduce<unknown>((o, k) => (o as Record<string, unknown>)[k as string], base) as number
      const max = largestAccepted(path, current)
      const profile = withValue(path, max)
      const where = `${path.join('.')} = ${max}`
      try {
        const a = assumptionsOf(profile, TODAY)
        const rows = project(profile.household, a)
        if (rows.length === 0) wrong.push(`${where}: no rows`)
        const problems = bookProblems(rows, a)
        if (problems.length > 0) wrong.push(`${where}: ${problems[0]}`)
      } catch (e) {
        wrong.push(`${where}: THREW ${(e as Error).message}`)
      }
    }
    expect(wrong.slice(0, 12), `${wrong.length} fields break the engine at their largest accepted value`).toEqual([])
  })

  it('at the smallest accepted value of each: the same', () => {
    const wrong: string[] = []
    for (const path of leaves) {
      const current = path.reduce<unknown>((o, k) => (o as Record<string, unknown>)[k as string], base) as number
      const min = smallestAccepted(path, current)
      const profile = withValue(path, min)
      const where = `${path.join('.')} = ${min}`
      try {
        const a = assumptionsOf(profile, TODAY)
        const rows = project(profile.household, a)
        if (rows.length === 0) wrong.push(`${where}: no rows`)
        const problems = bookProblems(rows, a)
        if (problems.length > 0) wrong.push(`${where}: ${problems[0]}`)
      } catch (e) {
        wrong.push(`${where}: THREW ${(e as Error).message}`)
      }
    }
    expect(wrong.slice(0, 12), `${wrong.length} fields break the engine at their smallest accepted value`).toEqual([])
  })

  it('the search itself finds a bound where one is known: a person’s retirement age stops at 75, never above', () => {
    const path = leaves.find((p) => p.join('.') === 'household.persons.0.retirementAge')!
    expect(path).toBeDefined()
    const current = (base.household as { persons: { retirementAge: number }[] }).persons[0].retirementAge
    const max = largestAccepted(path, current)
    expect(accepted(path, max)).toBe(true)
    expect(accepted(path, max + 1)).toBe(false)
    expect(max).toBeGreaterThanOrEqual(65)
    expect(max).toBeLessThan(200)
  })
})
