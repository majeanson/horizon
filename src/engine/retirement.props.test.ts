import { describe, expect, it } from 'vitest'
import { rrspNextRoom } from './accounts.ts'
import { leavingDate } from './dbPension.ts'
import { GOLDEN_ASSUMPTIONS as A } from './golden/household.fixture.ts'
import { paramsFor } from './params/index.ts'
import { project } from './projection.ts'
import { between, cases, intBetween } from './testGrid.ts'
import type { Household, Person, PersonId, YearRow } from './types.ts'

// WHEN PEOPLE STOP WORKING — what the projection must say about a household that no longer earns.
//
// Once a person retires their pay, the premiums on it (EI, QPIP, the QPP contribution), the RRSP deduction and the
// room it earned all stop; what the household lives on is ONLY the OAS (and the GIS when the income is low), the QPP
// pension, a defined-benefit pension, and what it draws from its RRSP / RRIF, TFSA and non-registered accounts —
// nothing else. These tests pin that on hand-checkable households and, as a property, on many generated ones.

const MIN = (y: number) => Math.min(60_000, y)
const ramp = (from: number, to: number, pay: number): Record<number, number> => Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [from + i, MIN(pay)]))

const base = (patch: Partial<Person> = {}): Person => ({
  id: 'self',
  name: 'Test',
  birth: { year: 1966, month: 6 },
  retirementAge: 60,
  salaryToday: 70_000,
  earningsHistory: ramp(1984, 2025, 50_000),
  rrq: { startAge: 65 },
  oas: { startAge: 65, residentSince: 1984 },
  accounts: {
    rrsp: { balance: 600_000, room: 200_000, annualContribution: 5_000 },
    tfsa: { balance: 150_000, room: 0, annualContribution: 0 },
    nonReg: { balance: 0, acb: 0, annualContribution: 0 },
  },
  pensions: [],
  ...patch,
})

const single = (p: Person, spending = { workingToday: 55_000, retiredToday: 50_000 }): Household => ({ livesAlone: true, persons: [p], spending })
const rowOf = (rows: YearRow[], year: number): YearRow => rows.find((r) => r.year === year)!
const at = (r: YearRow, id: PersonId = 'self') => r.persons[id]!
const inflate = (year: number) => (1 + A.inflation) ** (year - A.today.year)

describe('retirement stops the pay, the premiums, the deduction and the room it earned', () => {
  for (const age of [55, 58, 62, 65]) {
    it(`retiring at ${age}: pay in full to the month, a share in the year itself, nothing after`, () => {
      const h = single(base())
      const rows = project(h, A, { retirementAge: { self: age } })
      const leaving = leavingDate({ year: 1966, month: 6 }, age)
      for (const r of rows) {
        const p = at(r)
        const salary = 70_000 * (1 + A.wageGrowth) ** (r.year - A.today.year)
        if (r.year < leaving.year) {
          expect(p.employment, `${r.year}`).toBeCloseTo(salary, 1)
          expect(p.payrollContribution, `${r.year} pays EI + QPIP while working`).toBeGreaterThan(0)
          expect(p.rrqContribution, `${r.year} pays into the QPP while working`).toBeGreaterThan(0)
        } else if (r.year === leaving.year) {
          // A June birthday: five full months of pay before the retirement month.
          expect(p.employment, `${r.year}`).toBeCloseTo((salary * (leaving.month - 1)) / 12, 1)
        } else {
          expect(p.employment, `${r.year}`).toBe(0)
          expect(p.payrollContribution, `${r.year}`).toBe(0)
          expect(p.rrqContribution, `${r.year}`).toBe(0)
          expect(p.contributions.rrsp, `${r.year}: no RRSP deduction without pay, whatever the room`).toBe(0)
        }
      }
    })
  }

  it('a retired person\'s RRSP room does not grow: nothing earned, nothing added (and the pension adjustment never goes below zero)', () => {
    const rules = paramsFor(2027, { inflation: A.inflation, wageGrowth: A.wageGrowth }).accounts
    expect(rrspNextRoom(40_000, 0, 0, rules, rules.rrspLimit)).toBe(40_000)
    // …whereas a year of pay adds 18 % of it, up to the dollar limit.
    expect(rrspNextRoom(40_000, 50_000, 0, rules, rules.rrspLimit)).toBeCloseTo(40_000 + 9_000, 6)
    expect(rrspNextRoom(40_000, 500_000, 0, rules, rules.rrspLimit)).toBeCloseTo(40_000 + rules.rrspLimit, 6)
  })

  it('a pension adjustment takes room away but a year of pay can never leave the room smaller than it was', () => {
    const rules = paramsFor(2027, { inflation: A.inflation, wageGrowth: A.wageGrowth }).accounts
    expect(rrspNextRoom(10_000, 50_000, 999_999, rules, rules.rrspLimit)).toBe(10_000)
  })
})

