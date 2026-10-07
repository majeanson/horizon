import { citedLeaves, type Bracket, type Cited } from './cited.ts'
import { TWINS, pageFor } from './twins.ts'

// SOURCES.md and SOURCES.en.md, rendered from the params files — never hand-written.
//
// The point of citing every figure is that a stranger can check it. A stranger will not read
// a TypeScript tree; they will read one table per year: figure · value · the official page,
// by title and link · the day it was read · how it moves. That table is GENERATED from the same
// objects the engine reads (`npm run sources`), and a test fails the build when the committed
// file differs from what the objects would print — so the document cannot drift from the code,
// and the code cannot quietly change a figure without the diff showing in SOURCES.md.
//
// Two editions, one source: the French file (SOURCES.md) and the English file (SOURCES.en.md) print the SAME rows;
// the English one links each page's English edition first (twins.ts) and writes numbers the English way. A note is the
// official page's own wording and is printed as written, whichever language that page is in.
//
// Pure and dependency-free: it runs under Node (scripts/gen-sources.ts) and under Vitest alike.

export interface SourcesInput {
  /** Year → its params tree (a tree whose leaves are `Cited`). */
  years: Readonly<Record<number, unknown>>
  /** Cross-year series — a historical table that belongs to no single year. */
  series: ReadonlyArray<{ name: string; cited: Cited<unknown> }>
}

/** The two editions of the document. */
export type SourcesLang = 'fr' | 'en'

const spaced = (n: number, lang: SourcesLang = 'fr'): string => {
  const [int, dec] = String(n).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, lang === 'fr' ? ' ' : ',')
  return dec === undefined ? grouped : `${grouped}.${dec}`
}

/** A compact, exact, human-checkable rendering of any cited value. */
export function renderValue(v: unknown, lang: SourcesLang = 'fr'): string {
  if (typeof v === 'number') return spaced(v, lang)
  if (typeof v === 'string' || typeof v === 'boolean') return String(v)
  const percent = lang === 'fr' ? ' %' : '%'
  if (Array.isArray(v) && v.length > 0 && v.every((b) => typeof b === 'object' && b !== null && 'rate' in b && 'upTo' in b)) {
    return (v as Bracket[]).map((b) => `${b.upTo === null ? '∞' : spaced(b.upTo, lang)} @ ${+(b.rate * 100).toFixed(4)}${percent}`).join(' · ')
  }
  if (typeof v === 'object' && v !== null) {
    const entries = Object.entries(v as Record<string, unknown>)
    const keys = entries.map(([k]) => k)
    const numericKeys = keys.every((k) => /^\d+$/.test(k))
    if (numericKeys && entries.length > 6) {
      const first = entries[0]
      const last = entries[entries.length - 1]
      return `${entries.length} entries: ${first[0]} → ${renderValue(first[1], lang)} … ${last[0]} → ${renderValue(last[1], lang)}`
    }
    return entries.map(([k, x]) => `${k}: ${renderValue(x, lang)}`).join(' · ')
  }
  return String(v)
}

// A Markdown table cell may not contain a raw pipe or a line break.
const cell = (s: string): string => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')

