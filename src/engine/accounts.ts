import { roundTo } from './params/project.ts'
import type { Plain } from './params/cited.ts'
import type { YearParams } from './params/types.ts'

// The three kinds of account a household draws on — RRSP/RRIF, TFSA, non-registered — and the rules that
// govern how money moves in and out of each. All three are money SITTING SOMEWHERE; what each costs in tax to
// take out is what differs, and that difference is what the withdrawal order in projection.ts optimises.
//
//   RRSP / RRIF  Every dollar out is fully taxable. Until the year after the person turns 71 withdrawals are
//                voluntary; from then a minimum (a percentage of the 1 January balance, by age) is forced.
//   TFSA         Nothing out is taxable. Room grows each year and a withdrawal comes back as room NEXT year.
//   Non-registered  Only the GAIN in what is withdrawn is taxable (half of it). The engine treats the whole
//                return as deferred gain — a simplification (ENGINE.md §2): interest and dividends, which a
//                real account pays out and taxes yearly, are not modelled.
//
// CONVENTION FOR FLOWS. Money moves during the year, so a balance grows from its January level and from half
// of the year's net flow: end = start × (1 + r) + net × (1 + r)^½. (Withdrawals at the start of the year would
// understate growth; at the end, overstate it.) The RRIF minimum reads the JANUARY balance, as the CRA's does.

export type AccountRules = Plain<YearParams>['accounts']

// ── RRIF ──────────────────────────────────────────────────────────────────────────────────────────

/**
 * The prescribed minimum-withdrawal factor for a person whose age at 1 JANUARY is `ageAtJan1`:
 * 1 ÷ (90 − age) up to 70, the CRA's table from 71, and the last row (20 %) from 95 on.
 */
export function rrifFactor(ageAtJan1: number, rules: AccountRules): number {
  if (ageAtJan1 < rules.rrifConversionAge) return 1 / (rules.rrifDivisor - ageAtJan1)
  const ages = Object.keys(rules.rrifFactors).map(Number)
  const last = Math.max(...ages)
  return rules.rrifFactors[Math.min(ageAtJan1, last)]
}

/** The forced withdrawal for a year: the January balance × the factor for the age at 1 January. */
export function rrifMinimum(ageAtJan1: number, balanceJan1: number, rules: AccountRules): number {
  return roundTo(Math.max(0, balanceJan1) * rrifFactor(ageAtJan1, rules), 0.01)
}

/**
 * The first year a minimum is forced: the year AFTER the person turns 71 (an RRSP must be converted by
 * 31 December of the year they turn 71, and the minimum starts the year after the RRIF exists).
 */
export function firstRrifYear(birthYear: number, rules: AccountRules): number {
  return birthYear + rules.rrifConversionAge + 1
}

/** Age at 1 January of `year` for someone born in `birthYear` (their age attained in the year, less one). */
export const ageAtJan1 = (year: number, birthYear: number): number => year - birthYear - 1

// ── Balances ──────────────────────────────────────────────────────────────────────────────────────

/** A balance after a year: its January level grown, plus half a year's growth on the net flow. */
export function grow(start: number, netFlow: number, rate: number): number {
  return roundTo(start * (1 + rate) + netFlow * (1 + rate) ** 0.5, 0.01)
}

// ── TFSA ──────────────────────────────────────────────────────────────────────────────────────────

export interface TfsaState {
  balance: number
  /** Contribution room available now. */
  room: number
}

/** Puts in what the room allows; the rest is left over for another account. */
export function tfsaContribute(s: TfsaState, amount: number): { state: TfsaState; contributed: number; left: number } {
  const contributed = roundTo(Math.max(0, Math.min(amount, s.room)), 0.01)
  return { state: { balance: s.balance + contributed, room: s.room - contributed }, contributed, left: roundTo(Math.max(0, amount) - contributed, 0.01) }
}

/** Takes out up to `amount`; it is NOT taxable and the room it frees comes back next January. */
export function tfsaWithdraw(s: TfsaState, amount: number): { state: TfsaState; taken: number } {
  const taken = roundTo(Math.max(0, Math.min(amount, s.balance)), 0.01)
  return { state: { balance: s.balance - taken, room: s.room }, taken }
}

/** Room on 1 January: what was left, the year's new limit, and what was withdrawn the year before. */
export function tfsaNextRoom(roomLeft: number, withdrawnLastYear: number, limit: number): number {
  return roomLeft + withdrawnLastYear + limit
}

// ── RRSP room ─────────────────────────────────────────────────────────────────────────────────────

/**
 * Deduction room on 1 January: what is unused, plus the lesser of 18 % of LAST year's earned income and the
 * year's dollar limit, less the pension adjustment a defined-benefit plan reports (it uses up room).
 */
export function rrspNextRoom(roomLeft: number, earnedIncomeLastYear: number, pensionAdjustment: number, rules: AccountRules, dollarLimit: number): number {
  const earned = Math.min(rules.rrspRate * Math.max(0, earnedIncomeLastYear), dollarLimit)
  return Math.max(0, roomLeft + Math.max(0, earned - Math.max(0, pensionAdjustment)))
}

// ── Non-registered ────────────────────────────────────────────────────────────────────────────────

export interface NonRegState {
  balance: number
  /** Adjusted cost base: what has been put in, less what has been taken out of it. */
  acb: number
}

export function nonRegContribute(s: NonRegState, amount: number): NonRegState {
  const a = Math.max(0, amount)
  return { balance: s.balance + a, acb: s.acb + a }
}

/**
 * Takes out up to `amount`. The part of it that is GAIN — its share of the balance above the cost base — is
 * what the person is taxed on (before the inclusion rate); the cost base falls in the same proportion.
 */
export function nonRegWithdraw(s: NonRegState, amount: number): { state: NonRegState; taken: number; realizedGain: number } {
  const taken = roundTo(Math.max(0, Math.min(amount, s.balance)), 0.01)
  if (taken <= 0 || s.balance <= 0) return { state: s, taken: 0, realizedGain: 0 }
  const share = taken / s.balance
  const gainShare = Math.max(0, s.balance - s.acb) * share
  return { state: { balance: s.balance - taken, acb: s.acb * (1 - share) }, taken, realizedGain: roundTo(gainShare, 0.01) }
}
