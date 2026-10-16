import { describe, expect, it } from 'vitest'
import { fillCeiling } from '../engine/bracketFill.ts'
import { paramsFor } from '../engine/params/index.ts'
import { project } from '../engine/projection.ts'
import { genCases } from './householdGen.ts'

// THE FILL'S SECOND PASS, SEEN ON A PINNED HOUSEHOLD. The fill goes through the two people in turn, and what the second takes out of the RRSP changes what the first's income is once the pension is split —
// so the first is revisited. The mutation runner (scripts/mutate.mjs) found that, after the order of the people was fixed, NOTHING in the suite noticed the pass being removed: it moves only 4 of
// 719 filled years in a random sample, which no share-based property can see. So it is pinned: one generated couple (seed 11, case 0), one year (2048), where two passes put the first person's income
// ON the first-bracket line ($85 845) and one pass leaves it $228 short (0.27 %).
//
// The household is generated, not written out, so the test pins the generator's output by a hash: if the generator changes, this fails first and says so — re-pin it from the new case (and check the
// year below still shows the pass at work) rather than loosen the assertion.

const djb2 = (s: string) => {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

describe('the second pass of the fill, on a pinned couple', () => {
  const c = genCases(11, 1)[0]

  it('is the couple it was pinned on (a generator change must re-pin it, not slip by)', () => {
    expect(djb2(JSON.stringify(c.household) + JSON.stringify(c.assumptions)), 're-pin: the generated couple changed').toBe(916049176)
  })

  it('in 2048 the first person’s income is ON the first-bracket line, to a twentieth of a percent', () => {
    const a = { ...c.assumptions, bracketFill: 'bracket1' as const }
    const row = project(c.household, a).find((r) => r.year === 2048)!
    const line = fillCeiling('bracket1', paramsFor(2048, { inflation: a.inflation, wageGrowth: a.wageGrowth }))
    const self = row.persons.self!
    expect(self.employment).toBe(0)
    expect(self.gis).toBe(0)
    expect(self.balancesEnd.rrsp, 'the RRSP is not what stopped the fill').toBeGreaterThan(50_000)
    expect(Math.abs(self.netIncome - line) / line, `income ${self.netIncome.toFixed(0)} against a line of ${line.toFixed(0)}`).toBeLessThanOrEqual(0.0005)
  })
})
