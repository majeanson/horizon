import { citedLeaves, type Bracket, type Cited } from './cited.ts'

// SOURCES.md, rendered from the params files — never hand-written.
//
// The point of citing every figure is that a stranger can check it. A stranger will not read
// a TypeScript tree; they will read one table per year: figure · value · the official page,
// by title and link · the day it was read · how it moves. That table is GENERATED from the same
// objects the engine reads (`npm run sources`), and a test fails the build when the committed
// file differs from what the objects would print — so the document cannot drift from the code,
// and the code cannot quietly change a figure without the diff showing in SOURCES.md.
//
// Pure and dependency-free: it runs under Node (scripts/gen-sources.ts) and under Vitest alike.

export interface SourcesInput {
  /** Year → its params tree (a tree whose leaves are `Cited`). */
  years: Readonly<Record<number, unknown>>
  /** Cross-year series — a historical table that belongs to no single year. */
  series: ReadonlyArray<{ name: string; cited: Cited<unknown> }>
}

const spaced = (n: number): string => {
  const [int, dec] = String(n).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return dec === undefined ? grouped : `${grouped}.${dec}`
}

/** A compact, exact, human-checkable rendering of any cited value. */
export function renderValue(v: unknown): string {
  if (typeof v === 'number') return spaced(v)
  if (typeof v === 'string' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v) && v.length > 0 && v.every((b) => typeof b === 'object' && b !== null && 'rate' in b && 'upTo' in b)) {
    return (v as Bracket[]).map((b) => `${b.upTo === null ? '∞' : spaced(b.upTo)} @ ${+(b.rate * 100).toFixed(4)} %`).join(' · ')
  }
  if (typeof v === 'object' && v !== null) {
    const entries = Object.entries(v as Record<string, unknown>)
    const keys = entries.map(([k]) => k)
    const numericKeys = keys.every((k) => /^\d+$/.test(k))
    if (numericKeys && entries.length > 6) {
      const first = entries[0]
      const last = entries[entries.length - 1]
      return `${entries.length} entries: ${first[0]} → ${renderValue(first[1])} … ${last[0]} → ${renderValue(last[1])}`
    }
    return entries.map(([k, x]) => `${k}: ${renderValue(x)}`).join(' · ')
  }
  return String(v)
}

// A Markdown table cell may not contain a raw pipe or a line break.
const cell = (s: string): string => s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')

const INDEX_LABEL: Record<Cited['index'], string> = {
  cpi: 'prix (IPC)',
  wage: 'salaires',
  fixed: 'fixe',
  none: 'observation',
}

function rows(leaves: { path: string; cited: Cited<unknown> }[]): string[] {
  return leaves.map(({ path, cited: c }) => {
    const page = `[${cell(c.source.title)}](${c.source.url})`
    const idx = INDEX_LABEL[c.index] + (c.round === undefined ? '' : ` · arrondi ${c.round}`)
    const note = [c.source.verify ? `**⚠ À VÉRIFIER :** ${c.source.verify}` : '', c.source.note ?? ''].filter(Boolean).join(' ')
    return `| \`${path}\` | ${cell(renderValue(c.value))} | ${page} | ${c.source.retrieved} | ${idx} | ${cell(note)} |`
  })
}

const HEADER = '| Paramètre | Valeur | Page officielle | Relevé le | Évolue avec | Note |\n| --- | --- | --- | --- | --- | --- |'

export function renderSourcesMd({ years, series }: SourcesInput): string {
  const out: string[] = []
  out.push('# SOURCES.md — chaque chiffre du gouvernement, et d’où il vient')
  out.push('')
  out.push('> **Généré** par `npm run sources` à partir de `src/engine/params/` — ne pas éditer à la main.')
  out.push('> Un test (`sourcesMd.test.ts`) échoue si ce fichier diffère de ce que le code imprimerait.')
  out.push('>')
  out.push('> Chaque ligne est une valeur que le moteur lit, la page officielle où elle a été lue (titre et lien tels')
  out.push('> qu’imprimés), le jour de la lecture, et la façon dont elle évolue d’une année à l’autre quand aucune page')
  out.push('> officielle ne couvre encore l’année visée (*prix* = indexée à l’IPC, *salaires* = indexée aux salaires,')
  out.push('> *fixe* = constante légale, *observation* = série historique, jamais projetée).')
  out.push('> **Pour contre-vérifier :** ouvrez le lien, trouvez la ligne citée, comparez la valeur.')
  out.push('> Une ligne marquée **⚠ À VÉRIFIER** n’a pas pu être confirmée sur une page que vous pouvez ouvrir et comparer (copie archivée,')
  out.push('> valeur dérivée par calcul, résumé plutôt que page) : la raison est écrite sur la ligne.')
  out.push('')

  const yearList = Object.keys(years).map(Number).sort((a, b) => a - b)
  const allLeaves: { path: string; cited: Cited<unknown> }[] = []

  for (const y of yearList) {
    const leaves = citedLeaves(years[y])
    allLeaves.push(...leaves)
    out.push(`## ${y}`)
    out.push('')
    const unverified = leaves.filter((l) => l.cited.source.verify).length
    out.push(`${leaves.length} paramètres${unverified ? `, dont **${unverified} à vérifier**` : ''}.`)
    out.push('')
    out.push(HEADER)
    out.push(...rows(leaves))
    out.push('')
  }

  if (series.length > 0) {
    out.push('## Séries historiques')
    out.push('')
    out.push(HEADER)
    const leaves = series.map((s) => ({ path: s.name, cited: s.cited }))
    allLeaves.push(...leaves)
    out.push(...rows(leaves))
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
  out.push('## Pages consultées')
  out.push('')
  out.push(`${byUrl.size} pages officielles. Une page citée par beaucoup de chiffres est une page à relire en premier.`)
  out.push('')
  out.push('| Page officielle | Chiffres | Dernière lecture |')
  out.push('| --- | --- | --- |')
  for (const [url, v] of [...byUrl].sort((a, b) => a[0].localeCompare(b[0]))) {
    out.push(`| [${cell(v.title)}](${url}) | ${v.count} | ${v.latest} |`)
  }
  out.push('')
  return out.join('\n')
}
