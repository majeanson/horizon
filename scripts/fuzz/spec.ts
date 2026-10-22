import { ASSUMPTION_PRESETS } from '../../src/engine/assumptionPresets.ts'
import { GOLDEN_TODAY, history } from '../../src/engine/golden/household.fixture.ts'
import { rregopPension } from '../../src/engine/presets.ts'
import type { AccountKind, Assumptions, BracketFill, Flow, Household, Person, PersonId } from '../../src/engine/types.ts'
import { blankPerson } from '../../src/lib/schema.ts'

// A LIFE SPEC is what the model writes: a household in about forty plain numbers. It is NOT the engine's Household: the model never
// sees the engine's types, never writes an earnings history, and cannot make a field the engine does not read. `expand` turns a spec
// into the real thing, deterministically, so every household the harness runs is one the engine could be given. A sentinel of 0
// means « none », because a schema with nullable unions is one more way for a cheap model to go wrong.

export interface PersonSpec {
  birthYear: number
  birthMonth: number
  retirementAge: number
  /** Gross pay today, in today's dollars; 0 for someone already retired. */
  salary: number
  /** For someone already retired (salary 0): what they were paid in the last working years; else 0. */
  pastSalary: number
  rrsp: number
  tfsa: number
  nonReg: number
  rrspPerYear: number
  tfsaPerYear: number
  nonRegPerYear: number
  /** The part of the RRSP balance that is locked in; 0 for none. */
  lockedIn: number
  /** Calendar year Canadian residence began; 0 for a lifelong resident. */
  residentSince: number
  rrqStartAge: number
  oasStartAge: number
  /** An RREGOP (Québec public-sector) pension: years of service so far and the age it starts; 0 service for none. */
  rregopServiceYears: number
  rregopStartAge: number
  /** Work kept after the retirement age: the share of the pay (0 for none) until `partTimeUntilAge`. */
  partTimeShare: number
  partTimeUntilAge: number
}

export interface FlowSpec {
  label: string
  kind: 'windfall' | 'expense' | 'income'
  amount: number
  fromYear: number
  toYear: number
  owner: PersonId
  taxable: boolean
}

export interface LifeSpec {
  story: string
  persons: PersonSpec[]
  spendingWorking: number
  spendingRetired: number
  /** The home's value today; 0 for no home counted. */
  homeValue: number
  mortgageBalance: number
  mortgageRate: number
  mortgageMonthlyPayment: number
  /** The age (of the first person to reach it) the home is sold; 0 to keep it. */
  homeSaleAge: number
  homeReplacementCost: number
  childrenBirthYears: number[]
  /** What each child costs a year inside the budget; 0 for no cost stated. */
  childCostPerYear: number
  countChildBenefits: boolean
  flows: FlowSpec[]
  preset: 'prudent' | 'neutral' | 'bold'
  horizonAge: number
  survivorSpending: number
  marketPath: 'smooth' | 'badStart' | 'lostDecade' | 'boomBust'
  bracketFill: 'none' | 'bracket1' | 'oas'
  pensionSplitting: boolean
  drawTogether: boolean
  surplusToRrsp: boolean
  withdrawalOrder: AccountKind[]
}

const num = { type: 'number' } as const
const int = { type: 'integer' } as const
const bool = { type: 'boolean' } as const
const str = { type: 'string' } as const
const obj = (properties: Record<string, unknown>) => ({ type: 'object', properties, required: Object.keys(properties), additionalProperties: false })
const enumOf = (values: string[]) => ({ type: 'string', enum: values })

const PERSON_SCHEMA = obj({
  birthYear: int, birthMonth: int, retirementAge: int, salary: num, pastSalary: num,
  rrsp: num, tfsa: num, nonReg: num, rrspPerYear: num, tfsaPerYear: num, nonRegPerYear: num, lockedIn: num,
  residentSince: int, rrqStartAge: int, oasStartAge: int,
  rregopServiceYears: num, rregopStartAge: int, partTimeShare: num, partTimeUntilAge: int,
})

const FLOW_SCHEMA = obj({
  label: str, kind: enumOf(['windfall', 'expense', 'income']), amount: num, fromYear: int, toYear: int, owner: enumOf(['self', 'spouse']), taxable: bool,
})

const SPEC_SCHEMA = obj({
  story: str,
  persons: { type: 'array', items: PERSON_SCHEMA },
  spendingWorking: num, spendingRetired: num,
  homeValue: num, mortgageBalance: num, mortgageRate: num, mortgageMonthlyPayment: num, homeSaleAge: int, homeReplacementCost: num,
  childrenBirthYears: { type: 'array', items: int },
  childCostPerYear: num, countChildBenefits: bool,
  flows: { type: 'array', items: FLOW_SCHEMA },
  preset: enumOf(['prudent', 'neutral', 'bold']),
  horizonAge: int, survivorSpending: num,
  marketPath: enumOf(['smooth', 'badStart', 'lostDecade', 'boomBust']),
  bracketFill: enumOf(['none', 'bracket1', 'oas']),
  pensionSplitting: bool, drawTogether: bool, surplusToRrsp: bool,
  withdrawalOrder: { type: 'array', items: enumOf(['nonReg', 'rrsp', 'tfsa']) },
})

