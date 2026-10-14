import { parseAmount } from './pasteEarnings.ts'

// A BANK'S TRANSACTION EXPORT (CSV or TSV) → what the household spends in a year, by category. Read on the device, never sent anywhere: the person looks at the groups,
// ticks what belongs in the budget (the mortgage is counted apart, so is tax), and uses the total. Banks differ, so the reader looks for the columns by their names
// (French or English) and never assumes an order; what it cannot read it says so and reads nothing.

export interface BankRow {
  year: number
  month: number
  day: number
  description: string
  /** The bank's own category, or the description when the export has none. */
  category: string
  /** Dollars: negative is money out, positive is money in. */
  amount: number
}

export interface BankRead {
  rows: BankRow[]
  /** Lines that were not a transaction (blank, a total, a date nobody can read). */
  skipped: number
}

/** The delimiter that splits the header line into the most cells. */
function delimiterOf(text: string): string {
  const first = text.split(/\r?\n/).find((l) => l.trim() !== '') ?? ''
  const count = (d: string) => first.split(d).length
  return ['\t', ';', ','].reduce((best, d) => (count(d) > count(best) ? d : best), ',')
}

/** RFC 4180: cells separated by `delim`, a quoted cell may hold the delimiter, a doubled quote and a line break. */
function parseDelimited(text: string, delim: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') (cell += '"'), i++
      else if (ch === '"') quoted = false
      else cell += ch
    } else if (ch === '"') quoted = true
    else if (ch === delim) (row.push(cell), (cell = ''))
    else if (ch === '\n' || ch === '\r') {
      // « \r\n » ends a row at the « \r » and again, empty, at the « \n »: a row with nothing in it is dropped below.
      row.push(cell)
      cell = ''
      if (row.some((c) => c.trim() !== '')) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim() !== '')) rows.push(row)
  return rows
}

const FR_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const EN_MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const bare = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const monthOf = (name: string): number | null => {
  const n = bare(name).replace(/\.$/, '')
  if (n.length < 3) return null
  const i = [...FR_MONTHS, ...EN_MONTHS].findIndex((m) => bare(m) === n || bare(m).startsWith(n))
  return i < 0 ? null : (i % 12) + 1
}

/** « 2026-10-07 », « 2026/10/07 », « 07/10/2026 » (day first, as in Canadian French — unless the second figure cannot be a month), « 7 octobre 2026 », « Oct 7, 2026 ». */
export function parseBankDate(text: string): { year: number; month: number; day: number } | null {
  const t = text.trim()
  const valid = (year: number, month: number, day: number) => (year >= 1990 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31 ? { year, month, day } : null)
  let m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/.exec(t)
  if (m) return valid(+m[1], +m[2], +m[3])
  m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/.exec(t)
  if (m) return +m[2] > 12 ? valid(+m[3], +m[1], +m[2]) : valid(+m[3], +m[2], +m[1])
  m = /^(\d{1,2})\s+([^\s\d]+)\s+(\d{4})/.exec(t)
  if (m) return monthOf(m[2]) ? valid(+m[3], monthOf(m[2])!, +m[1]) : null
  m = /^([^\s\d]+)\.?\s+(\d{1,2}),?\s+(\d{4})/.exec(t)
  if (m) return monthOf(m[1]) ? valid(+m[3], monthOf(m[1])!, +m[2]) : null
  return null
}

interface Columns {
  date: number
  amount: number | null
  debit: number | null
  credit: number | null
  category: number | null
  description: number | null
}

