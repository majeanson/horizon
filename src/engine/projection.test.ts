import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { dbStart, dbYear } from './dbPension.ts'
import { gisCategory, gisCountedIncome, gisMonthly } from './oas.ts'
import { paramsFor } from './params/index.ts'
import { project } from './projection.ts'
import { rregopPension } from './presets.ts'
import { householdTax } from './tax.ts'
import { between, cases, intBetween } from './testGrid.ts'
import type { Household, Person, PersonId, YearRow } from './types.ts'

// THE PROJECTION — what the year-by-year simulation must satisfy for EVERY household, and a hand-checkable
// case where its answer can be computed independently from the pieces already verified against the sources.

const A = GOLDEN_ASSUMPTIONS
const H = GOLDEN_HOUSEHOLD

const withPerson = (h: Household, id: PersonId, patch: Partial<Person>): Household => ({
  ...h,
  persons: h.persons.map((p) => (p.id === id ? { ...p, ...patch } : p)),
})
const people = (row: YearRow) => Object.values(row.persons)

describe('projection — the books always balance', () => {
  const rows = project(H, A, {})

  it('runs from this year to the year the youngest person reaches the horizon age', () => {
    expect(rows[0].year).toBe(A.today.year)
    expect(rows[rows.length - 1].year).toBe(1981 + A.horizonAge)
    rows.forEach((r, i) => expect(r.year).toBe(A.today.year + i))
  })

  it('every year: everything received − tax − what is put away = what is spent − what could not be met', () => {
    for (const r of rows) {
      const received = r.household.grossIncome
      const putAway = people(r).reduce((s, p) => s + p.rrqContribution + p.contributions.nonReg + p.contributions.rrsp + p.contributions.tfsa, 0)
      expect(received - r.household.tax - putAway, `${r.year}`).toBeCloseTo(r.household.spending - r.household.shortfall, 1)
    }
  })

  it('gross income is exactly the sum of what each person received, withdrawals included', () => {
    for (const r of rows) {
      const sum = people(r).reduce((s, p) => s + p.employment + p.rrq + p.oas + p.gis + p.db + p.withdrawals.nonReg + p.withdrawals.rrsp + p.withdrawals.tfsa, 0)
      expect(sum, `${r.year}`).toBeCloseTo(r.household.grossIncome, 1)
    }
  })

  it('net worth is the sum of the accounts, and no account is ever negative', () => {
    for (const r of rows) {
      let total = 0
      for (const p of people(r)) {
        for (const v of Object.values(p.balancesEnd)) {
          expect(v, `${r.year}`).toBeGreaterThanOrEqual(-0.005)
          total += v
        }
      }
      expect(total, `${r.year}`).toBeCloseTo(r.household.netWorthEnd, 0)
    }
  })

  it('household tax is the sum of both people\'s federal, Québec and OAS-recovery tax', () => {
    for (const r of rows) {
      const sum = people(r).reduce((s, p) => s + p.federalTax + p.quebecTax + p.oasRecovery, 0)
      expect(sum, `${r.year}`).toBeCloseTo(r.household.tax, 1)
    }
  })

  it('is deterministic: the same inputs give the same rows', () => {
    expect(project(H, A, {})).toEqual(rows)
  })

  it('spending grows with inflation, and drops to the retired figure only once EVERYONE has retired', () => {
    const base = (y: number, today: number) => today * (1 + A.inflation) ** (y - A.today.year)
    for (const r of rows) {
      const everyoneRetired = r.year >= 1978 + 60 && r.year >= 1981 + 62
      const expected = base(r.year, everyoneRetired ? H.spending.retiredToday : H.spending.workingToday)
      expect(r.household.spending, `${r.year}`).toBeCloseTo(expected, 1)
    }
  })

  it('the figures for years past the last published one are marked projected, the published year is not', () => {
    expect(rows[0].projected).toBe(false)
    expect(rows[1].projected).toBe(true)
  })
})

