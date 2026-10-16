import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { project } from '../engine/projection.ts'
import { bookProblems } from './identities.ts'
import { assumptionsOf } from './resultsModel.ts'
import { SCHEMA_VERSION, validateProfile, type Profile } from './schema.ts'

// EVERY AGE THE APP ALLOWS IS AN AGE THE ENGINE CAN RUN. The validator accepts a birth year from 1900, and the plausibility rules of this repo allow anyone from 18 to 100: so a person born in every
// year from 1926 to 2008 is a profile the app must be able to hold, run, and draw. Each is built the way such a person would be (the retired ones with no pay and no history, the young with a career
// to come), checked by the validator, and run through the plan and its books. The QPP calculation threw for everyone born before 1948 and no property suite had met them.

const dir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures')
const base = JSON.parse(readFileSync(join(dir, `profile.v${SCHEMA_VERSION}.json`), 'utf8')) as Record<string, unknown>
const TODAY = { year: 2026, month: 10 }

function personBornIn(birthYear: number): Profile {
  const doc = structuredClone(base) as { household: Record<string, unknown> }
  const household = doc.household as { persons: Record<string, unknown>[]; livesAlone: boolean; children: number[]; spending: Record<string, number> }
  household.persons = [household.persons[0]]
  household.livesAlone = true
  household.children = []
  const age = TODAY.year - birthYear
  const retired = age >= 62
  Object.assign(household.persons[0], {
    birth: { year: birthYear, month: 6 },
    // the schema stops a stated retirement age at 75: a person of 90 who stopped working at 60 says 60
    retirementAge: retired ? Math.min(75, Math.max(50, age - 5)) : Math.max(age + 1, 55),
    salaryToday: retired ? 0 : 70_000,
    earningsHistory: {},
    rrq: { startAge: 65 },
    oas: { startAge: 65, residentSince: birthYear + 22 },
    pensions: [],
  })
  household.spending = { workingToday: 48_000, retiredToday: 40_000 }
  return doc as unknown as Profile
}

describe('a person born in every year from 1926 to 2008', { timeout: 300_000 }, () => {
  const years = Array.from({ length: 2008 - 1926 + 1 }, (_, i) => 1926 + i)

  for (const by of years.filter((y) => y % 4 === 2 || y === 1926 || y === 2008)) {
    it(`born ${by} (${TODAY.year - by}): valid, runs, finite, and the books hold`, () => {
      const p = personBornIn(by)
      expect(validateProfile(p).ok, `the validator refuses a person born in ${by}`).toBe(true)
      const a = assumptionsOf(p, TODAY)
      let rows: ReturnType<typeof project>
      try {
        rows = project(p.household, a)
      } catch (e) {
        throw new Error(`the engine THREW for a person born in ${by}: ${(e as Error).message}`)
      }
      expect(rows.length).toBeGreaterThan(0)
      expect(bookProblems(rows, a), `born ${by}`).toEqual([])
    })
  }

  it('every single year of birth in the range, in one sweep', () => {
    const wrong: string[] = []
    for (const by of years) {
      try {
        const a = assumptionsOf(personBornIn(by), TODAY)
        const rows = project(personBornIn(by).household, a)
        const problems = bookProblems(rows, a)
        if (problems.length > 0) wrong.push(`${by}: ${problems[0]}`)
      } catch (e) {
        wrong.push(`${by}: THREW ${(e as Error).message.slice(0, 80)}`)
      }
    }
    expect(wrong).toEqual([])
  })
})
