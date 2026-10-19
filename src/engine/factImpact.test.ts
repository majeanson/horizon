import { describe, expect, it } from 'vitest'
import { IMPACT_KINDS, factSwings, type ImpactKind } from './factImpact.ts'
import { EXAMPLES } from './golden/examples.ts'

// THE SWING OF A FIGURE: each typed number nudged both ways, the earliest working age asked again.

const { household, assumptions } = EXAMPLES.average
const ask = (kind: ImpactKind, owner: 'self' | 'spouse' | 'household' = 'household') => factSwings(household, assumptions, [{ id: 'x', owner, kind }]).swings.x

describe('factSwings', () => {
  it('a figure that is not in the household cannot move the answer', () => {
    const none = { ...household, home: null }
    const r = factSwings(none, assumptions, [{ id: 'h', owner: 'household', kind: 'homeValue' }, { id: 'm', owner: 'household', kind: 'mortgage' }])
    expect(r.swings.h.years).toBe(0)
    expect(r.swings.m.years).toBe(0)
  })
  it('spending moves the answer the way money does: less spending is never later, more is never earlier', () => {
    const base = factSwings(household, assumptions, []).base
    const s = ask('spendingRetired')
    expect(base).not.toBeNull()
    expect(s.down === null ? Infinity : s.down).toBeLessThanOrEqual(base!)
    expect(s.up === null ? Infinity : s.up).toBeGreaterThanOrEqual(base!)
    expect(s.years).toBeGreaterThan(0)
  })
  it('a bigger balance is never later, a smaller one never earlier', () => {
    const base = factSwings(household, assumptions, []).base!
    for (const kind of ['rrspBalance', 'tfsaBalance', 'nonRegBalance'] as const) {
      const s = ask(kind, 'self')
      expect(s.up === null ? Infinity : s.up, kind).toBeLessThanOrEqual(base)
      expect(s.down === null ? Infinity : s.down, kind).toBeGreaterThanOrEqual(base)
    }
  })
  it('every kind can be asked of every example without throwing, and swings are whole non-negative years', () => {
    for (const ex of [EXAMPLES.average, EXAMPLES.behind, EXAMPLES.retired]) {
      const facts = ex.household.persons.flatMap((p) => IMPACT_KINDS.filter((k) => !['spendingWorking', 'spendingRetired', 'homeValue', 'mortgage'].includes(k)).map((k) => ({ id: `${p.id}:${k}`, owner: p.id, kind: k })))
      const r = factSwings(ex.household, ex.assumptions, facts)
      for (const s of Object.values(r.swings)) {
        expect(Number.isInteger(s.years)).toBe(true)
        expect(s.years).toBeGreaterThanOrEqual(0)
      }
    }
  }, 60_000)
  it('the walk agrees with the full search on the answer it is nudging', () => {
    // A nudge of nothing (a household with no home) must land on the base, whatever the walk does.
    const none = { ...household, home: null }
    const r = factSwings(none, assumptions, [{ id: 'h', owner: 'household', kind: 'homeValue' }])
    expect(r.swings.h.down).toBe(r.base)
    expect(r.swings.h.up).toBe(r.base)
  })
})

describe('factSwings — a household whose oldest member is past 70', () => {
  // retireAt tries such a household at the oldest person's own age alone (it raises its range to them); the swings and the range must read the
  // SAME range, or a plan that works at 72 is told « maybe no age before 70 » at both ends and a nudge that breaks it reads as an earlier answer.
  const { household: retired, assumptions: a } = EXAMPLES.retired
  const older = { ...retired, persons: retired.persons.map((p) => ({ ...p, birth: { ...p.birth, year: p.birth.year - 4 } })) }
  const facts = [
    { id: 'spend', owner: 'household' as const, kind: 'spendingRetired' as const },
    { id: 'rrsp', owner: 'self' as const, kind: 'rrspBalance' as const },
  ]

  it('the example is what the test needs: the oldest is 72 and the plan works', () => {
    expect(a.today.year - older.persons[0].birth.year).toBe(72)
    expect(factSwings(older, a, []).base).toBe(72)
  })

  it('the range of a plan that works is a number at its lucky end, never « no age » — and it holds the answer', () => {
    const r = factSwings(older, a, facts)
    expect(r.base).toBe(72)
    expect(r.range!.low).toBe(72)
    expect(r.range!.high === null || r.range!.high === 72).toBe(true)
  })

  it('a nudge either moves nothing or breaks the plan, and a break is ONE year past the last age tried, never an earlier answer', () => {
    const r = factSwings(older, a, facts)
    for (const s of Object.values(r.swings)) {
      for (const side of [s.down, s.up]) expect(side === null || side === 72).toBe(true)
      expect(s.years).toBe(s.down === null || s.up === null ? 1 : 0)
    }
    // Spending 15 % more can only hurt: if it breaks the plan the « up » side is the null one, and the range's unlucky end follows it.
    const spend = r.swings.spend
    if (spend.down === null) expect(spend.up).toBeNull()
    if (spend.up === null) expect(r.range!.high).toBeNull()
  }, 60_000)
})