describe('projection — a household living on pensions alone, checked against the pieces', () => {
  // Born June 1964, leaves on the 62nd birthday (June 2026), RREGOP from 62, no savings, nothing else.
  const solo: Person = {
    ...H.persons[0],
    id: 'self',
    birth: { year: 1964, month: 6 },
    retirementAge: 62,
    salaryToday: 70_000,
    rrq: { startAge: 70 },
    oas: { startAge: 70, residentSince: 1982 },
    accounts: { rrsp: { balance: 0, room: 0, annualContribution: 0 }, tfsa: { balance: 0, room: 0, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } },
    pensions: [rregopPension({ serviceYearsToDate: 30, startAge: 62 })],
  }
  const house: Household = { persons: [solo], spending: { workingToday: 40_000, retiredToday: 40_000 } }
  const rows = project(house, { ...A, pensionSplitting: false }, {})

  it('the pension received each year is the DB module\'s own figure for that year', () => {
    const start = dbStart(solo.pensions[0], {
      birth: solo.birth,
      leaving: { year: 2026, month: 6 },
      today: A.today,
      salaryAt: (y) => solo.salaryToday * (1 + A.wageGrowth) ** (Math.min(y, 2026) - A.today.year),
      mgaAt: () => 10 ** 9,
    })
    for (const r of rows.filter((x) => x.year >= 2027 && x.year <= 2030)) {
      expect(r.persons.self!.db, `${r.year}`).toBeCloseTo(dbYear(start, r.year, A.inflation), 2)
    }
  })

  it('with no savings, the tax is the single person\'s tax on that pension, and any gap is the shortfall', () => {
    for (const r of rows.filter((x) => x.year >= 2028 && x.year <= 2029)) {
      const P = paramsFor(r.year, { inflation: A.inflation, wageGrowth: A.wageGrowth })
      const db = r.persons.self!.db
      expect(r.persons.self!.withdrawals).toEqual({ nonReg: 0, rrsp: 0, tfsa: 0 })
      const tax = householdTax([{ age: r.persons.self!.age, employment: 0, rrq: 0, oas: 0, db, registered: 0, capitalGains: 0, rrqBase: 0, rrqEnhanced: 0, rrspDeduction: 0 }], { federal: P.federal, quebec: P.quebec, oas: P.oas })
      expect(r.household.tax).toBeGreaterThan(0)
      expect(r.household.tax, `${r.year}`).toBeCloseTo(tax.total, 1)
      expect(r.household.shortfall, `${r.year}`).toBeCloseTo(Math.max(0, r.household.spending - (db + r.persons.self!.gis - r.household.tax)), 1)
    }
  })

  it('a household that spends more than its income and has no savings shows the gap, never a negative balance', () => {
    const poor = project({ ...house, spending: { workingToday: 90_000, retiredToday: 90_000 } }, A, {})
    expect(poor.some((r) => r.household.shortfall > 1_000)).toBe(true)
    for (const r of poor) expect(r.household.netWorthEnd).toBeGreaterThanOrEqual(0)
  })
})

