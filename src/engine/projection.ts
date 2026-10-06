import { ageAtJan1, firstRrifYear, grow, maxWithdraw, nonRegContribute, nonRegWithdraw, rrifMinimum, rrspNextRoom, tfsaNextRoom, type NonRegState } from './accounts.ts'
import { dbStart, dbYear, leavingDate, pensionAdjustment, type DbStart } from './dbPension.ts'
import { gisCategory, gisCountedIncome, gisMonthly, oasYear, type GisCategoryName, type OasPerson } from './oas.ts'
import { payrollContribution } from './payroll.ts'
import { paramsFor, type PlainYear } from './params/index.ts'
import { roundTo, type Indexation } from './params/project.ts'
import { rrqContribution, rrqPension, type RrqPension, type RrqRules } from './rrq.ts'
import { makeRrqRules, rrqContributionRulesFor } from './rrqRules.ts'
import { householdTax, householdTaxWithSplit, type PersonIncome, type Split, type TaxRules } from './tax.ts'
import type { AccountKind, Assumptions, Household, Person, PersonId, PersonYear, Scenario, YearRow } from './types.ts'

// The year-by-year projection: from today to the year the youngest person reaches the horizon age, what each
// year's incomes, taxes, withdrawals and balances are — and whether the household's spending is met.
//
// ONE YEAR, in the order it happens:
//   1. Incomes that need no decision: employment (until the retirement date), the RRQ pension, the OAS, the
//      defined-benefit pensions, and the RRIF minimum the law forces from the year after 71.
//   2. Outflows that need none: RRQ contributions and the savings the person has chosen to put away.
//   3. The tax on all of that, both spouses, with pension splitting; the GIS the incomes leave room for.
//   4. Spending is a NEED. If cash is short, money is drawn from the accounts in the household's chosen order,
//      each draw SOLVED against the tax function (a dollar out of an RRSP is not a dollar in hand), until the
//      need is met or the accounts are empty — whatever is left unmet is the year's SHORTFALL.
//      If cash is over, the surplus is saved: TFSA room first, then non-registered.
//   5. Balances grow by the year's return (mid-year convention); room and the RRIF age move on.
//
// Everything in a row is in THAT YEAR's dollars: inflation grows spending, savings and the cost-of-living
// parameters; wage growth grows salaries.

interface PersonState {
  rrsp: number
  rrspRoom: number
  tfsa: number
  tfsaRoom: number
  nonReg: NonRegState
}

interface ResolvedPerson {
  p: Person
  retirementAge: number
  rrqStartAge: number
  oasStartAge: number
  leaving: { year: number; month: number }
  rrq: RrqPension
  oas: OasPerson
  db: { pension: Person['pensions'][number]; start: DbStart }[]
  earnings: Record<number, number>
}

const sum = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0)

/** The wage-grown salary a person earns in a year, before the retirement date cuts it off. */
function salaryAt(p: Person, year: number, a: Assumptions): number {
  return p.salaryToday * (1 + a.wageGrowth) ** (year - a.today.year)
}

/** The share of a year the person is still employed: 1 before the retirement year, the months before the birthday in it, 0 after. */
function workFraction(r: ResolvedPerson, year: number): number {
  if (year < r.leaving.year) return 1
  if (year === r.leaving.year) return (r.leaving.month - 1) / 12
  return 0
}