describe('a household that lives on the OAS alone', () => {
  // Born 1960, retired since 2020, no pension, no savings, no QPP earnings: income is the OAS and the GIS, nothing else.
  const h = single(
    base({
      birth: { year: 1960, month: 3 },
      retirementAge: 60,
      salaryToday: 0,
      earningsHistory: {},
      oas: { startAge: 65, residentSince: 1978 },
      accounts: { rrsp: { balance: 0, room: 0, annualContribution: 0 }, tfsa: { balance: 0, room: 0, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } },
    }),
    { workingToday: 30_000, retiredToday: 26_000 },
  )
  const rows = project(h, A, {})

  it('every income line but the OAS and the GIS is zero, in every year', () => {
    for (const r of rows) {
      const p = at(r)
      expect(p.employment, `${r.year}`).toBe(0)
      expect(p.rrq, `${r.year}`).toBe(0)
      expect(p.db, `${r.year}`).toBe(0)
      expect(p.rrifMinimum, `${r.year}`).toBe(0)
      expect(p.withdrawals.nonReg + p.withdrawals.rrsp + p.withdrawals.tfsa, `${r.year}`).toBe(0)
      expect(p.oas, `${r.year}`).toBeGreaterThan(0)
      expect(p.gis, `${r.year}: a pensioner with no other income gets the GIS`).toBeGreaterThan(0)
      expect(r.household.grossIncome, `${r.year}`).toBeCloseTo(p.oas + p.gis, 2)
    }
  })

  it('what is not met is exactly the spending less what is left after tax, and the GIS is not taxed', () => {
    for (const r of rows) {
      const p = at(r)
      expect(p.netIncome, `${r.year}: the GIS never enters the net income`).toBeCloseTo(p.oas, 2)
      const afterTax = p.oas + p.gis - r.household.tax
      expect(r.household.shortfall, `${r.year}`).toBeCloseTo(Math.max(0, r.household.spending - afterTax), 1)
    }
  })

  it('the OAS is the published one and grows with prices: the 2026 pension, ten years later × inflation (plus the +10 % at 75)', () => {
    const p2026 = at(rowOf(rows, 2026)).oas
    // Age 66 in 2026: the 65–74 amount, 12 months. A figure in the hundreds a month, i.e. under 10 000 $ a year.
    expect(p2026).toBeGreaterThan(8_000)
    expect(p2026).toBeLessThan(10_000)
    const p2034 = at(rowOf(rows, 2034)).oas // age 74: still the 65–74 amount
    expect(p2034 / p2026).toBeGreaterThan(inflate(2034) * 0.995)
    expect(p2034 / p2026).toBeLessThan(inflate(2034) * 1.02)
  })
})

