import { ASSUMPTION_PRESETS } from '../assumptionPresets.ts'
import type { Assumptions, Household, Person } from '../types.ts'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD, GOLDEN_TODAY, history } from './household.fixture.ts'

// THE EXAMPLE HOUSEHOLDS — invented, round, plausible; nothing here is anyone's real data. Seven different lives, so that
// every table and every result can be looked at, and checked by hand, for more than one kind of person:
//
//   golden    a couple, one in the public sector (RREGOP), the other private — the household the golden snapshots pin
//   average   a couple on ordinary incomes, savings in RRSP and TFSA, no employer pension
//   modest    one person on a low income, little saved: the GIS matters
//   rich      a couple on high incomes with large savings in all three accounts, retiring early
//   behind    one person, 52, who started saving late and plans to stop at 60: the plan does NOT hold
//   retired   a retired couple: a pension in pay, both pensions already started, the nest being drawn down
//   newcomer  one person who arrived in Canada at 30: a partial OAS and a QPP history that starts late
//
// `engine/golden/examples.test.ts` holds each one to what its story says (the modest one gets a GIS, the one behind runs
// out, the newcomer's OAS is the share her residence earns…) and `lib/fixtureSanity.test.ts` to what life allows.

export type ExampleId = 'golden' | 'average' | 'modest' | 'rich' | 'behind' | 'retired' | 'newcomer'
export const EXAMPLE_IDS: readonly ExampleId[] = ['golden', 'average', 'modest', 'rich', 'behind', 'retired', 'newcomer']

export interface ExampleHousehold {
  id: ExampleId
  household: Household
  /** Birth years of the children (they change nothing in the projection). */
  children: number[]
  assumptions: Assumptions
}

const none = { balance: 0, acb: 0, annualContribution: 0 }
const person = (p: Omit<Person, 'oas' | 'rrq'> & { rrqStart?: number; oasStart?: number; residentSince?: number }): Person => {
  const { rrqStart, oasStart, residentSince, ...rest } = p
  return { ...rest, rrq: { startAge: rrqStart ?? 65 }, oas: { startAge: oasStart ?? 65, residentSince: residentSince ?? p.birth.year + 18 } }
}

const average: Household = {
  livesAlone: false,
  persons: [
    person({
      id: 'self', name: 'Marie', birth: { year: 1984, month: 5 }, retirementAge: 62, salaryToday: 72_000, earningsHistory: history(1984, 32_500),
      accounts: {
        rrsp: { balance: 85_000, room: 20_000, annualContribution: 5_000 },
        tfsa: { balance: 55_000, room: 30_000, annualContribution: 6_000 },
        nonReg: { balance: 10_000, acb: 9_000, annualContribution: 0 },
      },
      pensions: [],
    }),
    person({
      id: 'spouse', name: 'Luc', birth: { year: 1982, month: 2 }, retirementAge: 63, salaryToday: 58_000, earningsHistory: history(1982, 24_500),
      accounts: {
        rrsp: { balance: 55_000, room: 15_000, annualContribution: 3_000 },
        tfsa: { balance: 40_000, room: 35_000, annualContribution: 5_000 },
        nonReg: none,
      },
      pensions: [],
    }),
  ],
  spending: { workingToday: 82_000, retiredToday: 74_000 },
}

const modest: Household = {
  livesAlone: true,
  persons: [
    person({
      id: 'self', name: 'Hélène', birth: { year: 1971, month: 11 }, retirementAge: 65, salaryToday: 40_000, earningsHistory: history(1971, 11_000),
      accounts: {
        rrsp: { balance: 22_000, room: 8_000, annualContribution: 1_000 },
        tfsa: { balance: 18_000, room: 40_000, annualContribution: 1_500 },
        nonReg: none,
      },
      pensions: [],
    }),
  ],
  spending: { workingToday: 30_000, retiredToday: 28_000 },
}

