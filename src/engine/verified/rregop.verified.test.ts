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
import { dbStart, dbYear, indexationRate, pensionAdjustment, unreducedAge, type DbInput } from '../dbPension.ts'
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

  it('the earliest start is 55, whatever the person asks for', () => {
    const s = dbStart(rregopPension({ serviceYearsToDate: 20, startAge: 50 }), input(60_000, MGA_BIG, 50))
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
    expect(dbYear(s, 2022, 0.02)).toBeCloseTo(32_000 * 1.01, 2)
    expect(dbYear(s, 2026, 0.02)).toBeCloseTo(32_000 * 1.01 ** 5 - 11_200 * 1.01, 2)
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
