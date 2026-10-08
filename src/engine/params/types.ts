import type { Bracket, Cited } from './cited.ts'

// The shape of one tax year's government figures. Every leaf is `Cited`: the engine reads the
// plain number (`plain()`), the UI and SOURCES.md read the citation. Adding a figure the engine
// needs means adding it HERE and in every year's file — and a test (cited.test.ts) fails the
// build until each leaf names an official page.
//
// Grouping follows the authority that publishes the figure, because that is where a person goes
// to check it: Retraite Québec (rrq), Service Canada (oas), the Canada Revenue Agency (federal,
// accounts) and Revenu Québec / Finances Québec (quebec).

/** One of the four GIS categories, as printed in the quarterly « Maximum Benefit Amounts » table. */
export interface GisCategory {
  /** Maximum monthly GIS (top-up included), at no other income. */
  max: Cited
  /** Annual income above which no GIS is paid (a couple's COMBINED income where the category is a couple's). */
  cutoff: Cited
  /** Annual income above which the top-up is gone. */
  topUpCutoff: Cited
}

export interface YearParams {
  year: number

  /** Régime de rentes du Québec — Retraite Québec. */
  rrq: {
    /** Maximum pensionable earnings (MGA). */
    mga: Cited
    /** Additional maximum (YAMPE): the ceiling of the second additional plan. */
    yampe: Cited
    /** Basic exemption: earnings below it are not contributory. */
    exemption: Cited
    /** Employee contribution rate, base plan, on earnings between the exemption and the MGA. */
    rateBase: Cited
    /** Employee contribution rate, first additional plan, on the same band. */
    rateFirst: Cited
    /** Employee contribution rate, second additional plan, on earnings between the MGA and the YAMPE. */
    rateSecond: Cited
    /** CHECK FIGURE, never an input: the published maximum monthly pension at 65. */
    maxPension65: Cited
    /** CHECK FIGURE, never an input: the published maximum monthly BASE-plan pension at 65. */
    maxBasePension65: Cited
    /** The January indexation of pensions in pay (CPI). */
    indexation: Cited
    baseReplacement: Cited
    excludedShare: Cited
    firstReplacement: Cited
    secondReplacement: Cited
    firstFrom: Cited
    secondFrom: Cited
    /** Phase-in factor of the first additional component, by contribution year; a year not listed is 100 %. */
    phaseIn: Cited<Record<number, number>>
    additionalMonths: Cited
    earlyBase: Cited
    earlySlope: Cited
    latePerMonth: Cited
    lateMaxMonths: Cited
    /** From this year a pension that starts after 65 keeps the higher of two base-plan calculations. */
    lateProtectionFrom: Cited
    careerStartAge: Cited
    careerMaxAge: Cited
    normalAge: Cited
    earliestAge: Cited
    latestAge: Cited
  }

  /** Old Age Security and the Guaranteed Income Supplement — Service Canada. */
  oas: {
    /** Maximum monthly OAS pension, ages 65–74, at the quarter this year's figures were read. */
    monthly65to74: Cited
    /** …and from the month after the 75th birthday. */
    monthly75plus: Cited
    /** The permanent increase at 75 (multiplies the deferred amount too). */
    increaseAt75: Cited
    deferralPerMonth: Cited
    deferralMaxMonths: Cited
    startAgeMin: Cited
    startAgeMax: Cited
    /** Years of residence after 18 for a full pension. */
    residenceYearsFull: Cited
    /** Minimum years of residence for any partial pension, while living in Canada. */
    residenceYearsMinimum: Cited
    /** Net income above which OAS is recovered (the recovery tax, « clawback »). */
    recoveryThreshold: Cited
    recoveryRate: Cited
    /** The Allowance (the 60–64 spouse of a GIS recipient): its maximum monthly amount and its combined-income cut-off, at the quarter read. */
    allowanceMax: Cited
    allowanceCutoff: Cited
    /**
     * The shape of the Allowance and of the pensioner's GIS while the spouse receives it: breakpoints of Table 4 (combined annual
     * income → monthly dollars) at the quarter read. In another year both axes scale with `allowanceMax` (prices).
     */
    allowanceCurve: Cited<Record<number, number>>
    gisAllowanceCurve: Cited<Record<number, number>>
    gis: {
      /** Single, widowed or divorced. */
      single: GisCategory
      /** Spouse receives the full OAS pension. */
      spouseOas: GisCategory
      /** Spouse receives neither OAS nor the Allowance. */
      spouseNone: GisCategory
      /** Income above which the top-up starts to fall: a single person's, and a couple's combined. */
      topUpStartSingle: Cited
      topUpStartCouple: Cited
      /**
       * The statutory slopes of the GIS, as divisors: the monthly GIS falls by $1 for every
       * (divisor) dollars of ANNUAL income. Single: 24 (one dollar per two dollars of monthly income).
       * A couple's combined income: 48. The TOP-UP falls by $1 per (divisor) dollars above its start:
       * 48 for a single pensioner, 96 for a couple's combined income.
       */
      baseDivisorSingle: Cited
      baseDivisorCouple: Cited
      topUpDivisorSingle: Cited
      topUpDivisorCouple: Cited
      /** Employment income fully exempt from the GIS income test. */
      employmentExemptionFull: Cited
      /** The band above it in which half of employment income still counts. */
      employmentExemptionBand: Cited
    }
  }

