import type { Cited } from './cited.ts'

// The RRQ's historical pensionable-earnings ceilings. A retirement pension is computed from a
// person's WHOLE contributory career, and each year's earnings are re-expressed in today's dollars
// by the ratio of the average ceiling to THAT YEAR's ceiling — so the engine needs every year's
// ceiling, back to 1966, not just the current one. These are observations (what the ceiling WAS),
// so they are never projected: a year after the last one comes from the projected 2026 parameters
// (params/index.ts), not from here.
//
// Both tables are printed on Retraite Québec's « Pensionable earnings and contributions » page.
// Independent checks that the transcription is right, beyond the literal test: the five-year
// average ending in 2025 must equal the 66 580 $ Retraite Québec prints in its own calculation
// leaflet, and the official worked example (src/engine/verified/rrq.verified.test.ts) re-adjusts
// every year from 1978 to 2025 and must land on the leaflet's published totals to the dollar.

const SOURCE = {
  url: 'https://www.retraitequebec.gouv.qc.ca/en/programs/quebec-pension-plan/work-contributions/pensionable-earnings-contributions',
  title: 'Pensionable earnings and contributions',
  retrieved: '2026-10-06',
}

/** Maximum pensionable earnings (MGA — « maximum des gains admissibles »), by calendar year. */
export const RRQ_MGA_HISTORY: Cited<Record<number, number>> = {
  value: {
    1966: 5_000,
    1967: 5_000,
    1968: 5_100,
    1969: 5_200,
    1970: 5_300,
    1971: 5_400,
    1972: 5_500,
    1973: 5_900,
    1974: 6_600,
    1975: 7_400,
    1976: 8_300,
    1977: 9_300,
    1978: 10_400,
    1979: 11_700,
    1980: 13_100,
    1981: 14_700,
    1982: 16_500,
    1983: 18_500,
    1984: 20_800,
    1985: 23_400,
    1986: 25_800,
    1987: 25_900,
    1988: 26_500,
    1989: 27_700,
    1990: 28_900,
    1991: 30_500,
    1992: 32_200,
    1993: 33_400,
    1994: 34_400,
    1995: 34_900,
    1996: 35_400,
    1997: 35_800,
    1998: 36_900,
    1999: 37_400,
    2000: 37_600,
    2001: 38_300,
    2002: 39_100,
    2003: 39_900,
    2004: 40_500,
    2005: 41_100,
    2006: 42_100,
    2007: 43_700,
    2008: 44_900,
    2009: 46_300,
    2010: 47_200,
    2011: 48_300,
    2012: 50_100,
    2013: 51_100,
    2014: 52_500,
    2015: 53_600,
    2016: 54_900,
    2017: 55_300,
    2018: 55_900,
    2019: 57_400,
    2020: 58_700,
    2021: 61_600,
    2022: 64_900,
    2023: 66_600,
    2024: 68_500,
    2025: 71_300,
    2026: 74_600,
  },
  source: { ...SOURCE, note: 'Column « Maximum (MPE) », 1966 to 2026; the page shows no 2027 row. Copied as printed.' },
  index: 'none',
}

/**
 * The additional maximum (YAMPE / MGAS — the ceiling of the second additional plan), which exists
 * from 2024. "114 % of the MPE" from 2025 on, per the page.
 */
export const RRQ_YAMPE_HISTORY: Cited<Record<number, number>> = {
  value: { 2024: 73_200, 2025: 81_200, 2026: 85_000 },
  source: { ...SOURCE, note: 'Additional maximum annual pensionable earnings: 2024 73 200 $, 2025 81 200 $, 2026 85 000 $.' },
  index: 'none',
}

/**
 * The basic exemption, by calendar year: earnings at or under it carry no contribution, and a year whose earnings stay at or under it is a
 * year with no base contributions (the qualification of a deceased contributor, art. 107 of the Act, counts those years; see rrq.ts). The
 * same page, the same tables.
 */
export const RRQ_EXEMPTION_HISTORY: Cited<Record<number, number>> = {
  value: {
    1966: 600,
    1967: 600,
    1968: 600,
    1969: 600,
    1970: 600,
    1971: 600,
    1972: 600,
    1973: 700,
    1974: 700,
    1975: 700,
    1976: 800,
    1977: 900,
    1978: 1_000,
    1979: 1_100,
    1980: 1_300,
    1981: 1_400,
    1982: 1_600,
    1983: 1_800,
    1984: 2_000,
    1985: 2_300,
    1986: 2_500,
    1987: 2_500,
    1988: 2_600,
    1989: 2_700,
    1990: 2_800,
    1991: 3_000,
    1992: 3_200,
    1993: 3_300,
    1994: 3_400,
    1995: 3_400,
    1996: 3_500,
    1997: 3_500,
    1998: 3_500,
    1999: 3_500,
    2000: 3_500,
    2001: 3_500,
    2002: 3_500,
    2003: 3_500,
    2004: 3_500,
    2005: 3_500,
    2006: 3_500,
    2007: 3_500,
    2008: 3_500,
    2009: 3_500,
    2010: 3_500,
    2011: 3_500,
    2012: 3_500,
    2013: 3_500,
    2014: 3_500,
    2015: 3_500,
    2016: 3_500,
    2017: 3_500,
    2018: 3_500,
    2019: 3_500,
    2020: 3_500,
    2021: 3_500,
    2022: 3_500,
    2023: 3_500,
    2024: 3_500,
    2025: 3_500,
    2026: 3_500,
  },
  source: { ...SOURCE, note: 'Column « Minimum (Basic exemption) », 1966 to 2026, copied as printed: 600 $ from 1966, 3 500 $ every year since 1996.' },
  index: 'none',
}

