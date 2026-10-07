import { describe, expect, it } from 'vitest'
import { LEVEL_POSITION, type ImpactField } from '../engine/assumptionImpact.ts'
import { FR } from '../i18n.ts'
import { EN } from '../i18n.en.ts'

const FIELDS: readonly ImpactField[] = ['inflation', 'wageGrowth', 'returns', 'horizonAge']

describe('the words that explain it', () => {
  it('every field has a « why it matters » for low, typical and high, and each level a label', () => {
    const i = FR.assumptions.impact
    for (const field of FIELDS) for (const side of ['low', 'typical', 'high'] as const) expect(i.why[field][side].length, `${field} ${side}`).toBeGreaterThan(40)
    for (const level of Object.keys(LEVEL_POSITION)) expect(i.level[level as keyof typeof i.level]).toBeTruthy()
  })

  it('the claims the copy makes are the ones the engine tests pin (returns biggest lever; the horizon changes only the length)', () => {
    const i = FR.assumptions.impact
    expect(i.why.returns.low).toContain('levier le plus puissant')
    expect(i.why.returns.typical).toContain('levier qui pèse le plus')
    for (const side of ['low', 'typical', 'high'] as const) expect(i.why.horizonAge[side]).toContain('avant restent identiques')
    // see presetEffects.test.ts: « the RETURNS are the biggest lever » and « a shorter horizon is exactly the first rows of a longer one »
  })
})

describe('the English copy says the same things', () => {
  it('every sentence is filled, differs from the French, and carries the same two claims', () => {
    for (const field of FIELDS) for (const side of ['low', 'typical', 'high'] as const) {
      expect(EN.assumptions.impact.why[field][side].length, `${field} ${side}`).toBeGreaterThan(40)
      expect(EN.assumptions.impact.why[field][side]).not.toBe(FR.assumptions.impact.why[field][side])
    }
    expect(EN.assumptions.impact.why.returns.low).toContain('most powerful lever')
    for (const side of ['low', 'typical', 'high'] as const) expect(EN.assumptions.impact.why.horizonAge[side]).toContain('before stay identical')
  })
})