describe('the years before the OAS and the QPP start are paid from the accounts', () => {
  // Retires at 60 (June 2026), draws the QPP and the OAS at 65 (June 2031).
  const h = single(base({ birth: { year: 1966, month: 6 } }), { workingToday: 60_000, retiredToday: 60_000 })
  const rows = project(h, A, {})
  const wd = (r: YearRow) => at(r).withdrawals.nonReg + at(r).withdrawals.rrsp + at(r).withdrawals.tfsa

  it('between the last pay and the first pension there is no QPP, no OAS, no GIS, and the accounts cover the spending', () => {
    for (const y of [2027, 2028, 2029, 2030]) {
      const r = rowOf(rows, y)
      expect(at(r).employment).toBe(0)
      expect(at(r).rrq, `${y}`).toBe(0)
      expect(at(r).oas, `${y}`).toBe(0)
      expect(at(r).gis, `${y}`).toBe(0)
      expect(wd(r), `${y}`).toBeGreaterThan(r.household.spending)
      expect(r.household.shortfall, `${y}`).toBe(0)
    }
  })

  it('the pensions start in the month of the 65th birthday: a part-year then full years, and the draw on the accounts falls', () => {
    const y2031 = rowOf(rows, 2031)
    expect(at(y2031).oas).toBeGreaterThan(0)
    expect(at(y2031).rrq).toBeGreaterThan(0)
    const real = (r: YearRow) => wd(r) / inflate(r.year)
    expect(real(rowOf(rows, 2033)), 'two full years of pension later, the real draw is lower than the year before they started').toBeLessThan(real(rowOf(rows, 2030)))
    // A June birthday: the pension starts in July, so 6 months of 2031 (July–December) against the 12 of 2032, itself one January dearer.
    expect(at(y2031).rrq / at(rowOf(rows, 2032)).rrq).toBeCloseTo(6 / 12 / (1 + A.inflation), 2)
  })

  it('the RRIF minimum is forced from the year AFTER the one they turn 71 — the year they turn 72 — and is part of what they draw', () => {
    for (const r of rows) {
      if (r.year - 1966 <= 71) expect(at(r).rrifMinimum, `${r.year}`).toBe(0)
    }
    const first = rowOf(rows, 1966 + 72)
    expect(at(first).rrifMinimum, 'the first forced draw').toBeGreaterThan(0)
    expect(at(first).withdrawals.rrsp).toBeGreaterThanOrEqual(at(first).rrifMinimum)
  })
})

describe('a couple of whom one has retired and one still works', () => {
  const retired = base({ id: 'self', birth: { year: 1966, month: 6 }, retirementAge: 55, salaryToday: 0, accounts: { rrsp: { balance: 400_000, room: 150_000, annualContribution: 9_000 }, tfsa: { balance: 100_000, room: 20_000, annualContribution: 7_000 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } } })
  const working = base({ id: 'spouse', birth: { year: 1971, month: 2 }, retirementAge: 62, salaryToday: 90_000, earningsHistory: ramp(1989, 2025, 55_000), accounts: { rrsp: { balance: 100_000, room: 40_000, annualContribution: 6_000 }, tfsa: { balance: 40_000, room: 40_000, annualContribution: 6_000 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } } })
  const h: Household = { livesAlone: false, persons: [retired, working], spending: { workingToday: 52_000, retiredToday: 45_000 } }
  const rows = project(h, A, {})

  it('the retired one has no pay, no premium and no RRSP deduction in any year; the other has all three until the retirement month', () => {
    for (const r of rows) {
      const s = at(r, 'self')
      expect(s.employment, `${r.year}`).toBe(0)
      expect(s.payrollContribution, `${r.year}`).toBe(0)
      expect(s.rrqContribution, `${r.year}`).toBe(0)
      expect(s.contributions.rrsp, `${r.year}: the room is there, the pay is not`).toBe(0)
    }
    for (const y of [2026, 2030, 2032]) {
      const w = at(rowOf(rows, y), 'spouse')
      expect(w.employment).toBeGreaterThan(0)
      expect(w.payrollContribution).toBeGreaterThan(0)
      expect(w.contributions.rrsp).toBeGreaterThan(0)
    }
  })

  it('the household spends the « still working » figure until the LAST of them retires, then the retired one', () => {
    const spouseLeaves = 1971 + 62 // 2033
    for (const r of rows) {
      const want = (r.year < spouseLeaves ? 52_000 : 45_000) * inflate(r.year)
      expect(r.household.spending, `${r.year}`).toBeCloseTo(want, 1)
    }
  })

  it('while one still works, the retired one is paid by nobody: the household\'s money in is her pay plus the accounts', () => {
    const r = rowOf(rows, 2028)
    const s = at(r, 'self')
    expect(s.rrq + s.oas + s.gis + s.db, 'age 62: no pension has started').toBe(0)
  })
})

