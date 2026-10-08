// VERIFIED-AGAINST
// source:    https://simulr.svc.retraitequebec.gouv.qc.ca/en-CA
// title:     SimulR — the simplified tool for simulating retirement income (Retraite Québec), « Québec Pension Plan » step
// retrieved: 2026-10-07
// tolerance: 1 % — SimulR prints whole dollars a year and does not publish how it spreads a salary over the years of a career
//
// How the readings were taken: « Profile and objective » (birth date, current earnings, goal 70 %) → « Retirement income » (tick
// « Québec Pension Plan ») → « At what age did you begin receiving earnings of more than $3500? » and « At what age would you like to
// start receiving your retirement pension? », then « See the data » → « Québec Pension Plan $ … » a year from the start age to 95.
//
// What the readings show about SimulR (and what this test therefore models):
//   • It speaks in TODAY'S dollars: the same salary gives the same pension whatever the birth year (born 1971 and 1990 both read
//     $20 561 for a 200 000 $ earner from 18, pension at 65), i.e. the ceilings do not grow and the pension is measured against the
//     average of the 5 ceilings ending TODAY (2022–2026: 69 180 $), not against the 74 600 $ of 2026 alone.
//   • The salary is taken as a constant SHARE of each year's ceiling (40 000 $ ÷ 74 600 $ in every year of the career).
//   • The career runs from the age given to the pension start; a start up to ≈ 7 years after 18 changes nothing (the 15 % of months
//     dropped, 85 of 564, absorb 84): $20 140 for a start at 18, 21 or 25, $18 113 at 30, $13 648 at 40 — the same drop-out the
//     engine applies (s. 116.4, rrqDropOut.verified.test.ts).
import { describe, expect, it } from 'vitest'
import { RRQ_MGA_HISTORY } from '../params/rrqHistory.ts'
import { rrqPension } from '../rrq.ts'
import { makeRrqRules } from '../rrqRules.ts'

const MGA = RRQ_MGA_HISTORY.value
const TODAY = 2026
const rules = makeRrqRules({ inflation: 0, wageGrowth: 0 }) // a constant-dollar world: every future ceiling is today's
const ampeToday = ([2022, 2023, 2024, 2025, 2026] as const).reduce((s, y) => s + (MGA[y] ?? NaN), 0) / 5
const toTodaysCeilings = ampeToday / (MGA[TODAY] ?? NaN)

/** The engine's yearly pension, in today's dollars, for a constant share of the ceiling from `firstAge` to `startAge`. */
function yearly(birth: { year: number; month: number }, salary: number, firstAge: number, startAge: number): number {
  const earnings: Record<number, number> = {}
  const first = birth.year + firstAge
  const last = birth.year + startAge
  for (let y = first; y <= last; y++) {
    let months = 12
    if (y === first) months = 13 - birth.month // from the birthday month
    if (y === last) months = Math.min(months, birth.month) // to the birthday month
    earnings[y] = ((salary * rules.mga(y)) / (MGA[TODAY] ?? NaN)) * (months / 12)
  }
  return rrqPension({ birth, earnings, startAge }, rules).monthly * 12 * toTodaysCeilings
}

const near = (actual: number, expected: number) => expect(Math.abs(actual / expected - 1)).toBeLessThan(0.01)

describe('SimulR — the Québec Pension Plan step', () => {
  it('the five ceilings ending today average 69 180 $, 92,7 % of 2026\'s', () => {
    expect(ampeToday).toBe(69_180)
    expect(toTodaysCeilings).toBeCloseTo(0.9273, 4)
  })

  describe('40 000 $ a year from 21, born November 1971 (the example household Hélène)', () => {
    const readings: [number, number][] = [
      [60, 6_745], [61, 7_472], [62, 8_210], [63, 8_958], [64, 9_717], [65, 10_486], [66, 11_450], [68, 13_418], [70, 15_438], [72, 17_510],
    ]
    for (const [age, shown] of readings) {
      it(`a pension from ${age}: $${shown} a year`, () => near(yearly({ year: 1971, month: 11 }, 40_000, 21, age), shown))
    }
  })

  describe('70 588 $ a year, born May 1984 (the example household Marie)', () => {
    for (const [age, shown] of [[60, 12_516], [65, 20_140], [70, 29_567]] as const) {
      it(`from 21, a pension from ${age}: $${shown} a year`, () => near(yearly({ year: 1984, month: 5 }, 70_588, 21, age), shown))
    }
    it('a first job at 18, 21 or 25 reads the same $20 140: the dropped months absorb up to 7 missing years', () => {
      const at = (first: number) => yearly({ year: 1984, month: 5 }, 70_588, first, 65)
      near(at(18), 20_140)
      near(at(21), 20_140)
      near(at(25), 20_140)
      expect(Math.abs(at(25) / at(18) - 1)).toBeLessThan(0.005) // SimulR: exactly equal; the engine's part-year proration leaves 0,4 %
    })
    it('a first job at 30 reads $18 113 and at 40 reads $13 648: past the dropped months every missing year costs', () => {
      near(yearly({ year: 1984, month: 5 }, 70_588, 30, 65), 18_113)
      near(yearly({ year: 1984, month: 5 }, 70_588, 40, 65), 13_648)
    })
  })

  describe('a 200 000 $ earner from 18 (every year at the ceiling): the most the plan pays, in today\'s dollars', () => {
    for (const [age, shown] of [[60, 12_441], [65, 20_561], [70, 30_790]] as const) {
      it(`a pension from ${age}: $${shown} a year`, () => near(yearly({ year: 1971, month: 11 }, 200_000, 18, age), shown))
    }
  })
})
