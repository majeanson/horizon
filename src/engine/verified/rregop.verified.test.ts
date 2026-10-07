// VERIFIED-AGAINST
// source:    https://www.retraitequebec.gouv.qc.ca/en/publications/public-sector-pension-plans/rregop
// title:     RREGOP
// retrieved: 2026-10-06
// tolerance: exact to the cent (the official examples are whole-dollar arithmetic)
//
// Further sources, all read on 2026-10-06:
//   · https://www.retraitequebec.gouv.qc.ca/en/your-first-paycheck-retirement/quebec-public-service-education-health-social-services-sectors/when-can-you-receive-your-pension-rregop-how-much-will-you-receive
//     — « When can you receive your pension under RREGOP and how much will you receive? »: the Johanne example.
//   · https://www.legisquebec.gouv.qc.ca/en/pdf/cs/R-10.pdf — the Act (R-10), ss. 33, 34.2, 38, 39, 77.
import { describe, expect, it } from 'vitest'
import { daysPaidFromMonth, dbStart, dbYear, firstIndexationShare, indexationIncrease, indexationRate, pensionAdjustment, unreducedAge, type DbInput } from '../dbPension.ts'
import { knownYear } from '../params/index.ts'
import { rregopPension } from '../presets.ts'

// A member born in June 1960 who leaves on their 61st birthday with a flat salary, so every « average » is the salary itself.
const BIRTH = { year: 1960, month: 6 }
const input = (salary: number, mga: number, leavingAge = 61): DbInput => ({
  birth: BIRTH,
  leaving: { year: 1960 + leavingAge, month: 6 },
  today: { year: 1960 + leavingAge, month: 6 },
  salaryAt: () => salary,
  mgaAt: () => mga,
})
const MGA_BIG = 1_000_000 // far above any salary here: the coordination reads the salary

describe('RREGOP — basic pension (« Le calcul de la rente »)', () => {
  it('Jeanne, 61, 25 years, 72 000 $: 25 × 2 % × 72 000 = 36 000 $ a year, 3 000 $ a month', () => {
    const s = dbStart(rregopPension({ serviceYearsToDate: 25, startAge: 61 }), input(72_000, MGA_BIG))
    expect(s.formulaAnnual).toBe(36_000)
    expect(s.earlyReduction).toBe(0)
    expect(s.annualBeforeCoordination / 12).toBe(3_000)
  })

  it('Jacques, 59, 25 years, 72 000 $: unreduced at 61 → 24 months × 0.5 % = 12 % → 31 680 $ a year, 2 640 $ a month', () => {
    const s = dbStart(rregopPension({ serviceYearsToDate: 25, startAge: 59 }), input(72_000, MGA_BIG, 59))
    expect(s.unreducedAge).toBe(61)
    expect(s.earlyReduction).toBeCloseTo(0.12, 10)
    expect(s.annualBeforeCoordination).toBe(31_680)
    expect(s.annualBeforeCoordination / 12).toBe(2_640)
  })

  it('service beyond 40 years does not raise the pension (statute s. 34.2)', () => {
    const at40 = dbStart(rregopPension({ serviceYearsToDate: 40, startAge: 61 }), input(60_000, MGA_BIG))
    const at45 = dbStart(rregopPension({ serviceYearsToDate: 45, startAge: 61 }), input(60_000, MGA_BIG))
    expect(at45.formulaAnnual).toBe(at40.formulaAnnual)
    expect(at40.formulaAnnual).toBe(48_000)
  })
})

