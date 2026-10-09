import { PRESET_KEYS, withPreset, type PresetKey } from './assumptionPresets.ts'
import { oasStart } from './oas.ts'
import { paramsFor } from './params/index.ts'
import { project } from './projection.ts'
import { rrqStart } from './rrq.ts'
import type { AccountKind, Assumptions, Household, PersonId, Scenario, YearRow } from './types.ts'

// « Mes années 60 à 70 » — the bridge years, one year at a time.
//
// A person who stops working before the QPP and OAS begin lives on the NEST (their accounts) until the pensions start,
// and the age at which each pension starts decides how big the pensions are for the rest of the life. This module
// answers the question that choice raises — « do I have enough to live on the nest and defer, or must I take the
// pension early? » — from the SAME projection the verdict uses, so a figure here is a figure there:
//   · bridgeRun: one plan (retire at X, start the QPP at Y, the OAS at Z) laid out year by year, in today's dollars —
//     what the household needs, what the guaranteed pensions pay, what the nest has to cover and from which account,
//     the tax, and the nest left at the end of the year;
//   · bridgeView: five named strategies side by side (take the pensions as early as possible, at 65, as late as
//     possible, the user's own, and « bridge and defer » to 70), each with the numbers a person decides on, and — on
//     request — whether each one still works under the prudent, neutral and bold sets of assumptions.
//
// The levers move ONE person (the one being looked at); the other person, if any, keeps the profile's own ages — unless
// `both` is set (a couple's sixth strategy, « both defer to 70 »), which gives the other person the same QPP and OAS start ages.
// Everything is in today's dollars: a nest of 400 000 $ in 2050 means 400 000 $ of today's buying power.
//
// What it does NOT say: a break-even is a bet on how long a life lasts; the model has no survivor's pension (a spouse
// who outlives the other keeps no extra), no markets that go wrong in a particular order, and no change of spending
// with age. The page says so beside the numbers.

export type StrategyKey = 'mine' | 'asap' | 'standard' | 'max' | 'bridge' | 'both'
export const STRATEGY_KEYS: readonly StrategyKey[] = ['mine', 'asap', 'standard', 'max', 'bridge', 'both']

/** The strategies a household is shown: « both defer to 70 » means nothing to one person. */
export const strategyKeysFor = (h: Household): readonly StrategyKey[] => (h.persons.length > 1 ? STRATEGY_KEYS : STRATEGY_KEYS.filter((k) => k !== 'both'))

/** The three things a person can choose about their own retirement income. */
export interface BridgeLevers {
  id: PersonId
  /** The age employment income stops. */
  retirementAge: number
  /** The age the QPP starts, 60 to 72. */
  rrqStartAge: number
  /** The age the OAS starts, 65 to 70. */
  oasStartAge: number
  /** Every OTHER person in the household starts their QPP and OAS at these same ages (their retirement age stays the profile's). Absent: they keep their own. */
  both?: boolean
}

export type YearStatus = 'covered' | 'drawing' | 'short'

/** One year of the plan, household figures in today's dollars; `age` is the age of the person being looked at. */
export interface BridgeYear {
  year: number
  age: number
  /** What the household needed to spend. */
  spending: number
  employment: number
  /** The dated income (rent…) inside `employment`: 0 for most households; the « work » bar and column say so when it is not. */
  dated: number
  /** The defined-benefit pensions (both people). */
  db: number
  rrq: number
  oas: number
  gis: number
  /** The QPP + OAS of the person being looked at alone (the household sums above also hold a spouse's). */
  ownPension: number
  /** The two halves of `ownPension`. */
  ownRrq: number
  ownOas: number
  /** DB + QPP + OAS + GIS: income that needs no decision once begun. */
  guaranteed: number
  /** What was drawn from each account (the RRIF minimum is part of the RRSP/RRIF draw). */
  draws: Record<AccountKind, number>
  /** The sum of the draws. */
  drawn: number
  /** Income tax and the OAS recovery tax. */
  tax: number
  /** EI, QPIP, QPP and employer-pension-plan contributions on pay. */
  payroll: number
  /** Money put into accounts: the savings the person chose, and the surplus of a year that more than covers spending. */
  saved: number
  /** Spending the household could not meet even with every account empty. */
  shortfall: number
  /** What the accounts hold at the end of the year. */
  nest: Record<AccountKind, number> & { total: number }
  status: YearStatus
}

