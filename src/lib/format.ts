import type { Lang } from '../i18n'

// Number formatting for the UI — cached formatters, one per (lang, shape). Together with
// lib/money.ts this is the ONLY home of `new Intl.*` (intl-rule.test.ts): a new shape gets
// a new cached helper HERE, never an inline constructor paid per row.
const cache = new Map<string, Intl.NumberFormat>()
function nf(lang: Lang, key: string, opts: Intl.NumberFormatOptions): Intl.NumberFormat {
  const k = `${lang}:${key}`
  let f = cache.get(k)
  if (!f) {
    f = new Intl.NumberFormat(lang === 'en' ? 'en-CA' : 'fr-CA', opts)
    cache.set(k, f)
  }
  return f
}

// 1234567 → "1 234 567" / "1,234,567". null/NaN → ''.
export function formatInt(n: number | null | undefined, lang: Lang): string {
  if (n == null || !Number.isFinite(n)) return ''
  return nf(lang, 'int', { maximumFractionDigits: 0 }).format(n)
}

// A year prints WITHOUT a grouping separator: « 2 026 » would be a bug, not a number.
export function formatYear(n: number | null | undefined, lang: Lang): string {
  if (n == null || !Number.isFinite(n)) return ''
  return nf(lang, 'year', { useGrouping: false, maximumFractionDigits: 0 }).format(n)
}

// 0.0525 → "5,25 %" / "5.25%". `digits` is the number of fraction digits shown (default 1).
export function formatPct(fraction: number | null | undefined, lang: Lang, digits = 1): string {
  if (fraction == null || !Number.isFinite(fraction)) return ''
  return nf(lang, `pct${digits}`, { style: 'percent', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(fraction)
}

// A free-typed percentage → fraction ("2,5" → 0.025, "2.5 %" → 0.025). Same comma rule as
// parseMoney: a lone comma is a decimal mark in FR-CA. Empty/invalid → null.
export function parsePct(input: string): number | null {
  const cleaned = input.replace(/[^0-9.,]/g, '').replace(',', '.')
  if (!cleaned) return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? Math.round(n * 1e6) / 1e8 : null
}
