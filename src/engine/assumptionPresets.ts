import type { Assumptions } from './types.ts'

// Three ready-made sets of « what the future looks like » — prudent, neutral, bold — so a person who has no view of
// their own can start from a stated, defensible one instead of a blank field.
//
// These are NOT official figures and are not `Cited`: they are the person's assumptions, offered pre-filled. The
// NEUTRAL set is anchored on two published sources.
//   · RETURNS AND INFLATION — the FP Canada / Institut de planification financière 2026 Projection Assumption Guidelines
//     (effective 30 April 2026, published 23 April 2025): inflation 2,1 %, Canadian equities 6,3 %, U.S. equities 6,4 %,
//     fixed income 3,2 %. A 60 / 40 equity-and-bond mix of those is ≈ 5,1 % before fees; about 0,6 pt of fees (this app's
//     own assumption — the guidelines publish none) leaves 4,5 %. The non-registered account keeps the half-point gap the
//     app has always shown it (its return is taxed as a deferred gain).
//     https://institutpf.org/en/communique/linstitut-de-planification-financiere-et-fp-canada-et-publient-les-normes-dhypotheses-de-projection-2026
//   · WAGES — Retraite Québec's actuarial valuation of the QPP at 31 December 2024 (annex 3, tables 27 and 30): inflation
//     2,1 % from 2028 and a REAL growth of average earnings of 0,6 % a year from 2028 (0,4 % in 2025–2027), so 2,7 % a year in
//     all, and the same rate for the maximum pensionable earnings (MGA); the 20-year Québec average it cites is 0,8 % real.
//     The wage figure used to be the FP Canada one (3,1 %, the growth of the MGA from 2016 to 2026): a rate from a decade
//     when prices rose 2,8 % a year (Statistics Canada, table 18-10-0005-01, 2016 to 2025), paired here with 2,1 % inflation,
//     which made the QPP projection grow about 1 % a year faster than prices. The pension it is projected on is Retraite
//     Québec's, so its assumption is the one used.
//     https://www.retraitequebec.gouv.qc.ca/fr/publications/programmes/regime-rentes-quebec-rrq/evaluations-actuarielles
//
// PRUDENT and BOLD are the neutral set moved by a stated margin, in the direction that hurts (or helps) the plan:
// returns ∓ 1,5 pt, inflation toward the top (2,5 %) or the target (2,0 %) of the Bank of Canada's 1–3 % band, wages
// ∓ 0,5 pt (a prudent household's pay falls a little behind prices), and a life to 100 or to 90. They bracket a reasonable range; they are not forecasts and carry no
// probability (see simulate.ts on why there is no Monte-Carlo).

/**
 * The real growth of average earnings Retraite Québec assumes from 2028 (0,4 % in 2025–2027): 0,6 % a year on top of inflation. The Neutre wage growth is the inflation plus this,
 * and the page sets a person's own figure beside it.
 */
export const REAL_WAGE_GROWTH_RQ = 0.006

export type PresetKey = 'prudent' | 'neutral' | 'bold'

export const PRESET_KEYS: readonly PresetKey[] = ['prudent', 'neutral', 'bold']

export type PresetValues = Pick<Assumptions, 'inflation' | 'wageGrowth' | 'returns' | 'horizonAge'>

export const ASSUMPTION_PRESETS: Readonly<Record<PresetKey, PresetValues>> = {
  prudent: { inflation: 0.025, wageGrowth: 0.022, returns: { rrsp: 0.03, tfsa: 0.03, nonReg: 0.025 }, horizonAge: 100 },
  neutral: { inflation: 0.021, wageGrowth: 0.027, returns: { rrsp: 0.045, tfsa: 0.045, nonReg: 0.04 }, horizonAge: 95 },
  bold: { inflation: 0.02, wageGrowth: 0.032, returns: { rrsp: 0.06, tfsa: 0.06, nonReg: 0.055 }, horizonAge: 90 },
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
      const same = (x: number, y: number) => Math.abs(x - y) < 1e-9 // a typed « 2,7 » is 2.7 / 100, not always bit-equal
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
