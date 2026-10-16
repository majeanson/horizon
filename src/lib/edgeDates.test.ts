import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { paramsFor } from '../engine/params/index.ts'
import { project } from '../engine/projection.ts'
import { householdTax, type PersonIncome, type TaxRules } from '../engine/tax.ts'
import type { Assumptions, Household, Person } from '../engine/types.ts'
import { bookProblems } from './identities.ts'

// THE RULES THAT HANG ON A DATE. Several rules turn on a birthday or a month and are only visible at the edge: the RRIF minimum from the year after the 71st, the pension that starts the month
// after the birthday month, the split that begins at 65, a spouse born far from the other. The property suites check these through ranges (« year − birth ≤ 71 »); here each edge is
// walked exactly, for all twelve birth months, so an off-by-one in a month or a year has nowhere to hide.

const TODAY = { year: 2026, month: 10 }
const A: Assumptions = { ...GOLDEN_ASSUMPTIONS, today: TODAY, inflation: 0.02, wageGrowth: 0.03, returns: { nonReg: 0.04, rrsp: 0.04, tfsa: 0.04 }, pensionSplitting: false, bracketFill: null, withdrawalOrder: ['nonReg', 'tfsa', 'rrsp'] }

/** One person, already retired and 60 or so, with an RRSP and money to live on outside it, so the RRSP is touched by nothing but the forced minimum. */
const retired = (birthYear: number, month: number, over: Partial<Person> = {}): Person => ({
  id: 'self',
  name: 'self',
  birth: { year: birthYear, month },
  retirementAge: 50,
  salaryToday: 0,
  earningsHistory: {},
  rrq: { startAge: 72 },
  oas: { startAge: 70, residentSince: birthYear + 20 },
  accounts: { rrsp: { balance: 400_000, room: 0, annualContribution: 0 }, tfsa: { balance: 3_000_000, room: 0, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } },
  pensions: [],
  ...over,
})
const alone = (p: Person, spending = 30_000): Household => ({ livesAlone: true, persons: [p], spending: { workingToday: spending, retiredToday: spending } })
const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

describe('the RRIF minimum starts in the year AFTER the 71st birthday, whatever the month of birth', () => {
  for (const month of MONTHS) {
    it(`born in month ${month}: no minimum through the year they turn 71, the 5.28 % factor in the year they turn 72, on the January balance`, () => {
      const birthYear = 1960 // 66 today
      const rows = project(alone(retired(birthYear, month)), A)
      const mins = rows.map((r) => ({ year: r.year, min: r.persons.self!.rrifMinimum, prev: rows.find((x) => x.year === r.year - 1)?.persons.self }))
      const first = mins.find((m) => m.min > 0)!
      expect(first.year, `born ${birthYear}-${month}`).toBe(birthYear + 72)
      expect(mins.filter((m) => m.year <= birthYear + 71).every((m) => m.min === 0)).toBe(true)
      // the January balance is the previous December's: 5.28 % of it (the table's age-71 row is the age on 1 January of the year they turn 72)
      const january = first.prev!.balancesEnd.rrsp
      expect(first.min).toBeCloseTo(Math.round(january * paramsFor(first.year, { inflation: 0.02, wageGrowth: 0.03 }).accounts.rrifFactors[71] * 100) / 100, 1)
    })
  }
})

