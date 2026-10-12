import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { project } from './projection.ts'
import type { Household, PersonId } from './types.ts'

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

  it('on, the money left over is saved half in each name; off, all of it goes to one', () => {
    // a frugal household: more comes in than goes out, so the TFSA room fills and the rest is saved non-registered
    const h = structuredClone(GOLDEN_HOUSEHOLD)
    h.spending = { workingToday: 30_000, retiredToday: 30_000 }
    for (const p of h.persons) p.accounts.nonReg = { balance: 0, acb: 0, annualContribution: 0 }
    const [a, b] = ids(h)
    const grown = (rows: ReturnType<typeof project>, id: PersonId) => Math.max(...rows.map((r) => r.persons[id]?.balancesEnd.nonReg ?? 0))
    const off = project(h, A, {})
    const on = project(h, { ...A, drawTogether: true }, {})
    const [offA, offB, onA, onB] = [grown(off, a), grown(off, b), grown(on, a), grown(on, b)]
    // sanity: the plan saves non-registered money at all, and off it lands mostly with one person
    expect(offA + offB).toBeGreaterThan(1000)
    expect(Math.min(offA, offB)).toBeLessThan(0.5 * Math.max(offA, offB))
    expect(Math.min(onA, onB)).toBeGreaterThan(0.4 * Math.max(onA, onB))
  })

  it('one person is unaffected', () => {
    const h = structuredClone(GOLDEN_HOUSEHOLD)
    h.persons = [h.persons[0]]
    expect(project(h, { ...A, drawTogether: true }, {})).toEqual(project(h, A, {}))
  })
})
