import { describe, expect, it } from 'vitest'
import { knownYear } from './index.ts'
import { RRQ_CONTRIBUTION_RATE_HISTORY, RRQ_EXEMPTION_HISTORY, RRQ_INDEXATION_HISTORY, RRQ_MGA_HISTORY } from './rrqHistory.ts'

// The history tables, held to the page they were copied from by a figure the page prints BESIDE them: Retraite Québec's « Pensionable
// earnings and contributions » gives, for every year, the exemption, the MPE, the employee's rate AND the employee's maximum contribution.
// The last is the product of the other three — so a slip in any one of them (a rate typed 5,25 for 5,325, an exemption a year off) shows
// as a maximum the page does not print. The maxima below are copied from the same rows, as printed.

const MAX_EMPLOYEE: Record<number, number> = {
  1966: 79.2, 1967: 79.2, 1968: 81, 1969: 82.8, 1970: 84.6, 1971: 86.4, 1972: 88.2, 1973: 93.6, 1974: 106.2, 1975: 120.6, 1976: 135, 1977: 151.2, 1978: 169.2,
  1979: 190.8, 1980: 212.4, 1981: 239.4, 1982: 268.2, 1983: 300.6, 1984: 338.4, 1985: 379.8, 1986: 419.4, 1987: 444.6, 1988: 478, 1989: 525, 1990: 574.2,
  1991: 632.5, 1992: 696, 1993: 752.5, 1994: 806, 1995: 850.5, 1996: 893.2, 1997: 969, 1998: 1068.8, 1999: 1186.5, 2000: 1329.9, 2001: 1496.4, 2002: 1673.2,
  2003: 1801.8, 2004: 1831.5, 2005: 1861.2, 2006: 1910.7, 2007: 1989.9, 2008: 2049.3, 2009: 2118.6, 2010: 2163.15, 2011: 2217.6, 2012: 2341.65, 2013: 2427.6,
  2014: 2535.75, 2015: 2630.25, 2016: 2737.05, 2017: 2797.2, 2018: 2829.6, 2019: 2991.45, 2020: 3146.4, 2021: 3427.9, 2022: 3776.1, 2023: 4038.4, 2024: 4160,
  2025: 4339.2, 2026: 4479.3,
}

describe('the exemption and contribution-rate history', () => {
  const years = Object.keys(MAX_EMPLOYEE).map(Number)

  it('covers every year of the plan, 1966 to 2026, like the ceilings table', () => {
    expect(Object.keys(RRQ_EXEMPTION_HISTORY.value).map(Number)).toEqual(years)
    expect(Object.keys(RRQ_CONTRIBUTION_RATE_HISTORY.value).map(Number)).toEqual(years)
    expect(Object.keys(RRQ_MGA_HISTORY.value).map(Number)).toEqual(years)
  })

  it('rate × (MPE − exemption) is the maximum the page prints, to the cent, every year', () => {
    const off = years.filter((y) => Math.abs(RRQ_CONTRIBUTION_RATE_HISTORY.value[y] * (RRQ_MGA_HISTORY.value[y] - RRQ_EXEMPTION_HISTORY.value[y]) - MAX_EMPLOYEE[y]) > 0.005)
    expect(off).toEqual([])
  })

  it('ends where the 2026 parameters begin: the same exemption, and the base + first additional rate', () => {
    const p = knownYear(2026).rrq
    expect(RRQ_EXEMPTION_HISTORY.value[2026]).toBe(p.exemption)
    expect(RRQ_CONTRIBUTION_RATE_HISTORY.value[2026]).toBeCloseTo(p.rateBase + p.rateFirst, 10)
  })
})

describe('the January indexation history', () => {
  it('runs from 2001 to 2025 with no gap, the 2026 rate being the year’s own parameter', () => {
    const years = Object.keys(RRQ_INDEXATION_HISTORY.value).map(Number)
    expect(years[0]).toBe(2001)
    expect(years[years.length - 1]).toBe(2025)
    expect(years.length).toBe(25)
    expect(knownYear(2026).rrq.indexation).toBe(0.02)
  })

  it('holds the years the pages print (the 2023 jump, the 2024 block, the 2012 block without its year)', () => {
    const v = RRQ_INDEXATION_HISTORY.value
    expect(v[2023]).toBe(0.065)
    expect(v[2024]).toBe(0.044)
    expect(v[2025]).toBe(0.026)
    expect(v[2012]).toBe(0.028)
    expect(v[2010]).toBe(0.004)
    // Five Januaries, 2022 to 2026 (2,7 · 6,5 · 4,4 · 2,6 · 2,0 %): a 2021 pension was raised 19,5 %, not the 1,021⁵ = 11,0 % an assumed inflation gives.
    expect([2022, 2023, 2024, 2025].reduce((f, y) => f * (1 + v[y]), 1) * 1.02).toBeCloseTo(1.195, 4)
  })
})
