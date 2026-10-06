import type { Lang } from '../i18n'

// Money formatting and parsing. UNLIKE Babillard, amounts here are DOLLARS as a plain
// `number` (the engine's convention — see ENGINE.md), never integer cents.
//
// The formatters are cached per (lang, shape): constructing an Intl.NumberFormat costs
// ~100 µs and the results table paints one per cell. intl-rule.test.ts fails the build
// if a `new Intl.*` appears anywhere but here and lib/format.ts.
const fmtCache = new Map<string, Intl.NumberFormat>()
function currency(lang: Lang, cents: boolean): Intl.NumberFormat {
  const key = `${lang}:${cents ? 2 : 0}`
  let f = fmtCache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(lang === 'en' ? 'en-CA' : 'fr-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: cents ? 2 : 0,
      maximumFractionDigits: cents ? 2 : 0,
    })
    fmtCache.set(key, f)
  }
  return f
}

// dollars → "15 000 $" (FR-CA) / "$15,000" (EN-CA). Whole dollars by default; pass
// `{ cents: true }` where the official page prints cents ("1 507,65 $"), so a figure can
// be matched against the statement it came from. null/undefined/NaN → '' (nothing to show).
export function formatMoney(dollars: number | null | undefined, lang: Lang, opts: { cents?: boolean } = {}): string {
  if (dollars == null || !Number.isFinite(dollars)) return ''
  return currency(lang, opts.cents === true).format(dollars)
}

// A free-typed number → a number. The workhorse behind parseMoney and every other typed field (a
// percentage, a count of years): tolerates spaces (plain and non-breaking), a leading "$", and either
// separator. Empty/invalid → null; a negative number is refused unless `negative` is set.
//
// THE COMMA IS AMBIGUOUS, and this app is FR-CA first: « 812,82 » is eight hundred twelve
// dollars and eighty-two cents, while « 15,000 » is fifteen thousand. Reading every comma as
// a thousands separator turned a Québécois typing their balance into a number a hundred
// times too large, silently. The rule:
//   * a comma followed by exactly one or two digits AT THE END is a decimal mark;
//   * any other comma is grouping and is stripped;
//   * a dot stays the decimal mark;
//   * if BOTH appear, the LAST one is the decimal mark ("1.234,56" and "1,234.56").
export function parseDecimal(input: string, opts: { negative?: boolean; places?: number } = {}): number | null {
  const cleaned = input.replace(/[^0-9.,-]/g, '').replace(/\s/g, '')
  if (!cleaned) return null

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')
  let normalized: string
  if (lastComma >= 0 && lastDot >= 0) {
    const decimalAt = Math.max(lastComma, lastDot)
    normalized = cleaned.slice(0, decimalAt).replace(/[.,]/g, '') + '.' + cleaned.slice(decimalAt + 1).replace(/[.,]/g, '')
  } else if (lastComma >= 0) {
    normalized = /,\d{1,2}$/.test(cleaned) ? cleaned.replace(',', '.') : cleaned.replace(/,/g, '')
  } else {
    normalized = cleaned
  }

  const n = Number(normalized)
  if (!Number.isFinite(n) || (n < 0 && !opts.negative)) return null
  // Round by moving the decimal point in the EXPONENT, not by multiplying:
  // 1.005 * 100 is 100.49999999999999 in binary floating point and would round DOWN to 1.00,
  // while Number('1.005e2') is exactly 100.5. A typed amount means what its digits say.
  const places = opts.places ?? 2
  return Number(Math.round(Number(normalized + 'e' + places)) + 'e-' + places)
}

// A free-typed dollar amount → dollars, to the cent. Empty/invalid/negative → null.
export const parseMoney = (input: string): number | null => parseDecimal(input)
