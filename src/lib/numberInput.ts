import type { Lang } from '../i18n'
import { formatDecimal, formatYear } from './format.ts'
import { parseDecimal } from './money.ts'

// How a number box turns text into a number and back. Pure, so the rules a person relies on — « 5,25 » is five and a
// quarter percent, « 65,5 » is not an age — are tested without a browser. NumberField (the component) only wires them.
//
//   money    dollars to the cent, never negative         shown « 15 000 » / « 15,000 »
//   percent  a FRACTION stored (0.0525), shown as 5,25
//   decimal  years of service, shares: up to 4 decimals, the comma ALWAYS the decimal mark (no thousands here)
//   year     a whole year, shown without grouping (« 1978 »)
//   int      a whole number (an age)

export type NumberKind = 'money' | 'percent' | 'decimal' | 'year' | 'int'

/** The stored number, as the text a person sees in the box (no unit: the unit is drawn beside it). */
export function showNumber(value: number | null, kind: NumberKind, lang: Lang): string {
  if (value === null) return ''
  switch (kind) {
    case 'money':
      return formatDecimal(value, lang, 2)
    case 'decimal':
      return formatDecimal(value, lang, 4)
    case 'percent':
      return formatDecimal(Number((value * 100).toFixed(4)), lang, 2)
    default:
      return formatYear(value, lang)
  }
}

/** Text → the stored number, or null when it does not mean one of this kind. `negative` allows a minus sign. */
export function readNumber(text: string, kind: NumberKind, negative: boolean): number | null {
  switch (kind) {
    case 'money':
      return parseDecimal(text)
    case 'percent': {
      const p = parseDecimal(text, { negative, places: 2 })
      return p === null ? null : Number((p / 100).toFixed(6))
    }
    case 'decimal': {
      // « 19,4158 » is nineteen years and a bit, as the relevé prints it — a comma followed by four digits would be read
      // as grouping by parseDecimal, and a service count never reaches a thousand: so here the comma is the decimal mark.
      const plain = /^[^.]*,[^.,]*$/.test(text) ? text.replace(',', '.') : text
      return parseDecimal(plain, { places: 4 })
    }
    default: {
      // A whole number: « 65,5 » is refused, never quietly rounded to 66.
      const n = parseDecimal(text, { negative, places: 4 })
      return n !== null && Number.isInteger(n) ? n : null
    }
  }
}

/** What one ↑ / ↓ press moves a number box by: a whole year or age; a tenth of a point of percent; a tenth of a year of service; and for money a
 *  step that follows the figure's size (a tenth of its leading power of ten: 812 → 10, 15 000 → 1 000, 400 000 → 10 000), so the key is useful at any scale. */
export function stepFor(value: number | null, kind: NumberKind): number {
  switch (kind) {
    case 'year':
    case 'int':
      return 1
    case 'percent':
      return 0.001
    case 'decimal':
      return 0.1
    case 'money': {
      const v = Math.abs(value ?? 0)
      return v < 10 ? 1 : 10 ** (Math.floor(Math.log10(v)) - 1)
    }
  }
}

const PLACES: Record<NumberKind, number> = { money: 2, percent: 6, decimal: 4, year: 0, int: 0 }

/** The number after one ↑ (dir 1) or ↓ (dir -1): it lands on the step's grid (15 340 → 16 000, then 15 000 the other way), a held Shift moves ten steps,
 *  and it never leaves [lo, hi]. Pure, so the arithmetic is tested without a browser. */
export function stepped(value: number | null, kind: NumberKind, dir: 1 | -1, fast: boolean, lo: number, hi: number): number {
  const base = value ?? 0
  const step = stepFor(base, kind) * (fast ? 10 : 1)
  const q = Math.round((base / step) * 1e6) / 1e6
  const next = (dir > 0 ? Math.floor(q) + 1 : Math.ceil(q) - 1) * step
  const clamped = Math.min(hi, Math.max(lo, next))
  return Number(clamped.toFixed(PLACES[kind]))
}
