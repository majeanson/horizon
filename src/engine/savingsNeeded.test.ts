import { describe, expect, it, vi } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { everyoneAt, retireAt, runScenario } from './retireAt.ts'
import { SAVINGS_ACCOUNTS, savingsNeeded, withExtraSavings, type SavingsAccount } from './savingsNeeded.ts'

vi.setConfig({ testTimeout: 60_000 })

const H = GOLDEN_HOUSEHOLD
const A = GOLDEN_ASSUMPTIONS
const earliest = retireAt(H, A, { stopAtFirstOk: true }).earliestOk!
const worksWith = (extra: number, age: number, into: SavingsAccount = 'nonReg') => runScenario(withExtraSavings(H, extra, into), A, everyoneAt(H, age), age).ok

describe('the extra yearly saving that makes retiring at X work', () => {
  it('is zero at an age that already works', () => {
    expect(savingsNeeded(H, A, earliest)).toEqual({ age: earliest, extraPerYear: 0, account: null })
  })

  it('at an age that does not work, the amount returned works, and $50 less does not', () => {
    const age = earliest - 3
    expect(worksWith(0, age)).toBe(false)
    const { extraPerYear, account } = savingsNeeded(H, A, age)
    expect(extraPerYear).not.toBeNull()
    expect(account).not.toBeNull()
    expect(extraPerYear! % 50).toBe(0)
    expect(worksWith(extraPerYear!, age, account!)).toBe(true)
    // under the tolerance below the answer, NO placement works: it really is the smallest amount that works, wherever it is put
    for (const into of SAVINGS_ACCOUNTS) expect(worksWith(extraPerYear! - 50 - 25, age, into), into).toBe(false)
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
    // …into the account named, and only that one
    const rrsp = withExtraSavings(H, 4_000, 'rrsp')
    expect(rrsp.persons.reduce((s, p, i) => s + p.accounts.rrsp.annualContribution - H.persons[i].accounts.rrsp.annualContribution, 0)).toBeCloseTo(4_000, 6)
    expect(rrsp.persons.map((p) => p.accounts.nonReg.annualContribution)).toEqual(H.persons.map((p) => p.accounts.nonReg.annualContribution))
    const earners = H.persons.filter((p) => p.salaryToday > 0).length
    expect(added.filter((x) => x > 0)).toHaveLength(earners)
    expect(added.reduce((s, x) => s + x, 0)).toBeCloseTo(4_000, 6)
    expect(more.spending.workingToday).toBe(H.spending.workingToday - 4_000)
    expect(more.spending.retiredToday).toBe(H.spending.retiredToday)
  })
})

describe('the account it goes to: the placement that needs the least', () => {
  it('the golden household needs less through the RRSP (its deduction is saved too, the room is held to the law) than in a plain account', () => {
    const age = earliest - 2
    const { extraPerYear, account } = savingsNeeded(H, A, age)
    expect(account).toBe('rrsp')
    // the old answer (everything non-registered) would have asked for more: at the chosen amount, a plain account does not yet make it work
    expect(worksWith(extraPerYear!, age, 'nonReg')).toBe(false)
  })

  it('names no account when nothing more is needed, or when nothing works', () => {
    expect(savingsNeeded(H, A, earliest).account).toBeNull()
    expect(savingsNeeded(H, A, 50).account).toBeNull()
  })
})

describe('the rounded answer is always one that works and never more than can be moved', () => {
  it('for a working-years spending that is not a multiple of $50, every answer works and stays within it', () => {
    const odd = structuredClone(H)
    odd.spending.workingToday = 61_975
    for (let back = 1; back <= 12; back++) {
      const age = earliest - back
      const { extraPerYear, account } = savingsNeeded(odd, A, age)
      if (extraPerYear === null) continue
      expect(extraPerYear, `age ${age}`).toBeLessThanOrEqual(odd.spending.workingToday)
      expect(runScenario(withExtraSavings(odd, extraPerYear, account ?? 'nonReg'), A, everyoneAt(odd, age), age).ok, `age ${age}`).toBe(true)
    }
  })
})
