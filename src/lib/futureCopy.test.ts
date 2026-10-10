import { describe, expect, it } from 'vitest'
import { FUTURE_COPY, type FutureCopy } from './futureCopy.ts'

// The words of « Préparer l'avenir » live outside the eager dictionaries, so the dictionary parity test does not see them. This one does
// the same job for them: every text present in both languages, none empty, none left in the other language.

const { fr, en } = FUTURE_COPY

/** Every text the copy can print, rendered with sample arguments. */
function texts(c: FutureCopy): [string, string][] {
  const out: [string, string][] = [['title', c.title]]
  for (const [k, v] of Object.entries(c.care)) {
    if (typeof v === 'string') out.push([`care.${k}`, v])
  }
  out.push(
    ['care.age', c.care.age(85)],
    ['care.yearsOf.1', c.care.yearsOf(1)],
    ['care.yearsOf.n', c.care.yearsOf(10)],
    ['care.none', c.care.none(95)],
    ['care.same', c.care.same(59)],
    ['care.later.base', c.care.later(c.care.yearsOf(2), 61, 59)],
    ['care.later.nobase', c.care.later(c.care.yearsOf(2), 61, null)],
    ['care.leaves', c.care.leaves('900 k$', '1,2 M$')],
    ['care.short', c.care.short(59, '2051')],
    ['care.holds', c.care.holds(59)],
    ['care.full', c.care.full(20)],
    ['care.starts', c.care.starts('2051 (85)')],
  )
  for (const [k, v] of Object.entries(c.year)) out.push([`year.${k}`, v])
  return out
}

describe('the « Préparer l’avenir » copy, in both languages', () => {
  it('has the same keys and nothing empty', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort())
    expect(Object.keys(en.care).sort()).toEqual(Object.keys(fr.care).sort())
    expect(Object.keys(en.year).sort()).toEqual(Object.keys(fr.year).sort())
    for (const c of [fr, en]) for (const [k, v] of texts(c)) expect(v.trim().length, k).toBeGreaterThan(0)
  })

  it('English is not French pasted in: every sentence-length text differs between the languages', () => {
    const frTexts = new Map(texts(fr))
    for (const [k, v] of texts(en)) if (v.length > 30) expect(v, k).not.toBe(frTexts.get(k))
  })

  it('says the figures it was given', () => {
    expect(fr.care.later(fr.care.yearsOf(2), 61, 59)).toContain('2 ans plus tard')
    expect(fr.care.later(fr.care.yearsOf(2), 61, 59)).toContain('61')
    expect(fr.care.later(fr.care.yearsOf(2), 61, 59)).toContain('59')
    expect(en.care.later(en.care.yearsOf(1), 60, 59)).toContain('1 year later')
    expect(fr.care.none(95)).toContain('95')
    expect(fr.care.short(59, '2051')).toContain('2051')
  })
})

describe('canary: the « not French pasted in » check can fail', () => {
  it('French used as the English copy is caught by the very comparison the real test makes', () => {
    const frTexts = new Map(texts(fr))
    const pastedIn = texts(fr).filter(([k, v]) => v.length > 30 && v === frTexts.get(k))
    expect(pastedIn.length).toBeGreaterThan(5)
    const real = texts(en).filter(([k, v]) => v.length > 30 && v === frTexts.get(k))
    expect(real).toEqual([])
  })
})
