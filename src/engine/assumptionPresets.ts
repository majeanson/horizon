import type { Assumptions } from './types.ts'

// Three ready-made sets of « what the future looks like » — prudent, neutral, bold — so a person who has no view of
// their own can start from a stated, defensible one instead of a blank field.
//
// These are NOT official figures and are not `Cited`: they are the person's assumptions, offered pre-filled. The
// NEUTRAL set is anchored on the FP Canada / Institut de planification financière 2026 Projection Assumption
// Guidelines (effective 30 April 2026, published 23 April 2025): inflation 2,1 %, YMPE growth 3,1 %, Canadian equities
// 6,3 %, U.S. equities 6,4 %, fixed income 3,2 %. A 60 / 40 equity-and-bond mix of those is ≈ 5,1 % before fees; about
// 0,6 pt of fees (this app's own assumption — the guidelines publish none) leaves 4,5 %. The non-registered account
// keeps the half-point gap the app has always shown it (its return is taxed as a deferred gain).
// https://institutpf.org/en/communique/linstitut-de-planification-financiere-et-fp-canada-et-publient-les-normes-dhypotheses-de-projection-2026
//
// PRUDENT and BOLD are the neutral set moved by a stated margin, in the direction that hurts (or helps) the plan:
// returns ∓ 1,5 pt, inflation toward the top (2,5 %) or the target (2,0 %) of the Bank of Canada's 1–3 % band, wages
// ∓ 0,5 pt, and a life to 100 or to 90. They bracket a reasonable range; they are not forecasts and carry no
// probability (see simulate.ts on why there is no Monte-Carlo).

export type PresetKey = 'prudent' | 'neutral' | 'bold'

export const PRESET_KEYS: readonly PresetKey[] = ['prudent', 'neutral', 'bold']

export type PresetValues = Pick<Assumptions, 'inflation' | 'wageGrowth' | 'returns' | 'horizonAge'>

export const ASSUMPTION_PRESETS: Readonly<Record<PresetKey, PresetValues>> = {
  prudent: { inflation: 0.025, wageGrowth: 0.025, returns: { rrsp: 0.03, tfsa: 0.03, nonReg: 0.025 }, horizonAge: 100 },
  neutral: { inflation: 0.021, wageGrowth: 0.031, returns: { rrsp: 0.045, tfsa: 0.045, nonReg: 0.04 }, horizonAge: 95 },
  bold: { inflation: 0.02, wageGrowth: 0.035, returns: { rrsp: 0.06, tfsa: 0.06, nonReg: 0.055 }, horizonAge: 90 },
}

/** `a` with a preset's economy, returns and horizon laid over it; the withdrawal order and splitting are the person's. */
export function withPreset<A extends Pick<Assumptions, 'inflation' | 'wageGrowth' | 'returns' | 'horizonAge'>>(a: A, key: PresetKey): A {
  const p = ASSUMPTION_PRESETS[key]
  return { ...a, inflation: p.inflation, wageGrowth: p.wageGrowth, returns: { ...p.returns }, horizonAge: p.horizonAge }
}

/** Which preset the assumptions equal exactly, or null when they are the person's own (« personnalisé »). */
export function presetOf(a: PresetValues): PresetKey | null {
  return (
    PRESET_KEYS.find((key) => {
      const p = ASSUMPTION_PRESETS[key]
      const same = (x: number, y: number) => Math.abs(x - y) < 1e-9 // a typed « 3,1 » is 3.1 / 100, not always bit-equal
      return (
        same(a.inflation, p.inflation) &&
        same(a.wageGrowth, p.wageGrowth) &&
        a.horizonAge === p.horizonAge &&
        same(a.returns.rrsp, p.returns.rrsp) &&
        same(a.returns.tfsa, p.returns.tfsa) &&
        same(a.returns.nonReg, p.returns.nonReg)
      )
    }) ?? null
  )
}
