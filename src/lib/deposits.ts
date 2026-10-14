// What has been put into an account, set beside what it is worth: how much it gained or lost, and whether it is clearly below what it received. A CHECK that says what the
// money did, so that the return the plan assumes for the account is read against it. Never an input.

/** The account is « clearly below » what it received once it has lost this share. */
export const BELOW_BY = 0.2

export interface DepositsCheck {
  /** The change since the money went in: the balance over the deposits, less one (−0,69 is a loss of 69 %). */
  change: number
  below: boolean
}

/** Null while nothing was put in: there is nothing to compare. `deposited` is the total put in less the total taken out. */
export function depositsCheck(deposited: number | undefined, balance: number): DepositsCheck | null {
  if (deposited === undefined || !(deposited > 0)) return null
  const change = balance / deposited - 1
  return { change, below: change <= -BELOW_BY + 1e-9 }
}
