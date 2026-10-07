import { describe, expect, it } from 'vitest'
import { bridgeRun, bridgeView, leversFor, profileLevers, STRATEGY_KEYS, type BridgeLevers, type BridgeYear } from './bridge.ts'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from './golden/household.fixture.ts'
import type { Household } from './types.ts'

// « Mes années 60 à 70 »: the plan year by year, and the five strategies side by side. Every figure comes from the same
// projection the verdict reads, so these tests pin (1) that the table adds up to the projection's own books, (2) that
// the levers move what they say and only that, and (3) that the golden household shows a real trade-off between taking
// the pensions early and deferring — and a smaller nest shows deferral failing sooner.

const H = GOLDEN_HOUSEHOLD
const A = GOLDEN_ASSUMPTIONS

/** The golden household with every account scaled — a bigger or a smaller nest, everything else the same. */
function withNest(factor: number): Household {
  const h = structuredClone(H)
  for (const p of h.persons) {
    p.accounts.rrsp.balance *= factor
    p.accounts.tfsa.balance *= factor
    p.accounts.nonReg.balance *= factor
    p.accounts.nonReg.acb *= factor
  }
  return h
}

const at = (rows: readonly BridgeYear[], age: number): BridgeYear => rows.find((r) => r.age === age)!

describe('the year table adds up to the projection’s own books', () => {
  it('income + draws − tax − payroll − savings = spending − shortfall, every year, for every strategy and both people', () => {
    for (const id of ['self', 'spouse'] as const) {
      for (const key of STRATEGY_KEYS) {
        const run = bridgeRun(H, A, leversFor(key, H, id, profileLevers(H, id).retirementAge))
        for (const r of run.rows) {
          const cash = r.employment + r.guaranteed + r.drawn - r.tax - r.payroll - r.saved
          expect(Math.abs(cash - (r.spending - r.shortfall)), `${id} ${key} ${r.year}`).toBeLessThan(1)
        }
      }
    }
  })

  it('the nest is the sum of its three accounts, never negative, and a shortfall only comes with an empty nest', () => {
    for (const h of [H, withNest(0.7)]) {
      const run = bridgeRun(h, A, { ...profileLevers(h, 'self'), retirementAge: 56 })
      for (const r of run.rows) {
        expect(r.nest.total).toBeCloseTo(r.nest.nonReg + r.nest.rrsp + r.nest.tfsa, 6)
        expect(r.nest.nonReg).toBeGreaterThanOrEqual(-0.01)
        expect(r.nest.rrsp).toBeGreaterThanOrEqual(-0.01)
        expect(r.nest.tfsa).toBeGreaterThanOrEqual(-0.01)
        if (r.status === 'short') expect(r.nest.total, `${r.year}`).toBeLessThan(r.spending * 0.02) // essentially empty: the last few hundred dollars cannot be drawn net of tax
      }
    }
  })

  it('each year has the status its numbers say: short with a shortfall, drawing with a draw, covered otherwise', () => {
    const run = bridgeRun(withNest(0.7), A, { ...profileLevers(H, 'self'), retirementAge: 56 })
    expect(run.rows.some((r) => r.status === 'short')).toBe(true)
    expect(run.rows.some((r) => r.status === 'drawing')).toBe(true)
    for (const r of run.rows) {
      if (r.shortfall > 0.5) expect(r.status).toBe('short')
      else expect(r.status).toBe(r.drawn > 1 ? 'drawing' : 'covered')
    }
  })

  it('the household’s own work income is gone after the person retires: no pay for a person with no job', () => {
    const run = bridgeRun(H, A, { ...profileLevers(H, 'self'), retirementAge: 58 })
    // The spouse still works (retires at 62): so household pay continues, but the retired person's share is not added back.
    expect(at(run.rows, 62).employment).toBeGreaterThan(0)
    const late = run.rows.filter((r) => r.age >= 66)
    for (const r of late) expect(r.employment, `${r.year}`).toBe(0)
  })
})

