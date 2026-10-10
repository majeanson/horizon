// VERIFIED-AGAINST
// source:    https://www.retraitequebec.gouv.qc.ca/sites/default/files/SiteCollectionDocuments/RetraiteQuebec/en/publications/nos-programmes/regime-de-rentes/retraite/1036-1f-Methode-calcul-rente-2025.pdf
// title:     Retirement pension paid as of age 65 and 1 month (leaflet 1036-1-RRQ, 2025-06) — worked example, person born November 1960, pension from December 2025
// retrieved: 2026-10-06
// tolerance: exact to the cent on each component; ±1 $ on the career totals the leaflet prints rounded to the dollar
//
// Second source, same file: https://www.retraitequebec.gouv.qc.ca/en/programs/quebec-pension-plan/quebec-pension-plan-figures
//   « Québec Pension Plan Figures » — 2026 maximum pension at 65 = $1507.65, at 60 = $964.90 ($964.90 = 64 % of the maximum),
//   at 72 = $2394.15 ($2394.15 = 158.8 % of the maximum); base-plan-only maximum at 65 = $1441.25.
import { describe, expect, it } from 'vitest'
import { RRQ_MGA_HISTORY, RRQ_YAMPE_HISTORY } from '../params/rrqHistory.ts'
import { makeRrqRules, rrqContributionRulesFor } from '../rrqRules.ts'
import { adjustmentFactor, ampe5, rrqContribution, rrqPension, rrqStart, type RrqRules } from '../rrq.ts'

// The rules as the cited params will supply them (rates: Retraite Québec « The additional plan »;
// ceilings: the history tables). Written out here, independently, so this test fails if the
// params file and the engine ever disagree about a rate.
const RULES: RrqRules = {
  mga: (y) => RRQ_MGA_HISTORY.value[y] ?? NaN,
  yampe: (y) => RRQ_YAMPE_HISTORY.value[y] ?? null,
  baseRate: 0.25,
  excludedShare: 0.15,
  exemption: 3_500, // « Basic exemption $3500 » (Retraite Québec, 2026 Benefit Amounts and Key Data)
  firstRate: 0.0833,
  secondRate: 0.3333,
  firstFrom: 2019,
  secondFrom: 2024,
  phaseIn: { 2019: 0.15, 2020: 0.3, 2021: 0.5, 2022: 0.75 },
  additionalMonths: 480,
  earlyBase: 0.005,
  earlySlope: 0.001,
  latePerMonth: 0.007,
  lateMaxMonths: 84,
  lateProtectionFrom: 2024,
  careerStartAge: 18,
  careerMaxAge: 72,
  normalAge: 65,
}

// ── The leaflet's worked example: pensionable earnings 1978–2025 exactly as printed ────────────
const EXAMPLE_EARNINGS: Record<number, number> = {
  1978: 1100, 1979: 6705, 1980: 13110, 1981: 14700, 1982: 16500, 1983: 18500, 1984: 20800, 1985: 23400,
  1986: 23466, 1987: 24113, 1988: 25232, 1989: 26101, 1990: 27332, 1991: 29954, 1992: 31250, 1993: 31782,
  1994: 32751, 1995: 34900, 1996: 33333, 1997: 35800, 1998: 33825, 1999: 34283, 2000: 37600, 2001: 38300,
  2002: 35000, 2003: 36000, 2004: 37000, 2005: 37675, 2006: 40000, 2007: 43700, 2008: 44900, 2009: 46300,
  2010: 47200, 2011: 48300, 2012: 50100, 2013: 51100, 2014: 52500, 2015: 53600, 2016: 54900, 2017: 55300,
  2018: 55900, 2019: 57400, 2020: 58700, 2021: 61600, 2022: 64900, 2023: 66600, 2024: 75000, 2025: 85000,
}
const BORN_NOV_1960 = { year: 1960, month: 11 }

