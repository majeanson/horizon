import { ageAtJan1, firstRrifYear, grow, lockedAvailable, maxWithdraw, nonRegContribute, nonRegWithdraw, rrifMinimum, rrspNextRoom, splitRrspOut, tfsaNextRoom, unlocksAt65, type NonRegState } from './accounts.ts'
import { dbStart, dbYear, leavingDate, pensionAdjustment, type DbStart } from './dbPension.ts'
import { allowanceMonthly, gisCategory, gisCountedIncome, gisMonthly, gisWithAllowanceSpouseMonthly, oasStart, oasYear, residenceFraction, survivorAllowanceMonthly, type GisCategoryName, type OasPerson } from './oas.ts'
import { homeYear, initialHome, type HomeState } from './home.ts'
import { childBenefitsFor } from './childBenefits.ts'
import { leaveBenefit, leaveOf, leaveRulesOf } from './parentalLeave.ts'
import { childAdd, childStepDown, flowExpenses, flowIncome, flowWindfalls, partTimePay, retiredDriftFactor } from './lifeEvents.ts'
import { memberContribution } from './memberContribution.ts'
import { pathReturn, resolvePath } from './marketPaths.ts'
import { payrollContribution } from './payroll.ts'
import { paramsFor, type PlainYear } from './params/index.ts'
import { roundTo, type Indexation } from './params/project.ts'
import { rrqContribution, rrqPension, type RrqPension, type RrqRules } from './rrq.ts'
import { makeRrqRules, rrqContributionRulesFor } from './rrqRules.ts'
import { survivorPensionMonthly, type DeceasedComponents } from './survivor.ts'
import { householdTax, householdTaxWithSplit, type HouseholdTax, type PersonIncome, type Split, type TaxRules } from './tax.ts'
import type { AccountKind, Assumptions, Household, Person, PersonId, PersonYear, Scenario, YearRow } from './types.ts'

// The year-by-year projection: from today to the year the LAST person reaches their horizon age, what each
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
//
// A DEATH. Each person is in the plan through the year they reach their horizon age (their own, or the scenario's) and gone
// from the next. In a couple the first death hands everything to the survivor: the RRSP (and its locked part), the TFSA and the
// non-registered account join the survivor's — a spouse receives all three untaxed, the last at the deceased's cost base
// (Income Tax Act 70(6)) — and from then on the household is ONE person: taxed alone with Québec's living-alone amount, no
// splitting, the GIS of a single pensioner, spending at the survivor's share (`Assumptions.survivorSpending`). The survivor
// receives the QPP surviving spouse's pension (survivor.ts, taxed as QPP income), the share of the deceased's employer
// pensions their plans pay a spouse, and — widowed and 60 to 64 — the Allowance for the Survivor instead of the Allowance.
// The survivor also receives the QPP death benefit (2 500 $) once, the year after. The year of death itself is an ordinary year — which
// is what a spousal rollover makes the final return. Not modelled, by design: a survivor under 45 with a dependent child (Horizon plans
// the retirement of adults whose children are grown), a disabled survivor (no disability is modelled anywhere), the orphan's pension.

interface PersonState {
  rrsp: number
  /** The locked-in part of `rrsp` (0 ≤ rrspLocked ≤ rrsp). */
  rrspLocked: number
  rrspRoom: number
  tfsa: number
  tfsaRoom: number
  nonReg: NonRegState
}

