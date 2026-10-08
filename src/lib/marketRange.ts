import { retireAt } from '../engine/retireAt.ts'
import type { Assumptions, Household } from '../engine/types.ts'

// « And if the markets go badly? » — the earliest age that works under each ready-made market path laid over the person's own
// assumptions, and the smooth one beside them as the yardstick: four searches of a dozen full projections each.

export type StressPreset = 'badStart' | 'lostDecade' | 'boomBust'
export const STRESS_PRESETS: readonly StressPreset[] = ['badStart', 'lostDecade', 'boomBust']

/** The earliest age that works (null: none up to 70) under « lisse » and under each stress path. */
export interface MarketRange {
  smooth: number | null
  badStart: number | null
  lostDecade: number | null
  boomBust: number | null
}

export function marketRange(household: Household, assumptions: Assumptions): MarketRange {
  const at = (preset: 'smooth' | StressPreset) => retireAt(household, { ...assumptions, marketPath: { preset, custom: [] } }, { stopAtFirstOk: true }).earliestOk
  return { smooth: at('smooth'), badStart: at('badStart'), lostDecade: at('lostDecade'), boomBust: at('boomBust') }
}
