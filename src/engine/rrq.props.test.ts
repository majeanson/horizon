import { describe, expect, it } from 'vitest'
import { adjustmentFactor, rrqPension, rrqStart, type RrqPensionInput, type RrqRules } from './rrq.ts'
import { makeRrqRules } from './rrqRules.ts'
import { between, cases, intBetween, range } from './testGrid.ts'

// PROPERTIES OF THE RRQ CALCULATION — what must hold for EVERY career, not just the leaflet's.
//
// The worked example proves the formulas right at one point. These prove their SHAPE right
// everywhere: more earnings never lower a pension, a later start never lowers the adjustment, no
// career beats the maximum career, nothing outside the reference period matters. A wrong formula
// that happens to agree at the leaflet's point cannot survive all of these.

const RULES: RrqRules = makeRrqRules({ inflation: 0.02, wageGrowth: 0.03 })
const SEED = 20260610

interface Career {
  input: RrqPensionInput
  label: string
}

// A random career: born 1950–1992, starts work between 18 and 30, earns a varying share of the
// ceiling with occasional gaps, until a random end year.
const careers = (n: number, seed = SEED): Career[] =>
  cases(seed, n, (r, i) => {
    const birth = { year: intBetween(r, 1950, 1992), month: intBetween(r, 1, 12) }
    const startAge = intBetween(r, 60, 72)
    const workFrom = birth.year + intBetween(r, 18, 30)
    const workTo = birth.year + intBetween(r, 50, 70)
    const earnings: Record<number, number> = {}
    for (let y = workFrom; y <= Math.min(workTo, birth.year + 72); y++) {
      const gap = r() < 0.1
      earnings[y] = gap ? 0 : Math.round(RULES.mga(Math.min(y, 2026)) * between(r, 0.1, 1.4))
    }
    return { input: { birth, earnings, startAge }, label: `seed ${seed} case ${i}` }
  })

const N = 400

describe('RRQ — the additional components, like the base plan, begin the month after the 18th birthday', () => {
  // Born June 2005: 18 in June 2023, so the reference period begins in July 2023 — the year they turn 18 is a PARTIAL
  // year of 6 months, whose pensionable ceiling is pro-rated (leaflet 1036-1f: $71 300 × 11 ÷ 12 for 11 months).
  const birth = { year: 2005, month: 6 }
  const startAge = 60
  const earnings = { 2023: 40_000 } // more than half of the 2023 ceiling: the pro-rated cap must bite
  const at = rrqStart(birth, startAge)

  it('the first additional component caps the partial year at its months of the ceiling', () => {
    const ampe = (RULES.mga(at.year - 4) + RULES.mga(at.year - 3) + RULES.mga(at.year - 2) + RULES.mga(at.year - 1) + RULES.mga(at.year)) / 5
    const capped = RULES.mga(2023) * (6 / 12)
    expect(40_000).toBeGreaterThan(capped)
    const expected = Math.round(((RULES.firstRate * ((capped * ampe) / RULES.mga(2023))) / RULES.additionalMonths) * 100) / 100
    expect(rrqPension({ birth, earnings, startAge }, RULES).additionalFirst).toBe(expected)
  })

  it('so the partial year can never count for more than its 6 months of ceiling: a full ceiling and half of it give the same component', () => {
    const half = rrqPension({ birth, earnings: { 2023: RULES.mga(2023) / 2 }, startAge }, RULES).additionalFirst
    const full = rrqPension({ birth, earnings: { 2023: RULES.mga(2023) }, startAge }, RULES).additionalFirst
    expect(full).toBe(half)
  })
})