describe('a household with a pension in pay and no work at all', () => {
  const h = single(
    base({
      birth: { year: 1958, month: 9 },
      retirementAge: 60,
      salaryToday: 0,
      earningsHistory: ramp(1976, 2018, 45_000),
      rrq: { startAge: 65 },
      oas: { startAge: 65, residentSince: 1976 },
      accounts: { rrsp: { balance: 0, room: 0, annualContribution: 0 }, tfsa: { balance: 120_000, room: 0, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } },
      pensions: [
        {
          label: 'En cours', accrualRate: 0.02, maxServiceYears: 40, serviceYearsToDate: 0, serviceRatePerYear: 1, averagingYears: 5, coordination: null, earliestAge: 55,
          unreduced: { age: 61, serviceYears: 35, factor: null }, earlyReductionPerYear: 0.06, bridge: null, indexation: { share: 1, minus: 0 }, startAge: 60,
          inPay: { annual: 36_000 },
        },
      ],
    }),
    { workingToday: 45_000, retiredToday: 45_000 },
  )
  const rows = project(h, A, {})

  it('the pension is paid whole from this January, indexed each January after, and is the only thing besides the QPP and the OAS', () => {
    expect(at(rowOf(rows, 2026)).db).toBe(36_000)
    expect(at(rowOf(rows, 2027)).db).toBeCloseTo(36_000 * (1 + A.inflation), 2)
    expect(at(rowOf(rows, 2030)).db).toBeCloseTo(36_000 * (1 + A.inflation) ** 4, 2)
    for (const r of rows) {
      const p = at(r)
      expect(p.employment, `${r.year}`).toBe(0)
      expect(p.payrollContribution, `${r.year}`).toBe(0)
      expect(p.rrqContribution, `${r.year}`).toBe(0)
      expect(p.contributions.rrsp, `${r.year}: no RRSP deduction without pay (what is saved is only the surplus, in a TFSA or non-registered account)`).toBe(0)
      expect(r.household.grossIncome, `${r.year}`).toBeCloseTo(p.rrq + p.oas + p.allowance + p.gis + p.db + p.withdrawals.nonReg + p.withdrawals.rrsp + p.withdrawals.tfsa, 2)
    }
  })

  it('the pension, the QPP and the OAS together make the income, the TFSA fills only the gap, and tax is paid on the taxable ones', () => {
    const r = rowOf(rows, 2030)
    const p = at(r)
    expect(p.rrq).toBeGreaterThan(0)
    expect(p.oas).toBeGreaterThan(0)
    expect(r.household.tax).toBeGreaterThan(0)
    expect(p.netIncome).toBeCloseTo(p.rrq + p.oas + p.db, 0)
    expect(r.household.shortfall).toBe(0)
  })
})

