import type { Cited } from './cited.ts'

// WHAT A TYPICAL HOUSEHOLD HAS: the figures behind « I do not know my numbers ». Statistics Canada measures what Canadian
// households hold and spend; a person who cannot read their own balance can start from the household like theirs — the same
// age, the same kind of household — and say so (the figure stays « estimated » until they read it off a document).
//
// Every cell below is a cell of an official table, read on 2026-10-09 from the table's own CSV download (the « Download entire
// table » link on each page), reference year 2023, constant 2023 dollars. They are OBSERVATIONS, never projected (index: 'none').
// What is done with them — a level (modest · average · comfortable) read off the net-worth fifths and applied to the age's
// figure — is arithmetic in lib/levels.ts, said as such to the reader, and never presented as a government figure.

/** The age groups table 11-10-0016-01 prints (the age of the major income recipient). */
export type AgeBand = 'under35' | '35to44' | '45to54' | '55to64' | '65plus'

/** What is held, among the households that hold it. */
export interface Holdings {
  /** RRSPs, RRIFs, LIRAs and other registered plans: the median balance among households that have one. */
  rrsp: number
  /** The TFSA: the median balance among households that have one. */
  tfsa: number
  /** Deposits in financial institutions (chequing, savings, term deposits): the median among households that have any. */
  deposits: number
  /** The principal residence: the median value among owners. */
  home: number
}

export const TYPICAL_BY_AGE: Cited<Record<AgeBand, Holdings>> = {
  value: {
    under35: { rrsp: 15_000, tfsa: 10_000, deposits: 6_000, home: 460_000 },
    '35to44': { rrsp: 33_000, tfsa: 12_000, deposits: 6_800, home: 550_000 },
    '45to54': { rrsp: 72_600, tfsa: 15_000, deposits: 6_000, home: 550_000 },
    '55to64': { rrsp: 120_000, tfsa: 39_100, deposits: 9_000, home: 550_000 },
    '65plus': { rrsp: 102_200, tfsa: 52_100, deposits: 13_000, home: 500_000 },
  },
  source: {
    url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110001601',
    title: 'Assets and debts held by economic family type, by age group, Canada, provinces and selected census metropolitan areas, Survey of Financial Security',
    retrieved: '2026-10-09',
    note: 'Table 11-10-0016-01, 2023, Canada, « Economic families and persons not in an economic family », statistic « Median value for those holding asset or debt »: « Registered Retirement Savings Plans (RRSPs), Registered Retirement Income Funds (RRIFs), Locked-in Retirement Accounts (LIRAs) and other », « Tax Free Saving Accounts (TFSA) », « Deposits in financial institutions », « Principal residence »; one column per age group (Under 35 · 35 to 44 · 45 to 54 · 55 to 64 · 65 and older). Constant 2023 dollars.',
  },
  index: 'none',
}

/** The net-worth fifths of table 11-10-0049-01: all households, the second fifth, the middle one, the fourth. */
export type Wealth = 'all' | 'second' | 'middle' | 'fourth'

export const TYPICAL_BY_WEALTH: Cited<Record<Wealth, Holdings>> = {
  value: {
    all: { rrsp: 60_000, tfsa: 24_000, deposits: 8_400, home: 500_000 },
    second: { rrsp: 16_100, tfsa: 10_000, deposits: 5_000, home: 250_000 },
    middle: { rrsp: 40_000, tfsa: 15_000, deposits: 8_000, home: 400_000 },
    fourth: { rrsp: 105_100, tfsa: 33_000, deposits: 13_000, home: 600_000 },
  },
  source: {
    url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110004901',
    title: 'Assets and debts by net worth quintile, Canada, provinces and selected census metropolitan areas, Survey of Financial Security',
    retrieved: '2026-10-09',
    note: 'Table 11-10-0049-01, 2023, Canada, statistic « Median value for those holding asset or debt », the same four assets as table 11-10-0016-01; columns « Total, all net worth quintiles », « Second net worth quintile », « Middle net worth quintile », « Fourth net worth quintile ». Constant 2023 dollars.',
  },
  index: 'none',
}

/** Household spending: what a household spends in a year on current consumption (food, shelter, transport…), before income tax and savings. */
export const TYPICAL_SPENDING_BY_HOUSEHOLD: Cited<{ alone: number; couple: number; coupleWithChildren: number; loneParent: number }> = {
  value: { alone: 44_074, couple: 75_976, coupleWithChildren: 109_142, loneParent: 72_930 },
  source: {
    url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110022401',
    title: 'Household spending by household type',
    retrieved: '2026-10-09',
    note: 'Table 11-10-0224-01, 2023, Canada, « Average expenditure per household », « Total current consumption »: « One person households », « Couples without children », « Couples with children », « Lone-parent households with no additional persons ». Dollars a year.',
  },
  index: 'none',
}

/** The same spending by the household's before-tax income fifth: all households, then the second, middle and fourth fifths. */
export const TYPICAL_SPENDING_BY_INCOME: Cited<Record<Wealth, number>> = {
  value: { all: 76_146, second: 57_503, middle: 71_570, fourth: 88_993 },
  source: {
    url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110022301',
    title: 'Household spending by household income quintile, Canada, regions and provinces',
    retrieved: '2026-10-09',
    note: 'Table 11-10-0223-01, 2023, Canada, « Average expenditure per household », « Total current consumption »: « All quintiles », « Second quintile », « Third quintile », « Fourth quintile ». Dollars a year.',
  },
  index: 'none',
}

/** The same spending by the age of the household's reference person: the last years of work against retirement. */
export const TYPICAL_SPENDING_BY_AGE: Cited<{ age55to64: number; age65plus: number }> = {
  value: { age55to64: 76_902, age65plus: 52_446 },
  source: {
    url: 'https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1110022701',
    title: 'Household spending by age of reference person',
    retrieved: '2026-10-09',
    note: 'Table 11-10-0227-01, 2023, Canada, « Average expenditure per household », « Total current consumption »: « 55 to 64 years » and « 65 years and over ». Dollars a year.',
  },
  index: 'none',
}
