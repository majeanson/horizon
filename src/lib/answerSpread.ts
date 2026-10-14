import type { MarketRange } from './marketRange.ts'
import type { PresetRange } from './usePresetEarliest.ts'

// THE ANSWER AS A RANGE. The big age is the answer under the person's own assumptions. Beside it the page already works out, off the first paint, the earliest age under the
// three ready-made scenarios and under the market's good and bad paths (lib/usePresetEarliest.ts, lib/useMarketRange.ts). Read together they say how far that age moves when
// the future is kinder or harsher than assumed: the lowest of them, and the highest — or no age at all up to 70 when one of them has none.

export interface AnswerSpread {
  /** The youngest age any of them gives. */
  low: number
  /** The oldest age any of them gives; null when one of them has no age that works up to the page's last (70). */
  high: number | null
}

/**
 * The spread of the answer, or null while either set of searches is still out, or when it is not worth a line: every one of them gives the very age the page is showing (a
 * range of one age says nothing).
 */
export function answerSpread(age: number, range: PresetRange | undefined, stress: MarketRange | undefined): AnswerSpread | null {
  if (range === undefined || stress === undefined) return null
  const all = [age, range.prudent, range.neutral, range.bold, stress.smooth, stress.badStart, stress.lostDecade, stress.boomBust]
  const ages = all.filter((a): a is number => a !== null)
  const low = Math.min(...ages)
  const high = all.includes(null) ? null : Math.max(...ages)
  return low === age && high === age ? null : { low, high }
}