describe('RREGOP — coordination with the RRQ (« coordination avec le RRQ »)', () => {
  it('Lise, 25 years, average salary 30 000 $ below the average MGA 37 000 $: 25 × 0.7 % × 30 000 = 5 250 $ a year, 438 $ a month (rounded)', () => {
    const s = dbStart(rregopPension({ serviceYearsToDate: 25, startAge: 61 }), input(30_000, 37_000))
    expect(s.coordinationAnnual).toBe(5_250)
    expect(Math.round(s.coordinationAnnual / 12)).toBe(438)
  })

  it('the LESSER of the salary and the MGA is used: a salary above the MGA coordinates on the MGA (RRPE example, 25 × 0.7 % × 52 000 = 9 100 $)', () => {
    const s = dbStart(rregopPension({ serviceYearsToDate: 25, startAge: 60 }), input(75_000, 52_000, 60))
    expect(s.coordinationAnnual).toBe(9_100)
  })

  it('Johanne: 32 years, 50 000 $, retires at 61 → 32 000 $ a year (2 667 $ a month) until 65, then 11 200 $ less = 20 800 $ a year', () => {
    const p = rregopPension({ serviceYearsToDate: 32, startAge: 61 })
    const s = dbStart(p, input(50_000, MGA_BIG))
    expect(s.annualBeforeCoordination).toBe(32_000)
    expect(Math.round(s.annualBeforeCoordination / 12)).toBe(2_667)
    expect(s.coordinationAnnual).toBe(11_200)
    // Year-by-year, no inflation: the 61st birthday is June 2021 (first payment July), the 65th June 2025 (coordination from July).
    expect(dbYear(s, 2020, 0)).toBe(0)
    expect(dbYear(s, 2021, 0)).toBe(16_000) // 6 months
    expect(dbYear(s, 2022, 0)).toBe(32_000)
    expect(dbYear(s, 2024, 0)).toBe(32_000)
    expect(dbYear(s, 2025, 0)).toBe(32_000 - 11_200 / 2) // 6 months at each rate
    expect(dbYear(s, 2026, 0)).toBe(20_800)
    expect(dbYear(s, 2050, 0)).toBe(20_800)
  })

  it('Johanne at 38 years of service: the coordination is capped at 35 years (statute s. 39(2))', () => {
    const s = dbStart(rregopPension({ serviceYearsToDate: 38, startAge: 61 }), input(50_000, MGA_BIG))
    expect(s.formulaAnnual).toBe(38_000)
    expect(s.coordinationAnnual).toBe(12_250) // 35 × 0.7 % × 50 000
  })

  it('the coordination starts at 65 whatever the start age: a member who starts at 60 is coordinated from 65 too', () => {
    const s = dbStart(rregopPension({ serviceYearsToDate: 25, startAge: 60 }), input(30_000, 37_000, 60))
    expect(dbYear(s, 2024, 0)).toBe(s.annualBeforeCoordination) // 64: whole year in full
    expect(dbYear(s, 2026, 0)).toBe(s.annualBeforeCoordination - 5_250) // 66
  })
})

describe('RREGOP — when the pension is paid in full (statute s. 33)', () => {
  const p = (service: number) => rregopPension({ serviceYearsToDate: service, startAge: 61 })

  it('three routes: 61; 35 years at any age; 60 with age + service ≥ 90', () => {
    expect(unreducedAge(p(20), 20)).toBe(61)
    expect(unreducedAge(p(35), 35)).toBe(55) // 35 years: from the earliest age
    expect(unreducedAge(p(30), 30)).toBe(60) // 60 + 30 = 90
    expect(unreducedAge(p(32), 32)).toBe(60) // the factor is met at 60 (age 58 would be below the minimum age 60)
    expect(unreducedAge(p(25), 25)).toBe(61) // 90 − 25 = 65 > 61, so 61 wins
  })

  it('a member with 35 years who starts at 55 pays no reduction', () => {
    const s = dbStart(rregopPension({ serviceYearsToDate: 35, startAge: 55 }), input(60_000, MGA_BIG, 55))
    expect(s.earlyReduction).toBe(0)
  })

  it('starting at 55 with 20 years: 6 years early × 6 % = 36 %', () => {
    const s = dbStart(rregopPension({ serviceYearsToDate: 20, startAge: 55 }), input(60_000, MGA_BIG, 55))
    expect(s.earlyReduction).toBeCloseTo(0.36, 10)
  })

  it('the earliest start is 55, whatever the person asks for (a plan WITHOUT a deferred rule: reduced to the unreduced age, 61)', () => {
    const { deferred: _deferred, ...noDeferredRule } = rregopPension({ serviceYearsToDate: 20, startAge: 50 })
    const s = dbStart(noDeferredRule, input(60_000, MGA_BIG, 50))
    expect(s.earlyReduction).toBeCloseTo(0.36, 10)
  })
})