/**
 * The EMPLOYEE's contribution rate, by calendar year, on earnings between the exemption and the MPE — as printed: from 2019 it is the base
 * rate AND the first additional rate together (the page's note 1), so the base rate of a year from 2019 is this less the first additional
 * rate at that year's phase-in (rrqRules.ts). An independent check of the transcription: every year's rate × (MPE − exemption) is the
 * « Maximum contributions — Employee » the page prints beside it, to the cent (rrqHistory.test.ts).
 */
export const RRQ_CONTRIBUTION_RATE_HISTORY: Cited<Record<number, number>> = {
  value: {
    1966: 0.018,
    1967: 0.018,
    1968: 0.018,
    1969: 0.018,
    1970: 0.018,
    1971: 0.018,
    1972: 0.018,
    1973: 0.018,
    1974: 0.018,
    1975: 0.018,
    1976: 0.018,
    1977: 0.018,
    1978: 0.018,
    1979: 0.018,
    1980: 0.018,
    1981: 0.018,
    1982: 0.018,
    1983: 0.018,
    1984: 0.018,
    1985: 0.018,
    1986: 0.018,
    1987: 0.019,
    1988: 0.02,
    1989: 0.021,
    1990: 0.022,
    1991: 0.023,
    1992: 0.024,
    1993: 0.025,
    1994: 0.026,
    1995: 0.027,
    1996: 0.028,
    1997: 0.03,
    1998: 0.032,
    1999: 0.035,
    2000: 0.039,
    2001: 0.043,
    2002: 0.047,
    2003: 0.0495,
    2004: 0.0495,
    2005: 0.0495,
    2006: 0.0495,
    2007: 0.0495,
    2008: 0.0495,
    2009: 0.0495,
    2010: 0.0495,
    2011: 0.0495,
    2012: 0.05025,
    2013: 0.051,
    2014: 0.05175,
    2015: 0.0525,
    2016: 0.05325,
    2017: 0.054,
    2018: 0.054,
    2019: 0.0555,
    2020: 0.057,
    2021: 0.059,
    2022: 0.0615,
    2023: 0.064,
    2024: 0.064,
    2025: 0.064,
    2026: 0.063,
  },
  source: { ...SOURCE, note: 'Column « Contribution rate — Employee », 1966 to 2026 (1,8 % until 1986, 6,3 % in 2026), stored as fractions. From 2019 the rate includes the first additional plan (note 1 of the page).' },
  index: 'none',
}

const FIGURES_ARCHIVE = {
  url: 'https://www.retraitequebec.gouv.qc.ca/en/programs/quebec-pension-plan/quebec-pension-plan-figures/quebec-pension-plan-figures-archives',
  title: 'Québec Pension Plan Figures - Archives - Retraite Québec',
  retrieved: '2026-10-19',
}

/**
 * The QPP's January indexation of the pensions in pay, by year: « Indexation rate for benefits as at 1 January ». An OBSERVATION — what the
 * pensions WERE raised by — so a pension that began before today is carried to today by these, never by the assumed inflation (a forecast
 * has no business deciding the past). The 2026 rate is the year's own parameter (`rrq.indexation`), not repeated here; a year missing from
 * both (before 2001, or after the last published January) is moved by the assumed inflation, as any future year is.
 */
export const RRQ_INDEXATION_HISTORY: Cited<Record<number, number>> = {
  value: {
    2001: 0.025,
    2002: 0.03,
    2003: 0.016,
    2004: 0.032,
    2005: 0.017,
    2006: 0.023,
    2007: 0.021,
    2008: 0.02,
    2009: 0.025,
    2010: 0.004,
    2011: 0.017,
    2012: 0.028,
    2013: 0.018,
    2014: 0.009,
    2015: 0.018,
    2016: 0.012,
    2017: 0.014,
    2018: 0.015,
    2019: 0.023,
    2020: 0.019,
    2021: 0.01,
    2022: 0.027,
    2023: 0.065,
    2024: 0.044,
    2025: 0.026,
  },
  source: {
    ...FIGURES_ARCHIVE,
    note: 'One « Basic information » block per year, 2001 to 2023: « Indexation rate for benefits as at 1 January 2023 6.50% » … « 2001 2,5 % » (the 2012 block omits the year: « as at 1 January 2,8 % »). 2024 is printed on the current figures page (/en/programs/quebec-pension-plan/quebec-pension-plan-figures), in the block « Basic information on the Québec Pension Plan in 2024 », as « … as at 1 January 2023 4.4% » — a slip of the year: the archive gives 2023 as 6.50 %, and the French archive prints the same 4,4 % in its 2024 block. 2025: the French current page (/fr/programmes/regime-rentes-quebec/regime-chiffres), « Taux d’indexation des prestations au 1er janvier 2025 2,6 % ». So 2024 and 2025 are read on those two pages, not on this one.',
  },
  index: 'none',
}