function resolve(p: Person, a: Assumptions, s: Scenario, rrqRules: RrqRules): ResolvedPerson {
  const retirementAge = s.retirementAge?.[p.id] ?? p.retirementAge
  const rrqStartAge = s.rrqStartAge?.[p.id] ?? p.rrq.startAge
  const oasStartAge = s.oasStartAge?.[p.id] ?? p.oas.startAge
  const leaving = leavingDate(p.birth, retirementAge)
  const r = { p, retirementAge, rrqStartAge, oasStartAge, leaving } as ResolvedPerson

  // Pensionable earnings: the statement's past years, then the salary until the retirement date.
  const earnings: Record<number, number> = { ...p.earningsHistory }
  for (let y = a.today.year; y <= leaving.year; y++) earnings[y] = salaryAt(p, y, a) * workFraction(r, y)
  r.earnings = earnings

  r.rrq = rrqPension({ birth: p.birth, earnings, startAge: rrqStartAge }, rrqRules)
  r.oas = { birth: p.birth, startAge: oasStartAge, residentSince: p.oas.residentSince }
  r.db = p.pensions.map((pension) => ({
    pension,
    start: dbStart(pension, {
      birth: p.birth,
      leaving,
      today: a.today,
      salaryAt: (y) => salaryAt(p, Math.min(y, leaving.year), a),
      mgaAt: rrqRules.mga,
    }),
  }))
  return r
}

/** One person's incomes that need no decision, for a year. */
interface FixedIncome {
  age: number
  employment: number
  rrq: number
  oas: number
  oasMonths: number
  db: number
  rrifMin: number
  rrqC: { base: number; enhanced: number; total: number }
  /** EI + QPIP premiums on the year's employment income. */
  payrollC: number
  rrspC: number
  tfsaC: number
  nonRegC: number
}

export function project(h: Household, a: Assumptions, scenario: Scenario = {}): YearRow[] {
  const indexation: Indexation = { inflation: a.inflation, wageGrowth: a.wageGrowth }
  const rrqRules = makeRrqRules(indexation)
  const people = h.persons.map((p) => resolve(p, a, scenario, rrqRules))
  const youngestBorn = Math.max(...h.persons.map((p) => p.birth.year))
  const endYear = youngestBorn + a.horizonAge

  const yearParams = new Map<number, PlainYear>()
  const paramsOf = (y: number) => {
    let v = yearParams.get(y)
    if (!v) yearParams.set(y, (v = paramsFor(y, indexation)))
    return v
  }

  let states: PersonState[] = h.persons.map((p) => ({
    rrsp: p.accounts.rrsp.balance,
    rrspRoom: p.accounts.rrsp.room,
    tfsa: p.accounts.tfsa.balance,
    tfsaRoom: p.accounts.tfsa.room,
    nonReg: { balance: p.accounts.nonReg.balance, acb: p.accounts.nonReg.acb },
  }))

  const rows: YearRow[] = []
  for (let year = a.today.year; year <= endYear; year++) {
    const out = simulateYear(year, h, a, people, states, paramsOf, indexation)
    rows.push(out.row)
    states = out.next
  }
  return rows
}