describe('the leaflet\'s worked example — person born Nov 1960, pension from Dec 2025 (age 65 and 1 month)', () => {
  const p = rrqPension({ birth: BORN_NOV_1960, earnings: EXAMPLE_EARNINGS, startAge: 65 }, RULES)

  it('starts the month after the 65th birthday, and its reference period is 564 months', () => {
    expect(p.start).toEqual({ year: 2025, month: 12 })
    expect(p.referenceMonths).toBe(564) // 1 Dec 1978 – 30 Nov 2025
  })

  it('AMPE 5 of 2025 is the 66 580 $ the leaflet prints', () => {
    expect(p.ampe5).toBe(66580) // (61 600 + 64 900 + 66 600 + 68 500 + 71 300) / 5
  })

  it('drops 85 months (15 % of 564, rounded to the nearest month)', () => {
    expect(p.excludedMonths).toBe(85)
  })

  it('the career\'s adjusted earnings total $3 026 907, and the 85 dropped months account for $406 357', () => {
    // Printed rounded to the dollar in the leaflet, so ±1 $.
    expect(Math.abs(p.adjustedTotal - 3_026_907)).toBeLessThanOrEqual(1)
    expect(Math.abs(p.excludedTotal - 406_357)).toBeLessThanOrEqual(1)
    // …and the average of what remains is the leaflet's $5 470.88 a month: (3 026 907 − 406 357) ÷ 479.
    expect((p.adjustedTotal - p.excludedTotal) / (p.referenceMonths - p.excludedMonths)).toBeCloseTo(5470.88, 1)
  })

  it('base plan: 25 % × $5 470.88 = $1 367.72', () => {
    expect(p.base).toBeCloseTo(1367.72, 2)
  })

  it('first additional component: 8.33 % × $307 377 ÷ 480 = $53.34', () => {
    expect(p.additionalFirst).toBeCloseTo(53.34, 2)
  })

  it('second additional component: 33.33 % × $13 043 ÷ 480 = $9.06', () => {
    expect(p.additionalSecond).toBeCloseTo(9.06, 2)
  })

  it('the three components sum to the leaflet\'s $1 430.12 a month, with no adjustment at 65', () => {
    expect(p.adjustment).toBe(1)
    expect(p.monthly).toBeCloseTo(1430.12, 2)
  })

  it('the maximum base-plan pension of 2025 is the $1 387.08 the leaflet compares against', () => {
    expect(p.maxBase).toBeCloseTo(1387.08, 2)
  })
})

describe('the 2026 maximum pensions Retraite Québec publishes (QPP figures page)', () => {
  // A person who has earned at or above the ceiling for every month of a 47-year career, and
  // whose pension starts January 2026 (born December 1960 → 65 and 1 month).
  const BORN_DEC_1960 = { year: 1960, month: 12 }
  const maxEarnings: Record<number, number> = {}
  for (let y = 1979; y <= 2025; y++) maxEarnings[y] = 1_000_000 // far above any ceiling: capped at the ceiling
  const at = (startAge: number) => rrqPension({ birth: BORN_DEC_1960, earnings: maxEarnings, startAge }, RULES)

  it('AMPE 5 of 2026 is 69 180 $ and the base-plan maximum is $1 441.25 — the figure the page prints', () => {
    const p = at(65)
    expect(p.start).toEqual({ year: 2026, month: 1 })
    expect(p.ampe5).toBe(69180) // (64 900 + 66 600 + 68 500 + 71 300 + 74 600) / 5
    expect(p.base).toBeCloseTo(1441.25, 2)
    expect(p.maxBase).toBeCloseTo(1441.25, 2)
  })

  it('the maximum pension at 65 is $1 507.65 — base plus both additional components, fully earned', () => {
    const p = at(65)
    expect(p.additionalFirst + p.additionalSecond).toBeCloseTo(66.4, 1)
    expect(p.monthly).toBeCloseTo(1507.65, 1)
  })

  it('the maximum pension at 60 is $964.90 — 64 % of the maximum (a 0.6 % reduction × 60 months)', () => {
    // Born Dec 1965 → 60 and 1 month = Jan 2026, so the same AMPE 5 and the same maximum.
    const p = rrqPension({ birth: { year: 1965, month: 12 }, earnings: maxEarnings, startAge: 60 }, RULES)
    expect(p.start).toEqual({ year: 2026, month: 1 })
    expect(p.adjustment).toBeCloseTo(0.64, 6)
  })

  it('the maximum pension at 72 is $2 394.15 — 158.8 % of the maximum (0.7 % × 84 months)', () => {
    expect(adjustmentFactor(72, 1441.25, 1441.25, RULES)).toBeCloseTo(1.588, 9)
  })
})

