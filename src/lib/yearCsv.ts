import type { AgeResult } from '../engine/types'
import type { Lang } from '../i18n'

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
  const withHome = heads.mortgage !== undefined && heads.homeEquity !== undefined && result.rows.some((r) => r.household.homeValueEnd > 0)
  const lines = [[heads.year, heads.ages, money(heads.income), money(heads.tax), money(heads.spending), money(heads.shortfall), money(heads.netWorth), ...(withHome ? [money(heads.mortgage!), money(heads.homeEquity!)] : [])]]
  for (const row of result.rows) {
    const h = row.household
    const whole = (n: number) => String(Math.round(n / (options.factor ? options.factor(row.year) : 1)))
    lines.push([
      String(row.year),
      Object.values(row.persons)
        .map((p) => p.age)
        .join(' / '),
      whole(h.grossIncome),
      whole(h.tax),
      whole(h.spending),
      whole(h.shortfall),
      whole(h.netWorthEnd),
      ...(withHome ? [whole(h.mortgagePayment), whole(h.homeValueEnd - h.mortgageBalanceEnd)] : []),
    ])
  }
  return '﻿' + lines.map((l) => l.map((c) => field(c, sep)).join(sep)).join('\r\n') + '\r\n'
}
