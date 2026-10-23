import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { knownYear } from './params/index.ts'
import { project } from './projection.ts'
import { qcCreditsFor } from './qcCredits.ts'

// THE TWO QUÉBEC CREDITS IN THE PLAN: who counts, as of when, and that the year's books take them. The formulas are held to the official pages in verified/;
// here the household as the end of last year left it (who is 70, who is alone, how many children) and the projection that pays them.

const P = knownYear(2026).qcCredits
const UNTIL = knownYear(2026).childBenefits.familyAllowance.untilAge
const base = { year: 2027, births: [1950], aliveLastYear: 1, lastYearIncome: 20_000, children: [], livesAlone: true }

describe('who counts, as of the end of last year', () => {
  it('a person is 70 for the credit in the year AFTER the one they turn 70 in: born 1957 is 70 at the end of 2027, so the credit for 2027 arrives in 2028', () => {
    expect(qcCreditsFor({ ...base, year: 2027, births: [1957] }, P, UNTIL).seniorAssistance).toBe(0)
    expect(qcCreditsFor({ ...base, year: 2028, births: [1957] }, P, UNTIL).seniorAssistance).toBeGreaterThan(0)
  })

  it('a person living alone gets the « living alone » addition only if they were alone last year too: the year after a first death, the survivor still counts as a couple', () => {
    const alone = qcCreditsFor({ ...base, births: [1990], aliveLastYear: 1 }, P, UNTIL).solidarity
    const widowed = qcCreditsFor({ ...base, births: [1990], aliveLastYear: 2 }, P, UNTIL).solidarity
    expect(alone - widowed).toBe(172)
  })

  it('a household that says it does not live alone loses the same addition', () => {
    const roommates = qcCreditsFor({ ...base, births: [1990], livesAlone: false }, P, UNTIL).solidarity
    expect(qcCreditsFor({ ...base, births: [1990] }, P, UNTIL).solidarity - roommates).toBe(172)
  })

  it('a child counts for the solidarity credit while under 18 at the end of last year, and the housing supplement is 158 $ each', () => {
    const none = qcCreditsFor({ ...base, births: [1990, 1990], aliveLastYear: 2 }, P, UNTIL).solidarity
    const kids = qcCreditsFor({ ...base, births: [1990, 1990], aliveLastYear: 2, children: [2010, 2020] }, P, UNTIL).solidarity
    // born 2010 is 16 at the end of 2026; born 2020 is 6
    expect(kids - none).toBe(2 * 158)
    const grown = qcCreditsFor({ ...base, year: 2029, births: [1990, 1990], aliveLastYear: 2, children: [2010, 2020] }, P, UNTIL).solidarity
    // born 2010 is 18 at the end of 2028: no longer counted
    expect(grown - none).toBe(158)
  })

  it('a high income gets neither credit', () => {
    const rich = qcCreditsFor({ ...base, lastYearIncome: 200_000 }, P, UNTIL)
    expect(rich).toEqual({ seniorAssistance: 0, solidarity: 0 })
  })
})

describe('in the projection', () => {
  it('a retired person aged 70 or over on a modest income is paid both credits and the groceries benefit, none of it as work or dated income, and the books balance', () => {
    const rows = project(
      {
        ...GOLDEN_HOUSEHOLD,
        persons: [{ ...GOLDEN_HOUSEHOLD.persons[0], birth: { year: 1950, month: 3 }, retirementAge: 60, salaryToday: 30_000 }],
        spending: { workingToday: 30_000, retiredToday: 30_000 },
      },
      GOLDEN_ASSUMPTIONS,
    )
    const row = rows.find((r) => r.year === 2028)!
    expect(row.household.seniorAssistance ?? 0).toBeGreaterThan(0)
    expect(row.household.solidarityCredit ?? 0).toBeGreaterThan(0)
    expect(row.persons.self!.otherIncome ?? 0).toBe(0)
  })
})
