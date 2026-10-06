import { describe, expect, it } from 'vitest'
import { formatInt, formatPct, formatYear, parsePct } from './format'

const visible = (s: string) => s.replace(/[\s  ]/g, ' ')

describe('formatInt / formatYear / formatPct (cached formatters)', () => {
  it('groups an integer by the language\'s convention', () => {
    expect(visible(formatInt(1234567, 'fr'))).toBe('1 234 567')
    expect(formatInt(1234567, 'en')).toBe('1,234,567')
  })

  it('never groups a year — « 2 026 » would be a bug, not a number', () => {
    expect(formatYear(2026, 'fr')).toBe('2026')
    expect(formatYear(2026, 'en')).toBe('2026')
  })

  it('prints a fraction as a percentage with the requested number of decimals', () => {
    expect(visible(formatPct(0.0525, 'fr', 2))).toBe('5,25 %')
    expect(formatPct(0.0525, 'en', 2)).toBe('5.25%')
    expect(visible(formatPct(0.02, 'fr'))).toBe('2,0 %')
  })

  it('answers an empty string for nothing to show', () => {
    for (const v of [null, undefined, NaN, Infinity]) {
      expect(formatInt(v, 'fr')).toBe('')
      expect(formatYear(v, 'fr')).toBe('')
      expect(formatPct(v, 'fr')).toBe('')
    }
  })
})

describe('parsePct (a typed percentage → a fraction)', () => {
  it.each([
    ['2,5', 0.025],
    ['2.5', 0.025],
    ['2,5 %', 0.025],
    ['5,25', 0.0525],
    ['0', 0],
    ['100', 1],
  ])('reads %j as %d', (input, expected) => {
    expect(parsePct(input)).toBeCloseTo(expected, 8)
  })

  it('answers null for nothing and for words', () => {
    for (const bad of ['', '   ', 'abc', '%']) expect(parsePct(bad)).toBeNull()
  })

  it('round-trips with formatPct', () => {
    expect(parsePct(formatPct(0.0525, 'fr', 2))).toBeCloseTo(0.0525, 8)
  })
})
