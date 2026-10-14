import { describe, expect, it } from 'vitest'
import { EXAMPLES } from './golden/examples.ts'
import { GOLDEN_ASSUMPTIONS as A, GOLDEN_HOUSEHOLD as H } from './golden/household.fixture.ts'
import { agesLedger } from './ledger.ts'
import { oasTrace, recompose, rrqTrace } from './trace.ts'

// A trace is the figure's calculation as data: its parts must RECOMPOSE to the value the ledger shows, or the « d'où vient ce chiffre ? »
// would explain a number the engine did not compute. Two households: the golden couple (full residence) and the newcomer (a partial OAS).

// Every example starts its pensions at 65, where the QPP adjustment and the OAS deferral are both exactly 1: a trace that dropped them would still
// recompose. So a third household starts early (QPP 60) and late (OAS 70) to make the factors bite.
const shifted = { ...H, persons: H.persons.map((p) => ({ ...p, rrq: { startAge: 60 }, oas: { ...p.oas, startAge: 70 } })) }

const cases = [
  ['golden', agesLedger(H, A)],
  ['golden, QPP at 60 and OAS at 70', agesLedger(shifted, A)],
  ['newcomer', agesLedger(EXAMPLES.newcomer.household, EXAMPLES.newcomer.assumptions)],
] as const

describe('traces recompose to the displayed figure', () => {
  for (const [name, ledger] of cases) {
    for (const l of ledger) {
      it(`${name} ${l.id}: QPP`, () => {
        const t = rrqTrace(l)
        expect(recompose(t.parts)).toBeCloseTo(l.rrq.monthly, 1)
        expect(t.value).toBe(l.rrq.monthly)
        expect(t.today).toBe(l.rrq.monthlyToday)
      })
      it(`${name} ${l.id}: OAS`, () => {
        const t = oasTrace(l)
        expect(recompose(t.parts)).toBeCloseTo(l.oas.monthly, 1)
        expect(t.today).toBe(l.oas.monthlyToday)
      })
    }
  }

  it('the newcomer’s OAS really is partial (the residence factor is in the parts)', () => {
    const t = oasTrace(cases[2][1][0])
    expect(t.parts.find((p) => p.labelKey === 'oasResidence')!.value).toBeLessThan(1)
  })

  it('the shifted household’s factors are not 1 (the case that makes the recomposition see them)', () => {
    const l = cases[1][1][0]
    expect(l.rrq.adjustment).toBeLessThan(0.9)
    expect(l.oas.multiplier).toBeGreaterThan(1.3)
  })

  it('every trace names an official page and a door for each choice it rests on', () => {
    for (const [, ledger] of cases) {
      for (const t of ledger.flatMap((l) => [rrqTrace(l), oasTrace(l)])) {
        expect(t.source?.url).toMatch(/^https:\/\//)
        for (const i of t.inputs) expect(i.door, i.labelKey).toMatch(/^(person:|assumptions$|[a-z]+:[A-Za-z]+$)/)
      }
    }
  })
})
