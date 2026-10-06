import { describe, expect, it } from 'vitest'
import { knownYear } from './params/index.ts'
import { householdTax, type PersonIncome, type TaxRules } from './tax.ts'
import { between, cases, intBetween, range } from './testGrid.ts'

// PROPERTIES OF THE TAX — what must hold for every household, not just the worked examples.
//
// A tax system is a function of income with a few shapes you can state in a sentence: it never takes more
// than you have, it never falls as you earn more, a dollar earned never costs more than a dollar, there is no
// cliff, and a rule that lets you choose (splitting) can only ever help. A wrong credit, a mis-ordered
// deduction or a bracket off by one breaks at least one of them somewhere on the grid.

const P = knownYear(2026)
const RULES: TaxRules = { federal: P.federal, quebec: P.quebec, oas: P.oas }
const SEED = 20260930

const blank = (age: number): PersonIncome => ({ age, employment: 0, rrq: 0, oas: 0, db: 0, registered: 0, capitalGains: 0, rrqBase: 0, rrqEnhanced: 0, payrollPremiums: 0, rrspDeduction: 0 })

// A random person: an age, and each income source present or not with a plausible size.
function randomPerson(r: () => number): PersonIncome {
  const age = intBetween(r, 45, 92)
  const retired = age >= 62
  const p = blank(age)
  if (!retired || r() < 0.2) p.employment = Math.round(between(r, 0, 140_000))
  if (retired && r() < 0.8) p.rrq = Math.round(between(r, 0, 18_000))
  if (age >= 65 && r() < 0.9) p.oas = Math.round(between(r, 0, 9_500))
  if (retired && r() < 0.5) p.db = Math.round(between(r, 0, 90_000))
  if (r() < 0.6) p.registered = Math.round(between(r, 0, 80_000))
  if (r() < 0.3) p.capitalGains = Math.round(between(r, 0, 60_000))
  if (p.employment > 0) {
    p.rrqBase = Math.min(3_768.3, Math.round(p.employment * 0.053 * 100) / 100)
    p.rrqEnhanced = Math.min(1_127, Math.round(p.employment * 0.01 * 100) / 100)
  }
  return p
}

const households = (n: number, seed = SEED) =>
  cases(seed, n, (r, i) => ({
    persons: r() < 0.55 ? [randomPerson(r), randomPerson(r)] : [randomPerson(r)],
    label: `seed ${seed} household ${i}`,
  }))

const N = 400

describe('tax properties — sanity', () => {
  it('no income, no tax', () => {
    for (const age of range(30, 95, 5)) expect(householdTax([blank(age)], RULES).total, `age ${age}`).toBe(0)
  })

  it('the state never takes more than the household has: tax + recovery ≤ income, and neither is ever negative', () => {
    for (const { persons, label } of households(N)) {
      const h = householdTax(persons, RULES, { splitting: true })
      const income = persons.reduce((s, p) => s + p.employment + p.rrq + p.oas + p.db + p.registered + p.capitalGains / 2, 0)
      expect(h.total, label).toBeGreaterThanOrEqual(0)
      expect(h.total, label).toBeLessThanOrEqual(income + 0.01)
      for (const p of h.persons) {
        expect(p.federal.tax, label).toBeGreaterThanOrEqual(0)
        expect(p.quebec.tax, label).toBeGreaterThanOrEqual(0)
        expect(p.oasRecovery, label).toBeGreaterThanOrEqual(0)
        expect(p.oasRecovery, label).toBeLessThanOrEqual(persons[h.persons.indexOf(p)].oas + 0.01)
      }
    }
  })

  it('every person\'s total is the sum of their federal tax, their Québec tax and their recovery tax', () => {
    for (const { persons, label } of households(120, SEED + 1)) {
      for (const p of householdTax(persons, RULES, { splitting: true }).persons) {
        expect(p.total, label).toBeCloseTo(p.federal.tax + p.quebec.tax + p.oasRecovery, 1)
      }
    }
  })
})

