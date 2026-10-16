import { describe, expect, it } from 'vitest'
import { rrqPension, rrqStart, type RrqPensionInput, type RrqRules } from './rrq.ts'
import { makeRrqRules } from './rrqRules.ts'

// THE QPP FOR SOMEONE WHO WAS ALREADY WORKING WHEN THE PLAN BEGAN. The Québec Pension Plan began in January 1966: nobody has a contributory period before it, whatever age they were. The calculation counts
// the period from the 18th birthday, and a person whose 18th birthday fell before 1966 (born in 1947 or earlier — 79 or more today) asked for the ceiling of years the plan did not exist, which the
// engine refuses (« no parameters before 2026 »): a VALID profile of an older person threw into the page. The property suite generated people born 1950 to 1992, and so never met them.

const RULES: RrqRules = makeRrqRules({ inflation: 0.02, wageGrowth: 0.03 })
const PLAN_STARTED = 1966
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const career = (birthYear: number, month: number, startAge: number, from = PLAN_STARTED, to = birthYear + 64, pay = 40_000): RrqPensionInput => ({
  birth: { year: birthYear, month },
  startAge,
  earnings: Object.fromEntries(Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => [from + i, pay])),
})
const idx = (y: number, m: number) => y * 12 + (m - 1)

describe('anyone born before 1950, in every month of birth', () => {
  for (const birthYear of [1900, 1915, 1930, 1940, 1944, 1945, 1946, 1947, 1948, 1949]) {
    it(`born ${birthYear}: the pension is worked out (no throw), for every month of birth and every start age`, () => {
      for (const month of MONTHS) {
        for (const startAge of [60, 65, 70, 72]) {
          expect(() => rrqPension(career(birthYear, month, startAge), RULES), `${birthYear}-${month} at ${startAge}`).not.toThrow()
          const p = rrqPension(career(birthYear, month, startAge), RULES)
          expect(Number.isFinite(p.monthly) && p.monthly >= 0, `${birthYear}-${month} at ${startAge}`).toBe(true)
        }
      }
    })
  }

  it('a career with no earnings at all is a pension of nothing, not a throw', () => {
    for (const birthYear of [1900, 1930, 1945]) expect(rrqPension({ birth: { year: birthYear, month: 6 }, startAge: 65, earnings: {} }, RULES).monthly).toBe(0)
  })
})

describe('the contributory period never begins before the plan did', () => {
  it('for someone who turned 18 before 1966, the months counted are those since January 1966 and not one more', () => {
    for (const [birthYear, month] of [[1930, 5], [1940, 11], [1946, 2], [1947, 12]] as const) {
      const p = rrqPension(career(birthYear, month, 65), RULES)
      const start = rrqStart({ year: birthYear, month }, 65)
      const expected = idx(start.year, start.month) - idx(PLAN_STARTED, 1)
      // the period ends the month before the pension starts; allow one month for the boundary the leaflet counts by
      expect(p.referenceMonths, `${birthYear}-${month}`).toBeLessThanOrEqual(expected)
      expect(p.referenceMonths, `${birthYear}-${month}`).toBeGreaterThanOrEqual(expected - 1)
    }
  })

  it('someone who turned 18 AFTER 1966 is unchanged: the period starts at their 18th birthday, as before', () => {
    const born = career(1960, 6, 65, 1978)
    const p = rrqPension(born, RULES)
    const start = rrqStart({ year: 1960, month: 6 }, 65)
    expect(p.referenceMonths).toBeLessThanOrEqual(idx(start.year, start.month) - idx(1978, 7))
    expect(p.referenceMonths).toBeGreaterThanOrEqual(idx(start.year, start.month) - idx(1978, 7) - 1)
  })

  it('an older and a younger person with a record from 1966 on both get a pension (the older is not zeroed by the years before the plan)', () => {
    const young = rrqPension(career(1947, 6, 65, PLAN_STARTED, 2011), RULES).monthly
    const older = rrqPension(career(1940, 6, 65, PLAN_STARTED, 2004), RULES).monthly
    expect(young).toBeGreaterThan(0)
    expect(older).toBeGreaterThan(0)
  })
})