// Every sentence the generator itself writes, per edition. (The titles and notes come from the params, verbatim.)
const W = {
  fr: {
    index: { cpi: 'prix (IPC)', wage: 'salaires', fixed: 'fixe', none: 'observation' } as Record<Cited['index'], string>,
    rounded: 'arrondi',
    header: '| Paramètre | Valeur | Page officielle | Relevé le | Évolue avec | Note |\n| --- | --- | --- | --- | --- | --- |',
    otherEdition: (pageLang: 'fr' | 'en') => (pageLang === 'fr' ? 'version française' : 'English version'),
    onlyIn: 'page en français seulement',
    flag: '**⚠ À VÉRIFIER :**',
    count: (n: number, bad: number) => `${n} paramètres${bad ? `, dont **${bad} à vérifier**` : ''}.`,
    series: 'Séries historiques',
    pages: 'Pages consultées',
    pagesLead: (n: number) => `${n} pages officielles. Une page citée par beaucoup de chiffres est une page à relire en premier.`,
    pagesHeader: '| Page officielle | Chiffres | Dernière lecture |\n| --- | --- | --- |',
  },
  en: {
    index: { cpi: 'prices (CPI)', wage: 'wages', fixed: 'fixed', none: 'observation' } as Record<Cited['index'], string>,
    rounded: 'rounded to',
    header: '| Parameter | Value | Official page | Read on | Moves with | Note |\n| --- | --- | --- | --- | --- | --- |',
    otherEdition: (pageLang: 'fr' | 'en') => (pageLang === 'fr' ? 'version française' : 'English version'),
    onlyIn: 'French-language page only',
    flag: '**⚠ TO VERIFY:**',
    count: (n: number, bad: number) => `${n} parameters${bad ? `, of which **${bad} to verify**` : ''}.`,
    series: 'Historical series',
    pages: 'Pages consulted',
    pagesLead: (n: number) => `${n} official pages. A page cited by many figures is the first one to re-read.`,
    pagesHeader: '| Official page | Figures | Last read |\n| --- | --- | --- |',
  },
} as const

/**
 * The page cell of a row. French edition: the page as cited, with its twin beside it. English edition: the page's
 * ENGLISH edition first (its own, or its twin), the French edition beside it, and a page that exists in French only is
 * linked as it is and labelled.
 */
function pageCell(source: { url: string; title: string }, lang: SourcesLang): string {
  const w = W[lang]
  const entry = TWINS[source.url]
  if (lang === 'fr') {
    const twin = entry?.twin ? ` · [${w.otherEdition(entry.lang === 'en' ? 'fr' : 'en')}](${entry.twin.url})` : ''
    return `[${cell(source.title)}](${source.url})${twin}`
  }
  const shown = pageFor(source, 'en')
  // the French edition, when there is one and it is not the page being shown
  const french = entry?.lang === 'fr' ? (entry.twin ? source.url : null) : entry?.twin ? entry.twin.url : null
  const label = shown.inReaderLanguage ? '' : ` (${w.onlyIn})`
  return `[${cell(shown.title)}](${shown.url})${french ? ` · [${w.otherEdition('fr')}](${french})` : ''}${label}`
}

function rows(leaves: { path: string; cited: Cited<unknown> }[], lang: SourcesLang): string[] {
  const w = W[lang]
  return leaves.map(({ path, cited: c }) => {
    const idx = w.index[c.index] + (c.round === undefined ? '' : ` · ${w.rounded} ${c.round}`)
    const note = [c.source.verify ? `${w.flag} ${c.source.verify}` : '', c.source.note ?? ''].filter(Boolean).join(' ')
    return `| \`${path}\` | ${cell(renderValue(c.value, lang))} | ${pageCell(c.source, lang)} | ${c.source.retrieved} | ${idx} | ${cell(note)} |`
  })
}