describe('the levers move what they say, and only that', () => {
  it('starting the QPP later means no QPP before that age, a bigger one after, and the same OAS', () => {
    const asap = bridgeRun(H, A, leversFor('asap', H, 'self', 60))
    const max = bridgeRun(H, A, leversFor('max', H, 'self', 60))
    // QPP at 60 pays from 60; at 72 it pays nothing at 65 …
    expect(at(asap.rows, 62).ownPension).toBeGreaterThan(0)
    expect(at(max.rows, 62).ownPension).toBe(0)
    expect(at(max.rows, 66).ownPension).toBe(0)
    // … and, once both are paid, the later start pays more every year (today's dollars, indexed pensions).
    expect(at(max.rows, 75).ownPension).toBeGreaterThan(at(asap.rows, 75).ownPension * 1.2)
  })

  it('deferring lowers the guaranteed income of the bridge years and raises it afterwards', () => {
    const std = bridgeRun(H, A, leversFor('standard', H, 'self', 60))
    const bridge = bridgeRun(H, A, leversFor('bridge', H, 'self', 60))
    for (const age of [65, 66, 67, 68, 69]) expect(at(bridge.rows, age).guaranteed, `${age}`).toBeLessThan(at(std.rows, age).guaranteed)
    for (const age of [71, 75, 85]) expect(at(bridge.rows, age).guaranteed, `${age}`).toBeGreaterThan(at(std.rows, age).guaranteed)
    // The gap is paid by the nest: more is drawn at 65–69 under the deferral.
    const drawn = (run: typeof std) => run.rows.filter((r) => r.age >= 65 && r.age < 70).reduce((s, r) => s + r.drawn, 0)
    expect(drawn(bridge)).toBeGreaterThan(drawn(std))
  })

  it('moves ONE person: a spouse’s own start ages and retirement do not change when the first person’s do', () => {
    const a = bridgeRun(H, A, leversFor('asap', H, 'self', 60))
    const b = bridgeRun(H, A, leversFor('max', H, 'self', 60))
    // The spouse retires at 62 in both: their DB pension (not a lever of the person looked at) is the same.
    const spouseOnly = (run: typeof a) => run.rows.map((r) => r.db)
    // The household DB differs only through the first person's own plan, which has no DB pension start moved by these levers.
    expect(spouseOnly(a)).toEqual(spouseOnly(b))
  })

  it('the profile’s own levers are what the profile says', () => {
    expect(profileLevers(H, 'self')).toEqual({ id: 'self', retirementAge: H.persons[0].retirementAge, rrqStartAge: H.persons[0].rrq.startAge, oasStartAge: H.persons[0].oas.startAge })
    expect(leversFor('mine', H, 'spouse', 61)).toEqual({ id: 'spouse', retirementAge: 61, rrqStartAge: H.persons[1].rrq.startAge, oasStartAge: H.persons[1].oas.startAge })
    expect(leversFor('max', H, 'self', 60)).toMatchObject({ rrqStartAge: 72, oasStartAge: 70 })
    expect(leversFor('bridge', H, 'self', 60)).toMatchObject({ rrqStartAge: 70, oasStartAge: 70 })
    expect(leversFor('asap', H, 'self', 60)).toMatchObject({ rrqStartAge: 60, oasStartAge: 65 })
    expect(leversFor('standard', H, 'self', 60)).toMatchObject({ rrqStartAge: 65, oasStartAge: 65 })
  })
})

describe('« both defer to 70 » — the other person follows', () => {
  it('starts the other person’s QPP and OAS at 70 too, and leaves their retirement age alone', () => {
    const l = leversFor('both', H, 'self', 60)
    expect(l).toMatchObject({ rrqStartAge: 70, oasStartAge: 70, both: true })
    const own = bridgeRun(H, A, leversFor('bridge', H, 'self', 60))
    const both = bridgeRun(H, A, l)
    // the household's QPP before the 70th birthday of the person looked at differs only if the spouse's own started earlier
    const early = (r: typeof own) => r.rows.filter((y) => y.age < 70).reduce((s, y) => s + y.rrq + y.oas, 0)
    expect(early(both)).toBeLessThan(early(own))
    expect(both.rows[0].spending).toBeCloseTo(own.rows[0].spending, 6)
  })
  it('a household of one has no such strategy', () => {
    const solo = { ...H, persons: [H.persons[0]] }
    const v = bridgeView(solo, A, profileLevers(solo, 'self'))
    expect(v.strategies.map((s) => s.key)).not.toContain('both')
  })
})

