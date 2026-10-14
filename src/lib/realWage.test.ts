import { describe, expect, it } from 'vitest'
import { ASSUMPTION_PRESETS, REAL_WAGE_GROWTH_RQ } from '../engine/assumptionPresets.ts'
import { ABOVE_BY, realWage } from './realWage.ts'
import { REAL_WAGE_COPY } from './realWageCopy.ts'

// A typed wage growth is nominal; the pension grows by what is left after inflation, and Retraite Québec assumes 0,6 % of it (2024 actuarial valuation).

describe('what the wage growth is after inflation', () => {
  it('is the growth less the inflation, the way the valuation adds them', () => {
    expect(realWage(0.027, 0.021).real).toBeCloseTo(0.006, 12)
    expect(realWage(0.031, 0.021).real).toBeCloseTo(0.01, 12)
    expect(realWage(0.02, 0.025).real).toBeCloseTo(-0.005, 12)
  })

  it('the Neutre scenario IS the reference: its real growth is Retraite Québec\'s, and the page says nothing more', () => {
    const n = ASSUMPTION_PRESETS.neutral
    const w = realWage(n.wageGrowth, n.inflation)
    expect(w.reference).toBe(REAL_WAGE_GROWTH_RQ)
    expect(w.real).toBeCloseTo(REAL_WAGE_GROWTH_RQ, 12)
    expect(w.above).toBe(false)
  })

  it('says « above » once the figure is clearly over the reference, not for a rounding: 0,4 point is the bar', () => {
    expect(realWage(0.021 + REAL_WAGE_GROWTH_RQ + 0.003, 0.021).above).toBe(false)
    expect(realWage(0.021 + REAL_WAGE_GROWTH_RQ + ABOVE_BY, 0.021).above).toBe(true)
    expect(realWage(0.031, 0.021).above).toBe(true) // the old Neutre figure: 1,0 % real
    expect(realWage(0.02, 0.025).above).toBe(false) // below is not a warning
  })
})

describe('the words', () => {
  it('say the two figures they are given, in both languages', () => {
    for (const lang of ['fr', 'en'] as const) {
      const c = REAL_WAGE_COPY[lang]
      const line = c.line('R', 'X')
      expect(line).toContain('R')
      expect(line).toContain('X')
      expect(c.above.trim()).not.toBe('')
    }
    expect(REAL_WAGE_COPY.fr.above).not.toBe(REAL_WAGE_COPY.en.above)
  })
})
