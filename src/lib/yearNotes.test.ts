import { describe, expect, it } from 'vitest'
import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { project } from '../engine/projection.ts'
import type { Household } from '../engine/types.ts'
import { yearNotes } from './yearNotes.ts'

// THE YEARS THAT LOOK DIFFERENT FOR A REASON, read off the engine's own rows: a pension that starts part-way through a year, a survivor's pension that changes rule at 65, a one-off death benefit.

const notes = (h: Household) => yearNotes(project(structuredClone(h), structuredClone(GOLDEN_ASSUMPTIONS)))
const has = (n: ReturnType<typeof notes>, year: number, kind: string, who: string) => n.some((x) => x.year === year && x.kind === kind && x.who === who)

describe('a pension that starts part-way through the year', () => {
  it('is named in the year it starts, for each person (Camille: March 1978 → April 2043; Alex: September 1981 → October 2046)', () => {
    const n = notes(GOLDEN_HOUSEHOLD)
    for (const [year, who] of [[2043, 'self'], [2046, 'spouse']] as const) {
      expect(has(n, year, 'oasPartial', who), `OAS ${who} ${year}`).toBe(true)
      expect(has(n, year, 'rrqPartial', who), `QPP ${who} ${year}`).toBe(true)
    }
  })

  it('is not named when it starts in January and pays the whole year (born in December: the month after the 65th birthday is January)', () => {
    const h: Household = { ...GOLDEN_HOUSEHOLD, persons: GOLDEN_HOUSEHOLD.persons.map((p, i) => (i === 0 ? { ...p, birth: { year: 1978, month: 12 } } : p)) }
    const n = notes(h)
    expect(n.some((x) => x.who === 'self' && (x.kind === 'oasPartial' || x.kind === 'rrqPartial')), 'a January start is a whole year').toBe(false)
    expect(has(n, 2046, 'oasPartial', 'spouse')).toBe(true) // the other person still starts in October
  })
})

describe('after a death', () => {
  // the spouse dies at 55 (2036); the survivor, born March 1978, turns 65 in 2043 and starts their own QPP at 70, so nothing of their own muddies the picture
  const widowed: Household = {
    ...GOLDEN_HOUSEHOLD,
    persons: [
      { ...GOLDEN_HOUSEHOLD.persons[0], rrq: { startAge: 70 }, pensions: [] },
      { ...GOLDEN_HOUSEHOLD.persons[1], horizonAge: 55 },
    ],
  }
  const n = notes(widowed)

  it('names the one-off death benefit, the year the survivor pension begins, and the year the survivor turns 65', () => {
    expect(has(n, 2037, 'deathBenefit', 'self')).toBe(true)
    expect(has(n, 2037, 'survivorStarts', 'self')).toBe(true)
    expect(has(n, 2043, 'survivorAge65', 'self')).toBe(true)
  })

  it('names each of those once', () => {
    for (const kind of ['deathBenefit', 'survivorStarts', 'survivorAge65']) expect(n.filter((x) => x.kind === kind), kind).toHaveLength(1)
  })
})

describe('the notes as a whole', () => {
  it('come in year order, and there are none for a household with nothing out of the ordinary', () => {
    const n = notes(GOLDEN_HOUSEHOLD)
    expect(n.map((x) => x.year)).toEqual([...n.map((x) => x.year)].sort((a, b) => a - b))
    expect(yearNotes([])).toEqual([])
  })
})