  /** Federal personal income tax — Canada Revenue Agency / Department of Finance. */
  federal: {
    brackets: Cited<Bracket[]>
    /** The rate applied to non-refundable credits (the lowest tax rate). */
    creditRate: Cited
    bpaMax: Cited
    bpaMin: Cited
    ageAmount: Cited
    ageThreshold: Cited
    ageReduction: Cited
    ageMinAge: Cited
    pensionAmountMax: Cited
    pensionMinAge: Cited
    employmentAmount: Cited
    quebecAbatement: Cited
    capitalGainsInclusion: Cited
    splitMaxShare: Cited
  }

  /** Québec personal income tax — Revenu Québec / Finances Québec. */
  quebec: {
    brackets: Cited<Bracket[]>
    creditRate: Cited
    bpa: Cited
    ageAmount: Cited
    livingAloneAmount: Cited
    retirementIncomeAmount: Cited
    /** Family net income above which the age / living-alone / retirement-income amounts are reduced. */
    reductionThreshold: Cited
    reductionRate: Cited
    /** The retirement-income amount is the lesser of its maximum and this multiple of eligible income. */
    retirementIncomeMultiple: Cited
    ageMinAge: Cited
    splitMinAge: Cited
    splitMaxShare: Cited
    /** The worker deduction (line 201) is this share of work income, up to `workerDeductionMax`. */
    workerDeductionRate: Cited
    workerDeductionMax: Cited
  }

  /** Employee premiums on employment income: Employment Insurance (the Québec rate) and the QPIP. */
  payroll: {
    /** The EI employee premium rate for a Québec worker (lower than elsewhere, because the QPIP pays parental benefits). */
    eiRate: Cited
    eiMaxInsurable: Cited
    /** The QPIP employee premium rate. */
    qpipRate: Cited
    qpipMaxInsurable: Cited
  }

  /** Registered accounts — Canada Revenue Agency. */
  accounts: {
    rrspLimit: Cited
    rrspRate: Cited
    tfsaLimit: Cited
    tfsaCumulativeSince2009: Cited
    /** RRIF prescribed minimum factors, by age at 1 January, for 71 and over. */
    rrifFactors: Cited<Record<number, number>>
    /** Below 71 the factor is 1 ÷ (this − age). */
    rrifDivisor: Cited
    rrifConversionAge: Cited
    /** A defined-benefit plan's pension adjustment is (this × the benefit earned in the year) − the offset, never below zero. */
    pensionAdjustmentFactor: Cited
    pensionAdjustmentOffset: Cited
    /** Québec LIF (FRV): under `lifFreeAge` a locked-in part pays at most this × its 1 January balance in the year. */
    lifPrescribedRate: Cited
    /** From this age (attained in the year) a Québec LIF has no maximum (since 1 January 2025). */
    lifFreeAge: Cited
    /** From this age a locked-in balance of at most `lifUnlockShareOfMga` × MGA may be refunded: it stops being locked. */
    lifUnlockAge: Cited
    lifUnlockShareOfMga: Cited
  }
}
