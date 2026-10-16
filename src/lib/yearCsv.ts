import type { AgeResult } from '../engine/types'
import type { Lang } from '../i18n'
import { yearTableModel } from './yearTable'

/**
 * A scenario's name as the part of a file name: letters and digits kept (accents too), every run of anything else one hyphen, none at either end — « Retirer à 60 ans (tous) » is
 * `Retirer-à-60-ans-tous`. Nothing a file system refuses can be in it (\ / : * ? " < > |), a long name is cut, and a name with nothing in it is « plan », not a file called `…-.csv`.
 */
export function csvLabel(label: string): string {
  const slug = label.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 60).replace(/-$/, '')
  return slug === '' ? 'plan' : slug
}

// The per-year table as a spreadsheet file, for an advisor or a spouse who wants the numbers in a cell, not on a
// screen. Whole dollars, no thousands separators and no currency sign — a spreadsheet reads a bare integer in any locale
// — and the field separator follows the language's spreadsheet (« ; » in French, where « , » is the decimal mark).
// A leading BOM makes Excel read the accents as UTF-8.
//
// The file says the same numbers as the table on screen: `factor` divides each year's dollars the way the table does
// (today's dollars, or 1 for the year's own), and `unit` names those dollars in every money column's heading, so a
// spreadsheet opened next month still says which dollars it holds.

export interface YearCsvHeads {
  year: string
  ages: string
  income: string
  tax: string
  spending: string
  shortfall: string
  netWorth: string
  /** Heading of the locked-in REER column; added only when a year of the plan has a locked part. */
  rrspLocked?: string
  /** Headings of the two home columns; added only when a year of the plan has a home. */
  mortgage?: string
  homeEquity?: string
}

export interface YearCsvOptions {
  /** What a dollar of `year` is divided by (the chart's deflator for today's dollars); absent: the year's own dollars. */
  factor?: (year: number) => number
  /** The dollars' name, appended to every money heading: « (dollars d’aujourd’hui) ». */
  unit?: string
}

const field = (text: string, sep: string): string => (text.includes(sep) || text.includes('"') ? `"${text.replace(/"/g, '""')}"` : text)

export function yearCsv(result: AgeResult, heads: YearCsvHeads, lang: Lang, options: YearCsvOptions = {}): string {
  const sep = lang === 'fr' ? ';' : ','
  const money = (head: string) => (options.unit ? `${head} (${options.unit})` : head)
  const model = yearTableModel(result.rows, options.factor)
  const withHome = heads.mortgage !== undefined && heads.homeEquity !== undefined && model.hasHome
  const withLocked = heads.rrspLocked !== undefined && model.hasLocked
  const lines = [[heads.year, heads.ages, money(heads.income), money(heads.tax), money(heads.spending), money(heads.shortfall), money(heads.netWorth), ...(withLocked ? [money(heads.rrspLocked!)] : []), ...(withHome ? [money(heads.mortgage!), money(heads.homeEquity!)] : [])]]
  const whole = (n: number) => String(Math.round(n))
  for (const row of model.rows) {
    lines.push([
      String(row.year),
      row.ages.join(' / '),
      whole(row.income),
      whole(row.tax),
      whole(row.spending),
      whole(row.shortfall),
      whole(row.netWorth),
      ...(withLocked ? [whole(row.rrspLocked)] : []),
      ...(withHome ? [whole(row.mortgage), whole(row.homeEquity)] : []),
    ])
  }
  return '﻿' + lines.map((l) => l.map((c) => field(c, sep)).join(sep)).join('\r\n') + '\r\n'
}