describe('the adjustment for the age the pension starts (Retraite Québec citizen page, table)', () => {
  // « age 60: −30 % to −36 %; 61: −24 % to −28.8 %; 62: −18 % to −21.6 %; 63: −12 % to −14.4 %; 64: −6 % to −7.2 % »
  it.each([
    [60, 0.7, 0.64],
    [61, 0.76, 0.712],
    [62, 0.82, 0.784],
    [63, 0.88, 0.856],
    [64, 0.94, 0.928],
  ])('at %d the factor runs from the smallest pension (%f) to the maximum (%f)', (age, small, big) => {
    expect(adjustmentFactor(age, 0, 1441.25, RULES)).toBeCloseTo(small, 9)
    expect(adjustmentFactor(age, 1441.25, 1441.25, RULES)).toBeCloseTo(big, 9)
  })

  // « 66: +8.4 %, 67: +16.8 %, 68: +25.2 %, 69: +33.6 %, 70: +42.0 %, 71: +50.4 %, 72: +58.8 % »
  it.each([[66, 1.084], [67, 1.168], [68, 1.252], [69, 1.336], [70, 1.42], [71, 1.504], [72, 1.588]])(
    'at %d the pension is raised to %f of its 65 value',
    (age, expected) => {
      expect(adjustmentFactor(age, 1000, 1441.25, RULES)).toBeCloseTo(expected, 9)
    },
  )

  it('stops growing after 72 (the increase is capped at 84 months)', () => {
    expect(adjustmentFactor(75, 1000, 1441.25, RULES)).toBeCloseTo(1.588, 9)
  })

  it('the leaflet\'s own factor: 12 months early at a base pension of $1 367.72 against a maximum of $1 387.08', () => {
    // « 1 − 12 × (0.5 + 0.1 × (1367.72 / 1387.08)) / 100 »
    expect(adjustmentFactor(64, 1367.72, 1387.08, RULES)).toBeCloseTo(1 - (12 * (0.5 + 0.1 * (1367.72 / 1387.08))) / 100, 12)
  })
})

describe('the start month and the five-year average', () => {
  it('the pension starts the month AFTER the birthday month of the start age, rolling over December', () => {
    expect(rrqStart({ year: 1960, month: 11 }, 65)).toEqual({ year: 2025, month: 12 })
    expect(rrqStart({ year: 1960, month: 12 }, 65)).toEqual({ year: 2026, month: 1 })
    expect(rrqStart({ year: 1970, month: 1 }, 60)).toEqual({ year: 2030, month: 2 })
  })

  it('AMPE 5 is the plain mean of the five ceilings ending with the year', () => {
    expect(ampe5(2025, RULES)).toBe(66580)
    expect(ampe5(2026, RULES)).toBe(69180)
  })
})

describe('the cited parameters build EXACTLY the rules this file wrote by hand', () => {
  // RULES above is an independent transcription. If the params file and the formulas ever disagree
  // about a rate, a phase-in or an age, this fails — and so does the worked example below it, run
  // through the params instead of through the hand-written copy.
  const built = makeRrqRules({ inflation: 0.02, wageGrowth: 0.03 })

  it('every constant matches', () => {
    const { mga: _m, yampe: _y, ...rest } = RULES
    const { mga: _bm, yampe: _by, ...builtRest } = built
    expect(builtRest).toEqual(rest)
  })

  it('every historical ceiling matches, and a future year is projected from 2026, not invented', () => {
    for (let y = 1966; y <= 2026; y++) expect(built.mga(y), String(y)).toBe(RULES.mga(y))
    expect(built.yampe(2023)).toBeNull()
    expect(built.yampe(2024)).toBe(73_200)
    expect(built.mga(2027)).toBeGreaterThan(74_600)
    expect(built.mga(2027)).toBe(Math.round((74_600 * 1.03) / 100) * 100)
  })

  it('the leaflet\'s worked example, run through the params, gives the same $1 430.12', () => {
    const p = rrqPension({ birth: BORN_NOV_1960, earnings: EXAMPLE_EARNINGS, startAge: 65 }, built)
    expect(p.monthly).toBeCloseTo(1430.12, 2)
  })
})

describe('contributions, run through the params', () => {
  it('2026: 74 600 $ of earnings costs 4 479.30 $, as Retraite Québec prints', () => {
    expect(rrqContribution(74_600, rrqContributionRulesFor(2026, { inflation: 0.02, wageGrowth: 0.03 })).total).toBeCloseTo(4479.3, 2)
  })

  it('a year before 2024 has no second additional contribution (the additional maximum did not exist)', () => {
    const r = rrqContributionRulesFor(2026, { inflation: 0.02, wageGrowth: 0.03 })
    expect(rrqContribution(85_000, { ...r, yampe: null }).additionalSecond).toBe(0)
  })

  it('a future year uses the projected ceiling and the 2026 rates', () => {
    const r = rrqContributionRulesFor(2035, { inflation: 0.02, wageGrowth: 0.03 })
    expect(r.mga).toBeGreaterThan(74_600)
    expect(r.baseRate).toBe(0.053)
  })
})
