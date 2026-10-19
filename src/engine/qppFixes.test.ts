import { describe, expect, it } from 'vitest'
import { agesLedger } from './ledger.ts'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import { childRearingMonths, project, resolve } from './projection.ts'
import { makeRrqRules } from './rrqRules.ts'
import type { Household, PersonId } from './types.ts'

// Regression tests for the QPP fixes: the child-rearing exclusion's length, the ledger reading the household, part-time pay counted in the pensionable
// earnings, the exclusion carried to the survivor's pension, and the contribution cutoff (the year of the 72nd birthday is contributory, art. 37.0.1).

const A = GOLDEN_ASSUMPTIONS
const RULES = makeRrqRules({ inflation: A.inflation, wageGrowth: A.wageGrowth })
const KIDS = { benefits: false, qppExclusion: true, leave: null }
const withPerson = (id: string, over: Record<string, unknown>, extra: Partial<Household> = {}): Household => ({
  ...GOLDEN_HOUSEHOLD,
  ...extra,
  persons: GOLDEN_HOUSEHOLD.persons.map((p) => (p.id === (id as PersonId) ? { ...p, ...over } : p)),
})

describe('the child-rearing months of one child', () => {
  it('83 in all: after the birth month, to the 7th birthday, over EIGHT calendar years (5 + 6 x 12 + 6)', () => {
    const lower = GOLDEN_HOUSEHOLD.persons[1]
    const m = childRearingMonths(lower, { ...GOLDEN_HOUSEHOLD, children: [2020], kidsEffects: KIDS })!
    expect(m[2020]).toBe(5)
    for (let y = 2021; y <= 2026; y++) expect(m[y]).toBe(12)
    expect(m[2027]).toBe(6)
    expect(Object.values(m).reduce((s, x) => s + x, 0)).toBe(83)
  })
})

describe('the ledger', () => {
  it('reads the same QPP pension as the projection for a household with the exclusion on', () => {
    const lowEarner = { earningsHistory: Object.fromEntries(Array.from({ length: 12 }, (_, k) => [2012 + k, 0])) }
    const h = withPerson('spouse', lowEarner, { children: [2012], kidsEffects: KIDS })
    const spouse = h.persons[1]
    const ledger = agesLedger(h, A).find((l) => l.id === spouse.id)!
    const direct = resolve(spouse, A, {}, RULES, h)
    expect(ledger.rrq.monthly).toBeCloseTo(direct.rrq.monthly, 2)
    // and the exclusion was on: without the household the pension is smaller
    expect(resolve(spouse, A, {}, RULES).rrq.monthly).toBeLessThan(direct.rrq.monthly)
  })
})

describe('part-time pay after leaving', () => {
  it('is pensionable: the earnings carry the pay up to the end of the part-time work, and nothing after', () => {
    const h = withPerson('spouse', { retirementAge: 55, partTime: { untilAge: 60, share: 0.4 } })
    const r = resolve(h.persons[1], A, {}, RULES, h)
    const leave = r.leaving.year
    // born 1981: leaves 2036, part-time through the year before the 60th birthday (2040)
    expect(r.earnings[leave + 1]).toBeGreaterThan(0)
    expect(r.earnings[1981 + 59]).toBeGreaterThan(0)
    expect(r.earnings[1981 + 60]).toBeUndefined()
    // 40 % of the wage-grown salary
    expect(r.earnings[leave + 1]).toBeCloseTo(65_000 * (1 + A.wageGrowth) ** (leave + 1 - A.today.year) * 0.4, 2)
  })

  it('raises the pension over the same person with no part-time work', () => {
    const none = resolve(withPerson('spouse', { retirementAge: 55 }).persons[1], A, {}, RULES)
    const some = resolve(withPerson('spouse', { retirementAge: 55, partTime: { untilAge: 60, share: 0.4 } }).persons[1], A, {}, RULES)
    expect(some.rrq.monthly).toBeGreaterThan(none.rrq.monthly)
  })
})

describe('the survivor\'s pension from a deceased lower earner with the exclusion on', () => {
  it('counts the child-rearing months in the deceased\'s components at death', () => {
    const zero = { earningsHistory: Object.fromEntries(Array.from({ length: 12 }, (_, k) => [2012 + k, 0])), horizonAge: 55 }
    const run = (qppExclusion: boolean) => project(withPerson('spouse', zero, { children: [2012], kidsEffects: qppExclusion ? KIDS : null }), A, {})
    const total = (rows: ReturnType<typeof run>) => rows.reduce((s, r) => s + (r.persons.self?.survivorPension ?? 0), 0)
    expect(total(run(true))).toBeGreaterThan(total(run(false)) + 1)
  })
})

describe('the QPP contribution cutoff', () => {
  it('the year of the 72nd birthday is contributory (art. 37.0.1); the year after is not', () => {
    // self born 1978: 72 in 2050; works to 75 with a salary
    const h = withPerson('self', { retirementAge: 75, pensions: [] })
    const rows = project(h, A, {})
    const at = (year: number) => rows.find((r) => r.year === year)!.persons.self!.rrqContribution
    expect(at(2049)).toBeGreaterThan(0)
    expect(at(2050)).toBeGreaterThan(0)
    expect(at(2051)).toBe(0)
  })
})
