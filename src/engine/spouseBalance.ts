import { MIN_TRY_AGE, everyoneAt, retireAt, runScenario } from './retireAt.ts'
import type { Assumptions, Household, PersonId } from './types.ts'

// « What would evening out the two spouses' RRSPs be worth? » — the plan run again with part of the larger spouse's RRSP balance
// sitting in the other's. It approximates a SPOUSAL RRSP: the higher earner contributes, the money is the partner's to draw.
// Nothing new is modelled: the same projection, the same tax function, the same pension splitting, withdrawals still solved year
// by year. Only the owner of the balance changes, so the tax falls where the two spouses' brackets differ at the time of drawing.
//
// What it leaves out (and the page says so): the room and the yearly contribution stay with the larger spouse — a spousal
// contribution is deducted by the CONTRIBUTOR; the CRA's attribution rule (a withdrawal within the calendar years that follow a
// contribution is taxed back in the contributor's hands) is not simulated; and the benefit is mostly before 65, since the
// engine already splits pension income, RRIF included, from 65 on.

/** The share of the gap between the two balances that is moved: half evens them out. */
export const BALANCE_SHARE = 0.5

export interface BalanceOutcome {
  /** RRSP balance of each person today, in the household's person order. */
  rrsp: number[]
  /** The earliest whole age at which everyone can stop and the plan lasts, or null. */
  earliestOk: number | null
  /** Income tax and OAS recovery, summed over the plan at the asked age, in today's dollars. */
  lifetimeTax: number
}

export interface SpouseBalance {
  /** The age the tax was read at. */
  age: number
  /** The larger RRSP's share of the two RRSPs together (0.5 to 1). */
  share: number
  /** The person holding the larger RRSP, and the one who would receive part of it. */
  from: PersonId
  to: PersonId
  /** The balance moved, today's dollars (0 when the two are level, or when what could move is locked in). */
  moved: number
  current: BalanceOutcome
  balanced: BalanceOutcome
  /** Lifetime tax saved by evening out, today's dollars (negative when it would cost). */
  taxSaved: number
  /** Years earlier the plan lasts when evened out (0 when none, or when the household's own never lasts). */
  yearsEarlier: number
}

function outcome(h: Household, a: Assumptions, age: number, firstAge: number, lastAge: number): BalanceOutcome {
  const earliestOk = retireAt(h, a, { from: firstAge, to: lastAge, stopAtFirstOk: true }).earliestOk
  const run = runScenario(h, a, everyoneAt(h, age), age)
  let lifetimeTax = 0
  for (const row of run.rows) lifetimeTax += row.household.tax / Math.pow(1 + a.inflation, row.year - a.today.year)
  return { rrsp: h.persons.map((p) => p.accounts.rrsp.balance), earliestOk, lifetimeTax }
}

/** The plan with `gap × BALANCE_SHARE` of the larger RRSP moved to the smaller one; null for a household that is not a couple, or holds no RRSP. */
export function spouseBalance(h: Household, a: Assumptions, age: number, firstAge = MIN_TRY_AGE, lastAge = 70): SpouseBalance | null {
  if (h.persons.length < 2) return null
  const [p0, p1] = h.persons
  const total = p0.accounts.rrsp.balance + p1.accounts.rrsp.balance
  if (!(total > 0)) return null
  const [big, small] = p0.accounts.rrsp.balance >= p1.accounts.rrsp.balance ? [p0, p1] : [p1, p0]
  // A locked-in balance (a LIRA, an employer's VRSP share) cannot be sent to a spousal plan: only the rest can move.
  const movable = Math.max(0, big.accounts.rrsp.balance - (big.accounts.rrsp.lockedIn ?? 0))
  const moved = Math.min(movable, BALANCE_SHARE * (big.accounts.rrsp.balance - small.accounts.rrsp.balance))
  const current = outcome(h, a, age, firstAge, lastAge)
  const evened: Household = {
    ...h,
    persons: h.persons.map((p) =>
      p.id === big.id
        ? { ...p, accounts: { ...p.accounts, rrsp: { ...p.accounts.rrsp, balance: p.accounts.rrsp.balance - moved } } }
        : p.id === small.id
          ? { ...p, accounts: { ...p.accounts, rrsp: { ...p.accounts.rrsp, balance: p.accounts.rrsp.balance + moved } } }
          : p,
    ),
  }
  const balanced = moved > 0 ? outcome(evened, a, age, firstAge, lastAge) : current
  const yearsEarlier = current.earliestOk !== null && balanced.earliestOk !== null ? Math.max(0, current.earliestOk - balanced.earliestOk) : 0
  return { age, share: Math.max(p0.accounts.rrsp.balance, p1.accounts.rrsp.balance) / total, from: big.id, to: small.id, moved, current, balanced, taxSaved: current.lifetimeTax - balanced.lifetimeTax, yearsEarlier }
}
