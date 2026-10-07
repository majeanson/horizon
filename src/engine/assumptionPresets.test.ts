import { describe, expect, it } from 'vitest'
import { ASSUMPTION_PRESETS, PRESET_KEYS, presetOf, withPreset } from './assumptionPresets.ts'
import { RRQ_MGA_HISTORY } from './params/rrqHistory.ts'
import { retireAt } from './retireAt.ts'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'

describe('the three ready-made assumption sets', () => {
  it('are ordered: prudent ≤ neutral ≤ bold on every return and on wages, and the other way on inflation and life', () => {
    const { prudent, neutral, bold } = ASSUMPTION_PRESETS
    for (const kind of ['rrsp', 'tfsa', 'nonReg'] as const) {
      expect(prudent.returns[kind]).toBeLessThan(neutral.returns[kind])
      expect(neutral.returns[kind]).toBeLessThan(bold.returns[kind])
    }
    expect(prudent.wageGrowth).toBeLessThan(neutral.wageGrowth)
    expect(neutral.wageGrowth).toBeLessThan(bold.wageGrowth)
    expect(prudent.inflation).toBeGreaterThan(neutral.inflation)
    expect(neutral.inflation).toBeGreaterThan(bold.inflation)
    expect(prudent.horizonAge).toBeGreaterThan(neutral.horizonAge)
    expect(neutral.horizonAge).toBeGreaterThan(bold.horizonAge)
  })

  it('neutral is the FP Canada 2026 guideline: inflation 2,1 %, wage growth 3,1 %, 60/40 of 6,3 / 3,2 less fees', () => {
    const n = ASSUMPTION_PRESETS.neutral
    expect(n.inflation).toBe(0.021)
    expect(n.wageGrowth).toBe(0.031)
    const gross = 0.6 * 0.0635 + 0.4 * 0.032
    expect(n.returns.rrsp).toBeCloseTo(gross - 0.006, 2)
  })

  it('the neutral wage growth is what the ⓘ says: the MGA grew about 3,1 % a year from 2016 to 2026 (Retraite Québec)', () => {
    const mga = RRQ_MGA_HISTORY.value
    const growth = Math.pow(74_600 / mga[2016]!, 1 / 10) - 1
    expect(mga[2016]).toBe(54_900)
    expect(growth).toBeCloseTo(ASSUMPTION_PRESETS.neutral.wageGrowth, 3)
  })

  it('every value sits inside the limits the saved profile accepts (a preset must never blank the plan)', () => {
    for (const key of PRESET_KEYS) {
      const p = ASSUMPTION_PRESETS[key]
      expect(p.inflation).toBeGreaterThanOrEqual(-0.02)
      expect(p.inflation).toBeLessThanOrEqual(0.15)
      expect(p.wageGrowth).toBeGreaterThanOrEqual(-0.02)
      expect(p.wageGrowth).toBeLessThanOrEqual(0.15)
      for (const r of Object.values(p.returns)) {
        expect(r).toBeGreaterThanOrEqual(-0.2)
        expect(r).toBeLessThanOrEqual(0.3)
      }
      expect(Number.isInteger(p.horizonAge) && p.horizonAge >= 80 && p.horizonAge <= 110).toBe(true)
    }
  })

  it('withPreset keeps what is the person\'s (withdrawal order, splitting) and presetOf reads it back', () => {
    const own = { ...GOLDEN_ASSUMPTIONS, withdrawalOrder: ['tfsa', 'rrsp', 'nonReg'] as const, pensionSplitting: false }
    for (const key of PRESET_KEYS) {
      const next = withPreset({ ...own, withdrawalOrder: [...own.withdrawalOrder] }, key)
      expect(next.withdrawalOrder).toEqual(['tfsa', 'rrsp', 'nonReg'])
      expect(next.pensionSplitting).toBe(false)
      expect(presetOf(next)).toBe(key)
    }
  })

  it('one edited figure makes the set personal again, and a float-noisy typed value still matches', () => {
    expect(presetOf({ ...withPreset(GOLDEN_ASSUMPTIONS, 'neutral'), inflation: 0.022 })).toBeNull()
    expect(presetOf({ ...withPreset(GOLDEN_ASSUMPTIONS, 'neutral'), inflation: 2.1 / 100 })).toBe('neutral')
  })

  it('the verdict never gets better as the preset gets more prudent', () => {
    // The same computation as lib/presetEarliest.worker.ts (the verdict's « Selon le scénario » row).
    const v = Object.fromEntries(PRESET_KEYS.map((p) => [p, retireAt(GOLDEN_HOUSEHOLD, withPreset(GOLDEN_ASSUMPTIONS, p), { stopAtFirstOk: true }).earliestOk ?? Infinity]))
    expect(v.bold).toBeLessThanOrEqual(v.neutral)
    expect(v.neutral).toBeLessThanOrEqual(v.prudent)
  })
})