function simulateYear(
  year: number,
  h: Household,
  a: Assumptions,
  people: ResolvedPerson[],
  states: PersonState[],
  paramsOf: (y: number) => PlainYear,
  indexation: Indexation,
): { row: YearRow; next: PersonState[] } {
  const P = paramsOf(year)
  const rules: TaxRules = { federal: P.federal, quebec: P.quebec, oas: P.oas, livesAlone: h.livesAlone }
  const inflate = (1 + a.inflation) ** (year - a.today.year)
  const couple = people.length === 2

  // ── 1–2. what needs no decision ───────────────────────────────────────────────────────────────
  const fixed: FixedIncome[] = people.map((r, i) => {
    const age = year - r.p.birth.year
    const employment = salaryAt(r.p, year, a) * workFraction(r, year)
    const working = employment > 0

    const rrqMonths = year < r.rrq.start.year ? 0 : year === r.rrq.start.year ? 13 - r.rrq.start.month : 12
    const rrq = year < r.rrq.start.year ? 0 : roundTo(r.rrq.monthly * rrqMonths * (1 + a.inflation) ** (year - r.rrq.start.year), 0.01)

    const oasY = oasYear(year, r.oas, P.oas)
    const db = sum(r.db.map((d) => dbYear(d.start, year, a.inflation)))

    const rrifMin = year >= firstRrifYear(r.p.birth.year, P.accounts) ? rrifMinimum(ageAtJan1(year, r.p.birth.year), states[i].rrsp, P.accounts) : 0

    const rrqC = working && age < 72 ? rrqContribution(employment, rrqContributionRulesFor(year, indexation)) : { base: 0, additionalFirst: 0, additionalSecond: 0, total: 0 }

    const payrollC = working ? payrollContribution(employment, P.payroll).total : 0

    // Savings the person has decided to make while still working, in today's dollars, grown with prices.
    const acct = r.p.accounts
    const rrspC = working && age <= 71 ? Math.min(acct.rrsp.annualContribution * inflate, states[i].rrspRoom) : 0
    const tfsaC = working ? Math.min(acct.tfsa.annualContribution * inflate, states[i].tfsaRoom) : 0
    const nonRegC = working ? acct.nonReg.annualContribution * inflate : 0

    return { age, employment, rrq, oas: oasY.pension, oasMonths: oasY.months, db, rrifMin: Math.min(rrifMin, maxWithdraw(states[i].rrsp, a.returns.rrsp)), rrqC: { base: rrqC.base, enhanced: rrqC.additionalFirst + rrqC.additionalSecond, total: rrqC.total }, payrollC, rrspC, tfsaC, nonRegC }
  })

  const retiredAll = people.every((r) => year >= r.leaving.year)
  const spending = roundTo((retiredAll ? h.spending.retiredToday : h.spending.workingToday) * inflate, 0.01)

  // ── withdrawals are the unknown: one amount per person per account, solved below ──────────────
  const draw: Record<AccountKind, number[]> = { nonReg: people.map(() => 0), rrsp: people.map(() => 0), tfsa: people.map(() => 0) }

  /** The incomes the tax reads, for a given set of withdrawals. */
  const incomes = (): { persons: PersonIncome[]; realized: number[] } => {
    const realized = people.map((_, i) => nonRegWithdraw(states[i].nonReg, draw.nonReg[i]).realizedGain)
    return {
      realized,
      persons: people.map((_, i) => ({
        age: fixed[i].age,
        employment: fixed[i].employment,
        rrq: fixed[i].rrq,
        oas: fixed[i].oas,
        db: fixed[i].db,
        registered: fixed[i].rrifMin + draw.rrsp[i],
        capitalGains: realized[i],
        rrqBase: fixed[i].rrqC.base,
        rrqEnhanced: fixed[i].rrqC.enhanced,
        payrollPremiums: fixed[i].payrollC,
        rrspDeduction: fixed[i].rrspC,
      })),
    }
  }

  /** The GIS each person receives for the incomes given (a pensioner's, never above the published maximum). */
  const gisFor = (persons: PersonIncome[], netBefore: number[]): number[] =>
    people.map((_, i) => {
      if (fixed[i].oasMonths === 0) return 0
      const other = i === 0 ? 1 : 0
      const category: GisCategoryName = gisCategory({ present: couple, receivesOas: couple && fixed[other].oasMonths > 0 })
      const counted = (j: number) => gisCountedIncome(Math.max(0, netBefore[j] - persons[j].oas), persons[j].employment, P.oas)
      const income = couple ? counted(0) + counted(1) : counted(i)
      return roundTo(gisMonthly(income, category, P.oas) * fixed[i].oasMonths, 0.01)
    })

  /** Net cash the household has after tax and committed savings, for the current withdrawals, with a fixed split. */
  const evaluate = (split: Split) => {
    const { persons, realized } = incomes()
    const tax = householdTaxWithSplit(persons, rules, split)
    const gis = gisFor(persons, tax.persons.map((t) => t.netIncomeBeforeAdjustments))
    const cashIn = sum(people.map((_, i) => fixed[i].employment + fixed[i].rrq + fixed[i].oas + fixed[i].db + fixed[i].rrifMin + draw.rrsp[i] + draw.nonReg[i] + draw.tfsa[i] + gis[i]))
    const out = sum(people.map((_, i) => fixed[i].rrqC.total + fixed[i].payrollC + fixed[i].rrspC + fixed[i].tfsaC + fixed[i].nonRegC))
    return { tax, gis, realized, cash: cashIn - tax.total - out }
  }

  // The split worth making given the incomes that need no decision; held fixed while withdrawals are solved.
  let baseIncomes = incomes().persons
  let baseBest = a.pensionSplitting && couple ? householdTax(baseIncomes, rules, { splitting: true }).split : { from: null, amount: 0 }
  const fixedSplit = (): Split => {
    if (baseBest.from === null) return baseBest
    const from = baseIncomes[baseBest.from]
    const eligible = from.age >= 65 ? from.db + from.registered : 0
    return { from: baseBest.from, amount: Math.min(baseBest.amount, eligible * 0.5) }
  }

  // ── 2b. committed savings yield to spending ───────────────────────────────────────────────────
  // Spending is a need; a contribution is a choice. If the year's cash cannot cover both, the household does not
  // make a taxable RRSP withdrawal to fund a contribution (tax paid to move money from one pocket to another): it
  // saves less. Cut the account with no tax effect first (non-registered, then TFSA), the RRSP last — cutting it
  // also loses its deduction, so each key is cut by the LARGEST share of its contribution the need still allows.
  if (spending - evaluate(fixedSplit()).cash > 0.005) {
    for (const key of ['nonRegC', 'tfsaC', 'rrspC'] as const) {
      const original = fixed.map((f) => f[key])
      if (sum(original) <= 0) continue
      const withShare = (s: number) => {
        original.forEach((o, i) => (fixed[i][key] = o * s))
        return evaluate(fixedSplit()).cash - spending
      }
      if (withShare(1) >= -0.005) break
      if (withShare(0) < -0.005) continue // cutting all of it is still not enough: take all, and move to the next key
      let lo = 0
      let hi = 1
      for (let it = 0; it < 40 && hi - lo > 1e-6; it++) {
        const mid = (lo + hi) / 2
        if (withShare(mid) >= -0.005) lo = mid
        else hi = mid
      }
      withShare(lo)
      break
    }
    // Contributions changed the incomes (the RRSP deduction), so the split worth making is chosen again.
    baseIncomes = incomes().persons
    baseBest = a.pensionSplitting && couple ? householdTax(baseIncomes, rules, { splitting: true }).split : { from: null, amount: 0 }
  }

  // ── 3–4. draw on the accounts, in order, until the need is met ────────────────────────────────
  let need = spending - evaluate(fixedSplit()).cash
  if (need > 0.005) {
    for (const kind of a.withdrawalOrder) {
      if (need <= 0.005) break
      const room = people.map((_, i) =>
        kind === 'rrsp' ? maxWithdraw(states[i].rrsp, a.returns.rrsp) - fixed[i].rrifMin : kind === 'tfsa' ? maxWithdraw(states[i].tfsa, a.returns.tfsa) : maxWithdraw(states[i].nonReg.balance, a.returns.nonReg),
      )
      const available = sum(room.map((x) => Math.max(0, x)))
      if (available <= 0.005) continue

      // Allocate `x` among the persons: in chunks, to whoever currently has the LOWER taxable income and money left.
      const allocate = (x: number) => {
        for (let i = 0; i < people.length; i++) draw[kind][i] = 0
        if (people.length === 1) {
          draw[kind][0] = Math.min(x, Math.max(0, room[0]))
          return
        }
        const size = x / 24
        const taxable = people.map((_, i) => fixed[i].employment + fixed[i].rrq + fixed[i].oas + fixed[i].db + fixed[i].rrifMin + draw.rrsp[i])
        let left = x
        // Each pass gives one chunk to whoever has the lower taxable income AND still has money in this account;
        // a pass either places a whole chunk (at most 24) or empties one person's account (at most 2), so it ends.
        for (let pass = 0; pass < 64 && left > 1e-9; pass++) {
          const open = [0, 1].filter((i) => room[i] - draw[kind][i] > 1e-9).sort((i, j) => taxable[i] - taxable[j])
          if (open.length === 0) break
          const i = open[0]
          const take = Math.min(size, left, room[i] - draw[kind][i])
          draw[kind][i] += take
          left -= take
          if (kind === 'rrsp') taxable[i] += take
          else if (kind === 'nonReg') taxable[i] += take * 0.5
        }
      }

      const before = evaluate(fixedSplit()).cash
      const gain = (x: number) => {
        allocate(x)
        return evaluate(fixedSplit()).cash - before
      }

      // The extra net cash is not guaranteed to rise with every dollar drawn (a withdrawal can cost GIS), so SCAN
      // coarsely for the first amount that covers the need, then refine inside that step by bisection.
      let lo = 0
      let hi = -1
      // If nothing in the scan covers the need, draw the amount that nets the MOST cash — which is not always the
      // whole account when the marginal rate (tax + GIS lost) passes 100 % — and never let a negative gain raise the need.
      let best = { x: 0, g: 0 }
      const steps = 16
      for (let s = 1; s <= steps; s++) {
        const x = (available * s) / steps
        const g = gain(x)
        if (g >= need) {
          hi = x
          break
        }
        if (g > best.g) best = { x, g }
        lo = x
      }
      if (hi < 0) {
        allocate(best.x)
        need -= best.g
      } else {
        for (let it = 0; it < 40 && hi - lo > 0.01; it++) {
          const mid = (lo + hi) / 2
          if (gain(mid) >= need) hi = mid
          else lo = mid
        }
        allocate(hi)
        need -= gain(hi)
      }
    }
  }

  // The tax is final: let splitting pick its best allocation for the incomes actually received.
  const { persons: finalIncomes } = incomes()
  // …but never worse than the split the withdrawals were solved against (it may sit between two 5 % steps of the search).
  const searchedTax = householdTax(finalIncomes, rules, { splitting: a.pensionSplitting })
  const heldTax = householdTaxWithSplit(finalIncomes, rules, fixedSplit())
  const finalTax = heldTax.total < searchedTax.total ? heldTax : searchedTax
  const finalGis = gisFor(finalIncomes, finalTax.persons.map((t) => t.netIncomeBeforeAdjustments))
  const out = sum(people.map((_, i) => fixed[i].rrqC.total + fixed[i].payrollC + fixed[i].rrspC + fixed[i].tfsaC + fixed[i].nonRegC))
  const cashIn = sum(people.map((_, i) => fixed[i].employment + fixed[i].rrq + fixed[i].oas + fixed[i].db + fixed[i].rrifMin + draw.rrsp[i] + draw.nonReg[i] + draw.tfsa[i] + finalGis[i]))
  const cash = cashIn - finalTax.total - out
  const shortfall = roundTo(Math.max(0, spending - cash), 0.01)
  let surplus = Math.max(0, cash - spending)

  // ── surplus: saved, TFSA room first (the account whose growth is never taxed), then non-registered ──
  const extra = { tfsa: people.map(() => 0), nonReg: people.map(() => 0) }
  if (surplus > 0.005) {
    for (const i of people.map((_, k) => k).sort((x, y) => states[y].tfsaRoom - fixed[y].tfsaC - (states[x].tfsaRoom - fixed[x].tfsaC))) {
      const room = Math.max(0, states[i].tfsaRoom - fixed[i].tfsaC)
      const put = Math.min(room, surplus)
      extra.tfsa[i] = put
      surplus -= put
    }
    if (surplus > 0.005) {
      const i = people.length === 2 && finalTax.persons[1].netIncome < finalTax.persons[0].netIncome ? 1 : 0
      extra.nonReg[i] = surplus
    }
  }

  // ── 5. balances, rooms, and the row ───────────────────────────────────────────────────────────
  const next: PersonState[] = []
  const persons: Partial<Record<PersonId, PersonYear>> = {}
  const nextParams = paramsOf(year + 1)
  people.forEach((r, i) => {
    const s = states[i]
    const w = nonRegWithdraw(s.nonReg, draw.nonReg[i])
    const rrspOut = fixed[i].rrifMin + draw.rrsp[i]
    const tfsaIn = fixed[i].tfsaC + extra.tfsa[i]
    const nonRegIn = fixed[i].nonRegC + extra.nonReg[i]
    const rrspNext = grow(s.rrsp, fixed[i].rrspC - rrspOut, a.returns.rrsp)
    const tfsaNext = grow(s.tfsa, tfsaIn - draw.tfsa[i], a.returns.tfsa)
    const afterWithdrawal = nonRegContribute(w.state, nonRegIn)
    // Mid-year like the other two accounts (accounts.ts « convention for flows »): the balance grows from its
    // JANUARY level and half a year on the net flow. The gain realized by the withdrawal is still measured against
    // the January balance and cost base, which is what `nonRegWithdraw` does.
    const nonRegBalance = grow(s.nonReg.balance, nonRegIn - w.taken, a.returns.nonReg)

    // Rooms for next January.
    const earned = fixed[i].employment
    const pa = pensionAdjustment(r.p.pensions, earned, r.p.pensions.length > 0 && earned > 0, P.accounts)
    next.push({
      rrsp: rrspNext,
      rrspRoom: rrspNextRoom(Math.max(0, s.rrspRoom - fixed[i].rrspC), earned, pa, nextParams.accounts, nextParams.accounts.rrspLimit),
      tfsa: tfsaNext,
      tfsaRoom: tfsaNextRoom(Math.max(0, s.tfsaRoom - tfsaIn), draw.tfsa[i], nextParams.accounts.tfsaLimit),
      nonReg: { balance: nonRegBalance, acb: afterWithdrawal.acb },
    })

    const t = finalTax.persons[i]
    persons[r.p.id] = {
      age: fixed[i].age,
      employment: roundTo(fixed[i].employment, 0.01),
      rrq: fixed[i].rrq,
      oas: fixed[i].oas,
      gis: finalGis[i],
      db: fixed[i].db,
      rrifMinimum: fixed[i].rrifMin,
      withdrawals: { nonReg: roundTo(draw.nonReg[i], 0.01), rrsp: roundTo(rrspOut, 0.01), tfsa: roundTo(draw.tfsa[i], 0.01) },
      contributions: { nonReg: roundTo(nonRegIn, 0.01), rrsp: roundTo(fixed[i].rrspC, 0.01), tfsa: roundTo(tfsaIn, 0.01) },
      rrqContribution: fixed[i].rrqC.total,
      payrollContribution: fixed[i].payrollC,
      netIncome: t.netIncome,
      oasRecovery: t.oasRecovery,
      federalTax: t.federal.tax,
      quebecTax: t.quebec.tax,
      balancesEnd: { nonReg: nonRegBalance, rrsp: rrspNext, tfsa: tfsaNext },
    }
  })

  const grossIncome = sum(people.map((_, i) => fixed[i].employment + fixed[i].rrq + fixed[i].oas + fixed[i].db + fixed[i].rrifMin + draw.rrsp[i] + draw.nonReg[i] + draw.tfsa[i] + finalGis[i]))
  const row: YearRow = {
    year,
    persons,
    household: {
      grossIncome: roundTo(grossIncome, 0.01),
      tax: finalTax.total,
      spending,
      shortfall,
      netWorthEnd: roundTo(sum(next.map((s) => s.rrsp + s.tfsa + s.nonReg.balance)), 0.01),
    },
    projected: P.projected,
  }
  return { row, next }
}