describe('RRQ properties — earnings', () => {
  it('more earnings in any one year never LOWER any component of the pension', () => {
    for (const { input, label } of careers(N)) {
      const years = Object.keys(input.earnings).map(Number)
      if (!years.length) continue
      const y = years[Math.floor((years.length * (input.birth.month % 7)) / 7)]
      const before = rrqPension(input, RULES)
      const after = rrqPension({ ...input, earnings: { ...input.earnings, [y]: (input.earnings[y] ?? 0) + 25_000 } }, RULES)
      expect(after.base, `${label} base`).toBeGreaterThanOrEqual(before.base - 0.005)
      expect(after.additionalFirst, `${label} first`).toBeGreaterThanOrEqual(before.additionalFirst - 0.005)
      expect(after.additionalSecond, `${label} second`).toBeGreaterThanOrEqual(before.additionalSecond - 0.005)
      expect(after.monthly, `${label} monthly`).toBeGreaterThanOrEqual(before.monthly - 0.01)
    }
  })

  it('no career beats the maximum career: earning above every ceiling in every year', () => {
    for (const { input, label } of careers(N, SEED + 1)) {
      const max: Record<number, number> = {}
      for (let y = 1950; y <= 2100; y++) max[y] = 10_000_000
      const best = rrqPension({ ...input, earnings: max }, RULES)
      const mine = rrqPension(input, RULES)
      expect(mine.monthly, label).toBeLessThanOrEqual(best.monthly + 0.01)
      expect(mine.base, label).toBeLessThanOrEqual(best.base + 0.005)
    }
  })

  it('no earnings, no pension — every component is zero', () => {
    for (const { input, label } of careers(60, SEED + 2)) {
      const p = rrqPension({ ...input, earnings: {} }, RULES)
      expect([p.base, p.additionalFirst, p.additionalSecond, p.monthly], label).toEqual([0, 0, 0, 0])
    }
  })

  it('earnings above the ceiling are worth exactly the ceiling (the cap is real)', () => {
    for (const { input, label } of careers(120, SEED + 3)) {
      const huge = Object.fromEntries(Object.keys(input.earnings).map((y) => [y, 5_000_000]))
      const huger = Object.fromEntries(Object.keys(input.earnings).map((y) => [y, 9_000_000]))
      expect(rrqPension({ ...input, earnings: huge }, RULES).monthly, label).toBe(rrqPension({ ...input, earnings: huger }, RULES).monthly)
    }
  })

  it('scaling a whole career down by k ≤ 1 scales the base pension by AT LEAST k and at most 1 (capping is the only non-linearity)', () => {
    for (const { input, label } of careers(N, SEED + 4)) {
      const full = rrqPension(input, RULES)
      for (const k of [0.25, 0.5, 0.8]) {
        const scaled = rrqPension({ ...input, earnings: Object.fromEntries(Object.entries(input.earnings).map(([y, e]) => [y, e * k])) }, RULES)
        expect(scaled.base, `${label} k=${k}`).toBeGreaterThanOrEqual(k * full.base - 0.02)
        expect(scaled.base, `${label} k=${k}`).toBeLessThanOrEqual(full.base + 0.005)
      }
    }
  })

  it('dropping the lowest 15 % of months never lowers the base pension (the drop-out only ever helps)', () => {
    for (const { input, label } of careers(N, SEED + 5)) {
      const withDrop = rrqPension(input, RULES).base
      const without = rrqPension(input, { ...RULES, excludedShare: 0 }).base
      expect(withDrop, label).toBeGreaterThanOrEqual(without - 0.005)
    }
  })
})

describe('RRQ properties — what does NOT matter', () => {
  it('earnings after the pension starts, and before the 18th birthday, change nothing', () => {
    for (const { input, label } of careers(N, SEED + 6)) {
      const start = rrqStart(input.birth, input.startAge)
      const before = rrqPension(input, RULES)
      const noisy = { ...input.earnings }
      for (let y = start.year + 1; y <= start.year + 8; y++) noisy[y] = 900_000
      for (let y = input.birth.year; y <= input.birth.year + 17; y++) noisy[y] = 900_000
      expect(rrqPension({ ...input, earnings: noisy }, RULES).monthly, label).toBe(before.monthly)
    }
  })

  it('the pension does not depend on how earnings are keyed (a string year and a number year are the same year)', () => {
    const { input } = careers(1, SEED + 7)[0]
    const asStrings = Object.fromEntries(Object.entries(input.earnings).map(([y, e]) => [String(y), e]))
    expect(rrqPension({ ...input, earnings: asStrings }, RULES).monthly).toBe(rrqPension(input, RULES).monthly)
  })
})

