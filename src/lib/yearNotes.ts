import type { PersonId, PersonYear, YearRow } from '../engine/types.ts'

// THE YEARS THAT LOOK DIFFERENT FOR A REASON. In the year-by-year table a pension starts part-way through a year and is paid for only some of its months, a survivor's pension changes rule on the
// 65th birthday, and a one-off benefit sits inside a single year's QPP: each makes one year read oddly beside its neighbours (a pension that « falls », a survivor's pension that « drops »)
// when nothing is wrong. This names those years so the table can say why. Read off the engine's own rows (the consecutive years of one run), so it follows the engine and adds nothing to it.

export type YearNoteKind = 'oasPartial' | 'rrqPartial' | 'survivorStarts' | 'survivorAge65' | 'deathBenefit'

export interface YearNote {
  year: number
  kind: YearNoteKind
  who: PersonId
}

/** A first year paid at less than this share of the next one was paid for only part of the year (indexation alone moves a year to the next by a few percent, a missing month by eight). */
const PARTIAL = 0.94
/** The age a survivor's pension changes rule. */
const SURVIVOR_AGE = 65

/** What the person's own QPP pension paid in the year: the QPP received less the survivor's pension and the one-off death benefit that ride inside it. */
const ownRrq = (p: PersonYear): number => p.rrq - p.survivorPension - p.deathBenefit

export function yearNotes(rows: readonly YearRow[]): YearNote[] {
  const out: YearNote[] = []
  for (let i = 1; i < rows.length - 1; i++) {
    for (const who of ['self', 'spouse'] as const) {
      const prev = rows[i - 1].persons[who]
      const cur = rows[i].persons[who]
      const next = rows[i + 1].persons[who]
      if (!prev || !cur) continue
      const year = rows[i].year
      if (next && prev.oas === 0 && cur.oas > 0 && cur.oas < PARTIAL * next.oas) out.push({ year, kind: 'oasPartial', who })
      if (next && ownRrq(prev) <= 0 && ownRrq(cur) > 0 && ownRrq(cur) < PARTIAL * ownRrq(next)) out.push({ year, kind: 'rrqPartial', who })
      if (prev.survivorPension === 0 && cur.survivorPension > 0) out.push({ year, kind: 'survivorStarts', who })
      if (cur.survivorPension > 0 && cur.age === SURVIVOR_AGE) out.push({ year, kind: 'survivorAge65', who })
      if (cur.deathBenefit > 0) out.push({ year, kind: 'deathBenefit', who })
    }
  }
  return out.sort((a, b) => a.year - b.year || a.kind.localeCompare(b.kind))
}
