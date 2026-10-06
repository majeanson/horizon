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