const ALIASES = {
  date: /^(date|jour)\b|date de (transaction|l'op)/i,
  amount: /^(montant|amount|valeur|value)\b/i,
  debit: /(d[ée]bit|retrait|withdrawal|sortie|paid out)/i,
  credit: /(cr[ée]dit|d[ée]p[oô]t|deposit|entr[ée]e|paid in)/i,
  category: /(cat[ée]gorie|category)/i,
  description: /(description|libell[ée]|d[ée]tail|payee|merchant|b[ée]n[ée]ficiaire)/i,
}

function columnsOf(header: string[]): Columns | null {
  const find = (re: RegExp) => {
    const i = header.findIndex((h) => re.test(h.trim()))
    return i < 0 ? null : i
  }
  const date = find(ALIASES.date)
  const amount = find(ALIASES.amount)
  const debit = find(ALIASES.debit)
  const credit = find(ALIASES.credit)
  if (date === null || (amount === null && (debit === null || credit === null))) return null
  return { date, amount, debit, credit, category: find(ALIASES.category), description: find(ALIASES.description) }
}

/** Signed dollars from a cell. « -12,50 », « (12,50) » and « 12,50- » are money out; « +12,50 » is money in; no sign at all is `unsignedSign`. */
function signed(cell: string, unsignedSign: number): number | null {
  const t = cell.trim()
  if (t === '') return null
  const parens = /^\(.*\)$/.test(t) || /-\s*$/.test(t)
  const n = parseAmount(t.replace(/[()]/g, ''))
  if (n === null) return null
  if (parens) return -Math.abs(n)
  if (/^\+/.test(t)) return Math.abs(n)
  return t.startsWith('-') || n < 0 ? -Math.abs(n) : unsignedSign * Math.abs(n)
}

/**
 * Read an export. The header is the first line (among the first fifteen) with a date column and an amount — or a debit and a credit. Money out is negative. An export
 * that marks money IN with a « + » and leaves money out unsigned (some banks print them so) is read that way: with no minus sign anywhere, an unsigned amount is money out.
 */
export function readBank(text: string): BankRead {
  const table = parseDelimited(text, delimiterOf(text))
  let at = -1
  let cols: Columns | null = null
  for (let i = 0; i < Math.min(15, table.length) && cols === null; i++) {
    cols = columnsOf(table[i])
    if (cols) at = i
  }
  if (cols === null) return { rows: [], skipped: table.length }
  const body = table.slice(at + 1)
  const anyMinus = body.some((r) => r.some((c) => /^\s*-\s*\d/.test(c) || /^\(.*\d.*\)$/.test(c.trim())))
  const unsigned = anyMinus ? 1 : -1 // minus signs mark money out: an unsigned amount is money in; with none, an unsigned amount is money out
  const rows: BankRow[] = []
  let skipped = 0
  for (const r of body) {
    const when = parseBankDate(r[cols.date] ?? '')
    const description = (cols.description === null ? '' : r[cols.description] ?? '').replace(/\s+/g, ' ').trim()
    let amount: number | null = null
    if (cols.amount !== null) amount = signed(r[cols.amount] ?? '', unsigned)
    else {
      const out = signed(r[cols.debit!] ?? '', 1)
      const inn = signed(r[cols.credit!] ?? '', 1)
      amount = out !== null && out !== 0 ? -Math.abs(out) : inn !== null ? Math.abs(inn) : null
    }
    if (when === null || amount === null) {
      skipped++
      continue
    }
    const category = (cols.category === null ? '' : r[cols.category] ?? '').trim() || description.slice(0, 40) || '—'
    rows.push({ ...when, description, category, amount })
  }
  return { rows, skipped }
}

export interface BankGroup {
  name: string
  /** Dollars a year, the window's net spending (money out less refunds) scaled to twelve months; only groups with spending. */
  annual: number
  /** Transactions in the window. */
  count: number
  /** Whether it counts in the budget by default: transfers, card payments, income, the mortgage, tax and savings do not. */
  include: boolean
}

export interface BankSummary {
  from: { year: number; month: number }
  to: { year: number; month: number }
  /** Calendar months the window covers: twelve at most. */
  months: number
  groups: BankGroup[]
}

/** What is not household spending (or is counted elsewhere in the plan): moving money, paying a card, income, the mortgage, tax, saving. */
export const NOT_SPENDING = /transfert|transfer|virement|paiement carte|paiement de carte|credit card|carte de cr[ée]dit|revenu|income|salaire|payroll|hypoth[eè]que|mortgage|imp[oô]ts?\b|taxes?\b|reer|rrsp|celi|tfsa|placement|investment|[ée]pargne|savings/i

const index = (y: number, m: number) => y * 12 + (m - 1)

/**
 * The last twelve COMPLETE months of the export (a last month that stops before the 25th is a month in progress and is left out), counted by category. With fewer than
 * twelve months the net is scaled up to a year, and \`months\` says how many it rests on. Null when there is nothing to count.
 */
export function summarize(rows: readonly BankRow[]): BankSummary | null {
  if (rows.length === 0) return null
  const latest = rows.reduce((a, r) => (index(r.year, r.month) > index(a.year, a.month) ? r : a))
  const lastDay = rows.filter((r) => r.year === latest.year && r.month === latest.month).reduce((d, r) => Math.max(d, r.day), 0)
  const end = lastDay >= 25 ? index(latest.year, latest.month) : index(latest.year, latest.month) - 1
  const earliest = rows.reduce((a, r) => Math.min(a, index(r.year, r.month)), Infinity)
  const start = Math.max(end - 11, earliest)
  if (end < start) return null
  const inWindow = rows.filter((r) => index(r.year, r.month) >= start && index(r.year, r.month) <= end)
  const months = end - start + 1
  const byCategory = new Map<string, { net: number; count: number }>()
  for (const r of inWindow) {
    const g = byCategory.get(r.category) ?? { net: 0, count: 0 }
    g.net -= r.amount
    g.count++
    byCategory.set(r.category, g)
  }
  const groups = [...byCategory]
    .filter(([, g]) => g.net > 0)
    .map(([name, g]) => ({ name, annual: (g.net * 12) / months, count: g.count, include: !NOT_SPENDING.test(name) }))
    .sort((a, b) => b.annual - a.annual)
  const ym = (i: number) => ({ year: Math.floor(i / 12), month: (i % 12) + 1 })
  return { from: ym(start), to: ym(end), months, groups }
}

/** What the ticked groups come to in a year. */
export const totalOf = (groups: readonly BankGroup[], included: ReadonlySet<string>): number => groups.reduce((s, g) => s + (included.has(g.name) ? g.annual : 0), 0)
