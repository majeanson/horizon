import { describe, expect, it, vi } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { earliestEach, retireAt, runScenario } from './retireAt.ts'
import type { Household, Scenario } from './types.ts'

// « WHEN CAN EACH OF US RETIRE? » — one person's age tried while the other is held. Pinned: it is the SAME projection
// the rest of the app runs, a spouse held later never makes the other's answer later, and a household of one is unchanged.

vi.setConfig({ testTimeout: 60_000 })

const H = GOLDEN_HOUSEHOLD
const A = GOLDEN_ASSUMPTIONS
const [first, second] = H.persons

describe('each person, the other held', () => {
  it('is the earliest age that works when only that person\'s age moves and the other stays at theirs', () => {
    const each = earliestEach(H, A)
    expect(each.map((e) => e.id)).toEqual([first.id, second.id])
    for (const person of H.persons) {
      const e = each.find((x) => x.id === person.id)!
      const other = H.persons.find((q) => q.id !== person.id)!
      expect(e.other).toEqual({ id: other.id, heldAt: other.retirementAge })
      if (e.earliestOk === null) continue
      const at = (age: number) => runScenario(H, A, { retirementAge: { [other.id]: other.retirementAge, [person.id]: age } } as Scenario, age).ok
      expect(at(e.earliestOk), `works at ${e.earliestOk}`).toBe(true)
      for (let age = Math.max(50, A.today.year - person.birth.year); age < e.earliestOk; age++) expect(at(age), `fails at ${age}`).toBe(false)
    }
  })

  it('a partner who works LONGER never makes the other\'s earliest age later', () => {
    const answer = (heldAt: number) => earliestEach(H, A, { heldAt: { [second.id]: heldAt } }).find((e) => e.id === first.id)!.earliestOk ?? Infinity
    const ages = [58, 60, 62, 65, 67].map(answer)
    for (let i = 1; i < ages.length; i++) expect(ages[i], `held at ${[58, 60, 62, 65, 67][i]}`).toBeLessThanOrEqual(ages[i - 1])
    // …and it really moves (a held partner that changed nothing would pass the line above for free): the golden household needs 61 at 58 and 57 at 67.
    expect(ages[0]).toBeGreaterThan(ages[ages.length - 1])
  })

  it('holds the other at the profile age by default, and at the stated age when asked', () => {
    const held = earliestEach(H, A, { heldAt: { [second.id]: 66 } }).find((e) => e.id === first.id)!
    expect(held.other).toEqual({ id: second.id, heldAt: 66 })
    expect(earliestEach(H, A).find((e) => e.id === first.id)!.other!.heldAt).toBe(second.retirementAge)
  })

  it('a household of one gets the plain earliestOk and no « other »', () => {
    const alone: Household = { ...H, livesAlone: true, persons: [first] }
    const [only] = earliestEach(alone, A)
    expect(only.other).toBeNull()
    expect(only.earliestOk).toBe(retireAt(alone, A, { stopAtFirstOk: true }).earliestOk)
  })

  it('never tries an age the person has already passed, and gives null when nothing up to the limit works', () => {
    const none = earliestEach({ ...H, spending: { workingToday: 400_000, retiredToday: 400_000 } }, A, { to: 55 })
    for (const e of none) expect(e.earliestOk).toBeNull()
    const old = earliestEach(H, { ...A, today: { year: A.today.year + 12, month: A.today.month } })
    for (const e of old) expect(e.earliestOk === null || e.earliestOk >= 50).toBe(true)
  })
})