export interface BridgeSummary {
  ok: boolean
  firstShortfallYear: number | null
  /** The age of the person looked at in that year. */
  firstShortfallAge: number | null
  /** The household's net worth in the year the person turns 85 / 95; null past the plan's horizon. */
  netWorth85: number | null
  netWorth95: number | null
  /** The smallest nest at the end of any year between the person's 60th and 70th birthdays (inclusive) in which the plan is NOT short; null if none. */
  lowestNest: { amount: number; age: number } | null
  /** Everything CASHED over the whole plan, after tax: employment, pensions, GIS and what was drawn from the accounts (withdrawals count as income here), less tax. It does not count what is left in the accounts, so it does not rank the strategies the way wealth at 95 does. */
  lifetimeAfterTax: number
  /** The income tax and OAS recovery paid over the whole plan. */
  taxTotal: number
  /** The GIS received over the whole plan, and the OAS taken back by the recovery tax. */
  gisTotal: number
  oasRecoveryTotal: number
  /** What was drawn from the accounts while the person was 60 to 69. */
  drawn6070: number
}

export interface BridgeRun {
  levers: BridgeLevers
  rows: BridgeYear[]
  summary: BridgeSummary
}

export interface StrategyCard {
  key: StrategyKey
  levers: BridgeLevers
  summary: BridgeSummary
  /** The nest at the end of each year (today's dollars), for the chart. */
  nest: { year: number; age: number; total: number }[]
  /** Against starting the QPP and OAS at 65 (the `standard` card): how much MORE was drawn from the nest while 60 to 69. */
  extraDrawn6070: number
  /** The age (reached in the year) at which the pensions of this strategy have paid back what waiting cost, or the age at which waiting until 65 overtakes; null when it never happens in the plan or the strategy is the baseline. */
  breakEven: number | null
  /** Which of the two `breakEven` is: « later » (the strategy catches up with the standard) or « earlier » (the standard overtakes the strategy). null with `breakEven`. */
  breakEvenKind: 'later' | 'earlier' | null
}

/** The cited rates the copy quotes, so it never types them. */
export interface BridgeFacts {
  /** The QPP's gain per month of waiting after 65 (0.007) and its most (0.588, at 72). */
  rrqPerMonth: number
  rrqLateMax: number
  /** The OAS's gain per month of waiting after 65 (0.006) and its most (0.36, at 70). */
  oasPerMonth: number
  oasLateMax: number
}

export type MatrixCell = { ok: boolean; firstShortfallAge: number | null }

export interface BridgeView {
  /** The plan being tested, year by year. */
  selected: BridgeRun
  strategies: StrategyCard[]
  facts: BridgeFacts
  /** Under each set of assumptions, per strategy: does the money last? null unless asked for. */
  matrix: Record<StrategyKey, Record<PresetKey, MatrixCell>> | null
}

const sum = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0)
const KINDS: readonly AccountKind[] = ['nonReg', 'rrsp', 'tfsa']

/** The levers a named strategy sets, from the person's profile; `retirementAge` is the one being tested, the same in every strategy. */
export function leversFor(key: StrategyKey, h: Household, id: PersonId, retirementAge: number): BridgeLevers {
  const p = h.persons.find((x) => x.id === id) ?? h.persons[0]
  switch (key) {
    case 'asap':
      return { id: p.id, retirementAge, rrqStartAge: 60, oasStartAge: 65 }
    case 'standard':
      return { id: p.id, retirementAge, rrqStartAge: 65, oasStartAge: 65 }
    case 'max':
      return { id: p.id, retirementAge, rrqStartAge: 72, oasStartAge: 70 }
    case 'bridge':
      return { id: p.id, retirementAge, rrqStartAge: 70, oasStartAge: 70 }
    case 'both':
      return { id: p.id, retirementAge, rrqStartAge: 70, oasStartAge: 70, both: true }
    default:
      return { id: p.id, retirementAge, rrqStartAge: p.rrq.startAge, oasStartAge: p.oas.startAge }
  }
}

/** The profile's own levers for a person. */
export const profileLevers = (h: Household, id: PersonId): BridgeLevers => {
  const p = h.persons.find((x) => x.id === id) ?? h.persons[0]
  return { id: p.id, retirementAge: p.retirementAge, rrqStartAge: p.rrq.startAge, oasStartAge: p.oas.startAge }
}

const scenarioOf = (h: Household, l: BridgeLevers): Scenario => {
  const ids = l.both ? h.persons.map((p) => p.id) : [l.id]
  const each = (age: number) => Object.fromEntries(ids.map((id) => [id, age]))
  return { retirementAge: { [l.id]: l.retirementAge }, rrqStartAge: each(l.rrqStartAge), oasStartAge: each(l.oasStartAge) }
}

const inflator = (a: Assumptions) => (year: number) => (1 + a.inflation) ** (year - a.today.year)