describe('over many households: whoever has retired earns nothing and every account stays whole', () => {
  const SEED = 20261011
  const sample = cases(SEED, 24, (r, i) => {
    const mk = (id: PersonId): Person => {
      const birthYear = intBetween(r, 1958, 1992)
      const salary = id === 'self' || r() < 0.7 ? intBetween(r, 30_000, 150_000) : 0
      const pay = Math.min(salary * 0.8, 60_000)
      return {
        id,
        name: id,
        birth: { year: birthYear, month: intBetween(r, 1, 12) },
        retirementAge: intBetween(r, 50, 68),
        salaryToday: salary,
        earningsHistory: salary > 0 ? ramp(birthYear + 20, 2025, Math.round(pay)) : {},
        rrq: { startAge: intBetween(r, 60, 70) },
        oas: { startAge: intBetween(r, 65, 70), residentSince: birthYear + 18 },
        accounts: {
          rrsp: { balance: Math.round(between(r, 0, 700_000)), room: Math.round(between(r, 0, 80_000)), annualContribution: Math.round(between(r, 0, 12_000)) },
          tfsa: { balance: Math.round(between(r, 0, 200_000)), room: Math.round(between(r, 0, 60_000)), annualContribution: Math.round(between(r, 0, 7_000)) },
          nonReg: { balance: Math.round(between(r, 0, 200_000)), acb: 0, annualContribution: 0 },
        },
        pensions: [],
      }
    }
    const couple = r() < 0.6
    const persons = couple ? [mk('self'), mk('spouse')] : [mk('self')]
    for (const p of persons) p.accounts.nonReg.acb = Math.round(p.accounts.nonReg.balance * between(r, 0.5, 1))
    const h: Household = { livesAlone: !couple, persons, spending: { workingToday: intBetween(r, 35_000, 110_000), retiredToday: intBetween(r, 30_000, 100_000) } }
    return { h, label: `seed ${SEED} household ${i}` }
  })

  it('after the retirement year: no pay, no premiums, no QPP contribution, no RRSP deduction', () => {
    let checked = 0
    for (const { h, label } of sample) {
      for (const row of project(h, A, {})) {
        for (const p of h.persons) {
          if (row.year <= p.birth.year + p.retirementAge) continue
          const y = at(row, p.id)
          checked++
          expect(y.employment, `${label} ${p.id} ${row.year}`).toBe(0)
          expect(y.payrollContribution, `${label} ${p.id} ${row.year}`).toBe(0)
          expect(y.rrqContribution, `${label} ${p.id} ${row.year}`).toBe(0)
          expect(y.contributions.rrsp, `${label} ${p.id} ${row.year}`).toBe(0)
        }
      }
    }
    expect(checked, 'the sample must contain retired years').toBeGreaterThan(500)
  })

  it('a pension is paid only from its own start month, the GIS only to someone drawing the OAS, and a RRIF minimum only from the year after 71', () => {
    for (const { h, label } of sample) {
      for (const row of project(h, A, {})) {
        for (const p of h.persons) {
          const y = at(row, p.id)
          if (row.year < p.birth.year + p.rrq.startAge) expect(y.rrq, `${label} ${p.id} ${row.year}: QPP before its start`).toBe(0)
          if (row.year < p.birth.year + p.oas.startAge) expect(y.oas, `${label} ${p.id} ${row.year}: OAS before its start`).toBe(0)
          if (y.gis > 0) expect(y.oas, `${label} ${p.id} ${row.year}: a GIS without the OAS`).toBeGreaterThan(0)
          if (row.year - p.birth.year <= 71) expect(y.rrifMinimum, `${label} ${p.id} ${row.year}`).toBe(0)
        }
      }
    }
  })

  it('every year the books balance, nothing is drawn that is not there, and no account goes below zero', () => {
    for (const { h, label } of sample) {
      for (const row of project(h, A, {})) {
        const ps = Object.values(row.persons)
        const gross = ps.reduce((s, p) => s + p.employment + p.rrq + p.oas + p.allowance + p.gis + p.db + p.withdrawals.nonReg + p.withdrawals.rrsp + p.withdrawals.tfsa, 0)
        expect(row.household.grossIncome, `${label} ${row.year}`).toBeCloseTo(gross, 1)
        for (const p of ps) {
          for (const k of ['nonReg', 'rrsp', 'tfsa'] as const) {
            expect(p.balancesEnd[k], `${label} ${row.year} ${k}`).toBeGreaterThanOrEqual(0)
            expect(p.withdrawals[k], `${label} ${row.year} ${k}`).toBeGreaterThanOrEqual(0)
          }
        }
      }
    }
  })
})
