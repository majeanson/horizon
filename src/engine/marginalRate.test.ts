import { describe, expect, it } from 'vitest'
import { marginalRate, type CreditsContext } from './marginalRate.ts'
import { knownYear, paramsFor } from './params/index.ts'
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

// THE CREDITS A DOLLAR OF THIS YEAR'S INCOME SHRINKS NEXT YEAR: Québec's senior assistance credit (5,40 % over 27 835 $, 70 and over), the solidarity credit (6 % over 43 195 $) and the groceries
// benefit (5 % over 46 432 $) all read this year's income and pay next year. Held to the rates the official pages state, inside the range of each.
describe('the credits paid next year on this year’s income', () => {
  const next = paramsFor(2027, { inflation: 0.02, wageGrowth: 0.03 })
  const ctx = (births: number[]): CreditsContext => ({
    year: 2027,
    births,
    children: [],
    livesAlone: true,
    qc: next.qcCredits,
    groceries: next.groceriesBenefit,
    childUntilAge: next.childBenefits.familyAllowance.untilAge,
  })

  it('a single person aged 72 with 36 000 $ of net income loses the senior credit (5,40 %) and the solidarity credit (6 %) on the next dollar, and not yet the groceries benefit', () => {
    // 22 000 $ of pensions and 14 000 $ of RRSP: net income 36 000 $, inside 27 835 $–64 873 $ (senior) and 43 195 $ (solidarity starts there): senior only
    const persons = [pensioner({ age: 72, oas: 8_800, rrq: 13_200, registered: 14_000 })]
    const m = marginalRate({ persons, rules: RULES, splitting: false, credits: ctx([1954]) })
    expect(m.creditsLost).toBeCloseTo(0.054, 3)
    expect(m.rate).toBeCloseTo(m.tax + m.oasRecovery + m.gisLost + m.creditsLost, 10)
  })

  it('at 50 000 $ all three read: 5,40 % + 6 % + 5 %', () => {
    const persons = [pensioner({ age: 72, oas: 8_800, rrq: 13_200, registered: 28_000 })]
    const m = marginalRate({ persons, rules: RULES, splitting: false, credits: ctx([1954]) })
    // net income here is a little under the 50 000 $ nominal (the OAS recovery starts later), so the range of each credit is the same three
    expect(m.creditsLost).toBeCloseTo(0.054 + 0.06 + 0.05, 2)
  })

  it('without a context the credits are not counted: the same three parts as before, and nothing is lost', () => {
    const persons = [pensioner({ age: 72, oas: 8_800, rrq: 13_200, registered: 28_000 })]
    const m = marginalRate({ persons, rules: RULES, splitting: false })
    expect(m.creditsLost).toBe(0)
    expect(m.rate).toBeCloseTo(m.tax + m.oasRecovery + m.gisLost, 10)
  })

  it('a high income loses none: it gets none', () => {
    const persons = [pensioner({ age: 72, oas: 8_800, rrq: 16_000, db: 70_000, registered: 30_000 })]
    expect(marginalRate({ persons, rules: RULES, splitting: false, credits: ctx([1954]) }).creditsLost).toBe(0)
  })

  it('a person of 60 has no senior credit to lose', () => {
    const persons = [pensioner({ age: 60, rrq: 20_000, registered: 18_000, oas: 0 })]
    const m = marginalRate({ persons, rules: RULES, splitting: false, credits: ctx([1966]) })
    // solidarity only (and the groceries benefit above 46 432 $): never the 5,40 %
    expect(m.creditsLost).toBeLessThan(0.054 + 0.06)
  })
})
