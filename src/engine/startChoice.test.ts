import { describe, expect, it } from 'vitest'
import { bridgeView, profileLevers } from './bridge.ts'
import { EXAMPLES } from './golden/examples.ts'
import { leverRanking } from './levers.ts'
import { oasStart } from './oas.ts'
import { fromIndex, monthIndex, rrqStart } from './rrq.ts'
import { spouseTiming } from './spouseTiming.ts'
import { canStartAt } from './startChoice.ts'
import type { Household } from './types.ts'

// A START AGE ALREADY BEHIND A PERSON IS NOT A CHOICE. The levers, the bridge strategies and the spouses' timing grid all read one rule
// (startChoice.ts): a start in an earlier year is history, and a pension paid since an earlier year cannot be stopped to be taken later.

const today = { year: 2026, month: 10 }
const born = (year: number) => ({ year, month: 3 })

describe('canStartAt — the one rule', () => {
  it('a person’s own start age is always open: it is the plan as it stands', () => {
    expect(canStartAt('rrq', born(1950), 65, 65, today)).toBe(true)
  })
  it('a start in an earlier year is closed; this year or later is open', () => {
    expect(canStartAt('rrq', born(1962), 65, 60, today)).toBe(false) // 60 in 2022
    expect(canStartAt('rrq', born(1962), 65, 64, today)).toBe(true) // 64 in 2026: this year
    expect(canStartAt('oas', born(1962), 65, 70, today)).toBe(true)
  })
  it('a pension paid since an earlier year cannot be moved, even to an age still ahead', () => {
    // born 1958, QPP since 65 (2023): 70 falls in 2028, still ahead — but the pension has been paid for three years
    expect(canStartAt('rrq', born(1958), 65, 70, today)).toBe(false)
    expect(canStartAt('oas', born(1958), 65, 70, today)).toBe(false)
  })
})

describe('the month convention is one (rrq.ts), and the OAS start is the QPP rule', () => {
  it('monthIndex and fromIndex invert each other, and both pensions start the month after the birthday month', () => {
    for (const ym of [{ year: 1960, month: 1 }, { year: 1960, month: 12 }, { year: 2031, month: 7 }]) expect(fromIndex(monthIndex(ym))).toEqual(ym)
    for (const b of [{ year: 1961, month: 12 }, { year: 1970, month: 1 }, { year: 1980, month: 6 }]) {
      for (const age of [65, 66, 70]) expect(oasStart(b, age)).toEqual(rrqStart(b, age))
    }
    expect(rrqStart({ year: 1961, month: 12 }, 65)).toEqual({ year: 2027, month: 1 })
  })
})

describe('the levers: « at 70 » never re-runs a past choice', () => {
  const { household: retired, assumptions: a } = EXAMPLES.retired

  it('a couple both paid since 65 (the « retired » example, 68 and 66) is not offered « at 70 » at all: nothing it would move can move', () => {
    expect(a.today.year - retired.persons[0].birth.year).toBe(68)
    const r = leverRanking(retired, a)
    expect(r.levers.map((l) => l.id)).not.toContain('pensions70')
    expect(r.levers.length).toBe(3)
  }, 60_000)

  it('a couple still ahead of its starts is offered it (the « average » example: every lever, as before)', () => {
    const { household, assumptions } = EXAMPLES.average
    expect(leverRanking(household, assumptions).levers.map((l) => l.id)).toContain('pensions70')
  }, 60_000)
})

describe('the bridge strategies: a road already behind is marked, never offered as a plan', () => {
  // Hélène (« modest », born 1971) moved to 68 and not yet started (her own ages 70 / 70): 60 and 65 are behind her, 70 and 72 are not.
  const { household: modest, assumptions: a } = EXAMPLES.modest
  const late: Household = { ...modest, persons: modest.persons.map((p) => ({ ...p, birth: { ...p.birth, year: a.today.year - 68 }, retirementAge: 68, rrq: { ...p.rrq, startAge: 70 }, oas: { ...p.oas, startAge: 70 } })) }

  it('« asap » (QPP 60) and « standard » (65) are passed; « bridge » (70), « max » (72 / 70) and the person’s own are not', () => {
    const v = bridgeView(late, a, profileLevers(late, 'self'))
    const passed = Object.fromEntries(v.strategies.map((s) => [s.key, s.passed]))
    expect(passed).toEqual({ mine: false, asap: true, standard: true, max: false, bridge: false })
  }, 60_000)

  it('a household well ahead of every start has no passed card', () => {
    const v = bridgeView(modest, a, profileLevers(modest, 'self'))
    expect(v.strategies.every((s) => !s.passed)).toBe(true)
  }, 60_000)
})

describe('the spouses’ timing grid: a pension already paid is not re-timed', () => {
  it('in the « retired » couple, only the household’s own pair is feasible; every other cell moves a pension paid since 2023 or 2025', () => {
    const { household, assumptions } = EXAMPLES.retired
    const t = spouseTiming(household, assumptions)!
    const own = [household.persons[0].rrq.startAge, household.persons[1].rrq.startAge]
    for (const c of t.cells) expect(c.feasible, c.starts.join('/')).toBe(c.starts[0] === own[0] && c.starts[1] === own[1])
    expect(t.current.feasible).toBe(true)
  }, 120_000)
})
