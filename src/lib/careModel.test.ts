import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { retireAt } from '../engine/retireAt.ts'
import { CARE_AMOUNT_MAX, CARE_AMOUNT_MIN, CARE_FROM_MAX, CARE_FROM_MIN, CARE_START, CARE_YEARS_MAX, careAnswer, careFlow, formatCare, oldestBirthYear, parseCare, sameCare, withCare, type Care } from './careModel.ts'

const H = GOLDEN_HOUSEHOLD
const A = GOLDEN_ASSUMPTIONS
const BASE = retireAt(H, A, { stopAtFirstOk: true }).earliestOk!

describe('« and if the last years cost more? »', () => {
  it('is a dated expense that starts when the OLDEST person reaches the age', () => {
    const f = careFlow(H, { amount: 40_000, fromAge: 85, years: 6 }, 'care')
    expect(f.kind).toBe('expense')
    expect(f.amount).toBe(40_000)
    expect(f.fromYear).toBe(oldestBirthYear(H) + 85)
    expect(f.toYear).toBe(f.fromYear + 5)
    expect(f.taxable).toBe(false)
  })

  it('changes a copy: the household itself keeps its flows', () => {
    const before = H.flows
    const copy = withCare(H, CARE_START)
    expect(copy.flows).toHaveLength((before ?? []).length + 1)
    expect(H.flows).toBe(before)
  })

  it('never makes the money last longer, and a heavier care leaves less at the horizon', () => {
    const light = careAnswer(H, A, { amount: 10_000, fromAge: 85, years: 5 }, BASE)
    const heavy = careAnswer(H, A, { amount: 120_000, fromAge: 80, years: 15 }, BASE)
    expect(light.worthWithout).toBeCloseTo(heavy.worthWithout, 2)
    expect(light.worthWith).toBeLessThan(light.worthWithout)
    expect(heavy.worthWith).toBeLessThan(light.worthWith)
    for (const r of [light, heavy]) expect(r.earliest === null || r.earliest >= BASE).toBe(true)
  })

  it('a care that falls after the horizon changes nothing', () => {
    const after = careAnswer(H, A, { amount: 100_000, fromAge: CARE_FROM_MAX, years: CARE_YEARS_MAX }, BASE)
    // The precondition is asserted, not branched on: a golden horizon past 100 would otherwise make this test pass by doing nothing.
    expect(A.horizonAge).toBeLessThan(CARE_FROM_MAX - 4)
    expect(after.worthWith).toBeCloseTo(after.worthWithout, 2)
    expect(after.earliest).toBe(BASE)
  })

  it('says the plan falls short when a care large enough eats everything, and in which year', () => {
    const ruin = careAnswer(H, A, { amount: CARE_AMOUNT_MAX, fromAge: CARE_FROM_MIN, years: CARE_YEARS_MAX }, BASE)
    expect(ruin.ok).toBe(false)
    expect(ruin.firstShortfallYear).not.toBeNull()
    expect(ruin.worthWith).toBeLessThan(ruin.worthWithout)
  })
})

describe('the address', () => {
  it('reads « amount,age,years » rounded to each slider’s step and inside its reach', () => {
    expect(parseCare('30000,85,10')).toEqual({ amount: 30_000, fromAge: 85, years: 10 })
    expect(parseCare('30499,85.4,10.2')).toEqual({ amount: 30_000, fromAge: 85, years: 10 })
    expect(parseCare('1,1,0')).toEqual({ amount: CARE_AMOUNT_MIN, fromAge: CARE_FROM_MIN, years: 1 })
    expect(parseCare('9999999,200,99')).toEqual({ amount: CARE_AMOUNT_MAX, fromAge: CARE_FROM_MAX, years: CARE_YEARS_MAX })
  })

  it('takes the starting figure for a part left out, and nothing for anything unreadable', () => {
    expect(parseCare('45000')).toEqual({ ...CARE_START, amount: 45_000 })
    expect(parseCare(',90')).toEqual({ ...CARE_START, fromAge: 90 })
    for (const bad of [null, '', 'abc', '1,2,3,4', 'NaN,85,10', '30000,Infinity,10']) expect(parseCare(bad), String(bad)).toBeNull()
  })

  it('round-trips', () => {
    const c: Care = { amount: 55_000, fromAge: 88, years: 7 }
    expect(parseCare(formatCare(c))).toEqual(c)
    expect(sameCare(c, { ...c })).toBe(true)
    expect(sameCare(c, { ...c, years: 8 })).toBe(false)
  })
})