export interface ResolvedPerson {
  p: Person
  retirementAge: number
  rrqStartAge: number
  oasStartAge: number
  leaving: { year: number; month: number }
  /** The age this person's plan runs to, and the last year they are in it. */
  horizonAge: number
  deathYear: number
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

export function resolve(p: Person, a: Assumptions, s: Scenario, rrqRules: RrqRules, h?: Household): ResolvedPerson {
  const retirementAge = s.retirementAge?.[p.id] ?? p.retirementAge
  const rrqStartAge = s.rrqStartAge?.[p.id] ?? p.rrq.startAge
  const oasStartAge = s.oasStartAge?.[p.id] ?? p.oas.startAge
  const leaving = leavingDate(p.birth, retirementAge)
  const horizonAge = a.horizonForAll ?? p.horizonAge ?? a.horizonAge
  const r = { p, retirementAge, rrqStartAge, oasStartAge, leaving, horizonAge, deathYear: p.birth.year + horizonAge } as ResolvedPerson

  // Pensionable earnings: the statement's past years, then the salary until the retirement date.
  const earnings: Record<number, number> = { ...p.earningsHistory }
  // A parental leave takes weeks of pay off the years it falls in, and the benefit it pays is not pensionable: only the pay that was earned counts.
  const leaveRules = h?.kidsEffects?.leave ? leaveRulesOf(paramsFor(a.today.year, { inflation: a.inflation, wageGrowth: a.wageGrowth }).parentalLeave) : null
  for (let y = a.today.year; y <= leaving.year; y++) {
    const worked = workFraction(r, y)
    const off = h && leaveRules ? Math.min(worked, leaveOf(h, p.id, a.today.year, y, leaveRules).weeksOff / 52) : 0
    earnings[y] = salaryAt(p, y, a) * (worked - off)
  }
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
  /** The person's own QPP pension plus, after a spouse's death, the surviving spouse's pension. */
  rrq: number
  survivorRrq: number
  deathBenefit: number
  oas: number
  oasMonths: number
  db: number
  rrifMin: number
  rrqC: { base: number; enhanced: number; total: number }
  /** EI + QPIP premiums on the year's employment income. */
  payrollC: number
  /** The member's own pension-plan contributions on the year's pay (deducted from income). */
  rppC: number
  rrspC: number
  /** An employer's VRSP contribution: it lands in the locked part, costs no cash, and has first claim on the RRSP room. */
  employerC: number
  /** The locked part at 1 January, after the 65+ refund of a small balance. */
  lockedJan1: number
  /** What the free and the locked parts can each give this year (the locked one capped before 55). */
  freeAvail: number
  lockedAvail: number
  tfsaC: number
  nonRegC: number
  /** Dated income (rent…): taxed as ordinary income, and not taxed. */
  other: number
  otherFree: number
}

export function project(h: Household, a: Assumptions, scenario: Scenario = {}): YearRow[] {
  const indexation: Indexation = { inflation: a.inflation, wageGrowth: a.wageGrowth }
  const rrqRules = makeRrqRules(indexation)
  const people = h.persons.map((p) => resolve(p, a, scenario, rrqRules, h))
  const endYear = Math.max(...people.map((r) => r.deathYear))

  const yearParams = new Map<number, PlainYear>()
  const paramsOf = (y: number) => {
    let v = yearParams.get(y)
    if (!v) yearParams.set(y, (v = paramsFor(y, indexation)))
    return v
  }

  let states: PersonState[] = h.persons.map((p) => ({
    rrsp: p.accounts.rrsp.balance,
    rrspLocked: Math.min(Math.max(0, p.accounts.rrsp.lockedIn ?? 0), p.accounts.rrsp.balance),
    rrspRoom: p.accounts.rrsp.room,
    tfsa: p.accounts.tfsa.balance,
    tfsaRoom: p.accounts.tfsa.room,
    nonReg: { balance: p.accounts.nonReg.balance, acb: p.accounts.nonReg.acb },
  }))

  // The returns of a year: each account's average, unless a market path bends it. The path is counted from the first year anyone is
  // retired, so it follows the retirement age being tried (engine/marketPaths.ts).
  const path = resolvePath(a.marketPath)
  const firstRetired = Math.min(...people.map((r) => r.leaving.year))
  const returnsOf = (year: number): Record<AccountKind, number> =>
    path.length === 0
      ? a.returns
      : { nonReg: pathReturn(path, year - firstRetired, a.returns.nonReg), rrsp: pathReturn(path, year - firstRetired, a.returns.rrsp), tfsa: pathReturn(path, year - firstRetired, a.returns.tfsa) }

  const rows: YearRow[] = []
  let home: HomeState | null = h.home ? initialHome(h.home) : null
  // The living. A couple's first death hands the deceased's accounts to the survivor (see the header) and the survivor's rules take over.
  let alive = people
  let survivorOf: Survivorship | null = null
  // The family's net income of the year before: the benefits for a child follow the last return filed. The first year reads today's earnings.
  let lastIncome = h.persons.reduce((sum, p) => sum + p.salaryToday, 0)
  for (let year = a.today.year; year <= endYear; year++) {
    if (alive.length === 2) {
      const gone = alive.findIndex((r) => year > r.deathYear)
      if (gone >= 0) {
        const kept = gone === 0 ? 1 : 0
        const d = states[gone]
        const k = states[kept]
        states = [{ ...k, rrsp: k.rrsp + d.rrsp, rrspLocked: k.rrspLocked + d.rrspLocked, tfsa: k.tfsa + d.tfsa, nonReg: { balance: k.nonReg.balance + d.nonReg.balance, acb: k.nonReg.acb + d.nonReg.acb } }]
        survivorOf = survivorship(alive[gone], rrqRules)
        alive = [alive[kept]]
      }
    }
    // The house first: the year's mortgage payments, and — in the year of a sale — the equity it frees (into the first person's
    // non-registered account, before the year's tax and withdrawals are worked out) or the extra a dearer home costs.
    let housing: Housing = NO_HOUSING
    if (h.home && home) {
      const step = homeYear(home, h.home, year - h.persons[0].birth.year, a.inflation, (1 + a.inflation) ** (year - a.today.year), year)
      housing = { payment: step.payment, extraNeed: step.extraNeed, valueEnd: step.valueEnd, balanceEnd: step.balanceEnd }
      home = step.next
      if (step.released > 0) states = states.map((s, i) => (i === 0 ? { ...s, nonReg: { balance: s.nonReg.balance + step.released, acb: s.nonReg.acb + step.released } } : s))
    }
    // A windfall (an inheritance, a gift): tax-free money into the first person alive's non-registered account before the year's tax and withdrawals.
    const lump = flowWindfalls(h, year) * (1 + a.inflation) ** (year - a.today.year)
    if (lump > 0) states = states.map((s, i) => (i === 0 ? { ...s, nonReg: { balance: s.nonReg.balance + lump, acb: s.nonReg.acb + lump } } : s))
    const kidsBenefit = childBenefitsFor(h, year, lastIncome, alive.length === 1, paramsOf(year).childBenefits)
    const out = simulateYear(year, survivorOf ? { ...h, livesAlone: true } : h, a, alive, states, paramsOf, indexation, housing, returnsOf(year), rrqRules, survivorOf, kidsBenefit)
    rows.push(out.row)
    states = out.next
    lastIncome = Object.values(out.row.persons).reduce((sum, t) => sum + t.netIncome, 0)
  }
  return rows
}

/** What the house adds to a year: the mortgage paid, anything a dearer replacement home costs, and where the house ends the year. */
interface Housing {
  payment: number
  extraNeed: number
  valueEnd: number
  balanceEnd: number
}
const NO_HOUSING: Housing = { payment: 0, extraNeed: 0, valueEnd: 0, balanceEnd: 0 }

/** What a death leaves the survivor: who died and when, and the deceased's QPP components for the month of death (art. 137), in the dollars of `baseYear`. */
interface Survivorship {
  deceased: ResolvedPerson
  deathYear: number
  components: DeceasedComponents
  baseYear: number
}

function survivorship(r: ResolvedPerson, rrqRules: RrqRules): Survivorship {
  // A pension already payable at death: its components as computed at its start, unadjusted for the start age (art. 137 1°).
  if (r.rrq.start.year <= r.deathYear) return { deceased: r, deathYear: r.deathYear, components: { base: r.rrq.base, additionalFirst: r.rrq.additionalFirst, additionalSecond: r.rrq.additionalSecond }, baseYear: r.rrq.start.year }
  // Otherwise the components computed for the year of death (art. 137 2°, 137.1 b), 137.2 b)): the reference period ends with the death.
  const atDeath = rrqPension({ birth: r.p.birth, earnings: r.earnings, startAge: Math.max(18, r.deathYear - r.p.birth.year) }, rrqRules)
  return { deceased: r, deathYear: r.deathYear, components: { base: atDeath.base, additionalFirst: atDeath.additionalFirst, additionalSecond: atDeath.additionalSecond }, baseYear: r.deathYear }
}

/**
 * The deceased's employer pensions at the share each plan pays a surviving spouse, for a year: coordinated with the RRQ as from
 * 65 whatever the deceased's age (RREGOP: « the reduction of the pension provided for at age 65 will apply for your spouse, even if
 * you die before that age »), and paid from the January after the death at the latest — at the amount the plan would have paid
 * from the planned start age (ENGINE.md §2 names this simplification).
 */
function survivorDb(sv: Survivorship, year: number, inflation: number): number {
  const from = (sv.deathYear + 1) * 12
  return sum(
    sv.deceased.db.map((d) => {
      const share = d.pension.survivorShare ?? 0
      if (share <= 0) return 0
      const start = Math.min(d.start.startIndex, from)
      const forced: DbStart = {
        ...d.start,
        startIndex: start,
        coordinationIndex: d.start.coordinationIndex === null ? null : Math.min(d.start.coordinationIndex, start),
        afterIndex: d.start.afterIndex == null ? d.start.afterIndex : Math.min(d.start.afterIndex, start),
      }
      return share * dbYear(forced, year, inflation)
    }),
  )
}

function simulateYear(
  year: number,
  h: Household,
  a: Assumptions,
  people: ResolvedPerson[],
  states: PersonState[],
  paramsOf: (y: number) => PlainYear,
  indexation: Indexation,
  housing: Housing,
  returns: Record<AccountKind, number>,
  rrqRules: RrqRules,
  survivorOf: Survivorship | null,
  kidsBenefit = 0,
): { row: YearRow; next: PersonState[] } {
  const P = paramsOf(year)
  const rules: TaxRules = { federal: P.federal, quebec: P.quebec, oas: P.oas, livesAlone: h.livesAlone }
  const inflate = (1 + a.inflation) ** (year - a.today.year)
  const couple = people.length === 2

  const dated = flowIncome(h, year, people.map((r) => r.p.id))

  // ── 1–2. what needs no decision ───────────────────────────────────────────────────────────────
  const fixed: FixedIncome[] = people.map((r, i) => {
    const age = year - r.p.birth.year
    const worked = workFraction(r, year)
    // A parental leave (children still to come): the weeks off are unpaid by the employer — their pay is lost — and the plan pays a taxable benefit instead.
    const leaveY = h.kidsEffects?.leave && worked > 0 ? leaveOf(h, r.p.id, a.today.year, year, leaveRulesOf(P.parentalLeave)) : null
    const offShare = leaveY ? Math.min(worked, leaveY.weeksOff / 52) : 0
    const leavePay = leaveY && leaveY.weeksOff > 0 ? leaveBenefit(leaveY, salaryAt(r.p, year, a), P.payroll.qpipMaxInsurable) * ((offShare * 52) / leaveY.weeksOff) : 0
    const employment = salaryAt(r.p, year, a) * (worked - offShare) + partTimePay(r.p.partTime, salaryAt(r.p, year, a), worked, year - r.p.birth.year)
    // Pay of any kind brings the payroll premiums and the QPP contribution; only FULL-TIME work (before the retirement date) is the work the
    // person's chosen savings and employer-plan contributions were set for.
    const paid = employment > 0
    const working = salaryAt(r.p, year, a) * worked > 0

    const rrqMonths = year < r.rrq.start.year ? 0 : year === r.rrq.start.year ? 13 - r.rrq.start.month : 12
    const rrq = year < r.rrq.start.year ? 0 : roundTo(r.rrq.monthly * rrqMonths * (1 + a.inflation) ** (year - r.rrq.start.year), 0.01)

    // After a spouse's death: the surviving spouse's pension (survivor.ts), paid and taxed like the person's own QPP pension, and
    // the deceased's employer pensions at the share their plans pay a spouse.
    let survivorRrq = 0
    if (survivorOf) {
      const grow = (1 + a.inflation) ** (year - survivorOf.baseYear)
      const c = survivorOf.components
      const ownBase = year < r.rrq.start.year ? null : roundTo(r.rrq.base * r.rrq.adjustment * (1 + a.inflation) ** (year - r.rrq.start.year), 0.01)
      const monthly = survivorPensionMonthly(
        { age, deceased: { base: c.base * grow, additionalFirst: c.additionalFirst * grow, additionalSecond: c.additionalSecond * grow }, ownBase, ownStartAge: r.rrqStartAge, year },
        {
          baseShareUnder65: P.rrq.survivorBaseShareUnder65,
          baseShare65: P.rrq.survivorBaseShare65,
          additionalShare: P.rrq.survivorAdditionalShare,
          ownPensionOffset: P.rrq.survivorOwnPensionOffset,
          flatRate45to64: P.rrq.survivorFlatRate45to64,
          flatRateUnder45: P.rrq.survivorFlatRateUnder45,
        },
        rrqRules,
      )
      survivorRrq = roundTo(monthly * 12, 0.01)
    }
    // The death benefit: one payment, the year after the death, taxed as the survivor's income (it is the estate's or the recipient's).
    const deathBenefit = survivorOf && year === survivorOf.deathYear + 1 ? P.rrq.deathBenefit : 0

    const oasY = oasYear(year, r.oas, P.oas)
    const db = sum(r.db.map((d) => dbYear(d.start, year, a.inflation))) + (survivorOf ? roundTo(survivorDb(survivorOf, year, a.inflation), 0.01) : 0)

    const rrifMin = year >= firstRrifYear(r.p.birth.year, P.accounts) ? rrifMinimum(ageAtJan1(year, r.p.birth.year), states[i].rrsp, P.accounts) : 0

    const rrqC = paid && age < 72 ? rrqContribution(employment, rrqContributionRulesFor(year, indexation)) : { base: 0, additionalFirst: 0, additionalSecond: 0, total: 0 }

    const payrollC = paid ? payrollContribution(employment, P.payroll).total : 0
    const rppC = working ? roundTo(sum(r.p.pensions.map((d) => (d.memberContribution && !d.inPay ? memberContribution(salaryAt(r.p, year, a) * worked, worked, P.rrq.mga, d.memberContribution) : 0))), 0.01) : 0

    // Savings the person has decided to make while still working, in today's dollars, grown with prices.
    const acct = r.p.accounts
    // The locked-in part (accounts.ts): unless a small balance is refunded at 65+, what was locked in January stays locked; the free
    // part and the locked part (capped before 55) are what the RRSP can give this year. The employer's VRSP contribution is not a
    // choice, so it has first claim on the room; the person's own contribution takes what is left.
    const lockedJan1 = unlocksAt65(age, states[i].rrspLocked, P.rrq.mga, P.accounts) ? 0 : states[i].rrspLocked
    const freeAvail = maxWithdraw(states[i].rrsp - lockedJan1, returns.rrsp)
    const lockedAvail = lockedAvailable(age, lockedJan1, returns.rrsp, P.accounts)
    const employerC = working && age <= 71 ? Math.min((acct.rrsp.employerContribution ?? 0) * inflate, states[i].rrspRoom) : 0
    const rrspC = working && age <= 71 ? Math.min(acct.rrsp.annualContribution * inflate, Math.max(0, states[i].rrspRoom - employerC)) : 0
    const tfsaC = working ? Math.min(acct.tfsa.annualContribution * inflate, states[i].tfsaRoom) : 0
    const nonRegC = working ? acct.nonReg.annualContribution * inflate : 0

    return { age, employment, rrq: roundTo(rrq + survivorRrq + deathBenefit, 0.01), survivorRrq, deathBenefit, oas: oasY.pension, oasMonths: oasY.months, db, rrifMin: Math.min(rrifMin, maxWithdraw(states[i].rrsp, returns.rrsp)), rrqC: { base: rrqC.base, enhanced: rrqC.additionalFirst + rrqC.additionalSecond, total: rrqC.total }, payrollC, rppC, rrspC, employerC, lockedJan1, freeAvail, lockedAvail, tfsaC, nonRegC, other: dated[i].taxable * inflate + leavePay, otherFree: dated[i].free * inflate + (i === 0 ? kidsBenefit : 0) }
  })

  const retiredAll = people.every((r) => year >= r.leaving.year)
  // What the household must pay: its living costs, plus the mortgage (which ENDS) and a replacement home's extra cost in a sale year.
  const budget = retiredAll ? h.spending.retiredToday * retiredDriftFactor(a, Math.max(...people.map((r) => year - r.p.birth.year))) : Math.max(0, h.spending.workingToday - childStepDown(h, a, year))
  const spending = roundTo(budget * inflate * (survivorOf ? (a.survivorSpending ?? 1) : 1) + housing.payment + housing.extraNeed + (flowExpenses(h, year) + childAdd(h, a, year)) * inflate, 0.01)

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
        rppDeduction: fixed[i].rppC,
        other: fixed[i].other,
      })),
    }
  }

  // ── the Allowance: the 60–64 spouse of a pensioner, from the month after the 60th birthday to the month of the 65th ──
  // Paid in the months the person is in that window, their spouse is already on the OAS, and they have the ten years of residence;
  // while it is paid, the pensioner's GIS follows the « spouse receives the Allowance » curve. The same months, seen from both sides.
  const alwMonths = people.map((r, i) => {
    if (!couple || residenceFraction(r.oas, year, P.oas) <= 0) return 0
    const j = i === 0 ? 1 : 0
    const from = (r.p.birth.year + 60) * 12 + (r.p.birth.month - 1) + 1
    const to = (r.p.birth.year + 65) * 12 + (r.p.birth.month - 1)
    const spouseStart = oasStart(people[j].p.birth, people[j].oasStartAge)
    const spouseIdx = spouseStart.year * 12 + spouseStart.month - 1
    let n = 0
    for (let m = 0; m < 12; m++) {
      const idx = year * 12 + m
      if (idx >= from && idx <= to && idx >= spouseIdx && fixed[j].oasMonths > 0) n++
    }
    return n
  })
  // The Allowance for the Survivor: a widowed 60–64-year-old's months in the window — from the month after the 60th birthday or the
  // January after the death, to the month of the 65th birthday — with the ten years of residence. Their OWN income is what counts.
  const survMonths = (() => {
    if (!survivorOf || people.length !== 1 || residenceFraction(people[0].oas, year, P.oas) <= 0) return 0
    const b = people[0].p.birth
    const from = Math.max((b.year + 60) * 12 + (b.month - 1) + 1, (survivorOf.deathYear + 1) * 12)
    const to = (b.year + 65) * 12 + (b.month - 1)
    let n = 0
    for (let m = 0; m < 12; m++) {
      const idx = year * 12 + m
      if (idx >= from && idx <= to) n++
    }
    return n
  })()
  const anyAllowance = alwMonths.some((m) => m > 0) || survMonths > 0
  /** The couple's income as the GIS counts it: net income without the OAS and the Allowance, less the employment exemption. */
  const countedOf = (persons: PersonIncome[], netBefore: number[]) => (j: number) => gisCountedIncome(Math.max(0, netBefore[j] - persons[j].oas), persons[j].employment, P.oas)
  /** The Allowance each person receives this year, for the incomes given (before the Allowance itself is counted anywhere). */
  const allowanceFor = (persons: PersonIncome[], netBefore: number[]): number[] => {
    if (!anyAllowance) return people.map(() => 0)
    const counted = countedOf(persons, netBefore)
    if (survMonths > 0) return [roundTo(survivorAllowanceMonthly(counted(0), P.oas) * survMonths, 0.01)]
    const monthly = allowanceMonthly(counted(0) + counted(1), P.oas)
    return people.map((_, i) => roundTo(monthly * alwMonths[i], 0.01))
  }
  /**
   * The tax with the Allowance in it. The Allowance depends on the income WITHOUT itself and is taxable, so: tax once, read the
   * Allowance off that, add it to the OAS-side income (it is taxable, and the GIS does not count it), tax again. One pass when
   * nobody is eligible, which is nearly always.
   */
  const taxWithAllowance = (persons: PersonIncome[], compute: (p: PersonIncome[]) => HouseholdTax) => {
    const first = compute(persons)
    const allowance = allowanceFor(persons, first.persons.map((t) => t.netIncomeBeforeAdjustments))
    if (allowance.every((x) => x === 0)) return { tax: first, persons, allowance }
    const withAllowance = persons.map((p, i) => ({ ...p, oas: p.oas + allowance[i] }))
    return { tax: compute(withAllowance), persons: withAllowance, allowance }
  }

  /** The GIS each person receives for the incomes given (a pensioner's, never above the published maximum). */
  const gisFor = (persons: PersonIncome[], netBefore: number[]): number[] =>
    people.map((_, i) => {
      if (fixed[i].oasMonths === 0) return 0
      const other = i === 0 ? 1 : 0
      const category: GisCategoryName = gisCategory({ present: couple, receivesOas: couple && fixed[other].oasMonths > 0 })
      const counted = countedOf(persons, netBefore)
      const income = couple ? counted(0) + counted(1) : counted(i)
      // In the months the spouse receives the Allowance, this person's GIS is the one beside it (and the ordinary one once it is nil).
      const withAllowance = couple && allowanceMonthly(income, P.oas) > 0 ? Math.min(alwMonths[other], fixed[i].oasMonths) : 0
      return roundTo(gisMonthly(income, category, P.oas) * (fixed[i].oasMonths - withAllowance) + gisWithAllowanceSpouseMonthly(income, P.oas) * withAllowance, 0.01)
    })

  /** Net cash the household has after tax and committed savings, for the current withdrawals, with a fixed split. */
  const evaluate = (split: Split) => {
    const { persons: base, realized } = incomes()
    const { tax, persons, allowance } = taxWithAllowance(base, (p) => householdTaxWithSplit(p, rules, split))
    const gis = gisFor(persons, tax.persons.map((t) => t.netIncomeBeforeAdjustments))
    const cashIn = sum(people.map((_, i) => fixed[i].employment + fixed[i].rrq + fixed[i].oas + allowance[i] + fixed[i].db + fixed[i].other + fixed[i].otherFree + fixed[i].rrifMin + draw.rrsp[i] + draw.nonReg[i] + draw.tfsa[i] + gis[i]))
    const out = sum(people.map((_, i) => fixed[i].rrqC.total + fixed[i].payrollC + fixed[i].rppC + fixed[i].rrspC + fixed[i].tfsaC + fixed[i].nonRegC))
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

  // ── 2c. the surplus goes to the RRSP first, when the person asked for it and there is room ─────────────────────────
  // A year that covers its spending with cash to spare, for someone still working with RRSP room open: the largest extra
  // contribution (up to the room) that still leaves the year covered. It costs x and brings its deduction back, so the search
  // runs on the tax function like every other decision here; whatever is left after it (the refund, the rest) goes to the TFSA
  // and then the non-registered account below. Highest earner first (the deduction is worth most there).
  if (a.surplusToRrsp === true && evaluate(fixedSplit()).cash - spending > 0.005) {
    for (const i of people.map((_, k) => k).sort((x, y) => fixed[y].employment - fixed[x].employment)) {
      const roomLeft = fixed[i].employment > 0 && fixed[i].age <= 71 ? Math.max(0, states[i].rrspRoom - fixed[i].rrspC - fixed[i].employerC) : 0
      if (roomLeft <= 0.005) continue
      const base = fixed[i].rrspC
      const slack = (x: number) => {
        fixed[i].rrspC = base + x
        return evaluate(fixedSplit()).cash - spending
      }
      let lo = 0
      let hi = roomLeft
      if (slack(hi) >= -0.005) lo = hi
      else for (let it = 0; it < 40 && hi - lo > 0.01; it++) {
        const mid = (lo + hi) / 2
        if (slack(mid) >= -0.005) lo = mid
        else hi = mid
      }
      fixed[i].rrspC = base + lo
    }
    baseIncomes = incomes().persons
    baseBest = a.pensionSplitting && couple ? householdTax(baseIncomes, rules, { splitting: true }).split : { from: null, amount: 0 }
  }

  // ── 3–4. draw on the accounts, in order, until the need is met ────────────────────────────────
  let need = spending - evaluate(fixedSplit()).cash
  if (need > 0.005) {
    for (const kind of a.withdrawalOrder) {
      if (need <= 0.005) break
      const room = people.map((_, i) =>
        kind === 'rrsp' ? fixed[i].freeAvail + fixed[i].lockedAvail - fixed[i].rrifMin : kind === 'tfsa' ? maxWithdraw(states[i].tfsa, returns.tfsa) : maxWithdraw(states[i].nonReg.balance, returns.nonReg),
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
  const settled = taxWithAllowance(finalIncomes, (p) => {
    const searched = householdTax(p, rules, { splitting: a.pensionSplitting })
    const held = householdTaxWithSplit(p, rules, fixedSplit())
    return held.total < searched.total ? held : searched
  })
  const finalTax = settled.tax
  const finalAllowance = settled.allowance
  const finalGis = gisFor(settled.persons, finalTax.persons.map((t) => t.netIncomeBeforeAdjustments))
  const out = sum(people.map((_, i) => fixed[i].rrqC.total + fixed[i].payrollC + fixed[i].rppC + fixed[i].rrspC + fixed[i].tfsaC + fixed[i].nonRegC))
  const cashIn = sum(people.map((_, i) => fixed[i].employment + fixed[i].rrq + fixed[i].oas + finalAllowance[i] + fixed[i].db + fixed[i].other + fixed[i].otherFree + fixed[i].rrifMin + draw.rrsp[i] + draw.nonReg[i] + draw.tfsa[i] + finalGis[i]))
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
    const { locked: lockedOut } = splitRrspOut(rrspOut, fixed[i].freeAvail, fixed[i].lockedAvail)
    const rrspNext = grow(s.rrsp, fixed[i].rrspC + fixed[i].employerC - rrspOut, returns.rrsp)
    // The locked part grows on its own flows: the employer's money in, its share of the draw out. grow() is linear, so the two parts
    // differ from the whole by cent-rounding only; the clamp keeps 0 ≤ locked ≤ rrsp whatever the rounding.
    const rrspLockedNext = Math.min(Math.max(0, grow(fixed[i].lockedJan1, fixed[i].employerC - lockedOut, returns.rrsp)), rrspNext)
    const tfsaNext = grow(s.tfsa, tfsaIn - draw.tfsa[i], returns.tfsa)
    const afterWithdrawal = nonRegContribute(w.state, nonRegIn)
    // Mid-year like the other two accounts (accounts.ts « convention for flows »): the balance grows from its
    // JANUARY level and half a year on the net flow. The gain realized by the withdrawal is still measured against
    // the January balance and cost base, which is what `nonRegWithdraw` does.
    const nonRegBalance = grow(s.nonReg.balance, nonRegIn - w.taken, returns.nonReg)

    // Rooms for next January.
    const earned = fixed[i].employment
    const pa = pensionAdjustment(r.p.pensions, earned, r.p.pensions.length > 0 && earned > 0, P.accounts)
    next.push({
      rrsp: rrspNext,
      rrspLocked: rrspLockedNext,
      rrspRoom: rrspNextRoom(Math.max(0, s.rrspRoom - fixed[i].rrspC - fixed[i].employerC), earned, pa, nextParams.accounts, nextParams.accounts.rrspLimit),
      tfsa: tfsaNext,
      tfsaRoom: tfsaNextRoom(Math.max(0, s.tfsaRoom - tfsaIn), draw.tfsa[i], nextParams.accounts.tfsaLimit),
      nonReg: { balance: nonRegBalance, acb: afterWithdrawal.acb },
    })

    const t = finalTax.persons[i]
    persons[r.p.id] = {
      age: fixed[i].age,
      employment: roundTo(fixed[i].employment, 0.01),
      rrq: fixed[i].rrq,
      survivorPension: fixed[i].survivorRrq,
      deathBenefit: fixed[i].deathBenefit,
      oas: fixed[i].oas,
      allowance: finalAllowance[i],
      gis: finalGis[i],
      db: fixed[i].db,
      ...(fixed[i].other + fixed[i].otherFree > 0 ? { otherIncome: roundTo(fixed[i].other + fixed[i].otherFree, 0.01) } : {}),
      rrifMinimum: fixed[i].rrifMin,
      withdrawals: { nonReg: roundTo(draw.nonReg[i], 0.01), rrsp: roundTo(rrspOut, 0.01), tfsa: roundTo(draw.tfsa[i], 0.01) },
      contributions: { nonReg: roundTo(nonRegIn, 0.01), rrsp: roundTo(fixed[i].rrspC, 0.01), tfsa: roundTo(tfsaIn, 0.01) },
      rrqContribution: fixed[i].rrqC.total,
      payrollContribution: fixed[i].payrollC,
      pensionContribution: fixed[i].rppC,
      netIncome: t.netIncome,
      oasRecovery: t.oasRecovery,
      federalTax: t.federal.tax,
      quebecTax: t.quebec.tax,
      balancesEnd: { nonReg: nonRegBalance, rrsp: rrspNext, tfsa: tfsaNext },
      rrspLockedEnd: rrspLockedNext,
    }
  })

  const grossIncome = sum(people.map((_, i) => fixed[i].employment + fixed[i].rrq + fixed[i].oas + finalAllowance[i] + fixed[i].db + fixed[i].other + fixed[i].otherFree + fixed[i].rrifMin + draw.rrsp[i] + draw.nonReg[i] + draw.tfsa[i] + finalGis[i]))
  const row: YearRow = {
    year,
    persons,
    household: {
      grossIncome: roundTo(grossIncome, 0.01),
      tax: finalTax.total,
      spending,
      shortfall,
      netWorthEnd: roundTo(sum(next.map((s) => s.rrsp + s.tfsa + s.nonReg.balance)), 0.01),
      mortgagePayment: roundTo(housing.payment, 0.01),
      ...(kidsBenefit > 0 ? { childBenefit: roundTo(kidsBenefit, 0.01) } : {}),
      homeValueEnd: roundTo(housing.valueEnd, 0.01),
      mortgageBalanceEnd: roundTo(housing.balanceEnd, 0.01),
    },
    projected: P.projected,
  }
  return { row, next }
}
