import { ASSUMPTION_PRESETS, type PresetValues } from './assumptionPresets.ts'

// Where one assumption sits against the three ready-made scenarios, and which way that leans for the plan.
//
// « Low » and « high » mean the NUMBER (a low inflation, a high return) — measured against the range the prudent /
// neutral / bold sets span, so the words are anchored on something stated rather than on a feeling. What the number
// DOES to the plan is the `tilt`: a high return is optimistic, a high inflation or a long life is cautious. Beyond
// either end of the range the level is `below` / `above`: the person has gone past what the scenarios call reasonable.

export type ImpactField = 'inflation' | 'wageGrowth' | 'returns' | 'horizonAge'
export type ImpactLevel = 'below' | 'low' | 'typical' | 'high' | 'above'
/** What the number does to the plan: `cautious` leaves room, `optimistic` leans on the future going well. */
export type ImpactTilt = 'cautious' | 'middle' | 'optimistic'

export interface AssumptionImpact {
  level: ImpactLevel
  tilt: ImpactTilt
}

/** For these a HIGHER number is the more favourable one to the plan (a higher return, faster wages); for the others, lower is. */
const HIGHER_IS_BETTER: Readonly<Record<ImpactField, boolean>> = { inflation: false, wageGrowth: true, returns: true, horizonAge: false }

const mean = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0) / xs.length

const valueOf = (p: PresetValues, field: ImpactField): number => (field === 'returns' ? mean([p.returns.rrsp, p.returns.tfsa, p.returns.nonReg]) : p[field])

/** The field's value under prudent, neutral and bold, ascending. `returns` is the mean of the three accounts. */
export function impactAnchors(field: ImpactField): readonly [number, number, number] {
  const v = (['prudent', 'neutral', 'bold'] as const).map((k) => valueOf(ASSUMPTION_PRESETS[k], field)).sort((a, b) => a - b)
  return [v[0], v[1], v[2]]
}

const EPS = 1e-9 // a typed « 3,1 » is 3.1 / 100, not always bit-equal to the preset's own

export function impactOf(field: ImpactField, value: number): AssumptionImpact {
  return impactAmong(impactAnchors(field), value, HIGHER_IS_BETTER[field])
}

/** One account's return against the prudent / neutral / bold return OF THAT ACCOUNT (the sliders are per account). */
export function impactOfReturn(kind: 'rrsp' | 'tfsa' | 'nonReg', value: number): AssumptionImpact {
  const v = (['prudent', 'neutral', 'bold'] as const).map((k) => ASSUMPTION_PRESETS[k].returns[kind]).sort((a, b) => a - b)
  return impactAmong([v[0], v[1], v[2]], value, true)
}

function impactAmong(anchors: readonly [number, number, number], value: number, higherIsBetter: boolean): AssumptionImpact {
  const [lo, mid, hi] = anchors
  const level: ImpactLevel =
    value < lo - EPS ? 'below' : value > hi + EPS ? 'above' : value <= (lo + mid) / 2 + EPS ? 'low' : value <= (mid + hi) / 2 + EPS ? 'typical' : 'high'
  const high = level === 'high' || level === 'above'
  const tilt: ImpactTilt = level === 'typical' ? 'middle' : high === higherIsBetter ? 'optimistic' : 'cautious'
  return { level, tilt }
}

/** Position on a five-step track, 0 (far low) … 4 (far high) — what the meter draws. */
export const LEVEL_POSITION: Readonly<Record<ImpactLevel, number>> = { below: 0, low: 1, typical: 2, high: 3, above: 4 }
