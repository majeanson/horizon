import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD, history } from './golden/household.fixture.ts'
import { project } from './projection.ts'
import type { Household } from './types.ts'

// THE SURVIVOR'S PENSION IN THE YEAR THEY TURN 65. The under-65 rules (the base share of 37,5 % plus the flat-rate portion) apply to the months up to the
// 65th birthday and the from-65 rules (the base share of 60 %, no flat rate) from the month after: a survivor born in March is paid three months of
// the first and nine of the second in the year of the 65th birthday. The projection read « 65 or more » from the age reached in the year, so the whole
// year of the birthday was paid at the lower from-65 rate, and the flat-rate portion (about 14 000 $ a year) vanished for months it was owed:
// found by an LLM-written stress scenario (the golden couple, the spouse dying at 55: 2 004 $ paid for 2043 where about 5 100 $ was owed).

const i = GOLDEN_ASSUMPTIONS.inflation

/** The golden couple with the spouse dying at 55 (2036) and the survivor born in `month` of 1978, whose own QPP starts at 70: no own pension of theirs in 2043, so
 *  the two regimes are the plain « no pension of my own » formulas, one before the birthday and one after. */
const widowed = (month: number): Household => ({
  ...GOLDEN_HOUSEHOLD,
  persons: [
    { ...GOLDEN_HOUSEHOLD.persons[0], birth: { year: 1978, month }, rrq: { startAge: 70 }, pensions: [] },
    { ...GOLDEN_HOUSEHOLD.persons[1], horizonAge: 55 },
  ],
})

// THE SURVIVOR'S OWN PENSION STARTS PART-WAY THROUGH THE YEAR. The combined-benefit cap (arts. 136 and 136.1) takes the survivor's own base pension off what the survivor
// pension may pay, but only from the month that pension is PAID. The projection applied it from January of its start year, so the months before it started were capped by a
// pension not yet in payment: found by the same stress run (a survivor turning 65 in August, own QPP from September: 6 340 $ paid for the year where about 11 000 $ was owed).
const widowedWithOwn = (month: number): Household => ({
  ...GOLDEN_HOUSEHOLD,
  persons: [
    // own QPP from the month after the 65th birthday, on a near-maximum earnings history so that it takes most of the survivor pension away once it is paid
    { ...GOLDEN_HOUSEHOLD.persons[0], birth: { year: 1978, month }, rrq: { startAge: 65 }, pensions: [], earningsHistory: history(1978, 70_000) },
    { ...GOLDEN_HOUSEHOLD.persons[1], horizonAge: 55 },
  ],
})

describe('the survivor pension in the year their own QPP starts at 65', () => {
  for (const month of [3, 8]) {
    it(`born in month ${month}: the months before the own pension have no own pension to cap them, the months after do`, () => {
      const rows = project(widowedWithOwn(month), GOLDEN_ASSUMPTIONS)
      const survivor = (year: number) => rows.find((r) => r.year === year)!.persons.self!.survivorPension
      const under = survivor(2042) * (1 + i) // 2042: under 65, no own pension yet, whole year
      const over = survivor(2044) / (1 + i) // 2044: from 65, own pension in payment, whole year
      expect(under).toBeGreaterThan(over * 1.5) // the setup: the own pension takes most of the survivor pension away once it is paid
      const expected = (month / 12) * under + ((12 - month) / 12) * over
      expect(survivor(2043)).toBeGreaterThan(expected * 0.97)
      expect(survivor(2043)).toBeLessThan(expected * 1.03)
    })
  }
})

describe('the survivor pension in the year of the 65th birthday', () => {
  for (const month of [3, 11]) {
    describe(`survivor born in month ${month}`, () => {
      const rows = project(widowed(month), GOLDEN_ASSUMPTIONS)
      const survivor = (year: number) => rows.find((r) => r.year === year)!.persons.self!.survivorPension

      it('the setup is the one the test means: a pension before and after, the two regimes very different, nothing of her own yet', () => {
        const under = survivor(2042) * (1 + i)
        const over = survivor(2044) / (1 + i)
        expect(survivor(2042)).toBeGreaterThan(0)
        expect(under).toBeGreaterThan(over * 1.2) // the flat-rate portion is what the under-65 months carry: 20 000 $ a year against 14 600 $
        expect(rows.find((r) => r.year === 2043)!.persons.self!.rrq - survivor(2043)).toBe(0) // no own pension of hers yet: the QPP she is paid IS the survivor's
      })

      it('is the months up to the birthday at the under-65 rate and the rest at the from-65 rate', () => {
        const under = survivor(2042) * (1 + i) // last year's under-65 rate, indexed one year
        const over = survivor(2044) / (1 + i) // next year's from-65 rate, one year back
        const expected = (month / 12) * under + ((12 - month) / 12) * over
        expect(survivor(2043)).toBeGreaterThan(expected * 0.97)
        expect(survivor(2043)).toBeLessThan(expected * 1.03)
      })

      it('the years either side are whole years of their own regime', () => {
        expect(survivor(2042)).toBeGreaterThan(survivor(2044))
        expect(survivor(2044)).toBeGreaterThan(0)
      })
    })
  }
})