describe('tax properties — income and tax move together, and gently', () => {
  // Raise ONE person's income of ONE kind by $1 000 and compare the household before and after.
  const KINDS = ['employment', 'registered', 'db', 'rrq', 'capitalGains'] as const

  // PENSION INCOME IS THE ONE EXCEPTION, and it is the law, not a bug: the first dollars of ELIGIBLE pension income
  // earn credits (federal: up to 2 000 $; Québec: 1.25 × the income, up to 3 541 $) worth MORE than the tax on
  // them, so a little extra pension can lower the bill. Once both caps are reached (≈ 2 833 $) the property holds.
  const creditBandOpen = (p: PersonIncome, kind: (typeof KINDS)[number]) =>
    (kind === 'db' || kind === 'registered') && p.db + (p.age >= 65 ? p.registered : 0) < 3_000

  it('earning more never lowers the household\'s tax — except in the pension-credit band (see below)', () => {
    for (const { persons, label } of households(N, SEED + 2)) {
      for (const kind of KINDS) {
        if (creditBandOpen(persons[0], kind)) continue
        const before = householdTax(persons, RULES)
        const bumped = persons.map((p, i) => (i === 0 ? { ...p, [kind]: p[kind] + 1_000 } : p))
        expect(householdTax(bumped, RULES).total, `${label} ${kind}`).toBeGreaterThanOrEqual(before.total - 0.02)
      }
    }
  })

  it('…and in the pension-credit band the dip is bounded by the credits themselves, never more than they are worth', () => {
    let dips = 0
    for (const { persons, label } of households(N * 2, SEED + 20)) {
      for (const kind of ['db', 'registered'] as const) {
        if (!creditBandOpen(persons[0], kind)) continue
        const before = householdTax(persons, RULES)
        const bumped = persons.map((p, i) => (i === 0 ? { ...p, [kind]: p[kind] + 1_000 } : p))
        const drop = before.total - householdTax(bumped, RULES).total
        if (drop > 0.02) dips++
        // 1 000 $ more eligible pension earns at most 1 000 × 14 % federal (× 0.835 after the abatement) + 1 250 × 14 % Québec.
        expect(drop, `${label} ${kind}`).toBeLessThanOrEqual(1_000 * 0.14 * 0.835 + 1_250 * 0.14 + 0.02)
      }
    }
    expect(dips, 'the band is real: the generator must reach it').toBeGreaterThan(0)
  })

  it('…but never by more than the money earned (no cliff: the marginal rate stays well under 100 %)', () => {
    for (const { persons, label } of households(N, SEED + 3)) {
      for (const kind of KINDS) {
        const before = householdTax(persons, RULES)
        const bumped = persons.map((p, i) => (i === 0 ? { ...p, [kind]: p[kind] + 1_000 } : p))
        const extra = householdTax(bumped, RULES).total - before.total
        // The steepest stretch is the OAS clawback range: 15 % + 0.85 × 53.3 % ≈ 60 %, plus the credit phase-outs (≈ 5 %).
        expect(extra, `${label} ${kind}`).toBeLessThanOrEqual(1_000 * 0.75)
      }
    }
  })

  it('after-tax income never falls as income rises — a dollar saved or earned is never a loss', () => {
    for (const { persons, label } of households(N, SEED + 4)) {
      const net = (ps: PersonIncome[]) => {
        const income = ps.reduce((s, p) => s + p.employment + p.rrq + p.oas + p.db + p.registered + p.capitalGains / 2, 0)
        return income - householdTax(ps, RULES).total
      }
      const richer = persons.map((p, i) => (i === persons.length - 1 ? { ...p, registered: p.registered + 5_000 } : p))
      expect(net(richer), label).toBeGreaterThanOrEqual(net(persons) - 0.02)
    }
  })

  it('a single person\'s tax rises smoothly with income: no jump larger than the marginal rate allows, anywhere from 0 to 400 000 $', () => {
    for (const age of [40, 66, 80]) {
      let prev = householdTax([{ ...blank(age), registered: 0 }], RULES).total
      for (const income of range(1_000, 400_000, 1_000)) {
        const t = householdTax([{ ...blank(age), registered: income }], RULES).total
        expect(t - prev, `age ${age} @ ${income}`).toBeGreaterThanOrEqual(-0.02)
        expect(t - prev, `age ${age} @ ${income}`).toBeLessThanOrEqual(1_000 * 0.75)
        prev = t
      }
    }
  })
})

