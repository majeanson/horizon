import { atLeastOneAlive, chanceAlive, type SurvivorTable } from '../engine/survival.ts'

// THE CHANCE OF REACHING THE PLAN'S AGE, for the page that asks « jusqu'à quel âge planifier ». One line per person (their age today, the age the plan lasts to, the chance of being there), and for a
// couple the chance that at least one of them is alive in the plan's last year — the year the money still has to be there. Pure arithmetic on the profile and Statistics Canada's table (engine/survival.ts).

interface PersonAge {
  id: string
  birth: { year: number }
  horizonAge?: number | null
}

export interface SurvivalView {
  people: { id: string; age: number; horizon: number; chance: number }[]
  /** The last year of the plan and the chance at least one of the two is alive in it; null for one person. */
  couple: { year: number; chance: number } | null
}

/** @param horizonAge the scenario's age, for a person with none of their own. Null when no one has an age the table covers. */
export function survivalView(persons: readonly PersonAge[], horizonAge: number, todayYear: number, table: SurvivorTable): SurvivalView | null {
  const people: SurvivalView['people'] = []
  for (const p of persons) {
    const age = todayYear - p.birth.year
    const horizon = p.horizonAge ?? horizonAge
    const chance = chanceAlive(age, horizon, table)
    if (chance !== null) people.push({ id: p.id, age, horizon, chance })
  }
  if (people.length === 0) return null
  let couple: SurvivalView['couple'] = null
  if (persons.length === 2 && people.length === 2) {
    const year = Math.max(...persons.map((p) => p.birth.year + (p.horizonAge ?? horizonAge)))
    const chances = persons.map((p) => chanceAlive(todayYear - p.birth.year, year - p.birth.year, table))
    if (chances.every((c): c is number => c !== null)) couple = { year, chance: atLeastOneAlive(chances) }
  }
  return { people, couple }
}
