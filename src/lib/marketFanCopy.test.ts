import { describe, expect, it } from 'vitest'
import { FAN_IDS, SHIFT } from '../engine/fan'
import { MARKET_FAN_COPY } from './marketFanCopy'

// The words of « Les marchés, année par année » say the same shift the engine applies, name every line of the fan, and exist in both languages.

describe('the words of the market fan', () => {
  const points = String(Math.round(SHIFT * 100))
  for (const lang of ['fr', 'en'] as const) {
    const c = MARKET_FAN_COPY[lang]
    it(`${lang}: names the shift of the engine, and every line has a name`, () => {
      expect(c.names.lower).toContain(points)
      expect(c.names.higher).toContain(points)
      expect(c.hint).toContain(points)
      for (const id of FAN_IDS) expect(c.names[id].length).toBeGreaterThan(0)
    })
    it(`${lang}: every sentence is non-empty and takes its figures in`, () => {
      expect(c.runsOut(2056)).toContain('2056')
      expect(c.trough('1 000 $', 2060)).toContain('2060')
      expect(c.spread('A', 'B')).toMatch(/A.*B/)
      expect(c.figure(2026, 2087)).toMatch(/2026.*2087/)
    })
  }
  it('the two languages say different things (the English is not the French carried over)', () => {
    expect(MARKET_FAN_COPY.en.title).not.toBe(MARKET_FAN_COPY.fr.title)
    expect(MARKET_FAN_COPY.en.hint).not.toBe(MARKET_FAN_COPY.fr.hint)
  })
})
