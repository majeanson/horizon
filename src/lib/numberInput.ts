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