function yearOf(r: YearRow, id: PersonId, deflate: (year: number) => number, birthYear: number): BridgeYear {
  const d = deflate(r.year)
  const people = Object.values(r.persons)
  const pick = (f: (p: NonNullable<(typeof people)[number]>) => number) => sum(people.map((p) => f(p!))) / d
  const draws = Object.fromEntries(KINDS.map((k) => [k, pick((p) => p.withdrawals[k])])) as Record<AccountKind, number>
  const nestParts = Object.fromEntries(KINDS.map((k) => [k, pick((p) => p.balancesEnd[k])])) as Record<AccountKind, number>
  const guaranteed = pick((p) => p.db + p.rrq + p.oas + p.gis + p.allowance)
  const drawn = sum(KINDS.map((k) => draws[k]))
  const shortfall = r.household.shortfall / d
  return {
    year: r.year,
    // The person's age in the year — from their birth year, so the rows after their death (they leave the rows at their horizon age) still read in order.
    age: r.year - birthYear,
    spending: r.household.spending / d,
    employment: pick((p) => p.employment + (p.otherIncome ?? 0)),
    dated: pick((p) => p.otherIncome ?? 0),
    db: pick((p) => p.db),
    rrq: pick((p) => p.rrq),
    oas: pick((p) => p.oas),
    // The income-tested supplements together: the GIS, and the Allowance a 60–64 spouse gets beside it.
    gis: pick((p) => p.gis + p.allowance),
    ownPension: ((r.persons[id]?.rrq ?? 0) + (r.persons[id]?.oas ?? 0)) / d,
    ownRrq: (r.persons[id]?.rrq ?? 0) / d,
    ownOas: (r.persons[id]?.oas ?? 0) / d,
    guaranteed,
    draws,
    drawn,
    tax: r.household.tax / d,
    payroll: pick((p) => p.payrollContribution + p.rrqContribution + p.pensionContribution),
    saved: pick((p) => p.contributions.nonReg + p.contributions.rrsp + p.contributions.tfsa),
    shortfall,
    nest: { ...nestParts, total: sum(KINDS.map((k) => nestParts[k])) },
    // The verdict's own rule (retireAt, deferral, runScenario): ANY shortfall in the year, in the year's own dollars — so a figure here is never a plan that works there.
    status: r.household.shortfall > 0 ? 'short' : drawn > 1 ? 'drawing' : 'covered',
  }
}

function summarise(a: Assumptions, rows: readonly BridgeYear[], raw: readonly YearRow[]): BridgeSummary {
  const bad = rows.find((r) => r.status === 'short')
  const at = (age: number): number | null => {
    const row = rows.find((r) => r.age === age)
    return row ? row.nest.total : null
  }
  const bridgeYears = rows.filter((r) => r.age >= 60 && r.age <= 70 && r.status !== 'short')
  const lowest = bridgeYears.length === 0 ? null : bridgeYears.reduce((lo, r) => (r.nest.total < lo.nest.total ? r : lo))
  const deflate = inflator(a)
  const people = (r: YearRow) => Object.values(r.persons)
  return {
    ok: !bad,
    firstShortfallYear: bad ? bad.year : null,
    firstShortfallAge: bad ? bad.age : null,
    netWorth85: at(85),
    netWorth95: at(95),
    lowestNest: lowest ? { amount: lowest.nest.total, age: lowest.age } : null,
    lifetimeAfterTax: sum(raw.map((r) => (r.household.grossIncome - r.household.tax) / deflate(r.year))),
    taxTotal: sum(rows.map((r) => r.tax)),
    gisTotal: sum(rows.map((r) => r.gis)),
    oasRecoveryTotal: sum(raw.map((r) => sum(people(r).map((p) => p!.oasRecovery)) / deflate(r.year))),
    drawn6070: sum(rows.filter((r) => r.age >= 60 && r.age < 70).map((r) => r.drawn)),
  }
}

/** One plan laid out year by year. Quick for one projection; a couple of seconds for a whole view, so run a view in a worker. */
export function bridgeRun(h: Household, a: Assumptions, levers: BridgeLevers): BridgeRun {
  const raw = project(h, a, scenarioOf(h, levers))
  const deflate = inflator(a)
  const birthYear = (h.persons.find((p) => p.id === levers.id) ?? h.persons[0]).birth.year
  const rows = raw.map((r) => yearOf(r, levers.id, deflate, birthYear))
  return { levers, rows, summary: summarise(a, rows, raw) }
}

/**
 * The payments a pension made BEFORE the projection began (a start age already behind the person): the projection starts
 * today, so those years are not in the rows. They are in today's dollars, `months` of this year's real monthly amount
 * (a pension indexed to prices keeps its real amount), and `months` runs from the start month to this January.
 */
function missedBefore(h: Household, a: Assumptions, rows: readonly BridgeYear[], l: BridgeLevers): number {
  const p = h.persons.find((x) => x.id === l.id) ?? h.persons[0]
  const first = rows[0]
  if (!first) return 0
  const months = (start: { year: number; month: number }) => Math.max(0, (a.today.year - start.year) * 12 - (start.month - 1))
  return months(rrqStart(p.birth, l.rrqStartAge)) * (first.ownRrq / 12) + months(oasStart(p.birth, l.oasStartAge)) * (first.ownOas / 12)
}

