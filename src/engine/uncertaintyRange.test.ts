import { describe, expect, it } from 'vitest'
import { factSwings, type ImpactKind } from './factImpact.ts'
import { EXAMPLES } from './golden/examples.ts'

// THE RANGE: every unconfirmed figure nudged against / in favour of the household AT ONCE.

const n = (x: number | null) => x ?? 71
const KINDS: ImpactKind[] = ['rrspBalance', 'tfsaBalance', 'nonRegBalance', 'pension', 'earnings', 'salary', 'rrspRoom', 'tfsaRoom']
const factsOf = (ex: (typeof EXAMPLES)['average']) => ex.household.persons.flatMap((p) => KINDS.map((k) => ({ id: `${p.id}:${k}`, owner: p.id, kind: k })))
const spending = [
  { id: 'sw', owner: 'household' as const, kind: 'spendingWorking' as const },
  { id: 'sr', owner: 'household' as const, kind: 'spendingRetired' as const },
]

describe('uncertainty range', () => {
  it('is null when every figure is confirmed (no facts)', () => {
    expect(factSwings(EXAMPLES.average.household, EXAMPLES.average.assumptions, []).range).toBeNull()
  })

  it('brackets the answer after enforcement: low <= base <= high', () => {
    for (const ex of [EXAMPLES.average, EXAMPLES.behind, EXAMPLES.retired]) {
      const r = factSwings(ex.household, ex.assumptions, [...factsOf(ex), ...spending])
      expect(r.range).not.toBeNull()
      expect(n(r.range!.low)).toBeLessThanOrEqual(n(r.base))
      expect(n(r.range!.high)).toBeGreaterThanOrEqual(n(r.base))
    }
  }, 120_000)

  it('all figures wrong the bad way is at least as late as the worst single figure (holds on the average household)', () => {
    // Not a universal law: clamps (a locked-in share capped by a smaller balance, an ACB capped by balance) and non-monotone
    // plans can let a composition beat a single nudge. It holds here, where the figures only ever add up.
    const ex = EXAMPLES.average
    const r = factSwings(ex.household, ex.assumptions, [...factsOf(ex), ...spending])
    const worstSingle = Math.max(...Object.values(r.swings).flatMap((s) => [n(s.down), n(s.up)]))
    expect(n(r.range!.high)).toBeGreaterThanOrEqual(worstSingle)
    expect(n(r.range!.high)).toBeGreaterThan(n(r.base))
    expect(n(r.range!.low)).toBeLessThan(n(r.base))
  }, 120_000)

  it('the enforcement pins the base inside the range even when nothing moves', () => {
    const none = { ...EXAMPLES.average.household, home: null }
    const r = factSwings(none, EXAMPLES.average.assumptions, [{ id: 'h', owner: 'household', kind: 'homeValue' }])
    expect(r.range).toEqual({ low: r.base, high: r.base })
  })
})
