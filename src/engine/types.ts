import type { YearMonth } from './rrq.ts'

// The shapes the engine reads and writes: a household (who they are and what they have), the assumptions
// about the future, a scenario (the question being asked), and the year-by-year rows that come out.
//
// CONVENTIONS (ENGINE.md §1): money is a plain number of DOLLARS. A field described as « today's dollars » is
// in the dollars of `Assumptions.today.year` and is inflated by the engine; everything in a `YearRow` is in
// THAT YEAR's dollars. Years are calendar years; an age is the age attained during the year.

export type PersonId = 'self' | 'spouse'

/**
 * A defined-benefit pension plan the person belongs to, described by the rules its booklet states. The
 * Québec public-sector plan (RREGOP) is one preset of these (engine/presets.ts); any other plan is entered by
 * hand from its own booklet — every field below is a rule a plan states, never a guess the engine makes.
 */
export interface DbPension {
  /** Free text, e.g. « RREGOP ». Display only. */
  label: string
  /** The share of the average salary earned per year of service: 0.02 = 2 %. */
  accrualRate: number
  /** The most years of service the pension is calculated on (40 for RREGOP), or null for no limit. */
  maxServiceYears: number | null
  /** Years of service credited FOR THE CALCULATION as of today (the statement's « années de service pour le calcul de votre rente »). */
  serviceYearsToDate: number
  /** Years of service credited per year still worked (1 for full time). */
  serviceRatePerYear: number
  /** The number of best-paid years the average salary is taken over (5 for RREGOP). */
  averagingYears: number
  /** The plan's coordination with the RRQ: from `fromAge` the pension falls by rate × min(service, maxYears) × the lesser of the average salary and the average MGA. */
  coordination: { rate: number; fromAge: number; maxYears: number } | null
  /** The earliest age the pension may start (with reduction if before it is unreduced). */
  earliestAge: number
  /** When the pension is paid WITHOUT reduction: from `age`, or with `serviceYears` of service at any age, or from `factor.minAge` once age + service reaches `factor.total`. */
  unreduced: { age: number; serviceYears: number | null; factor: { minAge: number; total: number } | null }
  /** The permanent reduction per year the pension starts before it would have been unreduced (0.06 = 6 %). */
  earlyReductionPerYear: number
  /** A temporary supplement paid until a given age, as a share of the pension (a feature of some plans, none of RREGOP's), or null. */
  bridge: { share: number; untilAge: number } | null
  /** The yearly increase of the pension in pay: the greater of `share` × inflation and inflation − `minus`. Full indexation is { share: 1, minus: 0 }. */
  indexation: { share: number; minus: number }
  /** The age the person starts the pension (≥ earliestAge). */
  startAge: number
  /**
   * The plan's rule for a member who LEAVES before being eligible for any pension (a « deferred » pension): the permanent
   * reduction counts the years from the start to `toAge` instead of to the unreduced age; the RRQ coordination then applies
   * from the start, cut by the same share; and until the pension starts it is indexed by `indexation` (RREGOP: in full).
   * Absent: the plan has no such rule, and a member who leaves early gets the active member's reduction.
   */
  deferred?: { toAge: number; indexation: { share: number; minus: number } }
  /**
   * A pension ALREADY being paid (the retiree's « rente en cours »): the annual amount paid now, in today's dollars, as the
   * statement prints it — already reduced, coordinated and bridged. When set, the formula fields above are not read: only
   * `indexation` is, from next January on. Absent means a pension still to be calculated.
   *
   * `after65`: what the same pension pays from the month after the 65th birthday, in today's dollars, when it steps
   * down (a plan coordinated with the RRQ) or up. Leave it out for a pension that stays the same; it is ignored once
   * the person is already past that month (the figure paid now already is the one after).
   */
  inPay?: { annual: number; after65?: number }
}

