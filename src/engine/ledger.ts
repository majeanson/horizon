import { deferralMultiplier, oasStart, residenceFraction } from './oas.ts'
import { paramsFor } from './params/index.ts'
import { project, resolve } from './projection.ts'
import { makeRrqRules } from './rrqRules.ts'
import type { Assumptions, Household, PersonId } from './types.ts'

// « Mes données » — the three ages a person sets, each with the calculation that turns it into money, so a figure on the
// results page can be traced to the number that made it. It reads the SAME resolved person the projection runs on
// (projection.ts `resolve`), so nothing here can differ from the verdict.

export interface AgesLedger {
  id: PersonId
  /** `done`: the last pay is today or behind — the age can no longer be chosen. Likewise for each pension's start. */
  retirement: { age: number; leaving: { year: number; month: number }; done: boolean }
  rrq: {
    startAge: number
    start: { year: number; month: number }
    done: boolean
    /** The monthly pension at the start, in the start year's dollars, to the cent. */
    monthly: number
    /** The base and the two additional components before the start-age adjustment, per month. */
    base: number
    additionalFirst: number
    additionalSecond: number
    /** The multiplier the start age applies (< 1 early, > 1 late). */
    adjustment: number
    /** The monthly pension today's dollars would buy at the start (the start year's dollars deflated by prices). */
    monthlyToday: number
  }
  oas: {
    startAge: number
    start: { year: number; month: number }
    done: boolean
    /** The full monthly pension at 65–74 in the start year's figures, the residence share and the deferral multiplier it is multiplied by. */
    full: number
    residence: number
    multiplier: number
    monthly: number
    monthlyToday: number
  }
}

/** One person's ages and what they turn into, for the given household (the profile's own ages, unless `scenario` says otherwise). */
export function agesLedger(h: Household, a: Assumptions): AgesLedger[] {
  const indexation = { inflation: a.inflation, wageGrowth: a.wageGrowth }
  const rules = makeRrqRules(indexation)
  return h.persons.map((p) => {
    const r = resolve(p, a, {}, rules)
    const deflate = (year: number) => (1 + a.inflation) ** (year - a.today.year)
    const oStart = oasStart(p.birth, r.oasStartAge)
    // A pension that began before today is read at TODAY's figures: the engine holds no parameters for a past year.
    const O = paramsFor(Math.max(oStart.year, a.today.year), indexation).oas
    const residence = residenceFraction(r.oas, oStart.year, O)
    const multiplier = deferralMultiplier(r.oasStartAge, O)
    const oasMonthly = Math.round(O.monthly65to74 * residence * multiplier * 100) / 100
    return {
      id: p.id,
      retirement: { age: r.retirementAge, leaving: r.leaving, done: isPast(r.leaving, a.today) },
      rrq: {
        startAge: r.rrqStartAge,
        start: r.rrq.start,
        done: isPast(r.rrq.start, a.today),
        monthly: r.rrq.monthly,
        base: r.rrq.base,
        additionalFirst: r.rrq.additionalFirst,
        additionalSecond: r.rrq.additionalSecond,
        adjustment: r.rrq.adjustment,
        monthlyToday: r.rrq.monthly / deflate(r.rrq.start.year),
      },
      oas: { startAge: r.oasStartAge, start: oStart, done: isPast(oStart, a.today), full: O.monthly65to74, residence, multiplier, monthly: oasMonthly, monthlyToday: oasMonthly / deflate(oStart.year) },
    }
  })
}

/** What one projection says about the plan as a whole: the live impact of a change, cheap enough to run on every step of a slider. */
export interface PlanGlance {
  ok: boolean
  firstShortfallYear: number | null
  /** The household's net worth in the plan's last year, in today's dollars. */
  netWorthEnd: number
}

export function planGlance(h: Household, a: Assumptions): PlanGlance {
  const rows = project(h, a)
  const bad = rows.find((r) => r.household.shortfall > 0)
  const last = rows[rows.length - 1]
  return { ok: !bad, firstShortfallYear: bad ? bad.year : null, netWorthEnd: last ? last.household.netWorthEnd / (1 + a.inflation) ** (last.year - a.today.year) : 0 }
}

const monthIndex = (ym: { year: number; month: number }): number => ym.year * 12 + (ym.month - 1)

/** Is this month today or already behind? A start or a last pay that has happened can no longer be chosen. */
export const isPast = (ym: { year: number; month: number }, today: { year: number; month: number }): boolean => monthIndex(ym) <= monthIndex(today)

/**
 * Where the household stands against its own choices: has everybody already stopped working (then « when can I retire? » is
 * answered — the question left is whether the money lasts), and is any pension start still ahead (then « when should it start? »
 * is still a question).
 */
export function retirementState(h: Household, a: Assumptions): { everyoneRetired: boolean; pensionsOpen: boolean } {
  const ledger = agesLedger(h, a)
  return {
    everyoneRetired: ledger.every((l) => l.retirement.done),
    pensionsOpen: ledger.some((l) => !l.rrq.done || !l.oas.done),
  }
}