describe('RREGOP — indexation of the pension in pay (statute s. 77; « L\'indexation »)', () => {
  const ix = rregopPension({ serviceYearsToDate: 1, startAge: 61 }).indexation

  it('the greater of 50 % of the rate and the rate minus 3 %: 2 % → 1 % (the official 2026 example, post-1999 service)', () => {
    expect(indexationRate(0.02, ix)).toBeCloseTo(0.01, 12)
  })

  it('above 6 % the « rate − 3 % » arm wins; at or below 3 % the plan is never fully indexed', () => {
    expect(indexationRate(0.08, ix)).toBeCloseTo(0.05, 12)
    expect(indexationRate(0.03, ix)).toBeCloseTo(0.015, 12)
    expect(indexationRate(0, ix)).toBe(0)
  })

  it('the pension grows from the year after it starts, the coordination amount from the year after it applies', () => {
    const s = dbStart(rregopPension({ serviceYearsToDate: 32, startAge: 61 }), input(50_000, MGA_BIG))
    // Born June 1960, so the pension starts July 2021: 184 of the 365 days of 2021, hence 184/365 of the first (January 2022) indexation.
    const first = 1 + 0.01 * (184 / 365)
    expect(dbYear(s, 2022, 0.02)).toBeCloseTo(32_000 * first, 2)
    expect(dbYear(s, 2026, 0.02)).toBeCloseTo(32_000 * first * 1.01 ** 4 - 11_200 * 1.01, 2)
  })
})

describe('pension adjustment — CRA, Pension Adjustment Guide (T4084)', () => {
  const R = knownYear(2026).accounts
  const p = rregopPension({ serviceYearsToDate: 10, startAge: 61 })

  it('(9 × the benefit earned) − 600: 2 % of 80 000 = 1 600 → 9 × 1 600 − 600 = 13 800', () => {
    expect(pensionAdjustment([p], 80_000, true, R)).toBe(13_800)
  })

  it('never below zero, and nothing once the member is no longer accruing', () => {
    expect(pensionAdjustment([p], 10_000, true, R)).toBe(1_200) // 9 × 200 − 600
    expect(pensionAdjustment([p], 2_000, true, R)).toBe(0) // 9 × 40 − 600 < 0
    expect(pensionAdjustment([p], 80_000, false, R)).toBe(0)
  })
})

// The page's own worked example, « L'indexation (réajustement) de la rente »: Réjean, 25 200 $ a year, TAIR 2,0 %.
describe('RREGOP — the FIRST indexation is pro-rated by the days the pension was paid (Réjean)', () => {
  // The three service tiers of the page, each as the plan's own formula: full TAIR · TAIR − 3 % · the better of 50 % of TAIR and TAIR − 3 %.
  const TIERS = [
    { annual: 360, ix: { share: 1, minus: 0 }, expected: [7.2, 4.73] },
    { annual: 12_600, ix: { share: 0, minus: 0.03 }, expected: [0, 0] },
    { annual: 12_240, ix: { share: 0.5, minus: 0.03 }, expected: [122.4, 80.48] },
  ]
  const TAIR = 0.02

  it('retiring on 1 January 2025 the whole year is paid: +129,60 $ → 25 329,60 $', () => {
    const increases = TIERS.map((t) => indexationIncrease(t.annual, indexationRate(TAIR, t.ix), firstIndexationShare(365, 365)))
    expect(increases).toEqual(TIERS.map((t) => t.expected[0]))
    expect(Math.round(increases.reduce((a, b) => a + b, 0) * 100) / 100).toBe(129.6)
  })

  it('retiring on 5 May 2025 the pension is paid 240 days: +4,73 $ + 0 + 80,48 $ = +85,21 $ → 25 285,21 $', () => {
    const increases = TIERS.map((t) => indexationIncrease(t.annual, indexationRate(TAIR, t.ix), firstIndexationShare(240, 365)))
    expect(increases).toEqual(TIERS.map((t) => t.expected[1]))
    expect(Math.round(increases.reduce((a, b) => a + b, 0) * 100) / 100).toBe(85.21)
  })

  it('the engine counts the days from the 1st of the month the pension starts (months are its smallest step), 366 in a leap year', () => {
    expect(daysPaidFromMonth(2025, 0)).toEqual({ paid: 365, inYear: 365 }) // January: the whole year
    expect(daysPaidFromMonth(2025, 4)).toEqual({ paid: 245, inYear: 365 }) // 1 May: 245 days (the page's 240 starts on 6 May)
    expect(daysPaidFromMonth(2024, 2)).toEqual({ paid: 306, inYear: 366 }) // 1 March of a leap year
    expect(daysPaidFromMonth(2025, 11)).toEqual({ paid: 31, inYear: 365 })
  })

  it('a pension that starts in January is indexed in full the next January; one that starts in July only for the half-year it was paid', () => {
    const jan = dbStart(rregopPension({ serviceYearsToDate: 32, startAge: 60 }), { ...input(50_000, MGA_BIG, 60), birth: { year: 1960, month: 12 }, leaving: { year: 2020, month: 12 }, today: { year: 2020, month: 12 } })
    expect(jan.firstYearShare).toBe(1) // starts January 2021
    const jul = dbStart(rregopPension({ serviceYearsToDate: 32, startAge: 61 }), input(50_000, MGA_BIG)) // starts July 2021
    expect(jul.firstYearShare).toBeCloseTo(184 / 365, 12)
  })
})

