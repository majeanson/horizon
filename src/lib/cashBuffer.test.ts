import { describe, expect, it } from 'vitest'
import type { Household } from '../engine/types.ts'
import { CASH_BUFFER_BAND, cashBuffer } from './cashBuffer.ts'
import { exampleProfile } from './example.ts'

/** The golden couple, with the liquid balances and the retired spending set by hand: [nonReg, tfsa] a person. */
function household(balances: [number, number][], retiredToday: number): Household {
  const h = exampleProfile('golden').household
  const persons = balances.map(([nonReg, tfsa], i) => {
    const p = structuredClone(h.persons[i])
    p.accounts.nonReg.balance = nonReg
    p.accounts.tfsa.balance = tfsa
    p.accounts.rrsp.balance = 900_000 // never counted
    return p
  })
  return { ...h, persons, spending: { ...h.spending, retiredToday } }
}

describe('the cash buffer', () => {
  it('counts the non-registered and the TFSA money of both spouses, in months of retired spending', () => {
    const b = cashBuffer(household([[20_000, 10_000], [10_000, 10_000]], 60_000))
    expect(b.liquid).toBe(50_000)
    expect(b.monthly).toBeCloseTo(5_000)
    expect(b.months).toBeCloseTo(10)
    expect(b.status).toBe('within')
  })

  it('does not count the RRSP', () => {
    expect(cashBuffer(household([[0, 0], [0, 0]], 60_000)).liquid).toBe(0)
  })

  it('reads a single person', () => {
    const b = cashBuffer(household([[0, 30_000]], 60_000))
    expect(b.months).toBeCloseTo(6)
    expect(b.status).toBe('within')
  })

  it('says below, within and above against the band', () => {
    const at = (liquid: number) => cashBuffer(household([[liquid, 0]], 12_000)).status // 1 000 $ a month
    expect(at(5_999)).toBe('below')
    expect(at(CASH_BUFFER_BAND.min * 1000)).toBe('within')
    expect(at(CASH_BUFFER_BAND.max * 1000)).toBe('within')
    expect(at(12_001)).toBe('above')
  })

  it('has no months when no retired spending is entered (no division by zero)', () => {
    const b = cashBuffer(household([[50_000, 50_000]], 0))
    expect(b).toMatchObject({ months: null, status: 'unknown', monthly: 0 })
  })

  it('is empty, not unknown, when there are no liquid accounts', () => {
    const b = cashBuffer(household([[0, 0], [0, 0]], 48_000))
    expect(b).toMatchObject({ months: 0, status: 'empty', liquid: 0 })
  })
})
