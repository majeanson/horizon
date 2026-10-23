import { describe, expect, it } from 'vitest'
import { EXAMPLES, EXAMPLE_IDS } from '../engine/golden/examples.ts'
import { maxRetiredSpending } from '../engine/maxSpending.ts'
import { everyoneAt, runScenario } from '../engine/retireAt.ts'
import type { Assumptions, Household } from '../engine/types.ts'
import { computeAnswer } from './answer.ts'
import { MAX_AGE, MIN_AGE } from './resultsModel.ts'

// THE NUMBERS NEXT TO THE ANSWER. « Vous pouvez prendre votre retraite à 59 ans » is followed by what that age can fund each month. That figure is a DEFINITION —
// the most retired spending for which the plan still works — so it is held to it for every example household: at that spending the plan works, a little above it
// the plan does not, and the spending the household typed (when it works at all) is never above it. The step is the engine's own (100 $ a year).

const STEP = 100
const withSpending = (h: Household, retiredToday: number): Household => ({ ...h, spending: { ...h.spending, retiredToday } })
const worksAt = (h: Household, a: Assumptions, age: number, retiredToday: number) => runScenario(withSpending(h, retiredToday), a, everyoneAt(h, age), age).ok

describe('what the answer’s age can fund', { timeout: 300_000 }, () => {
  for (const id of EXAMPLE_IDS) {
    it(`${id}: the plan works at that spending, fails just past the step above it, and the household’s own spending fits when it works`, () => {
      const { household: h, assumptions: a } = EXAMPLES[id]
      const ages = h.persons.map((p) => a.today.year - p.birth.year)
      const answer = computeAnswer({
        household: h,
        assumptions: a,
        firstAge: Math.min(MAX_AGE, Math.max(MIN_AGE, Math.max(...ages))),
        youngest: Math.min(...ages),
        everyoneRetired: false,
      })
      if (answer.headline.age === null) {
        // nothing works up to the last age tried: there is no age to fund anything at, and no figure is made up
        expect(answer.comfort, id).toBeUndefined()
        expect(answer.stop, id).toBeNull()
        return
      }
      const age = answer.headline.age
      const comfort = answer.comfort
      expect(comfort, `${id}: a figure exists at ${age}`).not.toBeUndefined()
      if (comfort === null || comfort === undefined) return // not even 0 works at this age: the page says so, and invents nothing
      expect(comfort % STEP, `${id}: rounded down to the step`).toBe(0)
      expect(worksAt(h, a, age, comfort), `${id} at ${age}: ${comfort} $ works`).toBe(true)
      // the bisection stops within half a step of the edge, then rounds DOWN: one full step above must already be too much, give or take the edge's own step
      expect(worksAt(h, a, age, comfort + 2 * STEP), `${id} at ${age}: ${comfort + 2 * STEP} $ does not`).toBe(false)
      if (worksAt(h, a, age, h.spending.retiredToday)) expect(comfort + STEP, `${id}: the household's own ${h.spending.retiredToday} $ fits under the figure`).toBeGreaterThanOrEqual(h.spending.retiredToday)
    })
  }

  it('the figure does not rise when the plan is asked to last longer, nor fall when the household starts with more (to within the search’s own step: it stops within half a step of the edge and rounds down)', () => {
    for (const id of EXAMPLE_IDS) {
      const { household: h, assumptions: a } = EXAMPLES[id]
      const age = Math.max(60, ...h.persons.map((p) => a.today.year - p.birth.year))
      const base = maxRetiredSpending(h, a, age)
      if (base === null) continue
      const longer = maxRetiredSpending(h, { ...a, horizonAge: a.horizonAge + 5 }, age)
      expect(longer === null ? -1 : longer, `${id} longer plan`).toBeLessThanOrEqual(base + 3 * STEP) // each figure is within one step of its own edge: two of them may differ by two; a longer plan also spreads the drawing differently, and the income-tested credits (they read last year's income) add a third
      const richer = structuredClone(h)
      richer.persons[0].accounts.tfsa.balance += 100_000
      const more = maxRetiredSpending(richer, a, age)
      expect(more === null ? -1 : more, `${id} richer`).toBeGreaterThanOrEqual(base - STEP)
    }
  })
})
