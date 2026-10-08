import type { AgeResult } from '../engine/types'
import type { Lang } from '../i18n'

// The per-year table as a spreadsheet file, for an advisor or a spouse who wants the numbers in a cell, not on a
// screen. Whole dollars, no thousands separators and no currency sign — a spreadsheet reads a bare integer in any locale
// — and the field separator follows the language's spreadsheet (« ; » in French, where « , » is the decimal mark).
// A leading BOM makes Excel read the accents as UTF-8.

export interface YearCsvHeads {
  year: string
  ages: string
  income: string
  tax: string
  spending: string
  shortfall: string
  netWorth: string
}

const field = (text: string, sep: string): string => (text.includes(sep) || text.includes('"') ? `"${text.replace(/"/g, '""')}"` : text)

export function yearCsv(result: AgeResult, heads: YearCsvHeads, lang: Lang): string {
  const sep = lang === 'fr' ? ';' : ','
  const whole = (n: number) => String(Math.round(n))
  const lines = [[heads.year, heads.ages, heads.income, heads.tax, heads.spending, heads.shortfall, heads.netWorth]]
  for (const row of result.rows) {
    const h = row.household
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
    ])
  }
  return '﻿' + lines.map((l) => l.map((c) => field(c, sep)).join(sep)).join('\r\n') + '\r\n'
}