describe('RRQ properties — the start age', () => {
  it('the adjustment factor never falls as the start age rises, whatever the size of the pension', () => {
    for (const base of range(0, 1_500, 75)) {
      let prev = -Infinity
      for (const age of range(60, 75)) {
        const f = adjustmentFactor(age, base, 1_441.25, RULES)
        expect(f, `base ${base} age ${age}`).toBeGreaterThanOrEqual(prev)
        prev = f
      }
    }
  })

  it('a bigger base pension is reduced MORE per month early (0.5 % → 0.6 %), and never differently after 65', () => {
    for (const age of range(60, 64)) {
      let prev = Infinity
      for (const base of range(0, 1_441.25, 120)) {
        const f = adjustmentFactor(age, base, 1_441.25, RULES)
        expect(f, `age ${age} base ${base}`).toBeLessThanOrEqual(prev)
        prev = f
      }
    }
    for (const age of range(65, 75)) {
      expect(adjustmentFactor(age, 100, 1_441.25, RULES)).toBe(adjustmentFactor(age, 1_400, 1_441.25, RULES))
    }
  })

  it('the factor is 1 at 65 exactly, below 1 before, above 1 after', () => {
    expect(adjustmentFactor(65, 900, 1_441.25, RULES)).toBe(1)
    for (const a of range(60, 64)) expect(adjustmentFactor(a, 900, 1_441.25, RULES)).toBeLessThan(1)
    for (const a of range(66, 72)) expect(adjustmentFactor(a, 900, 1_441.25, RULES)).toBeGreaterThan(1)
  })

  it('the pension starts exactly twelve months later for each year of age, in any birth month', () => {
    for (const month of range(1, 12)) {
      const a = rrqStart({ year: 1970, month }, 60)
      const b = rrqStart({ year: 1970, month }, 61)
      expect((b.year - a.year) * 12 + (b.month - a.month)).toBe(12)
    }
  })

  it('for a career that keeps earning the ceiling to the start, a later start never lowers the monthly pension (60 → 72)', () => {
    for (const month of range(1, 12)) {
      const birth = { year: 1975, month }
      const steady: Record<number, number> = {}
      for (let y = 1993; y <= 2047; y++) steady[y] = 10_000_000
      let prev = 0
      for (const startAge of range(60, 72)) {
        const m = rrqPension({ birth, earnings: steady, startAge }, RULES).monthly
        expect(m, `born ${month}/1975, start ${startAge}`).toBeGreaterThanOrEqual(prev)
        prev = m
      }
    }
  })

  it('a pension that starts after 65 is never below the 65 pension, moved forward by the ceiling\'s growth (the post-2024 protection)', () => {
    let checked = 0
    for (const { input, label } of careers(N * 4, SEED + 8)) {
      // The protection exists for pensions that start from 2024 (rules.lateProtectionFrom); before it,
      // working on past 65 could genuinely lower the pension — which is exactly why it was introduced.
      if (input.startAge <= 65 || rrqStart(input.birth, input.startAge).year < RULES.lateProtectionFrom) continue
      checked++
      const at65 = rrqPension({ ...input, startAge: 65 }, RULES)
      const late = rrqPension(input, RULES)
      const growth = late.ampe5 / at65.ampe5
      expect(late.base, label).toBeGreaterThanOrEqual(at65.base * growth - 0.02)
    }
    expect(checked, 'the generator must reach the protected cases').toBeGreaterThan(40)
  })

  it('…and before 2024 there is no such protection (a person who starts late on a falling average can lose)', () => {
    // Born 1955, steady low earnings then none: the 2021 start has a lower base than the 65 pension grown by the ceiling.
    const earnings: Record<number, number> = {}
    for (let y = 1973; y <= 2010; y++) earnings[y] = 30_000
    const input = { birth: { year: 1955, month: 6 }, earnings, startAge: 68 }
    expect(rrqStart(input.birth, 68).year).toBeLessThan(RULES.lateProtectionFrom)
    const at65 = rrqPension({ ...input, startAge: 65 }, RULES)
    const late = rrqPension(input, RULES)
    expect(late.base).toBeLessThan(at65.base * (late.ampe5 / at65.ampe5))
  })
})
