import { describe, expect, it } from 'vitest'
import { ONBOARD_COPY, type OnboardCopy } from './onboardCopy.ts'

// The first visit's words live outside the eager dictionaries (onboardCopy.ts), so i18nParity does not see them: every text is present in both
// languages, non-empty, and not left in the other language; the quick path's assumption lines say « assumed », never an answer.

const { fr, en } = ONBOARD_COPY

/** Every string in a copy tree, functions called with trial arguments. */
const texts = (c: unknown, path = ''): [string, string][] => {
  if (typeof c === 'string') return [[path, c]]
  if (typeof c === 'function') return [[path, (c as (...a: unknown[]) => string)(3, 7, 'X')]]
  return Object.entries(c as object).flatMap(([k, v]) => texts(v, path ? `${path}.${k}` : k))
}
const keys = (c: unknown, path = ''): string[] => (typeof c === 'object' && c !== null ? Object.entries(c).flatMap(([k, v]) => keys(v, path ? `${path}.${k}` : k)) : [path])

describe('the first-visit copy', () => {
  it('has the same keys in both languages, every text non-empty', () => {
    expect(keys(en).sort()).toEqual(keys(fr).sort())
    for (const c of [fr, en] as OnboardCopy[]) for (const [k, t] of texts(c)) expect(t.trim(), k).not.toBe('')
  })
  it('puts every argument it is given into the sentence', () => {
    for (const c of [fr, en]) {
      expect(c.done.assumed.retire(63, null)).toContain('63')
      const couple = c.done.assumed.retire(63, 61)
      expect(couple).toContain('63')
      expect(couple).toContain('61')
    }
  })
  it('says the quick path’s departure age is assumed, in words the answered summary does not use', () => {
    expect(fr.done.assumed.retire(65, null)).toMatch(/supposé/)
    expect(en.done.assumed.retire(65, null)).toMatch(/assumed/)
    expect(fr.done.assumed.retire(65, null)).not.toBe(fr.done.summary.retire(65))
    expect(en.done.assumed.retire(65, null)).not.toBe(en.done.summary.retire(65))
  })
  it('is not left in the other language', () => {
    for (const [k, t] of texts(en)) expect(t, k).not.toMatch(/ votre | vous |Préciser|supposé/)
    for (const [k, t] of texts(fr)) expect(t, k).not.toMatch(/ the | your |We assumed/)
  })
  it('translates the quick path’s own lines', () => {
    expect(en.done.refineQuick).not.toBe(fr.done.refineQuick)
    expect(en.done.assumed.skipped).not.toBe(fr.done.assumed.skipped)
  })
})
