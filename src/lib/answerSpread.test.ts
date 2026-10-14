import { describe, expect, it } from 'vitest'
import { answerSpread } from './answerSpread.ts'
import { ANSWER_SPREAD_COPY } from './answerSpreadCopy.ts'
import type { MarketRange } from './marketRange.ts'
import type { PresetRange } from './usePresetEarliest.ts'

// The answer as a range: the big age, and the lowest and highest of what the three scenarios and the market paths give. Null while a search is out or when it says nothing.

const presets = (prudent: number | null, neutral: number | null, bold: number | null): PresetRange => ({ prudent, neutral, bold })
const market = (smooth: number | null, badStart: number | null, lostDecade: number | null, boomBust: number | null): MarketRange => ({ smooth, badStart, lostDecade, boomBust })

describe('the spread of an answer', () => {
  it('is the lowest and the highest age any scenario or market path gives, the page\'s own age included', () => {
    expect(answerSpread(60, presets(64, 60, 58), market(60, 63, 63, 59))).toEqual({ low: 58, high: 64 })
    expect(answerSpread(45, presets(49, 45, 42), market(45, 48, 48, 46))).toEqual({ low: 42, high: 49 })
  })

  it('is open at the top when one of them has no age that works', () => {
    expect(answerSpread(60, presets(null, 60, 58), market(60, 63, 63, 59))).toEqual({ low: 58, high: null })
    expect(answerSpread(60, presets(64, 60, 58), market(60, null, 63, 59))).toEqual({ low: 58, high: null })
  })

  it('a missing age at the bottom is not a low age: the lowest is read among the ages that exist', () => {
    expect(answerSpread(60, presets(64, 60, null), market(60, 62, 62, 59))).toEqual({ low: 59, high: null })
  })

  it('is null while either search is still out', () => {
    expect(answerSpread(60, undefined, market(60, 63, 63, 59))).toBeNull()
    expect(answerSpread(60, presets(64, 60, 58), undefined)).toBeNull()
    expect(answerSpread(60, undefined, undefined)).toBeNull()
  })

  it('is null when every one of them gives the very age shown: a range of one age says nothing', () => {
    expect(answerSpread(60, presets(60, 60, 60), market(60, 60, 60, 60))).toBeNull()
  })

  it('is not null for a single different value, either side of the age', () => {
    expect(answerSpread(60, presets(60, 60, 59), market(60, 60, 60, 60))).toEqual({ low: 59, high: 60 })
    expect(answerSpread(60, presets(61, 60, 60), market(60, 60, 60, 60))).toEqual({ low: 60, high: 61 })
  })

  it('the page\'s age is part of it even when no search gives it (the headline can come from a settled copy of the profile)', () => {
    expect(answerSpread(58, presets(64, 60, 59), market(60, 62, 62, 60))).toEqual({ low: 58, high: 64 })
  })
})

describe('the words', () => {
  it('say the ages they are given, in both languages', () => {
    for (const lang of ['fr', 'en'] as const) {
      const c = ANSWER_SPREAD_COPY[lang]
      expect(c.range(57, 64)).toContain('57')
      expect(c.range(57, 64)).toContain('64')
      expect(c.open(57, 70)).toContain('57')
      expect(c.open(57, 70)).toContain('70')
    }
    expect(ANSWER_SPREAD_COPY.fr.range(1, 2)).not.toBe(ANSWER_SPREAD_COPY.en.range(1, 2))
  })
})
