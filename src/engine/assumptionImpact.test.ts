import { describe, expect, it } from 'vitest'
import { ASSUMPTION_PRESETS, PRESET_KEYS } from './assumptionPresets.ts'
import { impactAnchors, impactOf, LEVEL_POSITION, type ImpactField } from './assumptionImpact.ts'

const FIELDS: readonly ImpactField[] = ['inflation', 'wageGrowth', 'returns', 'horizonAge']

describe('the impact of an assumption — where it sits against the three scenarios, and which way it leans', () => {
  it('the anchors are the prudent / neutral / bold values, ascending (returns: the mean of the three accounts)', () => {
    expect(impactAnchors('inflation')).toEqual([0.02, 0.021, 0.025])
    expect(impactAnchors('wageGrowth')).toEqual([0.025, 0.031, 0.035])
    expect(impactAnchors('horizonAge')).toEqual([90, 95, 100])
    const [lo, mid, hi] = impactAnchors('returns')
    expect(lo).toBeCloseTo((0.03 + 0.03 + 0.025) / 3, 12)
    expect(mid).toBeCloseTo((0.045 + 0.045 + 0.04) / 3, 12)
    expect(hi).toBeCloseTo((0.06 + 0.06 + 0.055) / 3, 12)
  })

  it('each scenario\'s own value lands where its name says: neutral is typical, prudent is cautious, bold is optimistic', () => {
    for (const field of FIELDS) {
      const v = (k: (typeof PRESET_KEYS)[number]) => {
        const p = ASSUMPTION_PRESETS[k]
        return field === 'returns' ? (p.returns.rrsp + p.returns.tfsa + p.returns.nonReg) / 3 : p[field]
      }
      expect(impactOf(field, v('neutral')), `${field} neutral`).toEqual({ level: 'typical', tilt: 'middle' })
      expect(impactOf(field, v('prudent')).tilt, `${field} prudent`).toBe('cautious')
      expect(impactOf(field, v('bold')).tilt, `${field} bold`).toBe('optimistic')
    }
  })

  it('« high » is about the number, the lean is about the plan: a high return is optimistic, a high inflation or a long life is cautious', () => {
    expect(impactOf('returns', 0.07)).toEqual({ level: 'above', tilt: 'optimistic' })
    expect(impactOf('returns', 0.01)).toEqual({ level: 'below', tilt: 'cautious' })
    expect(impactOf('inflation', 0.04)).toEqual({ level: 'above', tilt: 'cautious' })
    expect(impactOf('inflation', 0.01)).toEqual({ level: 'below', tilt: 'optimistic' })
    expect(impactOf('wageGrowth', 0.05)).toEqual({ level: 'above', tilt: 'optimistic' })
    expect(impactOf('horizonAge', 105)).toEqual({ level: 'above', tilt: 'cautious' })
    expect(impactOf('horizonAge', 85)).toEqual({ level: 'below', tilt: 'optimistic' })
  })

  it('between the anchors the level is the nearest band: low up to the first midpoint, typical to the second, then high', () => {
    expect(impactOf('horizonAge', 90).level).toBe('low')
    expect(impactOf('horizonAge', 92).level).toBe('low')
    expect(impactOf('horizonAge', 93).level).toBe('typical')
    expect(impactOf('horizonAge', 97).level).toBe('typical')
    expect(impactOf('horizonAge', 98).level).toBe('high')
    expect(impactOf('horizonAge', 100).level).toBe('high')
  })

  it('a float-noisy typed value (2,1 → 2.1 / 100) is still the neutral one, and the range\'s two ends are not « beyond » it', () => {
    expect(impactOf('inflation', 2.1 / 100).level).toBe('typical')
    expect(impactOf('inflation', 0.02).level).toBe('low')
    expect(impactOf('inflation', 0.025).level).toBe('high')
  })

  it('the level never falls as the number rises, over a fine sweep of every field', () => {
    for (const field of FIELDS) {
      const [lo, , hi] = impactAnchors(field)
      const span = hi - lo
      let last = -1
      for (let i = 0; i <= 200; i++) {
        const v = lo - span + (span * 3 * i) / 200
        const pos = LEVEL_POSITION[impactOf(field, v).level]
        expect(pos, `${field} ${v}`).toBeGreaterThanOrEqual(last)
        last = pos
      }
      expect(last).toBe(4)
    }
  })
})
