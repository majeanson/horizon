import { describe, expect, it } from 'vitest'
import { citedLeaves } from '../engine/params/cited.ts'
import { KNOWN } from '../engine/params/index.ts'
import { EN } from '../i18n.en.ts'
import { FR } from '../i18n.ts'
import { PARAM_LABELS } from './paramLabels.ts'
import { displayValue, knownYears, paramRows } from './paramsView.ts'

const fr = (year: number) => paramRows(year, 'fr', FR.results.params.entries)
const en = (year: number) => paramRows(year, 'en', EN.results.params.entries)

describe('the parameters panel shows exactly what the engine reads', () => {
  it('one row per cited figure of each known year, none invented, none dropped — in either language', () => {
    for (const year of knownYears()) {
      const paths = citedLeaves(KNOWN[year]).map((l) => l.path)
      expect(fr(year).map((r) => r.path)).toEqual(paths)
      expect(en(year).map((r) => r.path)).toEqual(paths)
    }
  })

  it('every row names its page, over https, and the day it was read', () => {
    for (const row of fr(knownYears()[0])) {
      expect(row.url, row.path).toMatch(/^https:\/\//)
      expect(row.title, row.path).not.toBe('')
      expect(row.retrieved, row.path).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('an unconfirmed figure carries its reason, a confirmed one carries none', () => {
    const rows = fr(knownYears()[0])
    // Every figure is confirmed today; a reason, when one is written, must be a real sentence (the ratchet in cited.test.ts holds the count).
    for (const r of rows) if (r.verify !== undefined) expect(r.verify.length, r.path).toBeGreaterThan(20)
    expect(rows.some((r) => !r.verify)).toBe(true)
  })

  it('a year with no published figures has no rows', () => {
    expect(fr(1900)).toEqual([])
  })
})

describe('the panel speaks the reader\'s language: the page, and the number', () => {
  const year = knownYears()[0]
  const row = (rows: ReturnType<typeof fr>, path: string) => rows.find((r) => r.path === path)!

  it('a page published in both languages links the French edition to a French reader and the English one to an English reader', () => {
    expect(row(fr(year), 'rrq.mga').url).toContain('/fr/')
    expect(row(fr(year), 'rrq.mga').title).toBe('Le Régime en chiffres')
    expect(row(fr(year), 'rrq.mga').pageLang).toBe('fr')
    expect(row(en(year), 'rrq.mga').url).toContain('/en/')
    expect(row(en(year), 'rrq.mga').title).toBe('Québec Pension Plan Figures')
  })

  it('a page written in French is linked to an English reader through its English edition when there is one', () => {
    // The Québec parameters PDF: AUTFR_… for French, AUTEN_… for English.
    expect(row(fr(year), 'quebec.bpa').url).toContain('AUTFR_')
    expect(row(en(year), 'quebec.bpa').url).toContain('AUTEN_')
    expect(row(en(year), 'quebec.bpa').inReaderLanguage).toBe(true)
  })

  it('a page with NO edition in the reader\'s language is still linked, and marked as not in it', () => {
    // The Finances Québec fiche behind quebec.creditRate has no English edition.
    expect(row(fr(year), 'quebec.creditRate').inReaderLanguage).toBe(true)
    const english = row(en(year), 'quebec.creditRate')
    expect(english.inReaderLanguage).toBe(false)
    expect(english.pageLang).toBe('fr')
    expect(english.url).toMatch(/^https:\/\//)
  })

  it('a row that IS in the reader\'s language is never marked', () => {
    for (const lang of ['fr', 'en'] as const) {
      for (const r of paramRows(year, lang, FR.results.params.entries)) if (r.inReaderLanguage) expect(r.pageLang, `${lang} ${r.path}`).toBe(lang)
    }
  })

  it('numbers are written the way the language writes them: « 1 507,65 » and « 1,507.65 », a year without a grouping space', () => {
    const plain = (s: string) => s.replace(/[  ]/g, ' ')
    expect(plain(row(fr(year), 'rrq.maxPension65').value)).toBe('1 507,65')
    expect(row(en(year), 'rrq.maxPension65').value).toBe('1,507.65')
    expect(row(fr(year), 'rrq.firstFrom').value).toBe('2019')
    expect(row(en(year), 'rrq.firstFrom').value).toBe('2019')
    expect(plain(row(fr(year), 'rrq.rateBase').value)).toBe('0,053')
    expect(row(en(year), 'rrq.rateBase').value).toBe('0.053')
  })

  it('a bracket table reads in the language too, and a long table is worded by the dictionary', () => {
    const plain = (s: string) => s.replace(/[  ]/g, ' ')
    expect(plain(row(fr(year), 'federal.brackets').value)).toContain('58 523 @ 14 %')
    expect(row(en(year), 'federal.brackets').value).toContain('58,523 @ 14%')
    expect(row(fr(year), 'accounts.rrifFactors').value).toMatch(/^25 valeurs: 71 → /)
    expect(row(en(year), 'accounts.rrifFactors').value).toMatch(/^25 entries: 71 → /)
    expect(displayValue(true, 'fr', FR.results.params.entries)).toBe('true')
  })
})

describe('every figure has a human name in both languages', () => {
  it('a label for each cited path, written in its own language — the id is only a footnote', () => {
    for (const year of knownYears()) {
      for (const { path } of citedLeaves(KNOWN[year])) {
        expect(PARAM_LABELS.fr[path], `fr ${path}`).toBeTruthy()
        expect(PARAM_LABELS.en[path], `en ${path}`).toBeTruthy()
        expect(PARAM_LABELS.en[path], path).not.toBe(PARAM_LABELS.fr[path])
      }
    }
  })

  it('no label is left over for a figure the engine no longer reads', () => {
    const paths = new Set(knownYears().flatMap((y) => citedLeaves(KNOWN[y]).map((l) => l.path)))
    for (const labels of [PARAM_LABELS.fr, PARAM_LABELS.en]) for (const key of Object.keys(labels)) expect(paths.has(key), key).toBe(true)
  })
})