describe('a pension starts the month AFTER the birthday month: the months paid in the first year are 12 minus the birth month', () => {
  const full = (rows: ReturnType<typeof project>, year: number, f: (p: NonNullable<(typeof rows)[number]['persons']['self']>) => number) => f(rows.find((r) => r.year === year)!.persons.self!)

  for (const month of MONTHS) {
    it(`QPP at 65, born in month ${month}`, () => {
      const birthYear = 1962
      const rows = project(alone(retired(birthYear, month, { rrq: { startAge: 65 }, earningsHistory: Object.fromEntries(Array.from({ length: 30 }, (_, i) => [1984 + i, 60_000])) })), A)
      const first = full(rows, birthYear + 65, (p) => p.rrq)
      const second = full(rows, birthYear + 66, (p) => p.rrq)
      if (month === 12) expect(first, 'born in December the first payment is in January').toBe(0)
      else expect(first / second, `${first} of ${second}`).toBeCloseTo((12 - month) / 12 / (1 + A.inflation), 1)
      expect(second).toBeGreaterThan(0)
    })

    it(`OAS at 65, born in month ${month}`, () => {
      const birthYear = 1962
      const rows = project(alone(retired(birthYear, month, { oas: { startAge: 65, residentSince: birthYear + 18 } })), A)
      const first = full(rows, birthYear + 65, (p) => p.oas)
      const second = full(rows, birthYear + 66, (p) => p.oas)
      if (month === 12) expect(first).toBe(0)
      else expect(first / second, `${first} of ${second}`).toBeCloseTo((12 - month) / 12 / (1 + A.inflation), 1)
      expect(second).toBeGreaterThan(0)
    })
  }
})

describe('pension income splitting begins at 65, to the year', () => {
  const P = paramsFor(2026, { inflation: 0.02, wageGrowth: 0.03 })
  const RULES: TaxRules = { federal: P.federal, quebec: P.quebec, oas: P.oas, livesAlone: false }
  const income = (over: Partial<PersonIncome>): PersonIncome => ({ age: 50, employment: 0, rrq: 0, oas: 0, db: 0, registered: 0, capitalGains: 0, rrqBase: 0, rrqEnhanced: 0, payrollPremiums: 0, rrspDeduction: 0, ...over })

  it('RRIF income of someone who is 64 at the end of the year cannot be split; at 65 it can, and the couple pays less', () => {
    const couple = (age: number) => householdTax([income({ age, registered: 90_000 }), income({ age: age - 1 })], RULES, { splitting: true })
    expect(couple(64).split.amount).toBe(0)
    expect(couple(65).split.amount).toBeGreaterThan(0)
    expect(couple(65).total).toBeLessThan(householdTax([income({ age: 65, registered: 90_000 }), income({ age: 64 })], RULES, { splitting: false }).total)
  })

  it('the share moved is at most half of the pension income, and never from the spouse with nothing', () => {
    const t = householdTax([income({ age: 70, registered: 90_000 }), income({ age: 70 })], RULES, { splitting: true })
    expect(t.split.from).toBe(0)
    expect(t.split.amount).toBeLessThanOrEqual(45_000)
    const reversed = householdTax([income({ age: 70 }), income({ age: 70, registered: 90_000 })], RULES, { splitting: true })
    expect(reversed.split.from).toBe(1)
  })

  // STATED, NOT ENDORSED: the law lets an employer pension's annuity income be split before 65; the engine splits from 65 only (ENGINE.md, tax.ts ◐), a choice that errs toward more tax.
  // Pinned so that a change is a decision: if it is ever modelled, this test is the one to turn around.
  it('a defined-benefit pension of someone under 65 is NOT split (the engine’s documented simplification)', () => {
    const t = householdTax([income({ age: 60, db: 90_000 }), income({ age: 58 })], RULES, { splitting: true })
    expect(t.split.amount).toBe(0)
  })
})

describe('spouses born far apart', { timeout: 120_000 }, () => {
  for (const gap of [-20, -15, -10, -5, 0, 5, 10, 15, 20]) {
    it(`${gap > 0 ? 'the second is ' + gap + ' years younger' : gap < 0 ? 'the second is ' + -gap + ' years older' : 'the same age'}: the books hold, and both are in the rows until their own end`, () => {
      const [a, b] = GOLDEN_HOUSEHOLD.persons
      const h: Household = { ...GOLDEN_HOUSEHOLD, persons: [a, { ...b, birth: { year: a.birth.year + gap, month: b.birth.month }, earningsHistory: {} }] }
      const rows = project(h, A)
      expect(bookProblems(rows, A)).toEqual([])
      const years = rows.map((r) => r.year)
      for (const p of h.persons) {
        const own = rows.filter((r) => r.persons[p.id])
        expect(own[own.length - 1].year, p.id).toBe(p.birth.year + A.horizonAge)
        expect(own.length).toBe(years.filter((y) => y <= p.birth.year + A.horizonAge).length)
      }
    })
  }
})
