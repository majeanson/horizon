// HOW LONG PEOPLE LIVE, as a chance. « Until what age should the plan last? » is the question every household answers with a number and no way to weigh it: the chance of reaching an age is what
// makes 90 or 95 mean something. Statistics Canada's complete life table for Québec (engine/params: `mortality.survivors`, both sexes, 2022 to 2024) says how many of 100 000 people born are alive
// at each age; the chance that someone of age A is alive at age B is the ratio of the two. It is an AVERAGE of all Québécois of that age: health, income and sex move it a lot (a woman of 65 reaches
// 90 about 40 % of the time and a man about 28 %), and the table is not the household's own — the screens say so.
//
// Two people's chances are taken as independent (a couple shares a life, a diet and often a fate, so the chance that at least one is alive is a little LOWER than this says): the simple, stated rule.
// Pure; reads no clock; an age outside the table (under 25, over 110) has no chance to give.

/** The table: survivors at each exact age, out of 100 000 born. */
export type SurvivorTable = Readonly<Record<number, number>>

/**
 * The chance, from 0 to 1, that someone aged `from` is alive at age `to`. 1 when `to` is not after `from`; 0 beyond the oldest age of the table; null when `from` is outside the table (there is no
 * chance to give for someone under its first age or over its last, and 0 would be a lie).
 */
export function chanceAlive(from: number, to: number, table: SurvivorTable): number | null {
  const ages = Object.keys(table).map(Number)
  const first = Math.min(...ages)
  const last = Math.max(...ages)
  if (!Number.isFinite(from) || !Number.isFinite(to) || from < first || from > last) return null
  if (to <= from) return 1
  if (to > last) return 0
  const a = table[Math.round(from)]
  const b = table[Math.round(to)]
  if (a === undefined || b === undefined || a <= 0) return null
  return Math.min(1, b / a)
}

/** The chance that at least one of these people is alive, each with the chance given, taken as independent. 0 for nobody. */
export function atLeastOneAlive(chances: readonly number[]): number {
  return 1 - chances.reduce((none, p) => none * (1 - p), 1)
}
