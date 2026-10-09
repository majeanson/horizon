import { bridgeRun, leversFor, ownPensionTotal, strategyKeysFor, type BridgeLevers, type StrategyKey } from './bridge.ts'
import type { Assumptions, Household } from './types.ts'

// « WHAT IF ONE OF US DIES EARLIER? » — the same plan, the same ways of starting the pensions, with the life of ONE person ending at each of a few ages
// (the other keeps their own). For each way of starting and each age: what that person's QPP + OAS paid until then, what the household owns when the
// plan ends (the survivor keeps the accounts), what the surviving spouse's QPP pension paid, and whether the money still lasts. It says what the
// timing of a pension is worth if the life is short, and how a death moves the rest — the break-even age, seen from the other side.
//
// Every figure comes from `bridgeRun`, i.e. from the same projection the verdict uses (a death is a person's `horizonAge`: survivor.ts, projection.ts),
// in today's dollars. Nothing here is a rule of its own.

/** The ages offered by default: ten years apart would hide the break-even (about 81–82), five years apart shows it. */
export const DEATH_AGES = [70, 75, 80, 85, 90] as const

export interface DeathCell {
  /** The person's own QPP + OAS received until then, before tax, today's dollars. */
  ownPensions: number
  /** The household's accounts when the plan ends (the survivor's, or the estate's when nobody is left), today's dollars. */
  netWorthEnd: number
  /** The QPP surviving spouse's pension paid to the other person, today's dollars (0 for one person alone, or when the other died first). */
  survivorRrq: number
  /** The money lasts to the end of the plan under this death. */
  ok: boolean
  firstShortfallAge: number | null
}

export interface DeathSweep {
  /** The person whose life ends, and the ages tried (only ahead of them, and inside their own plan). */
  id: Household['persons'][number]['id']
  ages: number[]
  rows: { key: StrategyKey; cells: DeathCell[] }[]
}

/** The ages worth trying for a person: still ahead of them, and not past the age their plan already runs to. */
export function sweepAges(h: Household, a: Assumptions, id: BridgeLevers['id'], offered: readonly number[] = DEATH_AGES): number[] {
  const p = h.persons.find((x) => x.id === id) ?? h.persons[0]
  const now = a.today.year - p.birth.year
  const end = a.horizonForAll ?? p.horizonAge ?? a.horizonAge
  return offered.filter((age) => age > now && age < end)
}

export function deathSweep(h: Household, a: Assumptions, levers: BridgeLevers, offered: readonly number[] = DEATH_AGES): DeathSweep {
  const ages = sweepAges(h, a, levers.id, offered)
  const rows = strategyKeysFor(h).map((key) => {
    const l = leversFor(key, h, levers.id, levers.retirementAge)
    const cells = ages.map((age): DeathCell => {
      const dying: Household = { ...h, persons: h.persons.map((p) => (p.id === levers.id ? { ...p, horizonAge: age } : p)) }
      const run = bridgeRun(dying, a, l)
      const last = run.rows[run.rows.length - 1]
      return {
        ownPensions: ownPensionTotal(dying, a, run),
        netWorthEnd: last ? last.nest.total : 0,
        survivorRrq: run.rows.reduce((s, r) => s + r.survivor, 0),
        ok: run.summary.ok,
        firstShortfallAge: run.summary.firstShortfallAge,
      }
    })
    return { key, cells }
  })
  return { id: levers.id, ages, rows }
}