describe('RREGOP — a DEFERRED pension (« La fin d’emploi avant l’admissibilité à une rente »)', () => {
  // A member born June 1992 who leaves at 40 with 15 years of service and takes the pension at the age asked.
  const born = { year: 1992, month: 6 }
  const leaveAt40: DbInput = { birth: born, leaving: { year: 2032, month: 6 }, today: { year: 2032, month: 6 }, salaryAt: () => 75_000, mgaAt: () => MGA_BIG }

  it('payable at 65 it is paid in full: no reduction, and the coordination starts at 65', () => {
    const s = dbStart(rregopPension({ serviceYearsToDate: 15, startAge: 65 }), leaveAt40)
    expect(s.earlyReduction).toBe(0)
    expect(s.formulaAnnual).toBe(22_500) // 15 × 2 % × 75 000
    expect(s.annualBeforeCoordination).toBe(22_500)
    expect(s.coordinationIndex).toBe(s.startIndex)
  })

  it('taken at 60 it is cut 0,5 % a month back to the 65th birthday: 60 months → 30 %', () => {
    const s = dbStart(rregopPension({ serviceYearsToDate: 15, startAge: 60 }), leaveAt40)
    expect(s.earlyReduction).toBeCloseTo(0.3, 10)
    expect(s.annualBeforeCoordination).toBeCloseTo(15_750, 2)
  })

  it('the coordination applies from the first payment, cut by the same 30 %: 15 × 0,7 % × 75 000 = 7 875 → 5 512,50', () => {
    const s = dbStart(rregopPension({ serviceYearsToDate: 15, startAge: 60 }), leaveAt40)
    expect(s.coordinationAnnual).toBeCloseTo(5_512.5, 2)
    expect(s.coordinationIndex).toBe(s.startIndex)
  })

  it('until it starts it is indexed in FULL from the January after leaving to the January of its start year', () => {
    const s = dbStart(rregopPension({ serviceYearsToDate: 15, startAge: 60 }), leaveAt40)
    // Leaves 2032, starts July 2052: twenty full indexations (2033 … 2052) of 2 %. The year it starts pays the amount indexed to that January.
    const startYear = Math.floor(s.startIndex / 12)
    expect(startYear).toBe(2052)
    const paid = dbYear(s, 2052, 0.02)
    const monthly = (s.annualBeforeCoordination * 1.02 ** 20 - s.coordinationAnnual * 1.02 ** 20) / 12
    expect(paid).toBeCloseTo(monthly * 6, 0) // July to December
  })

  it('a member who leaves at 55 or later, or with 35 years, is NOT deferred: the active reduction to the unreduced age applies', () => {
    const leaveAt58: DbInput = { ...leaveAt40, leaving: { year: 2050, month: 6 }, today: { year: 2050, month: 6 } }
    expect(dbStart(rregopPension({ serviceYearsToDate: 20, startAge: 58 }), leaveAt58).earlyReduction).toBeCloseTo(0.18, 10) // (61 − 58) × 6 %
    expect(dbStart(rregopPension({ serviceYearsToDate: 36, startAge: 55 }), leaveAt40).deferredFromYear).toBeNull()
  })
})
