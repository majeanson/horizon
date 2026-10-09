import { describe, expect, it } from 'vitest'
import { LAST_KNOWN_YEAR } from '../engine/params/index.ts'
import { RESULTS_COPY, longDate } from './resultsCopy.ts'
import { paramsVintage } from './vintage.ts'

describe('what the figures stand on', () => {
  it('names the last known tax year and an ISO day that no cited page was read after', () => {
    const v = paramsVintage()
    expect(v.year).toBe(LAST_KNOWN_YEAR)
    expect(v.newestRead).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
  it('writes the day the way each language does', () => {
    expect(longDate('2026-10-07', 'fr')).toBe('7 octobre 2026')
    expect(longDate('2026-11-01', 'fr')).toBe('1er novembre 2026')
    expect(longDate('2026-10-07', 'en')).toBe('October 7, 2026')
  })
  it('says it once the calendar has moved past the last year Horizon knows', () => {
    for (const lang of ['fr', 'en'] as const) {
      const c = RESULTS_COPY[lang].out
      expect(c.vintageProjected(2026, 2027)).toContain('2027')
      expect(c.vintageProjected(2026, 2027)).toContain('2026')
      expect(c.vintage(2026, longDate('2026-10-07', lang))).toContain('2026')
    }
  })
})
