import { plain } from '../engine/params/cited.ts'
import { RRSP_LIMIT_HISTORY } from '../engine/params/rrspHistory.ts'
import { TFSA_LIMIT_HISTORY } from '../engine/params/tfsaHistory.ts'
import type { Person } from '../engine/types.ts'
import { fillFromSalary } from './earnings.ts'
import type { Profile } from './schema.ts'

// THE QUICK WAY: what can be estimated when the documents are not at hand — and said to be an estimate. Nothing here marks a
// figure confirmed (only the person does that, lib/facts.ts), and nothing replaces a figure the person has typed: an estimate only
// fills what is blank (an earnings year with nothing in it, a TFSA or an RRSP room left at 0).

/**
 * The TFSA room someone probably has: every annual limit since they were first eligible (18, and not before 2009) up to this
 * year, less what the account holds — the balance standing in for what was contributed (growth makes it a little generous in
 * the room it leaves, and a withdrawal a little stingy: the CRA account has the real figure). Never negative.
 */
export function estimateTfsaRoom(birthYear: number, balance: number, year: number): number {
  const limits = plain(TFSA_LIMIT_HISTORY)
  const last = Math.max(...Object.keys(limits).map(Number))
  let total = 0
  for (let y = Math.max(2009, birthYear + 18); y <= year; y++) total += limits[y] ?? limits[last]
  return Math.max(0, Math.round(total - balance))
}

/** The share of last year's earned income that becomes RRSP room each year (the lesser of it and the year's dollar limit). */
const RRSP_ROOM_SHARE = 0.18

/**
 * The RRSP room someone probably has today — what each year's room added up to since 1991 (or since their first job), less what the account holds:
 *   · each deduction year earns the LESSER of 18 % of the PREVIOUS year's earned income and that year's dollar limit (the CRA's table, params/rrspHistory.ts);
 *   · the earned income of each past year is the one typed in the relevé, else today's salary deflated by the wage growth (lib/earnings.ts), NOT capped by the QPP's ceiling;
 *   · what was put in is not known: the balance (without the locked-in part, which came from a transfer and never used room) stands in for it — growth makes the balance exceed
 *     what went in, so the room left is a little STINGY, never generous (the CRA notice has the real figure).
 * Not estimated (null) for someone in an employer pension plan — its pension adjustment takes room away by an amount only the notice shows — or with no earnings to go by.
 * Never negative.
 */
export function estimateRrspRoom(person: Person, today: { year: number }, wageGrowth: number): number | null {
  if (person.pensions.length > 0) return null
  const earnings = fillFromSalary(person, today, wageGrowth)
  const paid = Object.keys(earnings).map(Number).filter((y) => earnings[y] > 0)
  if (paid.length === 0) return null
  const limits = plain(RRSP_LIMIT_HISTORY)
  const lastKnown = Math.max(...Object.keys(limits).map(Number))
  let earned = 0
  // The room of year Y comes from the pay of year Y − 1: so the first year of room is the year after the first paid year.
  for (let year = Math.max(1991, Math.min(...paid) + 1); year <= today.year; year++) {
    const pay = earnings[year - 1] ?? 0
    earned += Math.min(RRSP_ROOM_SHARE * pay, limits[year] ?? limits[lastKnown])
  }
  const { balance, lockedIn = 0 } = person.accounts.rrsp
  return Math.max(0, Math.round(earned - Math.max(0, balance - lockedIn)))
}

export interface Estimated {
  profile: Profile
  /** Earnings years that were blank and now hold an estimate. */
  years: number
  /** People whose TFSA room was 0 and now holds an estimate. */
  rooms: number
  /** People whose RRSP room was 0 and now holds an estimate. */
  rrspRooms: number
}

/**
 * Fill in what is missing from what is known: each person's blank earnings years from their salary (the same deflation as the
 * button on the earnings list), and a TFSA or an RRSP room left at 0 from their age, their earnings and their balance. The same profile comes back when
 * there is nothing to fill.
 */
export function estimateMissing(p: Profile, today: { year: number }): Estimated {
  let years = 0
  let rooms = 0
  let rrspRooms = 0
  const persons = p.household.persons.map((person): Person => {
    const filled = fillFromSalary(person, today, p.assumptions.wageGrowth)
    const added = Object.keys(filled).length - Object.keys(person.earningsHistory).length
    years += added
    const room = person.accounts.tfsa.room === 0 ? estimateTfsaRoom(person.birth.year, person.accounts.tfsa.balance, today.year) : person.accounts.tfsa.room
    const roomChanged = room !== person.accounts.tfsa.room
    if (roomChanged) rooms++
    // The RRSP room is read from the earnings as they will stand (the typed years and the estimated ones), only where it is blank.
    const rrspRoom = person.accounts.rrsp.room === 0 ? estimateRrspRoom({ ...person, earningsHistory: filled }, today, p.assumptions.wageGrowth) : null
    const rrspChanged = rrspRoom !== null && rrspRoom > 0
    if (rrspChanged) rrspRooms++
    if (added === 0 && !roomChanged && !rrspChanged) return person
    return { ...person, earningsHistory: filled, accounts: { ...person.accounts, tfsa: { ...person.accounts.tfsa, room }, rrsp: rrspChanged ? { ...person.accounts.rrsp, room: rrspRoom } : person.accounts.rrsp } }
  })
  if (years === 0 && rooms === 0 && rrspRooms === 0) return { profile: p, years, rooms, rrspRooms }
  return { profile: { ...p, household: { ...p.household, persons } }, years, rooms, rrspRooms }
}
