import { describe, expect, it } from 'vitest'
import { GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { rrqPension } from './rrq.ts'
import { makeRrqRules } from './rrqRules.ts'
import { statementEstimate } from './statementCheck.ts'

// THE RELEVÉ'S « MONTANT ACTUEL », reproduced. Retraite Québec prints the pension a person could get at 60 and at 65 if no more earnings were added, under today's
// rules, counting only the first enhancement. A person's own relevé matched this function to the dollar (307,02 and 407,29 against 307 and 407 printed); those
// figures are a person's, so they are not committed — the tests below pin what makes the function the relevé's and not the projection's.

const birth = { year: 1992, month: 4 }
const earnings = { 2019: 57_400, 2020: 58_700, 2021: 61_600, 2022: 64_900, 2023: 66_600, 2024: 73_200, 2025: 81_200 }
const NOW = 2026

describe('what the relevé estimates', () => {
  it('has a pension at 65 above the one at 60, and none for a history with no earnings', () => {
    expect(statementEstimate(birth, earnings, 65, NOW)).toBeGreaterThan(statementEstimate(birth, earnings, 60, NOW))
    expect(statementEstimate(birth, {}, 65, NOW)).toBe(0)
  })

  it('is TODAY\'s: asking in a later year changes nothing once the rules stop (there is no later rule to read)', () => {
    expect(statementEstimate(birth, earnings, 65, 2040)).toBe(statementEstimate(birth, earnings, 65, 2026))
    // …and in an earlier year it is that year's: the five ceilings ending 2025 average less than those ending 2026 (66 580 $ against 69 180 $).
    expect(statementEstimate(birth, earnings, 65, 2025) / statementEstimate(birth, earnings, 65, 2026)).toBeCloseTo(66_580 / 69_180, 3)
  })

  it('leaves out the second enhancement: the same history under the full rules pays more', () => {
    const rules = makeRrqRules({ inflation: 0, wageGrowth: 0 })
    const full = rrqPension({ birth, earnings, startAge: 65 }, rules).monthly
    expect(full).toBeGreaterThan(statementEstimate(birth, earnings, 65, NOW))
  })

  it('rests on today\'s average of the last five ceilings (69 180 $ in 2026), not on a projected one: a pension of the same earnings in a far year is higher in the projection', () => {
    // The projection's rules with no growth hold the 2026 ceiling (74 600 $) for every later year, so its AMPE5 is 74 600 $; the relevé's is 69 180 $.
    const flat = makeRrqRules({ inflation: 0, wageGrowth: 0 })
    const projected = rrqPension({ birth, earnings, startAge: 65 }, { ...flat, secondFrom: Number.MAX_SAFE_INTEGER }).monthly
    const statement = statementEstimate(birth, earnings, 65, NOW)
    expect(statement / projected).toBeCloseTo(69_180 / 74_600, 3)
  })

  it('counts every year on the relevé, whenever it falls: a later year entered or an earlier one pays more', () => {
    expect(statementEstimate(birth, { ...earnings, 2030: 90_000 }, 65, NOW)).toBeGreaterThan(statementEstimate(birth, earnings, 65, NOW)) // a year the person has entered counts, whenever it is
    expect(statementEstimate(birth, { ...earnings, 2018: 50_000 }, 65, NOW)).toBeGreaterThan(statementEstimate(birth, earnings, 65, NOW))
  })

  it('a pinned figure for the golden couple (derived, to catch drift): the first person at 60 and at 65', () => {
    const p = GOLDEN_HOUSEHOLD.persons[0]
    expect(statementEstimate(p.birth, p.earningsHistory, 60, NOW)).toBeCloseTo(721.69, 2)
    expect(statementEstimate(p.birth, p.earningsHistory, 65, NOW)).toBeCloseTo(988.12, 2)
  })
})