export interface Person {
  id: PersonId
  /** Shown in the UI only; never read by a formula. */
  name: string
  birth: YearMonth
  /** The age at which employment income stops. */
  retirementAge: number
  /** Gross employment income now, in today's dollars. The engine grows it by wage growth until retirement. */
  salaryToday: number
  /** Pensionable earnings by past calendar year, as the relevé's « Revenus de travail admissibles » prints them. */
  earningsHistory: Readonly<Record<number, number>>
  rrq: {
    /** Whole years, 60 to 72. */
    startAge: number
    /** The relevé's own estimate (monthly) at 60 / 65, kept as a CHECK against the engine, never as an input. */
    statementAt60?: number
    statementAt65?: number
  }
  oas: {
    /** Whole years, 65 to 70. */
    startAge: number
    /** The calendar year residence in Canada began (after 18). Lifelong residents: the birth year + 18. */
    residentSince: number
  }
  accounts: {
    rrsp: { balance: number; room: number; annualContribution: number }
    tfsa: { balance: number; room: number; annualContribution: number }
    nonReg: { balance: number; acb: number; annualContribution: number }
  }
  pensions: DbPension[]
}

export interface Household {
  /**
   * Whether the household is ONE adult who lives alone — the condition for Québec's living-alone amount. Ignored for a
   * couple (it is never alone). Absent means « one adult lives alone », which is what the engine assumed before it was
   * a stated fact; a saved profile always carries it (schema v2).
   */
  livesAlone?: boolean
  persons: Person[]
  spending: {
    /** Household spending while anyone still works, in today's dollars. */
    workingToday: number
    /** Household spending once everyone has retired, in today's dollars. */
    retiredToday: number
  }
}

export type AccountKind = 'nonReg' | 'rrsp' | 'tfsa'

export interface Assumptions {
  today: YearMonth
  /** Annual consumer-price inflation, as a fraction. */
  inflation: number
  /** Annual average-wage growth, as a fraction. */
  wageGrowth: number
  /** Nominal annual return by account. */
  returns: Record<AccountKind, number>
  /** The plan must last until the YOUNGEST person reaches this age. */
  horizonAge: number
  /** Which account to draw on first, second, third when savings are needed. */
  withdrawalOrder: readonly AccountKind[]
  /** Try every 5 % allocation of pension income between the spouses and keep the cheapest. */
  pensionSplitting: boolean
}

/** The question being asked: « what if … ». Overrides the profile's own choices for one run. */
export interface Scenario {
  retirementAge?: Partial<Record<PersonId, number>>
  rrqStartAge?: Partial<Record<PersonId, number>>
  oasStartAge?: Partial<Record<PersonId, number>>
}

/** One person's year. */
export interface PersonYear {
  age: number
  employment: number
  rrq: number
  oas: number
  /** Tax-free, income-tested; paid only to a pensioner. */
  gis: number
  db: number
  /** The RRIF minimum forced this year. */
  rrifMinimum: number
  withdrawals: Record<AccountKind, number>
  contributions: Record<AccountKind, number>
  rrqContribution: number
  /** EI and QPIP premiums paid on this year's employment income. */
  payrollContribution: number
  /** Net income (line 23600): what the tax and the credits read. */
  netIncome: number
  oasRecovery: number
  federalTax: number
  quebecTax: number
  balancesEnd: Record<AccountKind, number>
}

export interface YearRow {
  year: number
  persons: Partial<Record<PersonId, PersonYear>>
  household: {
    /** Everything received: employment, pensions, GIS, withdrawals. */
    grossIncome: number
    /** Income tax + the OAS recovery tax, both spouses. */
    tax: number
    /** What the household needed to spend this year. */
    spending: number
    /** Spending that could NOT be met even after emptying every account (0 in a year that works). */
    shortfall: number
    /** Everything the household owns, at the end of the year. */
    netWorthEnd: number
  }
  /** The figures this year used were projected, not published. */
  projected: boolean
}

export interface AgeResult {
  /** The retirement age tried. */
  age: number
  /** True when no year has a shortfall. */
  ok: boolean
  /** The first year with a shortfall, or null. */
  firstShortfallYear: number | null
  netWorthAtHorizon: number
  rows: YearRow[]
}

export interface RetireAtResult {
  byAge: AgeResult[]
  /** The earliest tried age at which the plan works, or null. */
  earliestOk: number | null
}
