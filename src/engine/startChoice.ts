import { oasStart } from './oas.ts'
import { rrqStart, type YearMonth } from './rrq.ts'

// « CAN I STILL START IT AT THAT AGE? » — the one test every place that offers a pension start age reads (the levers, the bridge
// strategies, the spouses' timing grid), so a choice already behind a person is never offered as if it could still be made.
//
// Year-level, like the projection: a start this year or later is still ahead (deferral.ts `passed` is the same test on the age asked).

export type PensionKind = 'rrq' | 'oas'

const startOf = (kind: PensionKind, birth: YearMonth, age: number): YearMonth => (kind === 'rrq' ? rrqStart(birth, age) : oasStart(birth, age))

/** A start date still to come: this calendar year or a later one. */
export const startAhead = (start: YearMonth, today: { year: number }): boolean => start.year >= today.year

/**
 * Whether a person can still make `age` the start of this pension. The age they have now always can — it is the plan as it stands. Any
 * other needs BOTH starts ahead: the one asked for (a start in an earlier year is history, not a choice) and the one they have (a pension
 * paid since an earlier year cannot be stopped and taken later at a higher rate: the QPP application and the OAS pension can only be
 * cancelled in the months after the first payment, `cancelMonths`).
 */
export function canStartAt(kind: PensionKind, birth: YearMonth, ownAge: number, age: number, today: { year: number }): boolean {
  if (age === ownAge) return true
  return startAhead(startOf(kind, birth, age), today) && startAhead(startOf(kind, birth, ownAge), today)
}
