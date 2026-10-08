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
  const s = text.replace(/[$\s  ]/g, '').replace(/[^\d.,-]/g, '')
  if (!/\d/.test(s) || s.startsWith('.') && s.length === 1) return null
  const negative = s.startsWith('-')
  const body = s.replace(/-/g, '')
  const lastDot = body.lastIndexOf('.')
  const lastComma = body.lastIndexOf(',')
  let normal: string
  if (lastDot >= 0 && lastComma >= 0) {
    // Both present: the last one is the decimal mark, the other is thousands.
    const dec = Math.max(lastDot, lastComma)
    normal = body.slice(0, dec).replace(/[.,]/g, '') + '.' + body.slice(dec + 1)
  } else if (lastDot >= 0 || lastComma >= 0) {
    const mark = lastDot >= 0 ? '.' : ','
    const parts = body.split(mark)
    const last = parts[parts.length - 1]
    // « 52,300 » (three digits, one mark) is thousands; « 52,30 » / « 52,5 » is a decimal; « 1,234,567 » is thousands.
    normal = parts.length > 2 || last.length === 3 ? parts.join('') : parts.join('.')
  } else normal = body
  const n = Number(normal)
  return Number.isFinite(n) ? (negative ? -n : n) : null
}

/** Split what follows the year into cells: by tab, else by `$`, else by runs of two spaces or more, else one cell. */
function cells(rest: string): string[] {
  const t = rest.trim()
  if (t.includes('\t')) return t.split('\t')
  if (t.includes('$')) return t.split('$')
  if (/ {2,}/.test(t)) return t.split(/ {2,}/)
  return [t]
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
