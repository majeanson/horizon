import { describe, expect, it } from 'vitest'
import { marginalRate } from './marginalRate.ts'
import { knownYear } from './params/index.ts'
import { householdTax, type PersonIncome, type TaxRules } from './tax.ts'

// THE MARGINAL RATE OF ONE MORE RRSP DOLLAR: the tax of the band reached, plus the OAS recovery above its threshold, plus the GIS lost where it is paid — the three
// the average rate hides. Held to the tax function's own totals (the rate is a difference of them), to the three ranges where each part is known from the Act
// (the GIS takes about half a dollar from a single pensioner; the recovery is 15 %; a middle income pays the bracket alone), and to its inputs (a different step reads a
// different stretch of the schedule).

const P = knownYear(2026)
const RULES: TaxRules = { federal: P.federal, quebec: P.quebec, oas: P.oas }

const pensioner = (over: Partial<PersonIncome>): PersonIncome => ({ age: 70, employment: 0, rrq: 0, oas: 0, db: 0, registered: 0, capitalGains: 0, rrqBase: 0, rrqEnhanced: 0, payrollPremiums: 0, rrspDeduction: 0, ...over })
const average = (persons: PersonIncome[]): number => {
  const t = householdTax(persons, RULES, { splitting: false })
  return t.total / t.persons.reduce((s, p) => s + p.netIncome, 0)
}

describe('the three parts of the marginal rate', () => {
  it('a low-income single pensioner loses half a dollar of GIS per dollar drawn (three quarters inside the top-up), on top of a small tax', () => {
    const persons = [pensioner({ oas: 8_800, rrq: 12_000 })]
    const m = marginalRate({ persons, rules: RULES, splitting: false })
    expect(m.gisLost).toBeGreaterThan(0.45)
    const inTopUp = marginalRate({ persons: [pensioner({ oas: 8_800, rrq: 3_000 })], rules: RULES, splitting: false })
    expect(inTopUp.gisLost).toBeGreaterThan(m.gisLost)
    expect(m.gisLost).toBeCloseTo(0.5, 2)
    expect(m.oasRecovery).toBe(0)
    expect(m.rate).toBeCloseTo(m.tax + m.oasRecovery + m.gisLost, 10)
    expect(m.rate).toBeGreaterThan(0.5)
  })

  it('above the recovery threshold the OAS is clawed back at 15 % and no GIS is left to lose', () => {
    const persons = [pensioner({ oas: 8_800, rrq: 16_000, db: 70_000, registered: 30_000 })]
    const m = marginalRate({ persons, rules: RULES, splitting: false })
    expect(m.oasRecovery).toBeCloseTo(P.oas.recoveryRate, 6)
    expect(m.gisLost).toBe(0)
    expect(m.tax).toBeGreaterThan(0.3)
    expect(m.rate).toBeCloseTo(m.tax + P.oas.recoveryRate, 6)
  })

  it('between the two, with no GIS and no recovery, it is the tax alone and exceeds the average rate', () => {
    const persons = [pensioner({ oas: 8_800, rrq: 14_000, db: 20_000, registered: 15_000 })]
    const m = marginalRate({ persons, rules: RULES, splitting: false })
    expect(m.gisLost).toBe(0)
    expect(m.oasRecovery).toBe(0)
    expect(m.rate).toBeGreaterThan(average(persons))
  })

  it('is exactly the difference of the tax function’s own totals, less the GIS the extra income removes', () => {
    const persons = [pensioner({ oas: 8_800, rrq: 12_000, registered: 20_000 }), pensioner({ age: 67, oas: 8_800, rrq: 6_000, registered: 3_000 })]
    for (const delta of [500, 1_000, 5_000]) {
      const m = marginalRate({ persons, rules: RULES, splitting: true, delta })
      const bumped = persons.map((p, i) => (i === m.who ? { ...p, registered: p.registered + delta } : p))
      const before = householdTax(persons, RULES, { splitting: true }).total
      const after = householdTax(bumped, RULES, { splitting: true }).total
      expect((m.tax + m.oasRecovery) * delta, `delta ${delta}`).toBeCloseTo(after - before, 6)
      expect(m.rate).toBeCloseTo(m.tax + m.oasRecovery + m.gisLost, 10)
    }
  })

  it('in a couple the extra dollar is drawn by the lower-income spouse unless told otherwise', () => {
    const persons = [pensioner({ oas: 8_800, rrq: 12_000, registered: 40_000 }), pensioner({ age: 67, oas: 8_800, rrq: 6_000 })]
    expect(marginalRate({ persons, rules: RULES, splitting: false }).who).toBe(1)
    expect(marginalRate({ persons, rules: RULES, splitting: false, who: 0 }).who).toBe(0)
  })
})

describe('the step is read', () => {
  it('a step across a bracket edge costs more per dollar than the same dollars on one side of it', () => {
    const top = P.federal.brackets[0].upTo ?? 58_000
    const persons = [pensioner({ oas: 8_800, db: Math.round(top) - 8_800 - 500 })]
    const small = marginalRate({ persons, rules: RULES, splitting: false, delta: 100 })
    const wide = marginalRate({ persons, rules: RULES, splitting: false, delta: 20_000 })
    expect(wide.rate).toBeGreaterThan(small.rate)
  })

  it('refuses a person-less household and a step that is not positive', () => {
    expect(() => marginalRate({ persons: [], rules: RULES, splitting: false })).toThrow()
    expect(() => marginalRate({ persons: [pensioner({})], rules: RULES, splitting: false, delta: 0 })).toThrow()
  })
})