const rich: Household = {
  livesAlone: false,
  persons: [
    person({
      id: 'self', name: 'Sophie', birth: { year: 1976, month: 4 }, retirementAge: 58, salaryToday: 190_000, earningsHistory: history(1976, 60_000),
      accounts: {
        rrsp: { balance: 640_000, room: 40_000, annualContribution: 25_000 },
        tfsa: { balance: 100_000, room: 20_000, annualContribution: 7_000 },
        nonReg: { balance: 450_000, acb: 300_000, annualContribution: 20_000 },
      },
      pensions: [],
    }),
    person({
      id: 'spouse', name: 'Marc', birth: { year: 1978, month: 8 }, retirementAge: 60, salaryToday: 130_000, earningsHistory: history(1978, 42_000),
      accounts: {
        rrsp: { balance: 380_000, room: 30_000, annualContribution: 20_000 },
        tfsa: { balance: 98_000, room: 22_000, annualContribution: 7_000 },
        nonReg: { balance: 150_000, acb: 110_000, annualContribution: 10_000 },
      },
      pensions: [],
    }),
  ],
  spending: { workingToday: 150_000, retiredToday: 130_000 },
}

const behind: Household = {
  livesAlone: true,
  persons: [
    person({
      id: 'self', name: 'Julien', birth: { year: 1974, month: 6 }, retirementAge: 60, salaryToday: 62_000, earningsHistory: history(1974, 19_000),
      accounts: {
        rrsp: { balance: 35_000, room: 60_000, annualContribution: 3_000 },
        tfsa: { balance: 12_000, room: 50_000, annualContribution: 0 },
        nonReg: none,
      },
      pensions: [],
    }),
  ],
  spending: { workingToday: 46_000, retiredToday: 38_000 },
}

const retired: Household = {
  livesAlone: false,
  persons: [
    person({
      id: 'self', name: 'Gilles', birth: { year: 1958, month: 3 }, retirementAge: 62, salaryToday: 0, earningsHistory: history(1958, 10_000, 2019),
      accounts: {
        rrsp: { balance: 280_000, room: 0, annualContribution: 0 },
        tfsa: { balance: 90_000, room: 20_000, annualContribution: 0 },
        nonReg: { balance: 60_000, acb: 45_000, annualContribution: 0 },
      },
      pensions: [
        {
          label: 'Rente de l’employeur', accrualRate: 0.02, maxServiceYears: 40, serviceYearsToDate: 30, serviceRatePerYear: 1, averagingYears: 5, coordination: null,
          earliestAge: 55, unreduced: { age: 60, serviceYears: null, factor: null }, earlyReductionPerYear: 0.06, bridge: null, indexation: { share: 0.5, minus: 0.03 },
          startAge: 62, inPay: { annual: 34_000, since: { year: 2020, month: 4 } },
        },
      ],
    }),
    person({
      id: 'spouse', name: 'Francine', birth: { year: 1960, month: 9 }, retirementAge: 63, salaryToday: 0, earningsHistory: history(1960, 9_000, 2023),
      accounts: { rrsp: { balance: 120_000, room: 0, annualContribution: 0 }, tfsa: { balance: 70_000, room: 15_000, annualContribution: 0 }, nonReg: none },
      pensions: [],
    }),
  ],
  spending: { workingToday: 82_000, retiredToday: 82_000 },
}

const newcomer: Household = {
  livesAlone: true,
  persons: [
    person({
      id: 'self', name: 'Amira', birth: { year: 1976, month: 2 }, retirementAge: 65, salaryToday: 58_000, earningsHistory: history(1976, 27_500, 2025, 2006), residentSince: 2006,
      accounts: {
        rrsp: { balance: 110_000, room: 25_000, annualContribution: 3_000 },
        tfsa: { balance: 50_000, room: 40_000, annualContribution: 3_000 },
        nonReg: none,
      },
      pensions: [],
    }),
  ],
  spending: { workingToday: 38_000, retiredToday: 36_000 },
}

const base = (): Assumptions => ({ ...GOLDEN_ASSUMPTIONS, today: GOLDEN_TODAY, ...ASSUMPTION_PRESETS.neutral })

export const EXAMPLES: Readonly<Record<ExampleId, ExampleHousehold>> = {
  golden: { id: 'golden', household: GOLDEN_HOUSEHOLD, children: [2012, 2015], assumptions: GOLDEN_ASSUMPTIONS },
  average: { id: 'average', household: average, children: [2014], assumptions: base() },
  modest: { id: 'modest', household: modest, children: [], assumptions: base() },
  rich: { id: 'rich', household: rich, children: [2008, 2011], assumptions: base() },
  behind: { id: 'behind', household: behind, children: [], assumptions: base() },
  retired: { id: 'retired', household: retired, children: [], assumptions: base() },
  newcomer: { id: 'newcomer', household: newcomer, children: [], assumptions: base() },
}
