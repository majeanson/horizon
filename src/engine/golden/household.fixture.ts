import { ASSUMPTION_PRESETS } from '../assumptionPresets.ts'
import { RRQ_MGA_HISTORY } from '../params/rrqHistory.ts'
import { rregopPension } from '../presets.ts'
import type { Assumptions, Household, Person } from '../types.ts'

// THE golden household: a Québec couple, built once and used by the golden snapshot, the e2e seed and the
// DevKit « Exemple ». Their numbers are invented, round and plausible — nothing here is anyone's real data.
//
//   · Self, born March 1978 (48): a public-sector employee in RREGOP, 85 000 $, 12 years of service so far.
//   · Spouse, born September 1981 (45): a private-sector employee, 65 000 $, no employer pension.
//   · Two children (born 2012 and 2015) are in the profile but change nothing: no cost is stated for them and no child benefit is counted (`kidsEffects` is null).
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

export function history(birthYear: number, startPay: number, lastYear = 2025, firstYear = birthYear + 21): Record<number, number> {
  const out: Record<number, number> = {}
  let pay = startPay
  for (let y = firstYear; y <= lastYear; y++) {
    out[y] = Math.round(Math.min(pay, YAMPE_BY_YEAR[y] ?? MGA_BY_YEAR[y] ?? RRQ_MGA_HISTORY.value[y] ?? 37_000))
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
  spending: { workingToday: 88_000, retiredToday: 90_000 },
}

export const GOLDEN_ASSUMPTIONS: Assumptions = {
  today: GOLDEN_TODAY,
  // EXACTLY the Neutre preset (assumptionPresets.ts): the example a person opens must read « Neutre », not « personnalisé »,
  // so the headline, the scenario table and the bridge matrix all speak about one set of assumptions.
  ...ASSUMPTION_PRESETS.neutral,
  withdrawalOrder: ['nonReg', 'rrsp', 'tfsa'],
  pensionSplitting: true,
  // The product's default (lib/schema.ts): after the first death the survivor keeps 70 % of the household's spending.
  survivorSpending: 0.7,
}
