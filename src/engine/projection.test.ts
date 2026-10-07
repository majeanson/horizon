import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { dbStart, dbYear } from './dbPension.ts'
import { gisCategory, gisCountedIncome, gisMonthly } from './oas.ts'
import { paramsFor } from './params/index.ts'
import { payrollContribution } from './payroll.ts'
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
      const putAway = people(r).reduce((s, p) => s + p.rrqContribution + p.payrollContribution + p.pensionContribution + p.contributions.nonReg + p.contributions.rrsp + p.contributions.tfsa, 0)
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

  it('a working year pays the EI and QPIP premiums on its employment income; a year with none pays none', () => {
    let worked = 0
    for (const r of rows) {
      const P = paramsFor(r.year, { inflation: A.inflation, wageGrowth: A.wageGrowth })
      for (const p of people(r)) {
        expect(p.payrollContribution, `${r.year}`).toBeCloseTo(payrollContribution(p.employment, P.payroll).total, 1)
        if (p.employment === 0) expect(p.payrollContribution, `${r.year}`).toBe(0)
        else {
          worked++
          expect(p.payrollContribution, `${r.year}`).toBeGreaterThan(0)
        }
      }
    }
    expect(worked, 'the golden household works for years').toBeGreaterThan(10)
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

describe('projection — a falling market never takes an account below zero', () => {
  // The mid-year convention ends a year with start × (1 + r) − out × (1 + r)^½; under a negative return,
  // emptying an account used to overshoot to a negative balance, a negative RRIF minimum and a negative withdrawal.
  const falling = [
    { returns: -0.05, inflation: 0.08 },
    { returns: -0.2, inflation: 0.02 },
    { returns: -0.5, inflation: 0 },
  ]
  it.each(falling)('returns $returns, inflation $inflation: every balance, withdrawal and RRIF minimum stays at or above zero', ({ returns, inflation }) => {
    const rows = project(H, { ...A, inflation, returns: { nonReg: returns, rrsp: returns, tfsa: returns } }, {})
    for (const r of rows) {
      for (const p of people(r)) {
        for (const v of [...Object.values(p.balancesEnd), ...Object.values(p.withdrawals), p.rrifMinimum]) {
          expect(Number.isFinite(v), `${r.year}`).toBe(true)
          expect(v, `${r.year}`).toBeGreaterThanOrEqual(-0.005)
        }
      }
      expect(r.household.netWorthEnd, `${r.year}`).toBeGreaterThanOrEqual(-0.005)
      const putAway = people(r).reduce((s, p) => s + p.rrqContribution + p.payrollContribution + p.pensionContribution + p.contributions.nonReg + p.contributions.rrsp + p.contributions.tfsa, 0)
      expect(r.household.grossIncome - r.household.tax - putAway, `${r.year}`).toBeCloseTo(r.household.spending - r.household.shortfall, 1)
    }
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
    // Spending that no year's income can beat, so no surplus is ever saved (2026 already spends the RETIRED figure:
    // the person leaves in June). « No savings » is then true by construction, not by the rounding of a trickle.
    const lean = project({ ...house, spending: { workingToday: 200_000, retiredToday: 200_000 } }, { ...A, pensionSplitting: false }, {})
    for (const r of lean.filter((x) => x.year >= 2028 && x.year <= 2029)) {
      const P = paramsFor(r.year, { inflation: A.inflation, wageGrowth: A.wageGrowth })
      const db = r.persons.self!.db
      expect(r.persons.self!.withdrawals).toEqual({ nonReg: 0, rrsp: 0, tfsa: 0 })
      const tax = householdTax([{ age: r.persons.self!.age, employment: 0, rrq: 0, oas: 0, db, registered: 0, capitalGains: 0, rrqBase: 0, rrqEnhanced: 0, payrollPremiums: 0, rrspDeduction: 0 }], { federal: P.federal, quebec: P.quebec, oas: P.oas })
      expect(r.household.tax).toBeGreaterThan(0)
      expect(r.household.tax, `${r.year}`).toBeCloseTo(tax.total, 1)
      expect(r.household.shortfall, `${r.year}`).toBeCloseTo(Math.max(0, r.household.spending - (db + r.persons.self!.gis - r.household.tax)), 1)
    }
  })

  it('a person who does not live alone pays exactly that year\'s living-alone credit more Québec tax (indexed amount × 14 %)', () => {
    // Spending no year can meet, so nothing is ever saved or drawn: the only thing that differs is the credit.
    const lean = { ...house, spending: { workingToday: 200_000, retiredToday: 200_000 } }
    const alone = project({ ...lean, livesAlone: true }, { ...A, pensionSplitting: false }, {})
    const shares = project({ ...lean, livesAlone: false }, { ...A, pensionSplitting: false }, {})
    for (const year of [2028, 2029]) {
      const q = paramsFor(year, { inflation: A.inflation, wageGrowth: A.wageGrowth }).quebec
      const a = alone.find((r) => r.year === year)!.persons.self!.quebecTax
      const s = shares.find((r) => r.year === year)!.persons.self!.quebecTax
      expect(q.livingAloneAmount, 'the amount is indexed past 2 172 $').toBeGreaterThan(2_172)
      expect(s - a, `${year}`).toBeCloseTo(q.livingAloneAmount * q.creditRate, 1)
    }
  })

  it('a household that spends more than its income and has no savings shows the gap, never a negative balance', () => {
    const poor = project({ ...house, spending: { workingToday: 90_000, retiredToday: 90_000 } }, A, {})
    expect(poor.some((r) => r.household.shortfall > 1_000)).toBe(true)
    for (const r of poor) expect(r.household.netWorthEnd).toBeGreaterThanOrEqual(0)
  })
})

describe('projection — committed savings yield to spending', () => {
  // The review's reproduction: 30 k$ of salary, 25 k$ of spending, and 2 000 $ + 2 000 $ of yearly savings entered.
  // The engine used to draw 3 464 $ out of the RRSP — taxed — to fund a 2 000 $ RRSP contribution the same year.
  const eager: Person = {
    ...H.persons[0],
    id: 'self',
    birth: { year: 1990, month: 1 },
    retirementAge: 65,
    salaryToday: 30_000,
    accounts: {
      rrsp: { balance: 20_000, room: 30_000, annualContribution: 2_000 },
      tfsa: { balance: 5_000, room: 30_000, annualContribution: 2_000 },
      nonReg: { balance: 0, acb: 0, annualContribution: 0 },
    },
    pensions: [],
  }
  const house: Household = { persons: [eager], spending: { workingToday: 25_000, retiredToday: 25_000 } }
  const rows = project(house, { ...A, pensionSplitting: false }, {})

  it('no year both takes money out of an account and puts money into one', () => {
    let cut = 0
    for (const r of rows) {
      const p = r.persons.self!
      // A forced RRIF minimum is not a choice (it can exceed spending, and then the surplus is saved): count only what was chosen.
      const out = p.withdrawals.nonReg + (p.withdrawals.rrsp - p.rrifMinimum) + p.withdrawals.tfsa
      const into = p.contributions.nonReg + p.contributions.rrsp + p.contributions.tfsa
      if (out > 0.01) expect(into, `${r.year}: withdrew ${out} and saved ${into}`).toBeLessThanOrEqual(0.01)
      const committed = 4_000 * (1 + A.inflation) ** (r.year - A.today.year)
      if (p.employment > 0 && into < committed - 0.01) cut++
    }
    expect(cut, 'the scenario must reach a working year where the savings had to be cut').toBeGreaterThan(0)
  })

  it('the RRSP deduction follows what was actually contributed, and the books still balance', () => {
    for (const r of rows) {
      const p = r.persons.self!
      expect(p.contributions.rrsp).toBeLessThanOrEqual(2_000 * (1 + A.inflation) ** (r.year - A.today.year) + 0.01)
      const putAway = p.rrqContribution + p.payrollContribution + p.pensionContribution + p.contributions.nonReg + p.contributions.rrsp + p.contributions.tfsa
      expect(r.household.grossIncome - r.household.tax - putAway, `${r.year}`).toBeCloseTo(r.household.spending - r.household.shortfall, 1)
    }
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

describe('projection — the withdrawal solver is precise and shares a couple fairly, over many households', () => {
  // These pin the solver's internals directly. Before them, a ×100 looser bisection tolerance and a flipped
  // couple-allocation weight were caught only by the golden snapshot — which is regenerated, not argued with.
  const SEED = 20261007
  const NO_SPLIT = { ...A, pensionSplitting: false }
  const sample = cases(SEED, 120, (r, i) => {
    const scale = between(r, 0.15, 0.9)
    const h: Household = {
      persons: H.persons.map((p) => ({
        ...p,
        accounts: {
          // Large RRSPs and small non-registered accounts, so a long stretch of years draws the RRSP alone for BOTH spouses.
          rrsp: { ...p.accounts.rrsp, balance: Math.round(p.accounts.rrsp.balance * scale * 12) },
          tfsa: { ...p.accounts.tfsa, balance: Math.round(p.accounts.tfsa.balance * scale * 6) },
          nonReg: { ...p.accounts.nonReg, balance: Math.round(p.accounts.nonReg.balance * scale * 5), acb: Math.round(p.accounts.nonReg.acb * scale * 5) },
        },
      })),
      spending: { workingToday: intBetween(r, 50_000, 90_000), retiredToday: intBetween(r, 45_000, 85_000) },
    }
    const self = intBetween(r, 55, 63)
    const spouse = intBetween(r, 55, 66)
    return { h, scenario: { retirementAge: { self, spouse } }, label: `seed ${SEED} household ${i} (retire ${self}/${spouse})` }
  })

  /** What each person drew by choice this year (the RRIF minimum was forced, not chosen), per account kind. */
  const voluntary = (r: YearRow) => ({
    nonReg: people(r).reduce((s, p) => s + p.withdrawals.nonReg, 0),
    rrsp: people(r).reduce((s, p) => s + (p.withdrawals.rrsp - p.rrifMinimum), 0),
    tfsa: people(r).reduce((s, p) => s + p.withdrawals.tfsa, 0),
  })
  const retired = (r: YearRow) => people(r).every((p) => p.employment === 0)

  it('a year that drew by choice and met its need to the cent saves no more than a couple of cents of overshoot', () => {
    let checked = 0
    for (const { h, scenario, label } of sample) {
      for (const r of project(h, NO_SPLIT, scenario)) {
        const v = voluntary(r)
        if (!retired(r) || r.household.shortfall !== 0 || v.nonReg + v.rrsp + v.tfsa <= 1) continue
        checked++
        // Retired people have no committed savings, so anything put away was surplus: the amount the solver overshot by.
        const saved = people(r).reduce((s, p) => s + p.contributions.nonReg + p.contributions.rrsp + p.contributions.tfsa, 0)
        expect(saved, `${label}, ${r.year}`).toBeLessThanOrEqual(0.03)
      }
    }
    expect(checked, 'the sample must contain solved years').toBeGreaterThan(40)
  })

  // The couple's allocation hands each chunk to whoever has the LOWER taxable income and still has money in that
  // account; a non-registered dollar counts for half (only its gain is taxed). So, while neither person's account is
  // empty, whoever ends HIGHER can have drawn only if they are within one chunk (a 24th of the draw) of the other.
  const fairness = (kind: 'rrsp' | 'nonReg', weight: number) => {
    let checked = 0
    for (const { h, scenario, label } of sample) {
      const rows = project(h, NO_SPLIT, scenario)
      for (const [i, r] of rows.entries()) {
        const v = voluntary(r)
        const others = kind === 'rrsp' ? v.nonReg + v.tfsa : v.rrsp + v.tfsa
        if (!retired(r) || v[kind] <= 1 || others > 0.01) continue
        const [a, b] = people(r)
        if (!a || !b) continue
        // An account the year's draw EMPTIED hands its chunks to the other spouse by necessity, not by the rule: skip it.
        // (Judged against the January balance — the year-end one carries mid-year growth and is never zero.)
        const january = Object.entries(r.persons).map(([id]) => (i > 0 ? rows[i - 1].persons[id as PersonId]!.balancesEnd[kind] : h.persons.find((p) => p.id === id)!.accounts[kind].balance))
        const took = [a, b].map((p) => (kind === 'rrsp' ? p.withdrawals.rrsp : p.withdrawals.nonReg))
        if (took.some((t, k) => t >= january[k] - 0.05)) continue
        const drawn = (p: typeof a) => (kind === 'rrsp' ? p.withdrawals.rrsp - p.rrifMinimum : p.withdrawals.nonReg)
        const taxable = (p: typeof a) => p.rrq + p.oas + p.db + p.rrifMinimum + weight * drawn(p)
        const [higher, lower] = taxable(a) >= taxable(b) ? [a, b] : [b, a]
        if (drawn(higher) <= 0.01) continue
        checked++
        expect(taxable(higher) - taxable(lower), `${label}, ${r.year}: the higher-income spouse took a ${kind} chunk`).toBeLessThanOrEqual((weight * v[kind]) / 24 + 0.05)
      }
    }
    return checked
  }

  it('RRSP: a spouse who ends with the higher taxable income took a chunk only while within one chunk of the other', () => {
    expect(fairness('rrsp', 1), 'the sample must contain shared RRSP draws').toBeGreaterThan(0)
  })

  it('non-registered: the same, counting a dollar as half taxable', () => {
    expect(fairness('nonReg', 0.5), 'the sample must contain shared non-registered draws').toBeGreaterThan(0)
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
        const putAway = people(r).reduce((s, p) => s + p.rrqContribution + p.payrollContribution + p.pensionContribution + p.contributions.nonReg + p.contributions.rrsp + p.contributions.tfsa, 0)
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
