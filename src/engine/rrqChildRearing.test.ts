import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { childRearingMonths } from './projection.ts'
import { rrqPension } from './rrq.ts'
import { makeRrqRules } from './rrqRules.ts'
import type { Household } from './types.ts'

// THE QPP's CHILD-REARING EXCLUSION (Act respecting the Québec Pension Plan, art. 101, third paragraph, c): a month for which the person receives a family benefit
// for a child under 7 is not in the base contributory period — but only in a year whose base earnings do not exceed the personal exemption. Held here: it changes nothing
// for anyone who works through those years, raises the pension of a parent who does not, and is exactly today's pension when it is not asked for.

const RULES = makeRrqRules({ inflation: 0.02, wageGrowth: 0.03 })
const BIRTH = { year: 1990, month: 6 }
/** Someone who earns 60 000 $ a year from 2012, but nothing in 2024–2029 (the years the children are small). */
const earnings = (zero: readonly number[]): Record<number, number> => {
  const out: Record<number, number> = {}
  for (let y = 2012; y <= 2054; y++) out[y] = zero.includes(y) ? 0 : 60_000
  return out
}
const SMALL = [2024, 2025, 2026, 2027, 2028, 2029]
const SMALL_MONTHS: Record<number, number> = { 2024: 5, 2025: 12, 2026: 12, 2027: 12, 2028: 12, 2029: 12, 2030: 6 }
const pension = (e: Record<number, number>, childRearingMonths?: Record<number, number>) => rrqPension({ birth: BIRTH, earnings: e, startAge: 65, childRearingMonths }, RULES)

describe('the pension', () => {
  it('is exactly what it was when no month is excluded: absent, or empty, to the cent', () => {
    const e = earnings(SMALL)
    const today = pension(e)
    expect(pension(e, {})).toEqual(today)
    expect(pension(e, { 2024: 0 })).toEqual(today)
  })

  it('rises for a parent with no earnings in the years of a small child: those months are out of the period, so the 15 % drop-out reaches the next-lowest ones', () => {
    const e = earnings(SMALL)
    const without = pension(e)
    const withIt = pension(e, SMALL_MONTHS)
    expect(withIt.base).toBeGreaterThan(without.base)
    expect(withIt.monthly).toBeGreaterThan(without.monthly)
    // it never exceeds what the same person would get working through those years
    expect(withIt.base).toBeLessThanOrEqual(pension(earnings([])).base + 0.01)
  })

  it('changes nothing for a parent who works through those years: the year\'s earnings are over the exemption', () => {
    const e = earnings([])
    expect(pension(e, SMALL_MONTHS)).toEqual(pension(e))
  })

  it('the exemption is the line: 3 500 $ qualifies, 3 501 $ does not', () => {
    const at = { ...earnings(SMALL), 2025: 3_500 }
    const over = { ...earnings(SMALL), 2025: 3_501 }
    const only2025 = { 2025: 12 }
    expect(pension(at, only2025).base).toBeGreaterThan(pension(at).base)
    expect(pension(over, only2025)).toEqual(pension(over))
  })

  it('only the months of a year are taken out, not more than the year has, and not a month of another year', () => {
    const e = earnings(SMALL)
    expect(pension(e, { 2025: 99 }).base).toEqual(pension(e, { 2025: 12 }).base)
    // a year that is not one of the zero years is not touched, however many months are asked for
    expect(pension(e, { 2040: 12 })).toEqual(pension(e))
  })

  it('planted: excluding a high-earning year would LOWER or keep the pension, never raise it — it is not allowed to', () => {
    const e = earnings([])
    for (const y of [2020, 2030, 2040]) expect(pension(e, { [y]: 12 })).toEqual(pension(e))
  })
})

describe('the months a household\'s children give a parent', () => {
  const H = GOLDEN_HOUSEHOLD
  const [first, second] = H.persons
  const lower = second.salaryToday < first.salaryToday ? second : first
  const higher = lower === first ? second : first
  const household = (children: number[], on: boolean, extra: Partial<Household> = {}): Household => ({ ...H, children, kidsEffects: on ? { benefits: false, qppExclusion: true, leave: null } : null, ...extra })

  it('nothing unless the household asked for it, or without a child', () => {
    expect(childRearingMonths(lower, household([2020], false))).toBeUndefined()
    expect(childRearingMonths(lower, household([], true))).toBeUndefined()
    expect(childRearingMonths(lower, undefined)).toBeUndefined()
  })

  it('one child: 5 months in the year of birth (after the birth month), 12 in each of the five next, 6 in the year it turns 7 — 71 in all', () => {
    const m = childRearingMonths(lower, household([2020], true))!
    expect(m[2020]).toBe(5)
    for (let y = 2021; y <= 2025; y++) expect(m[y]).toBe(12)
    expect(m[2026]).toBe(6)
    expect(Object.values(m).reduce((s, x) => s + x, 0)).toBe(71)
  })

  it('the benefit is paid to ONE parent, the lower earner: the other has none', () => {
    expect(childRearingMonths(higher, household([2020], true))).toBeUndefined()
    expect(childRearingMonths(lower, household([2020], true))).toBeDefined()
  })

  it('a lone parent is that parent, and two children close together never make more than 12 months in a year', () => {
    const alone: Household = household([2020, 2021], true, { persons: [H.persons[0]] })
    const m = childRearingMonths(H.persons[0], alone)!
    expect(m[2021]).toBe(12)
    expect(m[2022]).toBe(12)
    expect(Math.max(...Object.values(m))).toBe(12)
  })
})

describe('in the projection', () => {
  it('a household that does not ask is projected exactly as before; asking changes the pension only through those low-earning years', async () => {
    const { project } = await import('./projection.ts')
    const A = GOLDEN_ASSUMPTIONS
    const off = project({ ...GOLDEN_HOUSEHOLD, children: [A.today.year - 3] }, A, {})
    const plain = project(GOLDEN_HOUSEHOLD, A, {})
    // children alone (no cost stated, nothing counted) change nothing
    expect(off.map((r) => r.household.spending)).toEqual(plain.map((r) => r.household.spending))
    const on = project({ ...GOLDEN_HOUSEHOLD, children: [A.today.year - 3], kidsEffects: { benefits: false, qppExclusion: true, leave: null } }, A, {})
    // the golden couple works through those years, so the exclusion is without effect: the same rows
    expect(on).toEqual(off)
  })
})
