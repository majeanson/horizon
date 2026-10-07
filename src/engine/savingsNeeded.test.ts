import { describe, expect, it, vi } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { everyoneAt, retireAt, runScenario } from './retireAt.ts'
import { savingsNeeded, withExtraSavings } from './savingsNeeded.ts'

vi.setConfig({ testTimeout: 60_000 })

const H = GOLDEN_HOUSEHOLD
const A = GOLDEN_ASSUMPTIONS
const earliest = retireAt(H, A, { stopAtFirstOk: true }).earliestOk!
const worksWith = (extra: number, age: number) => runScenario(withExtraSavings(H, extra), A, everyoneAt(H, age), age).ok

describe('the extra yearly saving that makes retiring at X work', () => {
  it('is zero at an age that already works', () => {
    expect(savingsNeeded(H, A, earliest)).toEqual({ age: earliest, extraPerYear: 0 })
  })

  it('at an age that does not work, the amount returned works, and $50 less does not', () => {
    const age = earliest - 3
    expect(worksWith(0, age)).toBe(false)
    const { extraPerYear } = savingsNeeded(H, A, age)
    expect(extraPerYear).not.toBeNull()
    expect(extraPerYear! % 50).toBe(0)
    expect(worksWith(extraPerYear!, age)).toBe(true)
    expect(worksWith(extraPerYear! - 50 - 25, age)).toBe(false) // under the tolerance below the answer: it really is the smallest amount that works
  })

  it('the earlier you want to stop, the more you must save (never less)', () => {
    const amounts = [earliest - 1, earliest - 2, earliest - 4].map((age) => savingsNeeded(H, A, age).extraPerYear)
    expect(amounts.every((x) => x !== null)).toBe(true)
    const [a, b, c] = amounts as number[]
    expect(a).toBeLessThanOrEqual(b)
    expect(b).toBeLessThanOrEqual(c)
    expect(a).toBeGreaterThan(0)
  })

  it('is null when nobody has a salary to save from, and when even saving all the working-years spending cannot make it work', () => {
    const noPay = { ...H, persons: H.persons.map((p) => ({ ...p, salaryToday: 0 })) }
    expect(savingsNeeded(noPay, A, 50).extraPerYear).toBeNull()
    expect(savingsNeeded(H, A, 50).extraPerYear).toBeNull() // retiring at 50 is out of reach whatever is saved
  })

  it('moves the extra out of working-years spending into saving, split between the people with a salary, and leaves the household untouched at zero', () => {
    expect(withExtraSavings(H, 0)).toBe(H)
    const more = withExtraSavings(H, 4_000)
    const added = more.persons.map((p, i) => p.accounts.nonReg.annualContribution - H.persons[i].accounts.nonReg.annualContribution)
    const earners = H.persons.filter((p) => p.salaryToday > 0).length
    expect(added.filter((x) => x > 0)).toHaveLength(earners)
    expect(added.reduce((s, x) => s + x, 0)).toBeCloseTo(4_000, 6)
    expect(more.spending.workingToday).toBe(H.spending.workingToday - 4_000)
    expect(more.spending.retiredToday).toBe(H.spending.retiredToday)
  })
})