describe('projection — the accounts behave', () => {
  it('after the year they turn 71 a person is forced to take at least the RRIF minimum from the RRSP, and gets it taxed', () => {
    const rich = withPerson(H, 'self', { accounts: { ...H.persons[0].accounts, rrsp: { balance: 3_000_000, room: 0, annualContribution: 0 } } })
    const rows = project({ ...rich, spending: { workingToday: 20_000, retiredToday: 20_000 } }, A, {})
    const forced = rows.filter((r) => r.persons.self!.age >= 73)
    expect(forced.length).toBeGreaterThan(5)
    for (const r of forced) {
      expect(r.persons.self!.rrifMinimum, `${r.year}`).toBeGreaterThan(0)
      expect(r.persons.self!.withdrawals.rrsp, `${r.year}`).toBeGreaterThanOrEqual(r.persons.self!.rrifMinimum - 0.01)
    }
  })

  it('draws on the accounts in the household\'s order: the first account is emptied before the second is touched', () => {
    // Retired from now on, living off savings only, with the tax-free account listed LAST.
    const savers = withPerson(withPerson(H, 'self', { retirementAge: 48, pensions: [] }), 'spouse', { retirementAge: 45 })
    const rows = project(savers, { ...A, withdrawalOrder: ['nonReg', 'rrsp', 'tfsa'] }, {})
    let sawTfsa = false
    rows.forEach((r, i) => {
      if (i === 0) return
      const tfsaDrawn = people(r).reduce((s, p) => s + p.withdrawals.tfsa, 0)
      if (tfsaDrawn <= 1) return
      sawTfsa = true
      // The TFSA was touched, so the RRSP — listed before it — must have been taken in full: everything it held
      // at the start of the year (last year's closing balance) came out.
      const heldAtStart = people(rows[i - 1]).reduce((s, p) => s + p.balancesEnd.rrsp, 0)
      const taken = people(r).reduce((s, p) => s + p.withdrawals.rrsp, 0)
      expect(taken, `${r.year}: the TFSA was touched while the RRSP still held money`).toBeCloseTo(heldAtStart, 1)
    })
    expect(sawTfsa, 'the scenario must reach the third account').toBe(true)
  })

  it('surplus is saved, tax-free account first: while working, the TFSA receives what the household does not spend', () => {
    const first = project(H, A, {})[0]
    const tfsaIn = people(first).reduce((s, p) => s + p.contributions.tfsa, 0)
    expect(tfsaIn).toBeGreaterThan(0)
  })
})

describe('projection — more is never worse, over many households', () => {
  // The profile's own savings doubled can never push the date the plan first works LATER.
  const SEED = 20261006
  const sample = cases(SEED, 12, (r, i) => {
    const scale = between(r, 0.3, 1.6)
    const h: Household = {
      persons: H.persons.map((p) => ({
        ...p,
        salaryToday: Math.round(p.salaryToday * between(r, 0.6, 1.5)),
        accounts: {
          rrsp: { ...p.accounts.rrsp, balance: Math.round(p.accounts.rrsp.balance * scale) },
          tfsa: { ...p.accounts.tfsa, balance: Math.round(p.accounts.tfsa.balance * scale) },
          nonReg: { ...p.accounts.nonReg, balance: Math.round(p.accounts.nonReg.balance * scale), acb: Math.round(p.accounts.nonReg.acb * scale) },
        },
      })),
      spending: { workingToday: intBetween(r, 50_000, 110_000), retiredToday: intBetween(r, 50_000, 120_000) },
    }
    return { h, label: `seed ${SEED} household ${i}` }
  })

  const doubled = (h: Household): Household => ({
    ...h,
    persons: h.persons.map((p) => ({
      ...p,
      accounts: {
        rrsp: { ...p.accounts.rrsp, balance: p.accounts.rrsp.balance * 2 },
        tfsa: { ...p.accounts.tfsa, balance: p.accounts.tfsa.balance * 2 },
        nonReg: { ...p.accounts.nonReg, balance: p.accounts.nonReg.balance * 2, acb: p.accounts.nonReg.acb * 2 },
      },
    })),
  })

  const works = (h: Household, age: number): boolean => project(h, A, { retirementAge: { self: age, spouse: age } }).every((r) => r.household.shortfall === 0)
  const AGES = [56, 60, 64, 68]

  it('twice the savings: wherever the plan worked, it still works', () => {
    let worked = 0
    for (const { h, label } of sample) {
      for (const age of AGES) {
        if (!works(h, age)) continue
        worked++
        expect(works(doubled(h), age), `${label} @ ${age}`).toBe(true)
      }
    }
    expect(worked, 'the sample must include plans that work').toBeGreaterThan(8)
  })

  it('lower spending: wherever the plan worked, it still works', () => {
    for (const { h, label } of sample) {
      const frugal = { ...h, spending: { workingToday: h.spending.workingToday * 0.8, retiredToday: h.spending.retiredToday * 0.8 } }
      for (const age of AGES) if (works(h, age)) expect(works(frugal, age), `${label} @ ${age}`).toBe(true)
    }
  })

  it('every row of every sampled household balances', () => {
    for (const { h, label } of sample.slice(0, 8)) {
      for (const r of project(h, A, { retirementAge: { self: 60, spouse: 62 } })) {
        const putAway = people(r).reduce((s, p) => s + p.rrqContribution + p.contributions.nonReg + p.contributions.rrsp + p.contributions.tfsa, 0)
        expect(r.household.grossIncome - r.household.tax - putAway, `${label} ${r.year}`).toBeCloseTo(r.household.spending - r.household.shortfall, 1)
      }
    }
  })
})