/** The JSON schema a generation request is held to: a batch of specs. */
export const BATCH_SCHEMA = obj({ households: { type: 'array', items: SPEC_SCHEMA } })

const round = (x: number, to = 1) => Math.round(x / to) * to

function personOf(s: PersonSpec, id: PersonId): Person {
  const today = GOLDEN_TODAY
  const p = blankPerson(id, today)
  const age = today.year - s.birthYear
  const working = s.salary > 0 && s.retirementAge > age
  const lastYear = working ? today.year - 1 : Math.min(today.year - 1, s.birthYear + s.retirementAge - 1)
  // QPP earnings count from the 21st birthday, but only those earned in Québec: someone who arrived at 36 has no history before the year of arrival
  const firstYear = Math.max(s.birthYear + 21, s.residentSince > 0 ? s.residentSince : 0)
  const years = lastYear - firstYear + 1
  const pay = working ? s.salary : s.pastSalary
  // the ramp history() uses grows 4 % a year: start low enough that its last year lands at today's pay
  const earningsHistory = years > 0 && pay > 0 ? history(s.birthYear, round(pay / 1.04 ** (years - 1)), lastYear, firstYear) : {}
  return {
    ...p,
    id,
    name: id === 'self' ? 'A' : 'B',
    birth: { year: s.birthYear, month: Math.min(12, Math.max(1, s.birthMonth)) },
    retirementAge: s.retirementAge,
    horizonAge: null,
    partTime: s.partTimeShare > 0 ? { untilAge: s.partTimeUntilAge, share: s.partTimeShare } : null,
    salaryToday: s.salary,
    earningsHistory,
    rrq: { startAge: s.rrqStartAge },
    oas: { startAge: s.oasStartAge, residentSince: s.residentSince > 0 ? s.residentSince : s.birthYear + 18 },
    accounts: {
      rrsp: { balance: s.rrsp, room: round(s.rrspPerYear * 2), annualContribution: s.rrspPerYear, lockedIn: Math.min(s.lockedIn, s.rrsp), employerContribution: 0 },
      tfsa: { balance: s.tfsa, room: round(s.tfsaPerYear * 2), annualContribution: s.tfsaPerYear },
      nonReg: { balance: s.nonReg, acb: round(s.nonReg * 0.85), annualContribution: s.nonRegPerYear },
    },
    // A pension is built from the salary the person is paid: for someone already retired (no pay) a formula pension is $0 by construction, so a retiree's pension is entered the way the
    // app takes it, as « rente en cours » (`inPay`, the yearly amount already paid): about 2 % of the best pay a year of service, a quarter less for the coordination with the QPP.
    pensions:
      s.rregopServiceYears > 0
        ? [
            working
              ? rregopPension({ serviceYearsToDate: s.rregopServiceYears, startAge: s.rregopStartAge })
              : { ...rregopPension({ serviceYearsToDate: s.rregopServiceYears, startAge: s.rregopStartAge }), inPay: { annual: round(0.02 * Math.min(s.rregopServiceYears, 40) * s.pastSalary * 0.75, 100) } },
          ]
        : [],
  }
}

export interface Expanded {
  household: Household
  children: number[]
  assumptions: Assumptions
}

export function expand(spec: LifeSpec): Expanded {
  const persons = spec.persons.slice(0, 2).map((s, i) => personOf(s, i === 0 ? 'self' : 'spouse'))
  const flows: Flow[] = spec.flows.slice(0, 20).map((f) => ({ ...f, owner: persons.length === 1 ? 'self' : f.owner }))
  const household: Household = {
    livesAlone: persons.length === 1,
    persons,
    children: spec.childrenBirthYears,
    childSpending: spec.childCostPerYear > 0 ? { perChild: spec.childCostPerYear, untilAge: 23 } : null,
    kidsEffects: spec.countChildBenefits ? { benefits: true, qppExclusion: false, leave: null } : null,
    flows,
    spending: { workingToday: spec.spendingWorking, retiredToday: spec.spendingRetired },
    home:
      spec.homeValue > 0
        ? {
            value: spec.homeValue,
            mortgage: { balance: spec.mortgageBalance, rate: spec.mortgageRate, monthlyPayment: spec.mortgageMonthlyPayment },
            sale: spec.homeSaleAge > 0 ? { age: spec.homeSaleAge, replacementCost: spec.homeReplacementCost } : null,
          }
        : null,
  }
  const base = ASSUMPTION_PRESETS[spec.preset]
  const assumptions: Assumptions = {
    today: GOLDEN_TODAY,
    ...base,
    horizonAge: spec.horizonAge,
    survivorSpending: spec.survivorSpending,
    withdrawalOrder: spec.withdrawalOrder.length === 3 ? spec.withdrawalOrder : ['nonReg', 'rrsp', 'tfsa'],
    pensionSplitting: spec.pensionSplitting,
    drawTogether: spec.drawTogether,
    surplusToRrsp: spec.surplusToRrsp,
    bracketFill: spec.bracketFill === 'none' ? null : (spec.bracketFill as BracketFill),
    retiredSpendingDrift: 0,
    marketPath: { preset: spec.marketPath, custom: [] },
  }
  return { household, children: spec.childrenBirthYears, assumptions }
}
