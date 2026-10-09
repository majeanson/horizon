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
/** What a member pays out of pay while working: see memberContribution.ts. Fractions: 0.0863 = 8,63 %. */
export interface MemberContribution {
  rate: number
  /** The share of the maximum pensionable earnings (× service) that is exempt: 0.25. */
  exemptionShare: number
  /** The reduction per dollar the pay falls under the MGA (× service): 0.0153. */
  reductionFactor: number
}

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
   * The share of the pension paid to a surviving spouse for life after the member's death (RREGOP: 0.5, or 0.6 at the cost of 2 %
   * of the member's own pension). Absent: none is paid. Death before the pension starts: the share of the pension the member would
   * have been entitled to at death, coordinated as from 65.
   */
  survivorShare?: number
  /**
   * The plan's rule for a member who LEAVES before being eligible for any pension (a « deferred » pension): the permanent
   * reduction counts the years from the start to `toAge` instead of to the unreduced age; the RRQ coordination then applies
   * from the start, cut by the same share; and until the pension starts it is indexed by `indexation` (RREGOP: in full).
   * Absent: the plan has no such rule, and a member who leaves early gets the active member's reduction.
   */
  deferred?: { toAge: number; indexation: { share: number; minus: number } }
  /** The member's own contributions out of pay while working (deducted from taxable income too). Absent: none are modelled. Ignored for a pension in pay. */
  memberContribution?: MemberContribution
  /**
   * A pension ALREADY being paid (the retiree's « rente en cours »): the annual amount paid now, in today's dollars, as the
   * statement prints it — already reduced, coordinated and bridged. When set, the formula fields above are not read: only
   * `indexation` is, from next January on. Absent means a pension still to be calculated.
   *
   * `after65`: what the same pension pays from the month after the 65th birthday, in today's dollars, when it steps
   * down (a plan coordinated with the RRQ) or up. Leave it out for a pension that stays the same; it is ignored once
   * the person is already past that month (the figure paid now already is the one after).
   *
   * `since`: the month the pension began. It matters only when that is THIS year: the first January indexation then
   * pays only the share of the year the pension was paid (like any new pension). Absent, or any earlier year, means the
   * full first indexation — the pension already got its share, and the figure entered is the one paid now.
   */
  inPay?: { annual: number; after65?: number; since?: YearMonth }
}

export interface Person {
  id: PersonId
  /** Shown in the UI only; never read by a formula. */
  name: string
  birth: YearMonth
  /** The age at which employment income stops. */
  retirementAge: number
  /**
   * The age this person's plan runs to — their own « jusqu'à quel âge ». The person is alive through the year they reach it and
   * gone from the next; in a couple the first death switches the plan to the survivor's rules (projection.ts). Null or absent:
   * the scenario's horizonAge (Assumptions).
   */
  horizonAge?: number | null
  /** Gross employment income now, in today's dollars. The engine grows it by wage growth until retirement. */
  salaryToday: number
  /**
   * Work kept after the retirement age: a `share` of the salary (0 to 1) until the person reaches `untilAge`. It is paid, taxed and charged EI, QPIP and
   * QPP contributions like any employment; the savings the person chose to make "while working", and the employer-plan contributions, are NOT
   * made on it. Absent or null: none.
   */
  partTime?: { untilAge: number; share: number } | null
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
    rrsp: {
      balance: number
      room: number
      annualContribution: number
      /** The part of `balance` that is locked in (a LIRA / LIF, the employer share of a VRSP), today. Absent: none. */
      lockedIn?: number
      /** An employer's VRSP contribution per year, today's dollars, while working: it lands in the locked part, costs the person no cash and uses RRSP room. Absent: none. */
      employerContribution?: number
    }
    tfsa: { balance: number; room: number; annualContribution: number }
    nonReg: { balance: number; acb: number; annualContribution: number }
  }
  pensions: DbPension[]
}

/** The household's principal residence: what it is worth, what is still owed on it, and — optionally — when it is sold. */
export interface Home {
  /** What it would sell for today, in today's dollars. It then keeps its real value (grows with inflation). */
  value: number
  /** The mortgage; a home owned outright has a balance of 0. */
  mortgage: {
    /** Still owed today. */
    balance: number
    /** The stated annual rate (0.05 = 5 %); compounded semi-annually, as Canadian fixed-rate mortgages are. */
    rate: number
    /** The payment, each month, in nominal dollars (a weekly or fortnightly payment is stored as its monthly equivalent: × payments a year ÷ 12). */
    monthlyPayment: number
    /** How the person's statement counts the payment: the screen shows and takes it in that unit. It changes nothing in the calculation. Absent: monthly. */
    frequency?: 'monthly' | 'biweekly' | 'weekly'
    /**
     * The term ends: from January of `year` the rate is `rate`, and either the person's payment stays what it is (the payoff date moves) or the payoff
     * date stays and the payment changes (the new payment pays the balance of that year over the months that were left). Null or absent: the rate
     * never changes.
     */
    renewal?: { year: number; rate: number; keep: 'payment' | 'amortization' } | null
  }
  /**
   * Sold (or traded down) when the FIRST person reaches `age`; `replacementCost` is the new home's price in today's dollars
   * (0 = rent). Null: the home is kept for life.
   */
  sale: { age: number; replacementCost: number } | null
}

