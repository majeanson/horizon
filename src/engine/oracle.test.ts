import { describe, expect, it } from 'vitest'
import { knownYear } from './params/index.ts'
import { householdTax, type PersonIncome, type TaxRules } from './tax.ts'
import { between, cases, range } from './testGrid.ts'

// A SECOND, NAIVE CALCULATION. The verified suites check the engine against published examples; the property suites check what must hold of it. This is the third kind: an oracle written
// the plain way from the cited parameters alone (a loop over the brackets, one credit, the abatement), sharing NO code with taxFederal.ts / taxQuebec.ts / tax.ts, compared with
// the engine over many incomes. The household is the simplest that has any tax at all: one adult under 65, whose only income is ordinary income with no credit of its own (`other`: no pay, so no payroll premium,
// no deduction for workers; not pension income — a RRIF draw earns Québec's retirement-income amount at any age; under 65, so no age credit; not living alone): all that is left of the credits is the basic personal amount.
// Where the engine and the oracle part ways, one of them has misread a rule — the finding is the disagreement, wherever it sits.

const P = knownYear(2026)
const RULES: TaxRules = { federal: P.federal, quebec: P.quebec, oas: P.oas, livesAlone: false }
const person = (over: Partial<PersonIncome>): PersonIncome => ({
  age: 50, employment: 0, rrq: 0, oas: 0, db: 0, registered: 0, capitalGains: 0, rrqBase: 0, rrqEnhanced: 0, payrollPremiums: 0, rrspDeduction: 0, ...over,
})
const engine = (x: number, age = 50) => householdTax([person({ other: x, age })], RULES).persons[0]

type Bracket = { upTo: number | null; rate: number }
/** Tax on `x` by walking the brackets, slice by slice. */
function slices(x: number, brackets: readonly Bracket[]): number {
  let tax = 0
  let from = 0
  for (const b of brackets) {
    const top = b.upTo ?? Infinity
    if (x > from) tax += (Math.min(x, top) - from) * b.rate
    from = top
    if (x <= top) break
  }
  return tax
}

/** The federal basic personal amount: the maximum up to the start of the 29 % bracket, the minimum from the start of the 33 %, linear in between. */
function bpaFederal(x: number): number {
  const lo = P.federal.brackets[2].upTo!
  const hi = P.federal.brackets[3].upTo!
  if (x <= lo) return P.federal.bpaMax
  if (x >= hi) return P.federal.bpaMin
  return P.federal.bpaMax - ((P.federal.bpaMax - P.federal.bpaMin) * (x - lo)) / (hi - lo)
}

/** Federal tax before the Québec abatement: slices less the basic credit, never below nothing. */
const federalBasic = (x: number) => Math.max(0, slices(x, P.federal.brackets) - P.federal.creditRate * bpaFederal(x))
/** Federal tax as a Québec resident pays it: the abatement takes 16.5 points of the basic federal tax. */
const federalOracle = (x: number) => federalBasic(x) * (1 - P.federal.quebecAbatement)
const quebecOracle = (x: number) => Math.max(0, slices(x, P.quebec.brackets) - P.quebec.creditRate * P.quebec.bpa)

describe('the oracle itself: a hand-checkable figure, so it cannot be wrong the same way as the engine', () => {
  it('Finance Canada’s published case: $60 000 of taxable income, basic personal amount only, is $8 496 before credits and $6 193 after', () => {
    expect(slices(60_000, P.federal.brackets)).toBeCloseTo(8_496, 0)
    expect(federalBasic(60_000)).toBeCloseTo(6_193, 0)
  })

  it('the top combined marginal rate is the top federal rate after the abatement plus the top Québec rate (53.31 %)', () => {
    const top = P.federal.brackets[P.federal.brackets.length - 1].rate * (1 - P.federal.quebecAbatement) + P.quebec.brackets[P.quebec.brackets.length - 1].rate
    expect(top).toBeCloseTo(0.5331, 4)
  })
})

describe('the engine’s income tax against the oracle, to the dollar', () => {
  const grid = [...range(10_000, 400_000, 7_500), ...cases(20261016, 300, (r) => Math.round(between(r, 15_000, 600_000)))]

  it('federal tax, Québec tax and their sum, at every income from $10 000 to $600 000', () => {
    const wrong: string[] = []
    for (const x of grid) {
      const t = engine(x)
      const f = federalOracle(x)
      const q = quebecOracle(x)
      if (Math.abs(t.federal.tax - f) > 1) wrong.push(`${x}: federal ${t.federal.tax.toFixed(2)} against ${f.toFixed(2)}`)
      if (Math.abs(t.quebec.tax - q) > 1) wrong.push(`${x}: Québec ${t.quebec.tax.toFixed(2)} against ${q.toFixed(2)}`)
    }
    expect(wrong.slice(0, 8)).toEqual([])
  })

  it('the marginal rate in every bracket interval is the combined rate the schedules say, including the basic amount’s phase-down', () => {
    // every breakpoint of either schedule, then a point in the middle of each interval between them (and well above the last)
    const cuts = [...new Set([...P.federal.brackets, ...P.quebec.brackets].map((b) => b.upTo).filter((u): u is number => u !== null))].sort((a, b) => a - b)
    const mids = [25_000, ...cuts.map((c, i) => (i === cuts.length - 1 ? c + 100_000 : (c + cuts[i + 1]) / 2))]
    const wrong: string[] = []
    for (const x of mids) {
      const slope = (engine(x + 500).total - engine(x - 500).total) / 1000
      const expected = (federalOracle(x + 500) + quebecOracle(x + 500) - federalOracle(x - 500) - quebecOracle(x - 500)) / 1000
      if (Math.abs(slope - expected) > 2e-4) wrong.push(`${x}: the engine's slope ${slope.toFixed(4)} against ${expected.toFixed(4)}`)
    }
    expect(mids.length).toBeGreaterThan(6)
    expect(wrong).toEqual([])
  })

  it('no tax at all below the basic personal amounts, in either government', () => {
    for (const x of [0, 5_000, 12_000, Math.min(P.federal.bpaMax, P.quebec.bpa) - 100]) {
      const t = engine(x)
      expect(t.federal.tax, `${x}`).toBe(0)
      expect(t.quebec.tax, `${x}`).toBe(0)
    }
  })
})

describe('the OAS recovery tax inside the household tax, against the plain formula', () => {
  it('15 % of net income above the threshold, never more than the pension, at every income', () => {
    const oas = 9_000
    const wrong: string[] = []
    const incomes = [...range(60_000, 250_000, 3_000), ...cases(7, 120, (r) => Math.round(between(r, 50_000, 260_000)))]
    for (const registered of incomes) {
      const t = householdTax([person({ age: 70, registered, oas })], RULES).persons[0]
      const net = registered + oas
      const expected = Math.min(P.oas.recoveryRate * Math.max(0, net - P.oas.recoveryThreshold), oas)
      if (Math.abs(t.oasRecovery - expected) > 0.02) wrong.push(`${registered}: recovery ${t.oasRecovery.toFixed(2)} against ${expected.toFixed(2)}`)
    }
    expect(wrong.slice(0, 6)).toEqual([])
  })
})
