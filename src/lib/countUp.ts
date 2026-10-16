import type { Lang } from '../i18n'
import { formatDecimal } from './format.ts'
import { parseDecimal } from './money.ts'

// COUNTING UP A FIGURE — what the numbers of a short text read like part-way from one value to another. Pure, so the rules are tested without a browser; the component
// (components/CountUp.tsx) only draws the frames.
//
// Only a MONEY-sized number counts (a thousand and over: « 7 800 $ », « 15 000 »): an age, a percentage or a year in the same sentence stays what it is, so a sentence never shows a
// wrong age on its way to the right figure. A year written without a separator (« 2039 ») is not an amount.

// A number as a person writes it: digits with the grouping and decimal marks between them (« 1 507,65 », « 62 », « 5.25 »).
const NUMBER = /(\d(?:[\d\s  .,]*\d)?)/
const BIG = 1000

interface Figure {
  /** Index among the figures that count. */
  at: number
  value: number
  decimals: number
}

function figureOf(part: string, at: number): Figure | null {
  const value = parseDecimal(part)
  if (value === null || value < BIG) return null
  if (Number.isInteger(value) && value <= 2100 && !/[\s  .,]/.test(part)) return null // a year, not an amount
  const cents = /[.,](\d{1,2})$/.exec(part)
  return { at, value, decimals: cents ? cents[1].length : 0 }
}

/** The values of the figures in `text` that count, in reading order. */
export function countedFigures(text: string): number[] {
  const out: number[] = []
  text.split(NUMBER).forEach((part, i) => {
    if (i % 2 === 0) return
    const f = figureOf(part, out.length)
    if (f) out.push(f.value)
  })
  return out
}

/** `text` with each counted figure `p` (0 → 1) of the way from `from[i]` (0 when absent) to its own value. At p = 1 the text itself. */
export function countFrame(text: string, from: readonly number[] | null, p: number, lang: Lang): string {
  if (p >= 1) return text
  let counted = 0
  return text
    .split(NUMBER)
    .map((part, i) => {
      if (i % 2 === 0) return part
      const f = figureOf(part, counted)
      if (!f) return part
      counted++
      const start = from?.[f.at] ?? 0
      const v = start + (f.value - start) * p
      const k = 10 ** f.decimals
      return formatDecimal(Math.round(v * k) / k, lang, f.decimals)
    })
    .join('')
}