/**
 * A market path as the person chose it: a ready-made one, or their own list of yearly returns counted from the first retirement year
 * (`null`: that year earns the average). The ready-made names are in engine/marketPaths.ts.
 */
export interface MarketPath {
  preset: 'smooth' | 'badStart' | 'lostDecade' | 'boomBust' | 'custom'
  custom: readonly (number | null)[]
}

/**
 * A dated flow of money that is neither the budget nor a pension: an inheritance, a car, a roof, rent from a flat, a care reserve. Amounts are
 * in TODAY's dollars and grow with prices. `windfall`: received once, in `fromYear`, tax-free, into the non-registered account of the first
 * person alive. `expense`: paid every year from `fromYear` to `toYear` (the same year: once), on top of the budget. `income`: received every
 * year from `fromYear` to `toYear` by `owner` (whoever is alive takes it over after a death), taxed as ordinary income (`taxable`) or not.
 */
export interface Flow {
  label: string
  kind: 'windfall' | 'expense' | 'income'
  amount: number
  fromYear: number
  toYear: number
  owner: PersonId
  taxable: boolean
}

export interface Household {
  /**
   * Whether the household is ONE adult who lives alone — the condition for Québec's living-alone amount. Ignored for a
   * couple (it is never alone). Absent means « one adult lives alone », which is what the engine assumed before it was
   * a stated fact; a saved profile always carries it (schema v2).
   */
  livesAlone?: boolean
  persons: Person[]
  /** The principal residence. Absent or null: the household owns none (or does not want it counted). */
  home?: Home | null
  /** Birth years of the children (the profile's own list: it is the engine's too, since v16). */
  children?: readonly number[]
  /**
   * What each child costs inside the budget, until they leave: once a child reaches `untilAge` (they leave home), `perChild` (today's dollars a year,
   * already part of `spending.workingToday`) drops out of the working-years budget. Absent or null: the budget does not change as children leave.
   */
  childSpending?: { perChild: number; untilAge: number } | null
  /** The dated flows (see Flow). Absent: none. */
  flows?: readonly Flow[]
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
  /** The age each person's plan runs to unless they set their own (Person.horizonAge); the plan ends when the last person reaches theirs. */
  horizonAge: number
  /** Set by the sensitivity grid only: every person's horizon, overriding their own. Absent otherwise. */
  horizonForAll?: number
  /**
   * In a couple, the share of the household's spending the survivor keeps after the first death (0.7 = 70 %). A choice, not an
   * official figure. Absent: 1 — spending does not change.
   */
  survivorSpending?: number
  /** Which account to draw on first, second, third when savings are needed. */
  withdrawalOrder: readonly AccountKind[]
  /** Try every 5 % allocation of pension income between the spouses and keep the cheapest. */
  pensionSplitting: boolean
  /**
   * When a working year ends with cash left over and RRSP room is open, put the surplus in the RRSP first (the deduction is worth
   * more than the TFSA's tax-free growth for most earners), the rest going to the TFSA and then the non-registered account as ever.
   * Absent / false: the surplus goes to the TFSA, then non-registered, and the RRSP only gets what the person entered.
   */
  surplusToRrsp?: boolean
  /**
   * How the retired household's spending changes with age, in REAL terms a year, from age 70 (the oldest person alive): −0.01 is the often-observed
   * slowing of spending in later retirement. A choice, not an official figure. Absent or 0: spending stays level.
   */
  retiredSpendingDrift?: number
  /** The path the markets take (engine/marketPaths.ts). Absent: the average return, every year. */
  marketPath?: MarketPath
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
  /** RRQ pension received in the year — the person's own, plus the surviving spouse's pension after a death. */
  rrq: number
  /** The part of rrq that is the surviving spouse's pension (0 while both are alive). */
  survivorPension: number
  /** The QPP death benefit, inside rrq: the single payment received the year after a spouse's death, 0 in every other year. */
  deathBenefit: number
  oas: number
  /** The Allowance: paid to the 60–64 spouse of a pensioner on the GIS, taxable, income-tested (nothing once the couple's income is over the cut-off). */
  allowance: number
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
  /** The member's own employer-pension-plan contributions out of this year's pay. */
  pensionContribution: number
  /** Income from a dated `income` flow (rent…), taxed as ordinary income when the flow says so. Present only in a year that has some. */
  otherIncome?: number
  /** Net income (line 23600): what the tax and the credits read. */
  netIncome: number
  oasRecovery: number
  federalTax: number
  quebecTax: number
  balancesEnd: Record<AccountKind, number>
  /** The locked-in part of `balancesEnd.rrsp` at year end (0 when there is none). */
  rrspLockedEnd: number
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
    /** Paid on the mortgage this year (0 with no home or once paid off); it is part of `spending`. */
    mortgagePayment: number
    /** What the home is worth at the end of the year (0 with no home): wealth the net worth does not count. */
    homeValueEnd: number
    /** Still owed on the mortgage at the end of the year. */
    mortgageBalanceEnd: number
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