function preamble(lang: SourcesLang): string[] {
  if (lang === 'en') {
    return [
      '# SOURCES.en.md — every government figure, and the page it was read on',
      '',
      '> **Generated** by `npm run sources` out of `src/engine/params/` — do not edit by hand.',
      '> A test (`sourcesMd.test.ts`) fails if this file differs from what the code would print.',
      '> The French edition is [`SOURCES.md`](./SOURCES.md): same rows, same figures.',
      '>',
      '> Each row is a value the engine reads, the official page it was read on (title and link as printed), the day it',
      '> was read, and how it moves from one year to the next when no official page yet covers the year in question',
      '> (*prices* = indexed to the CPI, *wages* = indexed to wages, *fixed* = a legal constant, *observation* = a',
      '> historical series, never projected).',
      '> **To cross-check:** open the link, find the quoted line, compare the value. Each page is linked in its English',
      '> edition; where the agency also publishes it in French, that edition is linked beside it (« version française »).',
      '> A page the agency publishes in French only is linked as it is and labelled. A note is the official page’s own wording,',
      '> printed as written, so some notes are in French.',
      '> A row marked **⚠ TO VERIFY** could not be confirmed on a page you can open and compare (an archived copy, a value',
      '> derived by calculation, a summary rather than the page): the reason is written on the row.',
      '',
    ]
  }
  return [
    '# SOURCES.md — chaque chiffre du gouvernement, et d’où il vient',
    '',
    '> **Généré** par `npm run sources` à partir de `src/engine/params/` — ne pas éditer à la main.',
    '> Un test (`sourcesMd.test.ts`) échoue si ce fichier diffère de ce que le code imprimerait.',
    '> L’édition anglaise est [`SOURCES.en.md`](./SOURCES.en.md) : mêmes lignes, mêmes chiffres.',
    '>',
    '> Chaque ligne est une valeur que le moteur lit, la page officielle où elle a été lue (titre et lien tels',
    '> qu’imprimés), le jour de la lecture, et la façon dont elle évolue d’une année à l’autre quand aucune page',
    '> officielle ne couvre encore l’année visée (*prix* = indexée à l’IPC, *salaires* = indexée aux salaires,',
    '> *fixe* = constante légale, *observation* = série historique, jamais projetée).',
    '> **Pour contre-vérifier :** ouvrez le lien, trouvez la ligne citée, comparez la valeur. Quand l’organisme publie la page',
    '> dans l’autre langue, la seconde édition est liée à côté (« version française » / « English version »).',
    '> Une ligne marquée **⚠ À VÉRIFIER** n’a pas pu être confirmée sur une page que vous pouvez ouvrir et comparer (copie archivée,',
    '> valeur dérivée par calcul, résumé plutôt que page) : la raison est écrite sur la ligne.',
    '',
  ]
}

export function renderSourcesMd({ years, series }: SourcesInput, lang: SourcesLang = 'fr'): string {
  const w = W[lang]
  const out: string[] = preamble(lang)

  const yearList = Object.keys(years).map(Number).sort((a, b) => a - b)
  const allLeaves: { path: string; cited: Cited<unknown> }[] = []

  for (const y of yearList) {
    const leaves = citedLeaves(years[y])
    allLeaves.push(...leaves)
    out.push(`## ${y}`)
    out.push('')
    const unverified = leaves.filter((l) => l.cited.source.verify).length
    out.push(w.count(leaves.length, unverified))
    out.push('')
    out.push(w.header)
    out.push(...rows(leaves, lang))
    out.push('')
  }

  if (series.length > 0) {
    out.push(`## ${w.series}`)
    out.push('')
    out.push(w.header)
    const leaves = series.map((s) => ({ path: s.name, cited: s.cited }))
    allLeaves.push(...leaves)
    out.push(...rows(leaves, lang))
    out.push('')
  }

  // The pages themselves: how many figures lean on each, and when it was last read.
  const byUrl = new Map<string, { title: string; count: number; latest: string }>()
  for (const { cited: c } of allLeaves) {
    const cur = byUrl.get(c.source.url)
    if (!cur) byUrl.set(c.source.url, { title: c.source.title, count: 1, latest: c.source.retrieved })
    else {
      cur.count++
      if (c.source.retrieved > cur.latest) cur.latest = c.source.retrieved
    }
  }
  out.push(`## ${w.pages}`)
  out.push('')
  out.push(w.pagesLead(byUrl.size))
  out.push('')
  out.push(w.pagesHeader)
  for (const [url, v] of [...byUrl].sort((a, b) => a[0].localeCompare(b[0]))) {
    // The row is keyed by the page as cited; the English edition shows that page's English twin when it has one.
    const shown = lang === 'fr' ? { url, title: v.title, inReaderLanguage: true } : pageFor({ url, title: v.title }, 'en')
    const label = shown.inReaderLanguage ? '' : ` (${w.onlyIn})`
    out.push(`| [${cell(shown.title)}](${shown.url})${label} | ${v.count} | ${v.latest} |`)
  }
  out.push('')
  return out.join('\n')
}
