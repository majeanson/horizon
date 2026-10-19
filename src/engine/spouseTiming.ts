import { project } from './projection.ts'
import { rrqStart } from './rrq.ts'
import type { Assumptions, Household } from './types.ts'

// « WHO SHOULD START THE QPP FIRST? » — a couple's two start ages tried together, 3 × 3, each combination held to the SAME plain test as everything else.
// A pension that starts earlier pays longer but less; whether that is the better trade for the HOUSEHOLD depends on who outlives whom, because the survivor keeps the
// accounts but takes the larger of the two QPP pensions' worth only partly (engine/survivor.ts). So each combination is run three times — both alive to the end of the plan,
// then each spouse in turn dying early — and scored by the WORST of the three: a combination is only as good as its worst luck. The household's own start ages are run too, so the
// grid is read against what the profile says today. The ages stay what the profile says for everything else (retiring, the OAS, the employer pensions).
//
// The early death is an age stated here (`EARLY_DEATH_AGE`), not a forecast; it is the same device as the « Si l'un décède » sweep (a person's `horizonAge`). Pure.

/** The QPP start ages tried for each spouse: the earliest, the base age and the latest the Act allows. */
export const START_AGES = [60, 65, 70] as const
/** The age at which a spouse dies in the two early-death runs. */
export const EARLY_DEATH_AGE = 75

export interface TimingCell {
  /** The QPP start age of the first and of the second person. */
  starts: [number, number]
  /** The money lasts to the end of the plan in all three runs. */
  ok: boolean
  /** What the household owns at the end of the plan, in today's dollars: both alive · the first person dies early · the second does. */
  endWorth: { bothAlive: number; firstDies: number; secondDies: number }
  /** The smallest of the three (the score). */
  worst: number
  /**
   * Every person's start date is still ahead (this year or later — the same test as `StartOption.passed` in deferral.ts). A start age already behind a person
   * can no longer be chosen: the cell is still run (the grid keeps its shape) but never offered as `best`.
   */
  feasible: boolean
}

export interface SpouseTiming {
  /** The nine combinations, the first person's age down, the second's across. */
  cells: TimingCell[]
  /** The household's own start ages, run the same way. */
  current: TimingCell
  /** The combination with the highest worst case among the OPEN ones (`feasible`) that work in all three runs; else the household's own if it works; null when none does. */
  best: [number, number] | null
}

function run(h: Household, a: Assumptions, dies?: { index: number; age: number }): { ok: boolean; endWorth: number } {
  const dying: Household =
    dies === undefined ? h : { ...h, persons: h.persons.map((p, i) => (i === dies.index ? { ...p, horizonAge: dies.age } : p)) }
  const rows = project(dying, a, {})
  const last = rows[rows.length - 1]
  return { ok: !rows.some((r) => r.household.shortfall > 0), endWorth: last.household.netWorthEnd / (1 + a.inflation) ** (last.year - a.today.year) }
}

/** One combination of start ages, three runs. */
export function timingCell(h: Household, a: Assumptions, starts: [number, number]): TimingCell {
  const set: Household = { ...h, persons: h.persons.map((p, i) => (i < 2 ? { ...p, rrq: { ...p.rrq, startAge: starts[i] } } : p)) }
  // An age stated here, but never past the person's own plan: a horizon of 70 dies at 70, it does not live on to 75.
  const dieAt = (i: number) => {
    const p = set.persons[i]
    return Math.min(a.horizonForAll ?? p.horizonAge ?? a.horizonAge, Math.max(EARLY_DEATH_AGE, a.today.year - p.birth.year + 1))
  }
  const both = run(set, a)
  const first = run(set, a, { index: 0, age: dieAt(0) })
  const second = run(set, a, { index: 1, age: dieAt(1) })
  const endWorth = { bothAlive: both.endWorth, firstDies: first.endWorth, secondDies: second.endWorth }
  const feasible = set.persons.every((p, i) => i >= 2 || rrqStart(p.birth, starts[i]).year >= a.today.year)
  return { starts, ok: both.ok && first.ok && second.ok, endWorth, worst: Math.min(endWorth.bothAlive, endWorth.firstDies, endWorth.secondDies), feasible }
}

/** The grid for a couple; null for anyone else (a household of one has nobody to order). */
export function spouseTiming(h: Household, a: Assumptions): SpouseTiming | null {
  if (h.persons.length !== 2) return null
  const cells: TimingCell[] = []
  for (const sa of START_AGES) for (const sb of START_AGES) cells.push(timingCell(h, a, [sa, sb]))
  const current = timingCell(h, a, [h.persons[0].rrq.startAge, h.persons[1].rrq.startAge])
  const working = cells.filter((c) => c.ok && c.feasible)
  const top = working.reduce<TimingCell | null>((best, c) => (best === null || c.worst > best.worst ? c : best), null)
  // When no open combination works, the household's own (already chosen, possibly started) one is the only honest answer — if it works.
  return { cells, current, best: top !== null ? top.starts : current.ok ? current.starts : null }
}
