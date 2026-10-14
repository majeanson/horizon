import { plain } from '../engine/params/cited.ts'
import { knownYear, LAST_KNOWN_YEAR } from '../engine/params/index.ts'

// THE TFSA ROOM LEFT TODAY. The CRA account shows the room « as of January 1 »: it does not know what was deposited since. The room left is that figure less this
// year's deposits; a withdrawal made this year gives its room back only on the next January 1, and the new year's limit arrives the same day.

/** The yearly TFSA limit the engine uses (the last known year's, cited in engine/params). */
export const tfsaYearlyLimit = (): number => plain(knownYear(LAST_KNOWN_YEAR).accounts.tfsaLimit)

export interface TfsaRoom {
  /** The room left today; 0 when the deposits are over it. */
  today: number
  /** How far the deposits are over the CRA's room (0 when they are not): the CRA taxes the excess at 1 % a month. */
  overBy: number
  /** The room on the next January 1: what is left (never below 0) plus the yearly limit, this year's one, as a floor for next year's. */
  nextJanuary: number
}

/** `jan1`: the CRA's room as of January 1. `deposited`: what went into any TFSA since. `limit`: the yearly limit. */
export function tfsaRoom(jan1: number, deposited: number, limit: number): TfsaRoom {
  const left = jan1 - deposited
  return { today: Math.max(0, left), overBy: Math.max(0, -left), nextJanuary: Math.max(0, left) + limit }
}
