import { describe, expect, it } from 'vitest'
import type { Bracket, Cited, Source } from './cited.ts'
import { renderSourcesMd, renderValue } from './sourcesMd.ts'

const SRC = (n: number): Source => ({ url: `https://www.canada.ca/page-${n}`, title: `Page ${n} | with a pipe`, retrieved: `2026-10-0${n}` })
const c = <T>(value: T, n: number, index: Cited<T>['index'] = 'cpi', extra: Partial<Cited<T>> = {}): Cited<T> => ({ value, source: SRC(n), index, ...extra })

const tree = {
  year: 2026,
  rrq: { mga: c(74600, 1, 'wage', { round: 100 }), rate: c(0.063, 1, 'fixed') },
  federal: { brackets: c<Bracket[]>([{ upTo: 58523, rate: 0.14 }, { upTo: null, rate: 0.33 }], 2, 'cpi', { round: 1 }) },
}
const history: Cited<Record<number, number>> = {
  value: { 2024: 68500, 2025: 71300, 2026: 74600 },
  source: { ...SRC(3), note: 'Table des gains maximums | admissibles' },
  index: 'none',
}

describe('renderValue()', () => {
  it('groups thousands with a space and keeps the decimal point exact', () => {
    expect(renderValue(74600)).toBe('74 600')
    expect(renderValue(1507.65)).toBe('1 507.65')
    expect(renderValue(0.063)).toBe('0.063')
    expect(renderValue(-1234)).toBe('-1 234')
  })

  it('prints a scale as thresholds and rates, with an open top', () => {
    expect(renderValue([{ upTo: 58523, rate: 0.14 }, { upTo: null, rate: 0.33 }])).toBe('58 523 @ 14 % · ∞ @ 33 %')
  })

  it('summarises a long numeric table by its ends, and prints a short one in full', () => {
    const long = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [71 + i, (i + 1) / 100]))
    expect(renderValue(long)).toBe('25 entries: 71 → 0.01 … 95 → 0.25')
    expect(renderValue({ 71: 0.0528, 72: 0.054 })).toBe('71: 0.0528 · 72: 0.054')
  })
})

describe('renderSourcesMd()', () => {
  const md = renderSourcesMd({ years: { 2026: tree }, series: [{ name: 'rrq.mgaHistory', cited: history }] })

  it('is deterministic — same input, same bytes', () => {
    expect(renderSourcesMd({ years: { 2026: tree }, series: [{ name: 'rrq.mgaHistory', cited: history }] })).toBe(md)
  })

  it('renders one row per cited leaf, with the path, the value and the official page as a link', () => {
    expect(md).toContain('| `rrq.mga` | 74 600 |')
    expect(md).toContain('https://www.canada.ca/page-1')
    expect(md).toContain('| `federal.brackets` | 58 523 @ 14 % · ∞ @ 33 % |')
    expect(md).toContain('3 paramètres.')
  })

  it('says how each figure moves, including its official rounding', () => {
    expect(md).toContain('salaires · arrondi 100')
    expect(md).toContain('| fixe |')
    expect(md).toContain('observation')
  })

  it('never lets a pipe in a title or a note break the table', () => {
    expect(md).toContain('Page 1 \\| with a pipe')
    expect(md).toContain('Table des gains maximums \\| admissibles')
    for (const line of md.split('\n').filter((l) => l.startsWith('| `'))) {
      expect(line.replace(/\\\|/g, '').split('|').length, line).toBe(8) // 6 cells → 7 pipes → 8 parts
    }
  })

  it('lists each official page once, with how many figures lean on it and when it was last read', () => {
    expect(md).toContain('## Pages consultées')
    expect(md).toMatch(/\| \[Page 1 \\\| with a pipe\]\(https:\/\/www\.canada\.ca\/page-1\) \| 2 \| 2026-10-01 \|/)
    expect(md).toContain('3 pages officielles.')
  })

  it('lists the years in ascending order, with the cross-year series last before the page index', () => {
    const two = renderSourcesMd({ years: { 2027: tree, 2026: tree }, series: [{ name: 'h', cited: history }] })
    expect(two.indexOf('## 2026')).toBeLessThan(two.indexOf('## 2027'))
    expect(two.indexOf('## 2027')).toBeLessThan(two.indexOf('## Séries historiques'))
    expect(two.indexOf('## Séries historiques')).toBeLessThan(two.indexOf('## Pages consultées'))
  })

  it('flags a figure that could not be confirmed on a page the reader can open, with the reason on the row and a count in the year', () => {
    const flagged = { ...tree, federal: { brackets: { ...tree.federal.brackets, source: { ...SRC(2), verify: 'lu par une copie archivée' } } } }
    const out = renderSourcesMd({ years: { 2026: flagged }, series: [] })
    expect(out).toContain('**⚠ À VÉRIFIER :** lu par une copie archivée')
    expect(out).toContain('3 paramètres, dont **1 à vérifier**.')
    expect(md).not.toContain('À VÉRIFIER :')
    expect(md).toContain('3 paramètres.')
  })

  it('omits the series section when there is no series', () => {
    expect(renderSourcesMd({ years: { 2026: tree }, series: [] })).not.toContain('Séries historiques')
  })
})

