import { describe, expect, it } from 'vitest'
import { knownYear } from './params/index.ts'
import { deferralMultiplier, gisMonthly, oasRecovery, oasYear, residenceFraction, type GisCategoryName, type OasPerson, type OasRules } from './oas.ts'
import { cases, intBetween, range } from './testGrid.ts'

// PROPERTIES OF OAS AND THE GIS — what must hold at every income and every start age.
//
// The verified tests pin the curve at the points the government published. These prove its SHAPE
// between them: no cliff (a dollar of income never costs more than a dollar of benefit), no negative
// supplement, no recovery above the pension, deferral and residence only ever helping.

const RULES: OasRules = knownYear(2026).oas
const CATEGORIES: GisCategoryName[] = ['single', 'spouseOas', 'spouseNone']
const SEED = 20261001

describe('GIS properties', () => {
  it('is never negative and never above the published maximum, at any income', () => {
    for (const cat of CATEGORIES) {
      for (const income of range(0, 120_000, 137)) {
        const g = gisMonthly(income, cat, RULES)
        expect(g, `${cat} @ ${income}`).toBeGreaterThanOrEqual(0)
        expect(g, `${cat} @ ${income}`).toBeLessThanOrEqual(RULES.gis[cat].max)
      }
    }
  })

  it('never RISES with income', () => {
    for (const cat of CATEGORIES) {
      let prev = Infinity
      for (const income of range(0, 90_000, 50)) {
        const g = gisMonthly(income, cat, RULES)
        expect(g, `${cat} @ ${income}`).toBeLessThanOrEqual(prev + 0.011)
        prev = g
      }
    }
  })

  it('has no cliff: a dollar more income never costs more than a dollar of annual GIS (the steepest slope is under 1/12 a month per dollar)', () => {
    for (const cat of CATEGORIES) {
      for (const income of range(0, 90_000, 100)) {
        const lost = (gisMonthly(income, cat, RULES) - gisMonthly(income + 100, cat, RULES)) * 12
        // Losing at most 100 $ of annual GIS for 100 $ more income — and in fact at most 75 ¢ per dollar.
        expect(lost, `${cat} @ ${income}`).toBeLessThanOrEqual(100)
        expect(lost, `${cat} @ ${income}`).toBeGreaterThanOrEqual(-0.12)
      }
    }
  })

  it('total resources (income + a year of GIS) never fall as income rises — saving a dollar never leaves you poorer', () => {
    for (const cat of CATEGORIES) {
      let prev = -Infinity
      for (const income of range(0, 90_000, 25)) {
        const total = income + 12 * gisMonthly(income, cat, RULES)
        expect(total, `${cat} @ ${income}`).toBeGreaterThanOrEqual(prev - 0.2)
        prev = total
      }
    }
  })

  it('at the same income PER PERSON a pensioner in a couple gets no more than a single pensioner (combined income = twice each one\'s)', () => {
    // Comparing at the same COMBINED income would compare a household of two with a household of one.
    for (const each of range(0, 25_000, 250)) {
      expect(gisMonthly(2 * each, 'spouseOas', RULES), String(each)).toBeLessThanOrEqual(gisMonthly(each, 'single', RULES) + 0.01)
    }
  })

  it('a pensioner whose spouse has no pension gets at least what a single pensioner gets at the same income (their combined income is only what is counted)', () => {
    for (const income of range(0, 8_000, 500)) {
      expect(gisMonthly(income, 'spouseNone', RULES)).toBeGreaterThanOrEqual(gisMonthly(income, 'single', RULES) - 0.01)
    }
  })
})

