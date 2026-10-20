import { parseDecimal } from './money.ts'
// READING A PASTED « RELEVÉ DE PARTICIPATION ». The relevé lists one row per year; copied off the page (or out of a PDF) it arrives as
// text: a year, then one or more amounts, in no promised layout — tabs from a copied table, `$` signs, spaces as thousands separators,
// French (« 52 300,50 $ ») or English (« 52,300.50 ») numbers. This reads it all tolerantly and reports what it understood, so the person
// sees the years and amounts BEFORE anything is applied. Pure text in, plain data out; the page decides what to do with it.

export interface PastedRow {
  year: number
  /** Every amount found after the year, left to right. */
  amounts: number[]
}

export interface PastedEarnings {
  rows: PastedRow[]
  /** Lines that held text but no readable year-and-amount (headings, totals, notes). */
  skipped: number
  /** The most amounts any row has (the columns the person can choose among). */
  columns: number
}

const FIRST_YEAR = 1966

/** One amount as typed → dollars, or null when it is not one. Handles « 52 300,50 $ », « 52,300.50 », « 52.300,50 », « 1 234 ». */
export function parseAmount(text: string): number | null {
  // A pasted cell carries more than a typed box: a « $ », a currency code (« CA », « CAD »), thousands spaces of every width. Those go; the number itself
  // is read by THE one parser (lib/money.ts `parseDecimal`) — the same separator rules a typed figure has, plus `dotThousands`: « 52.300 » pasted is
  // 52 300. A minus anywhere is the sign (a trailing one, « 45,00- », is read as money out by the bank import, which passes the cell without it).
  const s = text.replace(/[^\d.,-]/g, '')
  const negative = s.startsWith('-')
  const n = parseDecimal(s.replace(/-/g, ''), { dotThousands: true })
  return n === null ? null : negative ? -n : n
}

/** Split what follows the year into cells: by tab, else by `$`, else by runs of two spaces or more, else one cell. */
function cells(rest: string): string[] {
  const t = rest.trim()
  if (t.includes('\t')) return t.split('\t')
  if (t.includes('$')) return t.split('$')
  if (/ {2,}/.test(t)) return t.split(/ {2,}/)
  return singleSpaced(t)
}

/**
 * Columns separated by ONE plain space (a PDF copy often gives that): « 5000 4000 » is two amounts, never 50 004 000 $. A space is also a French
 * thousands separator, so a group of exactly three digits that follows a number is that number's thousands (« 52 300 » is one amount, « 52 300,50 »
 * too). A no-break space (U+00A0, U+202F) is only ever a thousands separator: it never splits.
 */
function singleSpaced(t: string): string[] {
  const out: string[] = []
  for (const tok of t.split(' ').filter((x) => x !== '')) {
    const prev = out.length - 1
    // only onto a number grouped so far (« 52 », « 1 234 »): « 5000 300 » is two amounts, a four-digit figure has no thousands to add to
    if (prev >= 0 && /^\d{3}([.,]\d{1,2})?$/.test(tok) && /^\d{1,3}( \d{3})*$/.test(out[prev])) out[prev] = `${out[prev]} ${tok}`
    else out.push(tok)
  }
  return out
}

export function parseEarningsPaste(text: string, lastYear: number): PastedEarnings {
  const byYear = new Map<number, number[]>()
  let skipped = 0
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim()
    if (line === '') continue
    const m = /(?:^|[^\d])((?:19|20)\d{2})(?!\d)/.exec(line)
    const year = m ? Number(m[1]) : NaN
    if (!m || year < FIRST_YEAR || year > lastYear) {
      skipped++
      continue
    }
    const rest = line.slice(m.index + m[0].length)
    const amounts = cells(rest)
      .map(parseAmount)
      .filter((n): n is number => n !== null && n >= 0 && n <= 1e9)
    if (amounts.length === 0) {
      skipped++
      continue
    }
    byYear.set(year, amounts) // a year listed twice: the last line wins
  }
  const rows = [...byYear.entries()].sort((a, b) => a[0] - b[0]).map(([year, amounts]) => ({ year, amounts }))
  return { rows, skipped, columns: rows.reduce((n, r) => Math.max(n, r.amounts.length), 0) }
}

/** The years read, as the profile stores them, taking the amount in `column` (0 = the first after the year); rows without that column are left out. */
export function earningsFromPaste(rows: readonly PastedRow[], column: number): Record<number, number> {
  const out: Record<number, number> = {}
  for (const r of rows) if (column < r.amounts.length) out[r.year] = Math.round(r.amounts[column])
  return out
}
