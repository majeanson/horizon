import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { project } from './projection.ts'
import type { Household } from './types.ts'

// DRAWING TOGETHER: `Assumptions.drawTogether` shares each account's draw between the spouses in proportion to what each holds there.
// Off (the default) is the projection exactly as it was: the draw goes to whoever has the lower taxable income.

const A = GOLDEN_ASSUMPTIONS
const ids = (h: Household) => h.persons.map((p) => p.id)

// Camille retires first with an empty RRSP/TFSA; Alex keeps the money — a plan where one person's accounts pay for years.
function lopsided(): Household {
  const h = structuredClone(GOLDEN_HOUSEHOLD)
  h.persons[0].accounts.rrsp.balance = 0
  h.persons[0].accounts.tfsa.balance = 0
  h.persons[0].accounts.nonReg = { balance: 400_000, acb: 300_000, annualContribution: 0 }
  h.persons[1].accounts.nonReg = { balance: 400_000, acb: 300_000, annualContribution: 0 }
  return h
}

describe('drawTogether', () => {
  it('off (or absent) is the same projection to the cent', () => {
    expect(project(GOLDEN_HOUSEHOLD, { ...A, drawTogether: false }, {})).toEqual(project(GOLDEN_HOUSEHOLD, A, {}))
  })

  it('on, both spouses give from the same account in the same year', () => {
    const h = lopsided()
    const [a, b] = ids(h)
    const rows = project(h, { ...A, drawTogether: true }, {})
    const both = rows.filter((r) => r.persons[a] && r.persons[b] && r.persons[a].withdrawals.nonReg > 1 && r.persons[b].withdrawals.nonReg > 1)
    expect(both.length).toBeGreaterThan(0)
    // …where off, the lower taxable income alone pays until its account is empty
    const off = project(h, A, {})
    expect(off.filter((r) => r.persons[a] && r.persons[b] && r.persons[a].withdrawals.nonReg > 1 && r.persons[b].withdrawals.nonReg > 1).length).toBeLessThan(both.length)
  })

  it('one person is unaffected', () => {
    const h = structuredClone(GOLDEN_HOUSEHOLD)
    h.persons = [h.persons[0]]
    expect(project(h, { ...A, drawTogether: true }, {})).toEqual(project(h, A, {}))
  })
})