describe('recovery tax properties', () => {
  const OAS = 9_150
  it('is zero up to the threshold, never above the pension, and never falls as income rises', () => {
    let prev = 0
    for (const income of range(0, 250_000, 997)) {
      const r = oasRecovery(income, OAS, RULES)
      expect(r, String(income)).toBeGreaterThanOrEqual(prev - 0.011)
      expect(r, String(income)).toBeLessThanOrEqual(OAS)
      if (income <= RULES.recoveryThreshold) expect(r).toBe(0)
      prev = r
    }
  })

  it('what is left after the recovery tax never falls as other income rises (the 15 % slope is below 100 %)', () => {
    let prev = -Infinity
    for (const other of range(0, 250_000, 500)) {
      const net = other + OAS - oasRecovery(other + OAS, OAS, RULES)
      expect(net, String(other)).toBeGreaterThanOrEqual(prev - 0.011)
      prev = net
    }
  })

  it('takes exactly 15 cents of each extra dollar between the threshold and the point of full recovery', () => {
    const a = RULES.recoveryThreshold + 1_000
    expect(oasRecovery(a + 1_000, OAS, RULES) - oasRecovery(a, OAS, RULES)).toBeCloseTo(150, 2)
  })
})

describe('OAS properties — deferral and residence only ever help', () => {
  it('the deferral multiplier never falls as the start age rises, from 1 to 1.36', () => {
    let prev = 1
    for (const age of range(65, 72)) {
      const m = deferralMultiplier(age, RULES)
      expect(m).toBeGreaterThanOrEqual(prev)
      expect(m).toBeLessThanOrEqual(1.36 + 1e-12)
      prev = m
    }
  })

  it('residence never lowers the pension: more years never reduce the fraction, which is 0 to 1', () => {
    let prev = 0
    for (let years = 0; years <= 60; years++) {
      const p: OasPerson = { birth: { year: 1960, month: 6 }, startAge: 65, residentSince: 2025 - years }
      const f = residenceFraction(p, 2025, RULES)
      expect(f).toBeGreaterThanOrEqual(prev)
      expect(f).toBeLessThanOrEqual(1)
      prev = f
    }
  })

  it('a year of OAS is never negative, never more than 12 payments, and never falls from one year to the next once started (same level)', () => {
    for (const { person, label } of cases(SEED, 300, (r, i) => ({
      person: { birth: { year: intBetween(r, 1950, 1990), month: intBetween(r, 1, 12) }, startAge: intBetween(r, 65, 70), residentSince: intBetween(r, 1950, 2000) } as OasPerson,
      label: `case ${i}`,
    }))) {
      let prev = 0
      for (let year = person.birth.year + 60; year <= person.birth.year + 95; year++) {
        const y = oasYear(year, person, RULES)
        expect(y.pension, `${label} ${year}`).toBeGreaterThanOrEqual(0)
        expect(y.months, `${label} ${year}`).toBeLessThanOrEqual(12)
        expect(y.pension, `${label} ${year}`).toBeGreaterThanOrEqual(prev - 0.011)
        prev = y.pension
      }
    }
  })

  it('starting later never lowers the pension ONCE BOTH ARE FULLY STARTED (the 36 % is permanent)', () => {
    for (const month of range(1, 12)) {
      const at = (startAge: number) => oasYear(2045, { birth: { year: 1960, month }, startAge, residentSince: 1978 }, RULES).pension
      let prev = 0
      for (const age of range(65, 70)) {
        expect(at(age), `born month ${month}, start ${age}`).toBeGreaterThanOrEqual(prev)
        prev = at(age)
      }
    }
  })

  it('residence prorates linearly between 10 and 40 years: each extra year adds exactly 1/40 of the pension', () => {
    // Born January 1975, pension from February 2040, a full year paid in 2045; `years` of residence at the start.
    const at = (years: number) => oasYear(2045, { birth: { year: 1975, month: 1 }, startAge: 65, residentSince: 2040 - years }, RULES).pension
    const oneFortieth = (12 * RULES.monthly65to74) / 40
    for (const y of range(10, 39)) expect(at(y + 1) - at(y), `${y} → ${y + 1} years`).toBeCloseTo(oneFortieth, 1)
    expect(at(9)).toBe(0)
  })
})
