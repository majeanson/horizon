import { childBenefitsFor } from '../engine/childBenefits.ts'
import { leaveBenefit, leaveOf, leaveRulesOf } from '../engine/parentalLeave.ts'
import { childStage, costBandOf } from '../engine/lifeEvents.ts'
import { paramsFor } from '../engine/params/index.ts'
import type { Household, PersonId } from '../engine/types.ts'
import { DEFAULT_LEAVE_AGE, householdIncome, suggestChildCost } from './kidsCost.ts'
import type { Profile } from './schema.ts'

// WHAT A CHILD COSTS, NET OF WHAT THE STATE PAYS — said in plain numbers, today's dollars and today's income held level: the children at home now, and the first
// child still to come in its first year, with what its whole time at home costs. An ESTIMATE, from the figures the profile holds (typed ones first) or, failing
// them, Statistics Canada's; the benefits are income-tested, so a household with a high income sees little of them. It never touches the plan: the plan
// counts the benefits only when the household switches that on (`kidsEffects.benefits`).

export interface KidsMoney {
  /** What the children cost in a year, gross. */
  cost: number
  /** What the state would pay the family in a year for them (Canada Child Benefit and Allocation famille). */
  benefit: number
  net: number
}

export interface KidsSummary {
  /** The children at home now, as a whole; null when none is at home. */
  atHome: (KidsMoney & { children: number }) | null
  /** The first child still to come: the YEAR it adds, what it adds in its first year, and what all its years at home add up to (cost only). */
  planned: (KidsMoney & { born: number; lifetime: number }) | null
}

/** The benefits a family would be paid in `year` for these births, at today's figures and the income held level. */
function benefitFor(p: Profile, births: number[], year: number, todayYear: number): number {
  const h: Household = { ...p.household, children: births, kidsEffects: { benefits: true, qppExclusion: false, leave: null } }
  const P = paramsFor(todayYear, { inflation: p.assumptions.inflation, wageGrowth: p.assumptions.wageGrowth })
  return childBenefitsFor(h, year, householdIncome(p), p.household.persons.length === 1, P.childBenefits)
}

export function kidsSummary(p: Profile, todayYear: number): KidsSummary | null {
  const h = p.household
  const untilAge = h.childSpending?.untilAge ?? DEFAULT_LEAVE_AGE
  const born = h.children ?? []
  const home = born.filter((y) => childStage(y, todayYear, untilAge) === 'home')
  const future = born.filter((y) => childStage(y, todayYear, untilAge) === 'future').sort((a, b) => a - b)
  if (home.length === 0 && future.length === 0) return null
  const s = suggestChildCost(p, todayYear)
  if (s === null) return null
  const cs = h.childSpending ?? null

  let atHome: KidsSummary['atHome'] = null
  if (home.length > 0) {
    // a typed flat amount is what each child at home costs; failing it, Statistics Canada's figure at each child's own age
    const cost = cs && cs.perChild > 0 ? cs.perChild * home.length : home.reduce((sum, y) => sum + s.bands[costBandOf(todayYear - y)], 0)
    const benefit = benefitFor(p, home, todayYear, todayYear)
    atHome = { cost, benefit, net: cost - benefit, children: home.length }
  }

  let planned: KidsSummary['planned'] = null
  if (future.length > 0) {
    const first = future[0]
    const at = (age: number) => (cs?.byAge ? cs.byAge[costBandOf(age)] : cs && cs.perChild > 0 ? cs.perChild : s.bands[costBandOf(age)])
    let lifetime = 0
    for (let age = 0; age < untilAge; age++) lifetime += at(age)
    // what this child adds, over the family as it will be in the year of its birth: the children then at home, with and without it
    const others = born.filter((y) => y !== first && y <= first && first - y <= 17)
    const benefit = benefitFor(p, [...others, first], first, todayYear) - benefitFor(p, others, first, todayYear)
    const cost = at(0)
    planned = { born: first, cost, benefit, net: cost - benefit, lifetime }
  }
  return { atHome, planned }
}

export interface LeaveLine {
  person: PersonId
  /** Weeks off, in all, for the first child still to come. */
  weeks: number
  /** The pay those weeks lose, and what the Québec Parental Insurance Plan pays instead (taxable), in today's dollars. */
  lostPay: number
  benefit: number
}

/** What a parental leave does to each parent's pay, for the first child still to come; null with no leave stated or no such child. */
export function leaveSummary(p: Profile, todayYear: number): LeaveLine[] | null {
  const h = p.household
  if (!h.kidsEffects?.leave) return null
  const first = (h.children ?? []).filter((y) => y > todayYear).sort((a, b) => a - b)[0]
  if (first === undefined) return null
  const P = paramsFor(todayYear, { inflation: p.assumptions.inflation, wageGrowth: p.assumptions.wageGrowth })
  const rules = leaveRulesOf(P.parentalLeave)
  const one: Household = { ...h, children: [first] }
  return h.persons.map((x) => {
    let weeks = 0
    let benefit = 0
    for (let year = first; year <= first + 2; year++) {
      const y = leaveOf(one, x.id, todayYear, year, rules)
      weeks += y.weeksOff
      benefit += leaveBenefit(y, x.salaryToday, P.payroll.qpipMaxInsurable)
    }
    return { person: x.id, weeks, lostPay: (x.salaryToday * weeks) / 52, benefit }
  })
}