describe('the strategies side by side', () => {
  const view = (h: Household, levers: BridgeLevers, matrix = false) => bridgeView(h, A, levers, matrix)
  const card = (v: ReturnType<typeof view>, key: (typeof STRATEGY_KEYS)[number]) => v.strategies.find((s) => s.key === key)!

  it('lists the strategies a couple is shown, the selected plan is one of the runs, and « standard » is the baseline', () => {
    const v = view(H, profileLevers(H, 'self'))
    expect(v.strategies.map((s) => s.key)).toEqual([...STRATEGY_KEYS])
    expect(card(v, 'standard').extraDrawn6070).toBe(0)
    expect(card(v, 'standard').breakEven).toBeNull()
    expect(v.selected.levers).toEqual(profileLevers(H, 'self'))
    expect(v.matrix).toBeNull()
  })

  it('a deferral pays for itself later than the age it starts at; an early start is overtaken by waiting until 65', () => {
    for (const id of ['self', 'spouse'] as const) {
      const v = view(H, profileLevers(H, id))
      expect(card(v, 'max').breakEven, `${id} max`).toBeGreaterThan(72)
      expect(card(v, 'bridge').breakEven, `${id} bridge`).toBeGreaterThan(70)
      expect(card(v, 'asap').breakEven, `${id} asap`).toBeGreaterThan(65)
      expect(card(v, 'asap').breakEven!, `${id} asap < max`).toBeLessThan(card(v, 'max').breakEven!)
    }
  })

  it('the bridge costs nest: deferring draws more from the accounts at 60–69 than starting at 65, taking early draws less', () => {
    const v = view(H, profileLevers(H, 'self'))
    expect(card(v, 'max').extraDrawn6070).toBeGreaterThan(50_000)
    expect(card(v, 'bridge').extraDrawn6070).toBeGreaterThan(50_000)
    expect(card(v, 'asap').extraDrawn6070).toBeGreaterThan(-1)
    // …and the deferred plans end with MORE at 95 (the longevity trade) while holding LESS at 70.
    expect(card(v, 'max').summary.netWorth95!).toBeGreaterThan(card(v, 'standard').summary.netWorth95!)
    expect(card(v, 'max').summary.lowestNest!.amount).toBeLessThan(card(v, 'standard').summary.lowestNest!.amount)
  })

  it('golden household: a real trade-off — under the prudent set the earlier the pensions, the longer the money lasts', () => {
    const v = view(H, profileLevers(H, 'self'), true)
    const m = v.matrix!
    for (const key of STRATEGY_KEYS) {
      // monotone in the economy: a strategy that holds under a harsher set holds under a gentler one
      if (m[key].prudent.ok) expect(m[key].neutral.ok).toBe(true)
      if (m[key].neutral.ok) expect(m[key].bold.ok).toBe(true)
    }
    expect(m.standard.neutral.ok).toBe(true)
    expect(m.max.neutral.ok).toBe(true)
    // the prudent set breaks them at DIFFERENT ages — the numbers the page lets the person see
    expect(m.standard.prudent.ok).toBe(false)
    expect(m.max.prudent.ok).toBe(false)
    expect(m.max.prudent.firstShortfallAge).not.toBe(m.standard.prudent.firstShortfallAge)
  })

  it('a good-sized nest can defer to 70; a small one retiring early runs out sooner when it defers than when it does not', () => {
    // Retiring at 57 on the golden nest: starting at 65 runs out at 98, deferring to 72/70 lasts to the horizon.
    const big = view(H, { ...profileLevers(H, 'self'), retirementAge: 57 })
    expect(card(big, 'standard').summary.ok).toBe(false)
    expect(card(big, 'max').summary.ok).toBe(true)
    // Retiring at 55 on 70 % of that nest: both fail, and the deferral fails FIRST (68 against 73) — the bridge years cannot be carried.
    const small = view(withNest(0.7), { ...profileLevers(H, 'self'), retirementAge: 55 })
    expect(card(small, 'standard').summary.ok).toBe(false)
    expect(card(small, 'max').summary.ok).toBe(false)
    expect(card(small, 'max').summary.firstShortfallAge!).toBeLessThan(card(small, 'standard').summary.firstShortfallAge!)
  })

  it('a year the plan cannot cover is named by the age of the person looked at', () => {
    const v = view(withNest(0.7), { ...profileLevers(H, 'self'), retirementAge: 56 })
    const s = card(v, 'standard').summary
    expect(s.firstShortfallYear).not.toBeNull()
    expect(s.firstShortfallYear! - H.persons[0].birth.year).toBe(s.firstShortfallAge)
  })

  it('the lowest nest of the bridge years is read over ages 60 to 70 only', () => {
    // « max » bottoms out at 70; « asap » at 60 (the nest is higher by 70 because the pensions came early) — both ends of the window.
    for (const [key, atAge] of [['max', 70], ['asap', 60]] as const) {
      const run = bridgeRun(H, A, leversFor(key, H, 'self', 60))
      const low = run.summary.lowestNest!
      expect(low.age, key).toBe(atAge)
      const inWindow = run.rows.filter((r) => r.age >= 60 && r.age <= 70).map((r) => r.nest.total)
      expect(low.amount, key).toBeCloseTo(Math.min(...inWindow), 6)
      // and the plan has lower nests OUTSIDE the window (the later years), which must not be picked
      expect(Math.min(...run.rows.map((r) => r.nest.total)), key).toBeLessThan(low.amount)
    }
  })
})
