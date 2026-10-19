import { describe, expect, it, vi } from 'vitest'
import { bridgeRun, profileLevers } from './bridge.ts'
import { deferralView } from './deferral.ts'
import { GOLDEN_ASSUMPTIONS as A, GOLDEN_HOUSEHOLD as H } from './golden/household.fixture.ts'
import type { Household } from './types.ts'

// A person's OWN QPP is not the QPP they receive: after a spouse's death the surviving spouse's pension and the death benefit ride inside `PersonYear.rrq`
// (projection.ts adds them), but a start-age comparison is about the pension the START AGE chose. Regression: deferral.ts and bridge.ts read `rrq` whole, so the
// widow's « own » pension jumped at the death and the break-even was bent by money no start age could change.
vi.setConfig({ testTimeout: 60_000 })

const widow: Household = { ...H, persons: H.persons.map((p) => (p.id === 'spouse' ? { ...p, horizonAge: 70 } : p)) }
const deathYear = 1981 + 70

describe('the own pension excludes the survivor pension and the death benefit', () => {
  it('bridge: Camille’s ownRrq after his death equals her ownRrq in the same plan where he lives', () => {
    const lev = profileLevers(H, 'self')
    const alive = bridgeRun(H, A, lev).rows
    const dead = bridgeRun(widow, A, lev).rows
    for (const y of [deathYear + 1, deathYear + 2, deathYear + 3]) {
      const a = alive.find((r) => r.year === y)!
      const d = dead.find((r) => r.year === y)!
      expect(d.survivor, `${y} survivor pension is shown on its own line`).toBeGreaterThan(0)
      expect(d.ownRrq, `${y}`).toBeCloseTo(a.ownRrq, 1)
      expect(d.ownPension, `${y}`).toBeCloseTo(a.ownPension, 1)
    }
  })

  it('deferral: Camille’s monthly QPP per start age is the same whether or not he dies early (nothing of his is hers to choose)', () => {
    const before = deferralView(H, A).persons[0]
    const after = deferralView(widow, A).persons[0]
    for (const o of before.rrq) {
      const w = after.rrq.find((x) => x.age === o.age)!
      expect(w.monthly, `${o.age}`).toBeCloseTo(o.monthly, 1)
      // the break-even reads the cumulative pension through the widowhood: his survivor pension must not move it
      expect(w.breakEven, `${o.age} break-even`).toBe(o.breakEven)
    }
    expect(before.rrq.find((o) => o.age === 70)!.breakEven).not.toBeNull()
  })
})