describe('tax properties — splitting', () => {
  it('splitting can only help: the best allocation is never worse than none', () => {
    for (const { persons, label } of households(N, SEED + 5)) {
      if (persons.length !== 2) continue
      const none = householdTax(persons, RULES, { splitting: false })
      const best = householdTax(persons, RULES, { splitting: true })
      expect(best.total, label).toBeLessThanOrEqual(none.total + 0.001)
    }
  })

  it('never moves more than half of what may be moved, never from a person under 65, never more than they have', () => {
    for (const { persons, label } of households(N, SEED + 6)) {
      if (persons.length !== 2) continue
      const best = householdTax(persons, RULES, { splitting: true })
      if (best.split.from === null) continue
      const giver = persons[best.split.from]
      expect(giver.age, label).toBeGreaterThanOrEqual(65)
      expect(best.split.amount, label).toBeLessThanOrEqual((giver.db + giver.registered) / 2 + 0.01)
      expect(best.split.amount, label).toBeGreaterThan(0)
    }
  })

  it('does not depend on which spouse is listed first', () => {
    for (const { persons, label } of households(200, SEED + 7)) {
      if (persons.length !== 2) continue
      const a = householdTax(persons, RULES, { splitting: true }).total
      const b = householdTax([persons[1], persons[0]], RULES, { splitting: true }).total
      expect(a, label).toBeCloseTo(b, 1)
    }
  })

  it('a household of one is unaffected by the splitting option', () => {
    for (const { persons, label } of households(120, SEED + 8)) {
      if (persons.length !== 1) continue
      expect(householdTax(persons, RULES, { splitting: true }).total, label).toBe(householdTax(persons, RULES, { splitting: false }).total)
    }
  })
})

describe('tax properties — what is the same, and what is not', () => {
  it('a gain is taxed as half its size of ordinary income (under 65, where neither earns a pension credit)', () => {
    for (const g of range(2_000, 100_000, 6_000)) {
      expect(householdTax([{ ...blank(50), capitalGains: g }], RULES).total).toBe(householdTax([{ ...blank(50), registered: g / 2 }], RULES).total)
    }
  })

  it('a pension at 65 or over is taxed no more than the same amount at 64 (the pension and retirement credits, and the age amount, only help)', () => {
    for (const income of range(10_000, 90_000, 10_000)) {
      expect(householdTax([{ ...blank(66), db: income }], RULES).total).toBeLessThanOrEqual(householdTax([{ ...blank(64), db: income }], RULES).total)
    }
  })

  it('an RRSP deduction never raises the tax, and lowers it once the person owes any', () => {
    const t = (d: number) => householdTax([{ ...blank(45), employment: 90_000, rrspDeduction: d }], RULES).total
    for (const d of range(0, 30_000, 2_500)) expect(t(d + 2_500)).toBeLessThanOrEqual(t(d) + 0.01)
    expect(t(10_000)).toBeLessThan(t(0) - 2_000)
  })

  it('more enhanced QPP contributions never raise the tax (it is a deduction)', () => {
    for (const e of range(0, 1_127, 100)) {
      const t = (x: number) => householdTax([{ ...blank(50), employment: 80_000, rrqEnhanced: x }], RULES).total
      expect(t(e + 100)).toBeLessThanOrEqual(t(e) + 0.01)
    }
  })

  it('a couple pays no more than the same two people taxed as strangers who live alone would pay together… when both are poor (the shared credit never hurts)', () => {
    for (const age of [66, 72]) {
      const a = { ...blank(age), db: 22_000 }
      const b = { ...blank(age), db: 8_000 }
      const couple = householdTax([a, b], RULES, { splitting: false }).total
      const apart = householdTax([a], RULES).total + householdTax([b], RULES).total
      // The couple loses the living-alone amount (2 172 $), so it may pay MORE than two singles — by at most that credit twice.
      expect(couple).toBeLessThanOrEqual(apart + 2 * 2_172 * 0.14 + 0.02)
    }
  })
})
