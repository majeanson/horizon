import { describe, expect, it } from 'vitest'
import { profileLevers } from './bridge.ts'
import { DEATH_AGES, deathSweep, sweepAges } from './deathSweep.ts'
import { EXAMPLES } from './golden/examples.ts'
import { GOLDEN_ASSUMPTIONS as A, GOLDEN_HOUSEHOLD as H } from './golden/household.fixture.ts'

// « WHAT IF ONE OF US DIES EARLIER? » — the timing of a pension seen from a short life. The break-even ages the bridge view already states
// (about 73 for taking the QPP at 60 against 65; about 82 for deferring to 72 / 70) are the thresholds this table must reproduce from the other side.

const sweep = deathSweep(H, A, profileLevers(H, 'self'))
const row = (key: string) => sweep.rows.find((r) => r.key === key)!
const at = (key: string, age: number) => row(key).cells[sweep.ages.indexOf(age)]

describe('deathSweep', () => {
  it('tries the ages ahead of the person and inside their plan, and a row for every way of starting', () => {
    expect(sweep.ages).toEqual([...DEATH_AGES])
    expect(sweep.rows.map((r) => r.key)).toEqual(['mine', 'asap', 'standard', 'max', 'bridge', 'both'])
    for (const r of sweep.rows) expect(r.cells).toHaveLength(sweep.ages.length)
    // a plan that already ends at 85 has no death at 90 to try; someone already 70 has no death at 70
    const short = { ...H, persons: H.persons.map((p) => (p.id === 'self' ? { ...p, horizonAge: 85 } : p)) }
    expect(sweepAges(short, A, 'self')).toEqual([70, 75, 80])
    expect(sweepAges(H, { ...A, today: { year: 1978 + 70, month: 6 } }, 'self')).toEqual([75, 80, 85, 90])
  })

  it('what the person was paid only grows with a longer life, for every way of starting', () => {
    for (const r of sweep.rows) {
      for (let i = 1; i < r.cells.length; i++) expect(r.cells[i].ownPensions, `${r.key} ${sweep.ages[i]}`).toBeGreaterThanOrEqual(r.cells[i - 1].ownPensions)
    }
  })

  it('reproduces the break-evens: the QPP at 60 leads until about 73, the deferral to 72 / 70 overtakes the standard about 82', () => {
    // dying at 70 or 75: taking it early has paid more than waiting for 65 only until the break-even — at 70 it leads, at 75 it has been overtaken
    expect(at('asap', 70).ownPensions).toBeGreaterThan(at('standard', 70).ownPensions)
    expect(at('asap', 75).ownPensions).toBeLessThan(at('standard', 75).ownPensions)
    // dying at 80 the deferral has not caught up; at 85 it has
    expect(at('max', 80).ownPensions).toBeLessThan(at('standard', 80).ownPensions)
    expect(at('max', 85).ownPensions).toBeGreaterThan(at('standard', 85).ownPensions)
  })

  it('a couple: the survivor keeps a QPP pension after the first death, and a person alone has none to keep', () => {
    expect(at('standard', 75).survivorRrq).toBeGreaterThan(0)
    const alone = EXAMPLES.modest
    const s = deathSweep(alone.household, alone.assumptions, profileLevers(alone.household, 'self'))
    for (const r of s.rows) for (const c of r.cells) expect(c.survivorRrq).toBe(0)
  })

  it('the figures are the verdict’s own: a death at the plan’s own age leaves the plan as the bridge view states it', () => {
    const own = deathSweep(H, A, profileLevers(H, 'self'), [90])
    expect(own.rows.find((r) => r.key === 'standard')!.cells[0].ok).toBe(true)
  })
})
