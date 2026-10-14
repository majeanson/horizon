import type { Household } from '../engine/types.ts'

// The cash buffer: how many months of RETIRED spending sit in money that can be spent without a tax bill on the way out —
// the non-registered account and the TFSA, both spouses together. REER money is left out on purpose: it is taxable when it
// is withdrawn, so it is not a cushion. A READOUT only: the engine never reads it, and nothing is saved.

/** The band the readout compares against, in months. A rule of thumb, not an official figure: no citation. */
export const CASH_BUFFER_BAND = { min: 6, max: 12 } as const

export type CashBufferStatus =
  /** No retired spending entered: there is nothing to divide by. */
  | 'unknown'
  /** No money in the non-registered account or the TFSA. */
  | 'empty'
  | 'below'
  | 'within'
  | 'above'

export interface CashBuffer {
  /** Non-registered + TFSA balances, both spouses, dollars. */
  liquid: number
  /** Retired spending a month, today's dollars. */
  monthly: number
  /** Months of retired spending the liquid money covers; null when no retired spending is entered. */
  months: number | null
  status: CashBufferStatus
}

export function cashBuffer(household: Household, band: { min: number; max: number } = CASH_BUFFER_BAND): CashBuffer {
  const liquid = household.persons.reduce((sum, p) => sum + Math.max(0, p.accounts.nonReg.balance) + Math.max(0, p.accounts.tfsa.balance), 0)
  const monthly = Math.max(0, household.spending.retiredToday) / 12
  if (!(monthly > 0)) return { liquid, monthly: 0, months: null, status: 'unknown' }
  const months = liquid / monthly
  if (!(liquid > 0)) return { liquid: 0, monthly, months: 0, status: 'empty' }
  return { liquid, monthly, months, status: months < band.min ? 'below' : months > band.max ? 'above' : 'within' }
}