/** The person's own QPP + OAS received, cumulative by their age, in today's dollars and before tax — `offset` is what was paid before the plan's first year. */
function pensionCumulative(rows: readonly BridgeYear[], offset: number): Map<number, number> {
  const out = new Map<number, number>()
  let s = offset
  for (const r of rows) {
    s += r.ownPension
    out.set(r.age, s)
  }
  return out
}

/**
 * The first age at which a strategy's cumulative QPP + OAS (today's dollars, before tax) and the baseline's (both at 65)
 * cross: where the one that started LATER has caught up, or where the one that started EARLIER has been overtaken. The
 * direction comes from the cumulatives themselves (who is ahead when they first differ), not from the start ages — so a
 * mixed strategy (QPP at 60, OAS at 70) has an answer too. null when they never cross in the plan or never differ.
 */
export function breakEvenOf(option: ReadonlyMap<number, number>, baseline: ReadonlyMap<number, number>): { age: number; kind: 'later' | 'earlier' } | null {
  let ahead: boolean | null = null
  for (const [age, s] of option) {
    const b = baseline.get(age) ?? 0
    if (s === b) continue
    if (ahead === null) {
      ahead = s > b
      continue
    }
    if (ahead ? b >= s : s >= b) return { age, kind: ahead ? 'earlier' : 'later' }
  }
  return null
}

const sameLevers = (x: BridgeLevers, y: BridgeLevers) => x.retirementAge === y.retirementAge && x.rrqStartAge === y.rrqStartAge && x.oasStartAge === y.oasStartAge && !!x.both === !!y.both

/**
 * The plan being tested and the five strategies beside it. `withMatrix` also asks, for each strategy, whether the money
 * lasts under the prudent, neutral and bold sets of assumptions (15 more projections: only when asked).
 */
export function bridgeView(h: Household, a: Assumptions, levers: BridgeLevers, withMatrix = false): BridgeView {
  const selected = bridgeRun(h, a, levers)
  const cards = strategyKeysFor(h).map((key) => {
    const l = leversFor(key, h, levers.id, levers.retirementAge)
    const run = sameLevers(l, levers) ? selected : bridgeRun(h, a, l)
    return { key, levers: l, run }
  })
  const base = cards.find((c) => c.key === 'standard')!
  const baseCum = pensionCumulative(base.run.rows, missedBefore(h, a, base.run.rows, base.levers))
  const strategies: StrategyCard[] = cards.map(({ key, levers: l, run }) => {
    const broke = key === 'standard' ? null : breakEvenOf(pensionCumulative(run.rows, missedBefore(h, a, run.rows, l)), baseCum)
    return {
      key,
      levers: l,
      summary: run.summary,
      nest: run.rows.map((r) => ({ year: r.year, age: r.age, total: r.nest.total })),
      extraDrawn6070: run.summary.drawn6070 - base.run.summary.drawn6070,
      breakEven: broke?.age ?? null,
      breakEvenKind: broke?.kind ?? null,
    }
  })

  const P = paramsFor(a.today.year, { inflation: a.inflation, wageGrowth: a.wageGrowth })
  const facts: BridgeFacts = {
    rrqPerMonth: P.rrq.latePerMonth,
    rrqLateMax: P.rrq.latePerMonth * P.rrq.lateMaxMonths,
    oasPerMonth: P.oas.deferralPerMonth,
    oasLateMax: P.oas.deferralPerMonth * P.oas.deferralMaxMonths,
  }
  return { selected, strategies, facts, matrix: withMatrix ? bridgeMatrix(h, a, levers) : null }
}

/** For each strategy a household is shown (a one-person household has no « both » entry), whether the money lasts under the prudent, neutral and bold sets of assumptions (fifteen projections). */
export function bridgeMatrix(h: Household, a: Assumptions, levers: BridgeLevers): Record<StrategyKey, Record<PresetKey, MatrixCell>> {
  return Object.fromEntries(
    strategyKeysFor(h).map((key) => {
      const l = leversFor(key, h, levers.id, levers.retirementAge)
      const cells = Object.fromEntries(
        PRESET_KEYS.map((preset) => {
          const s = bridgeRun(h, withPreset(a, preset), l).summary
          return [preset, { ok: s.ok, firstShortfallAge: s.firstShortfallAge } satisfies MatrixCell]
        }),
      ) as Record<PresetKey, MatrixCell>
      return [key, cells]
    }),
  ) as Record<StrategyKey, Record<PresetKey, MatrixCell>>
}
