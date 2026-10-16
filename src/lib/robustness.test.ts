import { describe, expect, it } from 'vitest'
import { project } from '../engine/projection.ts'
import type { AccountKind, Assumptions } from '../engine/types.ts'
import { checkCases, genCases } from './householdGen.ts'
import { bookProblems } from './identities.ts'

// ROBUSTNESS OF THE INPUTS THE ENGINE IS GIVEN. The profile lives in localStorage as JSON and comes back through a parse; the household chooses the order its accounts are drawn in. Two things
// follow that no single example shows: a plan must be the same plan after it has been saved and reopened (a field JSON turns into something else — an `undefined`, a -0, an
// Infinity — would change what a reader sees the day after), and every one of the six orders of drawing must keep the books, not just the one the household happens to have.

const CASES = [8, 88, 808].flatMap((s) => genCases(s, 20))
const ORDERS: AccountKind[][] = [
  ['nonReg', 'rrsp', 'tfsa'],
  ['nonReg', 'tfsa', 'rrsp'],
  ['rrsp', 'nonReg', 'tfsa'],
  ['rrsp', 'tfsa', 'nonReg'],
  ['tfsa', 'nonReg', 'rrsp'],
  ['tfsa', 'rrsp', 'nonReg'],
]

describe('a plan is the same plan after it has been saved and reopened', { timeout: 300_000 }, () => {
  it('every year of the rows is identical when the household and the assumptions go through JSON and back', () => {
    expect(
      checkCases(CASES, (c) => {
        const h = JSON.parse(JSON.stringify(c.household))
        const a = JSON.parse(JSON.stringify(c.assumptions)) as Assumptions
        const before = project(c.household, c.assumptions)
        const after = project(h, a)
        if (before.length !== after.length) return [`${before.length} years before, ${after.length} after the round trip`]
        const i = before.findIndex((r, k) => JSON.stringify(r) !== JSON.stringify(after[k]))
        return i < 0 ? [] : [`${before[i].year}: the row differs after a JSON round trip`]
      }),
    ).toBeNull()
  })

  it('the households the generator makes survive JSON unchanged, and every number in them is finite (a NaN or an Infinity becomes a null on the way back)', () => {
    const nonFinite = (x: unknown, path = ''): string[] =>
      typeof x === 'number' ? (Number.isFinite(x) ? [] : [`${path} is ${x}`]) : x !== null && typeof x === 'object' ? Object.entries(x).flatMap(([k, v]) => nonFinite(v, `${path}.${k}`)) : []
    expect(
      checkCases(CASES, (c) => {
        const out = nonFinite(c.household)
        if (JSON.stringify(JSON.parse(JSON.stringify(c.household))) !== JSON.stringify(c.household)) out.push('the household changes through JSON')
        return out
      }),
    ).toBeNull()
  })
})

describe('every order of drawing the accounts keeps the books', { timeout: 300_000 }, () => {
  for (const order of ORDERS) {
    it(order.join(' › '), () => {
      expect(
        checkCases(CASES, (c) => {
          const a = { ...c.assumptions, withdrawalOrder: order }
          return bookProblems(project(c.household, a), a)
        }),
      ).toBeNull()
    })
  }

  it('the order never changes what the household SPENDS, only where it comes from: the budget of every year is the same under all six', () => {
    expect(
      checkCases(CASES.slice(0, 40), (c) => {
        const spent = ORDERS.map((o) => project(c.household, { ...c.assumptions, withdrawalOrder: o }).map((r) => r.household.spending))
        return spent.every((s) => JSON.stringify(s) === JSON.stringify(spent[0])) ? [] : ['the budget depends on the order of drawing']
      }),
    ).toBeNull()
  })

  it('a household with nothing to draw from but one account is the same plan under every order', () => {
    expect(
      checkCases(CASES.slice(0, 40), (c) => {
        // only the TFSA holds money, nothing is contributed or inherited: whatever the order, the only thing left to draw from is the TFSA
        const h = {
          ...c.household,
          flows: undefined,
          home: undefined,
          persons: c.household.persons.map((p) => ({
            ...p,
            pensions: [],
            accounts: { rrsp: { balance: 0, room: 0, annualContribution: 0, lockedIn: 0 }, tfsa: { ...p.accounts.tfsa, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } },
          })),
        }
        const runs = ORDERS.map((o) => JSON.stringify(project(h, { ...c.assumptions, withdrawalOrder: o, surplusToRrsp: false }).map((r) => [r.household.tax, r.household.shortfall])))
        // A surplus year puts money in the non-registered account, which an order can then reach first: compare only plans in which no year had a surplus saved
        const hadSurplus = project(h, { ...c.assumptions, surplusToRrsp: false }).some((r) => Object.values(r.persons).some((p) => (p?.balancesEnd.nonReg ?? 0) > 0.01))
        return hadSurplus || runs.every((r) => r === runs[0]) ? [] : ['the order of drawing changed a plan that has only one account']
      }),
    ).toBeNull()
  })
})
