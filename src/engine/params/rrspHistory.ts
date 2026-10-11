import type { Cited } from './cited.ts'

// The RRSP's annual dollar limit, year by year since the room rules began (1991). A person's unused RRSP room is what the room earned each year added up
// — the lesser of 18 % of the PREVIOUS year's earned income and that year's dollar limit — less what has gone into the account: to ESTIMATE it without the
// CRA notice of assessment in hand the app needs every year's limit, not just this year's. These are observations (what the limit WAS), so they are never projected.
//
// Transcribed from the page's table on 2026-10-11 (1990 is listed as « old limits » and has no figure; the page also lists 2027, $35,390, which is not used: the
// estimate stops at the year it is made). An independent check beyond the literal test: 2026's figure is the one `accounts.rrspLimit` already cites.

export const RRSP_LIMIT_HISTORY: Cited<Record<number, number>> = {
  value: {
    1991: 11_500,
    1992: 12_500,
    1993: 12_500,
    1994: 13_500,
    1995: 14_500,
    1996: 13_500,
    1997: 13_500,
    1998: 13_500,
    1999: 13_500,
    2000: 13_500,
    2001: 13_500,
    2002: 13_500,
    2003: 14_500,
    2004: 15_500,
    2005: 16_500,
    2006: 18_000,
    2007: 19_000,
    2008: 20_000,
    2009: 21_000,
    2010: 22_000,
    2011: 22_450,
    2012: 22_970,
    2013: 23_820,
    2014: 24_270,
    2015: 24_930,
    2016: 25_370,
    2017: 26_010,
    2018: 26_230,
    2019: 26_500,
    2020: 27_230,
    2021: 27_830,
    2022: 29_210,
    2023: 30_780,
    2024: 31_560,
    2025: 32_490,
    2026: 33_810,
  },
  source: {
    url: 'https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html',
    title: 'MP, DB, RRSP, DPSP, ALDA, TFSA limits, YMPE and the YAMPE',
    retrieved: '2026-10-11',
    note: 'The annual RRSP dollar limit by year, 1991–2026 (the page’s table; its 1990 row reads « old limits »).',
  },
  index: 'none',
}
