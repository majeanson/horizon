// « ANNULER » AFTER A FILL. A level, « Estimer ce qui manque » and the relevé's « Remplir » each write many figures at once, then offer to take them back.
// Taking them back restores what was there BEFORE — so it is only honest while nothing else has changed since: undoing after the person typed their salary,
// added a spouse or pasted their relevé would silently throw all of that away. The offer stands while the thing the fill produced is still what is on
// screen (the very same object: every edit makes a new one), and goes the moment anything else is touched.

/** What a fill did: its note, what was there before it (null: nothing to undo), and what it produced. */
export interface FillDone<T> {
  note: string
  before: T | null
  after: T | null
}

/** May the fill still be undone? Only while what it produced is still exactly what is there now. */
export const canUndo = <T>(done: FillDone<T> | null, now: T): boolean => done !== null && done.before !== null && done.after !== null && done.after === now
