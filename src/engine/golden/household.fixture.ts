import { rregopPension } from '../presets.ts'
import type { Assumptions, Household, Person } from '../types.ts'

// THE golden household: a Québec couple, built once and used by the golden snapshot, the e2e seed and the
// DevKit « Exemple ». Their numbers are invented, round and plausible — nothing here is anyone's real data.
//
//   · Self, born March 1978 (48): a public-sector employee in RREGOP, 85 000 $, 12 years of service so far.
//   · Spouse, born September 1981 (45): a private-sector employee, 65 000 $, no employer pension.
//   · Two children (born 2012 and 2015) are in the profile but change nothing in v1 (no child benefits).
//
// The earnings history is a plain ramp so the fixture does not carry 55 literals: it starts the year a person turns
// 21 and grows 4 % a year, never above that year's ceiling — the MGA, and from 2024 the additional ceiling (YAMPE),
// which is what a relevé prints for someone earning above the MGA. The two starting pays are chosen so the LAST year
// lands within a few percent of today's salary (a history that ended 25 % under the salary would be a raise nobody got).

export const GOLDEN_TODAY = { year: 2026, month: 10 } as const

const MGA_BY_YEAR: Readonly<Record<number, number>> = {
  1999: 37_400, 2000: 37_600, 2001: 38_300, 2002: 39_100, 2003: 39_900, 2004: 40_500, 2005: 41_100, 2006: 42_100,
  2007: 43_700, 2008: 44_900, 2009: 46_300, 2010: 47_200, 2011: 48_300, 2012: 50_100, 2013: 51_100, 2014: 52_500,
  2015: 53_600, 2016: 54_900, 2017: 55_300, 2018: 55_900, 2019: 57_400, 2020: 58_700, 2021: 61_600, 2022: 64_900,
  2023: 66_600, 2024: 68_500, 2025: 71_300,
}

/** The additional ceiling the relevé counts earnings up to, from 2024 (the cited params: rrqHistory.ts). */
const YAMPE_BY_YEAR: Readonly<Record<number, number>> = { 2024: 73_200, 2025: 81_200 }

function history(birthYear: number, startPay: number): Record<number, number> {
  const out: Record<number, number> = {}
  let pay = startPay
  for (let y = birthYear + 21; y <= 2025; y++) {
    out[y] = Math.round(Math.min(pay, YAMPE_BY_YEAR[y] ?? MGA_BY_YEAR[y] ?? 37_000))
    pay *= 1.04
  }
  return out
}

const self: Person = {
  id: 'self',
  name: 'Camille',
  birth: { year: 1978, month: 3 },
  retirementAge: 60,
  salaryToday: 85_000,
  earningsHistory: history(1978, 30_000),
  rrq: { startAge: 65 },
  oas: { startAge: 65, residentSince: 1996 },
  accounts: {
    rrsp: { balance: 95_000, room: 18_000, annualContribution: 6_000 },
    tfsa: { balance: 48_000, room: 24_000, annualContribution: 7_000 },
    nonReg: { balance: 15_000, acb: 12_000, annualContribution: 0 },
  },
  pensions: [rregopPension({ serviceYearsToDate: 12, startAge: 60 })],
}

const spouse: Person = {
  id: 'spouse',
  name: 'Alex',
  birth: { year: 1981, month: 9 },
  retirementAge: 62,
  salaryToday: 65_000,
  earningsHistory: history(1981, 25_000),
  rrq: { startAge: 65 },
  oas: { startAge: 65, residentSince: 1999 },
  accounts: {
    rrsp: { balance: 60_000, room: 12_000, annualContribution: 4_000 },
    tfsa: { balance: 36_000, room: 30_000, annualContribution: 6_000 },
    nonReg: { balance: 10_000, acb: 9_000, annualContribution: 0 },
  },
  pensions: [],
}

export const GOLDEN_HOUSEHOLD: Household = {
  livesAlone: false, // a couple never does; a saved profile always states it
  persons: [self, spouse],
  spending: { workingToday: 88_000, retiredToday: 100_000 },
}

export const GOLDEN_ASSUMPTIONS: Assumptions = {
  today: GOLDEN_TODAY,
  inflation: 0.02,
  wageGrowth: 0.03,
  returns: { nonReg: 0.045, rrsp: 0.05, tfsa: 0.05 },
  horizonAge: 95,
  withdrawalOrder: ['nonReg', 'rrsp', 'tfsa'],
  pensionSplitting: true,
}
