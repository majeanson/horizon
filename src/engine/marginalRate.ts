import { groceriesBenefit, groceriesRulesOf } from './groceriesBenefit.ts'
import { gisCategory, gisCountedIncome, gisMonthly } from './oas.ts'
import type { PlainYear } from './params/index.ts'
import { roundTo } from './params/project.ts'
import { qcCreditsFor } from './qcCredits.ts'
import { householdTax, type HouseholdTax, type PersonIncome, type TaxRules } from './tax.ts'

// THE MARGINAL RATE OF AN EXTRA RRSP DOLLAR. « If this person drew one more dollar from the RRSP / RRIF this year, how much of it would the state take back?
// » The answer is more than the tax bracket: the extra income also lifts the OAS recovery tax (15 % above the threshold, never more than the pension) and
// shrinks the Guaranteed Income Supplement (about 50 cents lost per dollar for a single pensioner, 25 for a member of a couple, in the ranges where it is paid).
// The credits that read this year's income NEXT year — Québec's senior assistance and solidarity credits and the groceries benefit — are lost too, at their own rates (5,4 %, 6 %, 5 %, each only inside its
// range): they are read from the same credit functions the projection uses, at the income of this year and at that income plus the dollars drawn, and counted in `creditsLost` when the caller says who is
// asking (`credits`).
// The year is evaluated twice — as it is, and with `delta` more dollars of registered income for one person — through the SAME functions the projection
// uses (`householdTax` with its splitting search, `gisCountedIncome` / `gisMonthly`), so the rate and the plan cannot disagree. Pure; reads no clock.
//
// SIMPLIFICATIONS (ENGINE.md §2): the GIS is read for twelve months at the person's OAS (a year with a partial OAS or an Allowance is not special-cased), and
// it is the income of the SAME year that counts (like the projection). The average rate compared with this one is « total tax ÷ net income » (lib/yearTable.ts).

export interface MarginalRateInput {
  /** The year's incomes as the tax function reads them (one or two people). */
  persons: readonly PersonIncome[]
  rules: TaxRules
  /** Whether pension splitting is on (`Assumptions.pensionSplitting`): the cheapest allocation is searched in both runs. */
  splitting: boolean
  /** The person who draws the extra dollars. Absent: the one with the lower net income (the spouse who draws next). */
  who?: number
  /** The extra withdrawal, dollars. Absent: 1 000 (the rate is the average over that step, so a bracket edge inside it is felt). */
  delta?: number
  /** Who is asking, for the credits paid next year on this year's income. Absent: they are not counted (`creditsLost` is 0). */
  credits?: CreditsContext
}

/** What the credits of NEXT year read: the household as this year leaves it, and the figures of that year. */
export interface CreditsContext {
  /** The year the credits are paid in: the year after the one being read. */
  year: number
  /** Birth years of the people in the year being read. */
  births: readonly number[]
  /** Birth years of the children, when the household counts the child benefits; else none. */
  children: readonly number[]
  /** Whether the household says it lives alone when single. */
  livesAlone: boolean
  qc: PlainYear['qcCredits']
  groceries: PlainYear['groceriesBenefit']
  /** The age under which a child counts for the solidarity credit (the Allocation famille's). */
  childUntilAge: number
}

/** The three credits a household is paid in `ctx.year` on a family net income of `income` the year before. */
function creditsAt(income: number, ctx: CreditsContext): number {
  const qc = qcCreditsFor({ year: ctx.year, births: ctx.births, aliveLastYear: ctx.births.length, lastYearIncome: income, children: ctx.children, livesAlone: ctx.livesAlone }, ctx.qc, ctx.childUntilAge)
  const kids = ctx.children.filter((born) => ctx.year - born >= 0 && ctx.year - born < ctx.groceries.childUntilAge).length
  return qc.seniorAssistance + qc.solidarity + groceriesBenefit(income, ctx.births.length === 2, kids, groceriesRulesOf(ctx.year, ctx.groceries))
}

export interface MarginalRate {
  /** Who drew the extra dollars. */
  who: number
  delta: number
  /** The extra income tax (federal + Québec) per extra dollar. */
  tax: number
  /** The extra OAS recovery tax per extra dollar. */
  oasRecovery: number
  /** The GIS lost per extra dollar. */
  gisLost: number
  /** The credits paid next year that this dollar of income shrinks, per extra dollar (0 unless the caller gave `credits`). */
  creditsLost: number
  /** The sum of the four: what the state takes back (or no longer pays) out of one more dollar. */
  rate: number
}

/** The GIS paid over a year, per person, for these incomes (twelve months for a person who receives the OAS). */
function gisOf(persons: readonly PersonIncome[], tax: HouseholdTax, rules: TaxRules): number {
  const couple = persons.length === 2
  const counted = persons.map((p, j) => gisCountedIncome(Math.max(0, tax.persons[j].netIncomeBeforeAdjustments - p.oas), p.employment, rules.oas))
  let total = 0
  persons.forEach((p, i) => {
    if (p.oas <= 0) return
    const other = couple ? persons[i === 0 ? 1 : 0] : null
    const category = gisCategory({ present: couple, receivesOas: other !== null && other.oas > 0 })
    const income = couple ? counted[0] + counted[1] : counted[i]
    total += gisMonthly(income, category, rules.oas) * 12
  })
  return total
}

export function marginalRate(input: MarginalRateInput): MarginalRate {
  const { persons, rules, splitting } = input
  const delta = input.delta ?? 1000
  if (persons.length === 0 || !(delta > 0)) throw new Error('marginalRate: needs a person and a positive step')
  const base = householdTax(persons, rules, { splitting })
  const who = input.who ?? (persons.length === 2 && base.persons[1].netIncome < base.persons[0].netIncome ? 1 : 0)
  const bumped = persons.map((p, i) => (i === who ? { ...p, registered: p.registered + delta } : p))
  const more = householdTax(bumped, rules, { splitting })
  const recovery = (t: HouseholdTax) => t.persons.reduce((s, p) => s + p.oasRecovery, 0)
  const incomeTax = (t: HouseholdTax) => t.total - recovery(t)
  const tax = (incomeTax(more) - incomeTax(base)) / delta
  const oasRecovery = (recovery(more) - recovery(base)) / delta
  const gisLost = roundTo(gisOf(persons, base, rules) - gisOf(bumped, more, rules), 0.01) / delta
  const net = (t: HouseholdTax) => t.persons.reduce((s, p) => s + p.netIncome, 0)
  const creditsLost = input.credits ? roundTo(creditsAt(net(base), input.credits) - creditsAt(net(more), input.credits), 0.01) / delta : 0
  return { who, delta, tax, oasRecovery, gisLost, creditsLost, rate: tax + oasRecovery + gisLost + creditsLost }
}
