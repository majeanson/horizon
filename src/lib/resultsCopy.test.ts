import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { RESULTS_COPY } from './resultsCopy.ts'

// The words of the results page that live outside the eager dictionaries (a budget reason: resultsCopy.ts), so the
// dictionary parity test does not see them. English is TYPED as the French (the shapes cannot drift); this holds the texts.

const { fr, en } = RESULTS_COPY

/** Every text, rendered with sample arguments (functions get small numbers and names). */
function texts(o: unknown, path = ''): [string, string][] {
  if (typeof o === 'string') return [[path, o]]
  if (typeof o === 'function') {
    const f = o as (...a: unknown[]) => unknown
    const tries: unknown[][] = [[3, 'Camille', 4, 5], [62, 'Prudent', 70], [3, true], ['3 %', 2040], [null, 'Prudent', 70], ['Camille', 61, 'Alex', 58], [50, 2030]]
    for (const args of tries) {
      try {
        const v = f(...args)
        if (typeof v === 'string' && v.length > 0) return [[path, v]]
      } catch {
        /* try the next shape of arguments */
      }
    }
    return [[path, '']]
  }
  if (o && typeof o === 'object') return Object.entries(o).flatMap(([k, v]) => texts(v, path ? `${path}.${k}` : k))
  return []
}

describe('the results-page copy, in both languages', () => {
  const f = texts(fr)
  const e = texts(en)

  it('has the same texts in both languages and none is empty', () => {
    expect(e.map(([k]) => k).sort()).toEqual(f.map(([k]) => k).sort())
    expect(f.length).toBeGreaterThan(30) // a floor: an empty export cannot pass
    for (const [k, v] of [...f, ...e]) expect(v.trim().length, k).toBeGreaterThan(0)
  })

  it('English is not French pasted in: every sentence-length text differs', () => {
    const frTexts = new Map(f)
    for (const [k, v] of e) if (v.length > 30) expect(v, k).not.toBe(frTexts.get(k))
  })

  it('says what the engine pins: « even at 70 » (the oldest age tried works for nobody), and the range names no preset itself', () => {
    expect(fr.headline.none(70)).toContain('même à 70 ans')
    expect(en.headline.none(70)).toContain('even at 70')
    expect(fr.headline.none(70)).not.toContain('avant 70')
    // The preset names are written ONCE, in the dictionary (`assumptions.presets`): the range row's own copy
    // holds only the heading and the two figure shapes, never a preset name.
    for (const c of [fr, en]) {
      for (const text of [c.headline.rangeTitle, c.headline.rangeAge(62), c.headline.rangeNone(70)]) {
        expect(text).not.toMatch(/Prudent|Neutre|Audacieux|Conservative|Neutral|Bold/i)
      }
    }
  })

  it('carries the answer’s range while figures are estimates, and the open end says so', () => {
    expect(fr.headline.confidenceRange(58, 63, 3, 20)).toMatch(/Entre 58 et 63 ans.*3 sur 20 confirmés/)
    expect(en.headline.confidenceRange(58, 63, 3, 20)).toMatch(/Between age 58 and 63.*3 of 20 confirmed/)
    expect(fr.headline.confidenceRangeOpen(58, 70, 3, 20)).toContain('peut-être aucun âge avant 70')
    expect(en.headline.confidenceRangeOpen(58, 70, 3, 20)).toContain('possibly no age before 70')
  })

  it('frames each « Préciser » figure as how much confirming it narrows the answer', () => {
    expect(fr.refine.swing(1)).toBe('resserre la réponse d’environ 1 an')
    expect(fr.refine.swing(3)).toBe('resserre la réponse d’environ 3 ans')
    expect(en.refine.swing(1)).toBe('narrows the answer by about 1 year')
    expect(en.refine.swing(3)).toBe('narrows the answer by about 3 years')
  })

  it('never hard-codes the engine’s nudge size: it arrives as an argument', () => {
    const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'resultsCopy.ts'), 'utf8')
    expect(src).not.toMatch(/15[\s\u00a0\u202f]*%/)
    expect(fr.refine.movesHint('X')).toContain('X')
    expect(en.refine.movesHint('X')).toContain('X')
  })

  it('names the tax in the stop-working answer: the pensions are counted AFTER tax', () => {
    expect(fr.questions.stop.share('50 %', '2040')).toContain('après impôt')
    expect(en.questions.stop.share('50%', '2040')).toContain('after tax')
  })
})