describe('renderSourcesMd() — the English edition', () => {
  // Real entries of twins.ts: a French-first page with an English twin, an English-first page with a French twin, a French-only page.
  const FR_FIRST = 'https://cdn-contenu.quebec.ca/cdn-contenu/adm/min/finances/publications-adm/parametres/AUTFR_RegimeImpot2026.pdf'
  const EN_FIRST = 'https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-118.html'
  const FR_ONLY = 'https://www.budget.finances.gouv.qc.ca/budget/outils/depenses-fiscales/fiches/fiche-110906.asp'
  const at = (url: string, title: string): Cited<number> => ({ value: 1, source: { url, title, retrieved: '2026-10-01' }, index: 'fixed' })
  const real = { frFirst: at(FR_FIRST, 'Paramètres français'), enFirst: at(EN_FIRST, 'Income Tax Act, section 118'), frOnly: at(FR_ONLY, 'Fiche française') }
  const rowOf = (md: string, path: string) => md.split('\n').find((l) => l.startsWith(`| \`${path}\``))!

  const mdEn = renderSourcesMd({ years: { 2026: tree }, series: [{ name: 'rrq.mgaHistory', cited: history }] }, 'en')

  it('prints the same rows with English headings, English numbers and English index words', () => {
    expect(mdEn).toContain('# SOURCES.en.md')
    expect(mdEn).toContain('| Parameter | Value | Official page | Read on | Moves with | Note |')
    expect(mdEn).toContain('| `rrq.mga` | 74,600 |')
    expect(mdEn).toContain('| `federal.brackets` | 58,523 @ 14% · ∞ @ 33% |')
    expect(mdEn).toContain('wages · rounded to 100')
    expect(mdEn).toContain('3 parameters.')
    expect(mdEn).toContain('## Historical series')
    expect(mdEn).toContain('## Pages consulted')
    expect(mdEn).toContain('3 official pages.')
    expect(mdEn).not.toContain('paramètres')
  })

  it('links the English edition of a page first and the French one beside it — whichever language the page was cited in', () => {
    const out = renderSourcesMd({ years: { 2026: real }, series: [] }, 'en')
    // cited in French → its English twin is shown, the French page is the « version française » link
    expect(rowOf(out, 'frFirst')).toMatch(/^\| `frFirst` \| 1 \| \[[^\]]+\]\((?!https:\/\/cdn-contenu[^)]*AUTFR)[^)]+\) · \[version française\]\(https:\/\/cdn-contenu[^)]*AUTFR_RegimeImpot2026\.pdf\)/)
    // cited in English → shown as is, the French twin beside it
    expect(rowOf(out, 'enFirst')).toContain(`[Income Tax Act, section 118](${EN_FIRST}) · [version française](https://laws-lois.justice.gc.ca/fra/`)
    // the French edition of the document keeps the page as cited, with its twin beside it (unchanged behaviour)
    expect(rowOf(renderSourcesMd({ years: { 2026: real }, series: [] }), 'enFirst')).toContain(`[Income Tax Act, section 118](${EN_FIRST}) · [version française](`)
  })

  it('links a page that exists in French only as it is, and says so', () => {
    const out = renderSourcesMd({ years: { 2026: real }, series: [] }, 'en')
    expect(rowOf(out, 'frOnly')).toContain(`[Fiche française](${FR_ONLY}) (French-language page only)`)
    expect(rowOf(out, 'frOnly')).not.toContain('version française')
  })

  it('flags an unconfirmed figure in English too', () => {
    const flagged = { ...tree, federal: { brackets: { ...tree.federal.brackets, source: { ...SRC(2), verify: 'read from an archived copy' } } } }
    const out = renderSourcesMd({ years: { 2026: flagged }, series: [] }, 'en')
    expect(out).toContain('**⚠ TO VERIFY:** read from an archived copy')
    expect(out).toContain('3 parameters, of which **1 to verify**.')
  })

  it('never lets a pipe break the table, and has exactly the French edition’s rows', () => {
    for (const line of mdEn.split('\n').filter((l) => l.startsWith('| `'))) expect(line.replace(/\\\|/g, '').split('|').length, line).toBe(8)
    const fr = renderSourcesMd({ years: { 2026: tree }, series: [{ name: 'rrq.mgaHistory', cited: history }] })
    const pathsOf = (md: string) => md.split('\n').filter((l) => l.startsWith('| `')).map((l) => l.split('|')[1])
    expect(pathsOf(mdEn)).toEqual(pathsOf(fr))
  })

  it('is deterministic, and the default edition stays French', () => {
    expect(renderSourcesMd({ years: { 2026: tree }, series: [{ name: 'rrq.mgaHistory', cited: history }] }, 'en')).toBe(mdEn)
    expect(renderSourcesMd({ years: { 2026: tree }, series: [] })).toContain('# SOURCES.md — chaque chiffre')
  })
})
