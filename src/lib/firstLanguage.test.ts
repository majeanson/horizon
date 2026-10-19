import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { firstLanguage } from './firstLanguage.ts'

// THE LANGUAGE A VISIT OPENS IN — the saved choice, else the browser's first French or English tag, else French — and the bootstrap that paints
// `<html lang>` before the app runs (public/theme-bootstrap.js), held to the SAME cases: the two cannot import each other.

const CASES: { saved: string | null; browser: string[]; want: 'fr' | 'en'; why: string }[] = [
  { saved: null, browser: ['fr-CA', 'en-CA'], want: 'fr', why: 'a French browser' },
  { saved: null, browser: ['en-US', 'en'], want: 'en', why: 'an English browser' },
  { saved: null, browser: ['EN-gb'], want: 'en', why: 'any case, any region' },
  { saved: null, browser: ['es-MX', 'en-US', 'fr'], want: 'en', why: 'the browser’s own order: English is asked before French' },
  { saved: null, browser: ['de-DE', 'es'], want: 'fr', why: 'neither language: French first' },
  { saved: null, browser: [], want: 'fr', why: 'no list at all' },
  { saved: 'fr', browser: ['en-US'], want: 'fr', why: 'a saved choice always wins' },
  { saved: 'en', browser: ['fr-CA'], want: 'en', why: 'a saved choice always wins' },
  { saved: 'de', browser: ['en-US'], want: 'en', why: 'a saved value that is no language is ignored' },
]

describe('firstLanguage', () => {
  for (const c of CASES) it(c.why + ` (${c.saved ?? '—'} · ${c.browser.join(', ') || '∅'})`, () => expect(firstLanguage(c.saved, c.browser)).toBe(c.want))
})

describe('public/theme-bootstrap.js applies the same rule before the first paint', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
  const script = readFileSync(join(root, 'public/theme-bootstrap.js'), 'utf8')
  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
    document.documentElement.removeAttribute('lang')
  })
  for (const c of CASES) {
    it(c.why, () => {
      if (c.saved !== null) localStorage.setItem('horizon-lang', c.saved)
      vi.spyOn(navigator, 'languages', 'get').mockReturnValue(c.browser)
      vi.spyOn(navigator, 'language', 'get').mockReturnValue(c.browser[0] ?? '')
      new Function(script)()
      expect(document.documentElement.getAttribute('lang')).toBe(c.want)
    })
  }
})
