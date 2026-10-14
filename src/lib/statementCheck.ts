import { statementEstimate, type StatementAge } from '../engine/statementCheck.ts'
import type { Person } from '../engine/types.ts'

// The relevé's « Montant actuel » the person typed, set beside what the calculation gives for the same history (engine/statementCheck.ts). A CHECK, never an
// input: the projection does not read the typed figure. The relevé prints whole dollars, so a figure within a dollar of the calculation is the same figure.

/** How close the two must be to be called the same: the relevé rounds to the dollar. */
export const SAME_WITHIN = 1

export interface StatementLine {
  at: StatementAge
  /** What the relevé says. */
  typed: number
  /** What the calculation gives, to the cent. */
  engine: number
  /** The calculation less the relevé. */
  diff: number
  /** |diff| as a share of the relevé's figure. */
  share: number
  same: boolean
}

/** The line for one age, or null while the person has typed no figure for it (nothing to check) or has no earnings entered (nothing to calculate from). */
export function statementLine(person: Person, at: StatementAge, todayYear: number): StatementLine | null {
  const typed = at === 60 ? person.rrq.statementAt60 : person.rrq.statementAt65
  if (typed === undefined || typed <= 0) return null
  if (Object.values(person.earningsHistory).every((v) => !(v > 0))) return null
  const engine = statementEstimate(person.birth, person.earningsHistory, at, todayYear)
  const diff = engine - typed
  return { at, typed, engine, diff, share: Math.abs(diff) / typed, same: Math.abs(diff) <= SAME_WITHIN }
}