describe('projection — the income-tested benefits are wired in', () => {
  const rules = (year: number) => paramsFor(year, { inflation: A.inflation, wageGrowth: A.wageGrowth })

  it('a modest retiree living on tax-free savings receives the GIS the OAS module computes for their counted income', () => {
    // Born January 1956 (70), retired since 65, OAS and RRQ from 65, a small RRQ pension, and only a TFSA to live on.
    const modest: Person = {
      ...H.persons[0],
      id: 'self',
      birth: { year: 1956, month: 1 },
      retirementAge: 65,
      salaryToday: 0,
      earningsHistory: Object.fromEntries(Array.from({ length: 31 }, (_, i) => [1990 + i, 16_000])),
      rrq: { startAge: 65 },
      oas: { startAge: 65, residentSince: 1974 },
      accounts: { rrsp: { balance: 0, room: 0, annualContribution: 0 }, tfsa: { balance: 120_000, room: 0, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } },
      pensions: [],
    }
    const rows = project({ persons: [modest], spending: { workingToday: 30_000, retiredToday: 30_000 } }, { ...A, today: { year: 2026, month: 1 } }, {})
    const row = rows.find((r) => r.year === 2028)!
    const p = row.persons.self!
    const P = rules(2028)
    expect(p.gis).toBeGreaterThan(1_000)
    const counted = gisCountedIncome(p.rrq, 0, P.oas)
    expect(p.gis).toBeCloseTo(gisMonthly(counted, gisCategory({ present: false, receivesOas: false }), P.oas) * 12, 1)
    // …and it is tax-free: the tax is on the RRQ pension and the OAS only.
    expect(p.withdrawals.tfsa).toBeGreaterThan(0)
  })

  it('someone with under ten years of residence has no OAS, and therefore no GIS — however little they live on', () => {
    const recent: Person = {
      ...H.persons[0],
      id: 'self',
      birth: { year: 1961, month: 6 },
      retirementAge: 65,
      salaryToday: 0,
      earningsHistory: {},
      oas: { startAge: 65, residentSince: 2018 },
      accounts: { rrsp: { balance: 0, room: 0, annualContribution: 0 }, tfsa: { balance: 120_000, room: 0, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } },
      pensions: [],
    }
    const rows = project({ persons: [recent], spending: { workingToday: 30_000, retiredToday: 30_000 } }, { ...A, today: { year: 2026, month: 1 } }, {})
    for (const r of rows.filter((x) => x.year >= 2026 && x.year <= 2035)) {
      expect(r.persons.self!.oas, `${r.year}`).toBe(0)
      expect(r.persons.self!.gis, `${r.year}`).toBe(0)
    }
  })

  it('a large RRIF pushes net income over the threshold: part of the OAS is recovered, never more than the OAS itself', () => {
    const rich = withPerson(H, 'self', { accounts: { ...H.persons[0].accounts, rrsp: { balance: 3_000_000, room: 0, annualContribution: 0 } } })
    const rows = project(rich, A, {})
    const hit = rows.filter((r) => r.persons.self!.oasRecovery > 0)
    expect(hit.length).toBeGreaterThan(3)
    for (const r of hit) expect(r.persons.self!.oasRecovery).toBeLessThanOrEqual(r.persons.self!.oas + 0.01)
  })
})
