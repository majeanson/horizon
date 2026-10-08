import { plain } from '../engine/params/cited.ts'
import { TFSA_LIMIT_HISTORY } from '../engine/params/tfsaHistory.ts'
import type { Person } from '../engine/types.ts'
import { fillFromSalary } from './earnings.ts'
import type { Profile } from './schema.ts'

// THE QUICK WAY: what can be estimated when the documents are not at hand — and said to be an estimate. Nothing here marks a
// figure confirmed (only the person does that, lib/facts.ts), and nothing replaces a figure the person has typed: an estimate only
// fills what is blank (an earnings year with nothing in it, a TFSA room left at 0).

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

export interface Estimated {
  profile: Profile
  /** Earnings years that were blank and now hold an estimate. */
  years: number
  /** People whose TFSA room was 0 and now holds an estimate. */
  rooms: number
}

/**
 * Fill in what is missing from what is known: each person's blank earnings years from their salary (the same deflation as the
 * button on the earnings list) and a TFSA room left at 0 from their age and balance. The same profile comes back when
 * there is nothing to fill.
 */
export function estimateMissing(p: Profile, today: { year: number }): Estimated {
  let years = 0
  let rooms = 0
  const persons = p.household.persons.map((person): Person => {
    const filled = fillFromSalary(person, today, p.assumptions.wageGrowth)
    const added = Object.keys(filled).length - Object.keys(person.earningsHistory).length
    years += added
    const room = person.accounts.tfsa.room === 0 ? estimateTfsaRoom(person.birth.year, person.accounts.tfsa.balance, today.year) : person.accounts.tfsa.room
    const roomChanged = room !== person.accounts.tfsa.room
    if (roomChanged) rooms++
    if (added === 0 && !roomChanged) return person
    return { ...person, earningsHistory: filled, accounts: { ...person.accounts, tfsa: { ...person.accounts.tfsa, room } } }
  })
  if (years === 0 && rooms === 0) return { profile: p, years, rooms }
  return { profile: { ...p, household: { ...p.household, persons } }, years, rooms }
}
