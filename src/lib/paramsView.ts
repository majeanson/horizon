import { citedLeaves, type Bracket } from '../engine/params/cited.ts'
import { KNOWN } from '../engine/params/index.ts'
import { pageFor, type PageLang } from '../engine/params/twins.ts'
import type { Lang } from '../i18n'
import { formatDecimal, formatYear } from './format.ts'

// « Paramètres utilisés »: the government figures a result stands on, one row per figure, each with the official
// page it was read on and the day it was read — the same objects the engine reads and SOURCES.md prints, so the
// panel on the results page cannot say anything the engine does not use.
//
// It is shown in the READER'S language: the page link is the French edition for a French reader and the English one for
// an English reader (engine/params/twins.ts), and a number is written the way that language writes it — « 1 507,65 » and
// « 1,507.65 », a year without a grouping space.

export interface ParamRow {
  path: string
  /** The figure, written in the reader's language. */
  value: string
  title: string
  url: string
  /** The language the linked page is written in. */
  pageLang: PageLang
  /** False when the reader's language has no edition of the page: the link goes to the other one, and the panel says so. */
  inReaderLanguage: boolean
  retrieved: string
  /** Why this figure is not confirmed against an openable page, or undefined when it is. */
  verify: string | undefined
}

export function knownYears(): number[] {
  return Object.keys(KNOWN).map(Number).sort((a, b) => a - b)
}

const decimalsOf = (n: number): number => {
  const s = String(n)
  const dot = s.indexOf('.')
  return dot < 0 ? 0 : s.length - dot - 1
}

/**
 * A cited value written for a reader of `lang`. `entries` words a long table (« 25 valeurs » / « 25 entries ») — its
 * wording belongs to the dictionaries, not here. A figure whose path ends in « From » is a calendar year (2019): no grouping.
 */
export function displayValue(v: unknown, lang: Lang, entries: (n: number) => string, path = ''): string {
  if (typeof v === 'number') return /From$/.test(path) ? formatYear(v, lang) : formatDecimal(v, lang, Math.min(6, decimalsOf(v)))
  if (typeof v === 'string' || typeof v === 'boolean') return String(v)
  const percent = lang === 'fr' ? ' %' : '%'
  if (Array.isArray(v) && v.length > 0 && v.every((b) => typeof b === 'object' && b !== null && 'rate' in b && 'upTo' in b)) {
    return (v as Bracket[]).map((b) => `${b.upTo === null ? '∞' : formatDecimal(b.upTo, lang, 0)} @ ${formatDecimal(b.rate * 100, lang, 4)}${percent}`).join(' · ')
  }
  if (typeof v === 'object' && v !== null) {
    const list = Object.entries(v as Record<string, unknown>)
    const numericKeys = list.every(([k]) => /^\d+$/.test(k))
    if (numericKeys && list.length > 6) {
      const [first, last] = [list[0], list[list.length - 1]]
      return `${entries(list.length)}: ${first[0]} → ${displayValue(first[1], lang, entries)} … ${last[0]} → ${displayValue(last[1], lang, entries)}`
    }
    return list.map(([k, x]) => `${k}: ${displayValue(x, lang, entries)}`).join(' · ')
  }
  return String(v)
}

/** `tree` is for tests: a fixture tree stands in for the year's, so the unconfirmed-figure branch is exercised even while none is flagged. */
export function paramRows(year: number, lang: Lang, entries: (n: number) => string, tree: object | undefined = KNOWN[year]): ParamRow[] {
  if (!tree) return []
  return citedLeaves(tree).map(({ path, cited }) => {
    const page = pageFor(cited.source, lang)
    return {
      path,
      value: displayValue(cited.value, lang, entries, path),
      title: page.title,
      url: page.url,
      pageLang: page.pageLang,
      inReaderLanguage: page.inReaderLanguage,
      retrieved: cited.source.retrieved,
      verify: cited.source.verify,
    }
  })
}
