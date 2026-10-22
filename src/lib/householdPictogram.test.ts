import { describe, expect, it } from 'vitest'
import { EXAMPLE_IDS } from '../engine/golden/examples.ts'
import { exampleProfile } from './example.ts'
import { lifeStage, pictogramOf, savingsTier } from './householdPictogram.ts'
import { defaultProfile } from './schema.ts'

// The picture of a household is held to what the household's own data says: who, how far along, how many children, a home, how much saved. Read at a fixed
// year so the examples do not age under the test.
const YEAR = 2026
const of = (id: Parameters<typeof exampleProfile>[0]) => pictogramOf(exampleProfile(id), YEAR)
const concepts = (id: Parameters<typeof exampleProfile>[0]) => of(id).map((t) => t.concept)
const count = (list: string[], c: string) => list.filter((x) => x === c).length

describe('lifeStage', () => {
  it('is retired from the planned stop, young under 40, near within ten years of the stop, else the middle', () => {
    const p = (born: number, retirementAge: number) => ({ birth: { year: born, month: 1 }, retirementAge })
    expect(lifeStage(p(1960, 62), YEAR)).toBe('retired')
    expect(lifeStage(p(1999, 30), YEAR)).toBe('young')
    expect(lifeStage(p(1991, 47), YEAR)).toBe('young')
    expect(lifeStage(p(1971, 58), YEAR)).toBe('near')
    expect(lifeStage(p(1984, 62), YEAR)).toBe('middle')
  })
})

describe('savingsTier', () => {
  const holds = (n: number) => [{ accounts: { rrsp: { balance: n, room: 0, annualContribution: 0 }, tfsa: { balance: 0, room: 0, annualContribution: 0 }, nonReg: { balance: 0, acb: 0, annualContribution: 0 } } }]
  it('shows none for nothing, then one to three « $ »', () => {
    expect(savingsTier(holds(0))).toBe(0)
    expect(savingsTier(holds(99_999))).toBe(1)
    expect(savingsTier(holds(100_000))).toBe(2)
    expect(savingsTier(holds(499_999))).toBe(2)
    expect(savingsTier(holds(500_000))).toBe(3)
  })
})

describe('pictogramOf, over every example household', () => {
  it('draws one person per adult, the first marigold and the second sky, and keys are unique', () => {
    for (const id of EXAMPLE_IDS) {
      const profile = exampleProfile(id)
      const tokens = pictogramOf(profile, YEAR)
      const people = tokens.filter((t) => t.who !== undefined)
      expect(people, id).toHaveLength(profile.household.persons.length)
      expect(people.map((t) => t.who), id).toEqual(profile.household.persons.map((_, i) => Math.min(i, 1)))
      expect(new Set(tokens.map((t) => t.id)).size, id).toBe(tokens.length)
    }
  })

  it('tells each story’s facts', () => {
    expect(concepts('family').filter((c) => c === 'enfants')).toHaveLength(2)
    expect(concepts('planner')).toEqual(expect.arrayContaining(['enfants', 'maison', 'heritage']))
    expect(count(concepts('planner'), 'enfants')).toBe(1)
    expect(concepts('retired')).toEqual(expect.arrayContaining(['retraite', 'employeur']))
    expect(of('retired').filter((t) => t.concept === 'retraite')).toHaveLength(2)
    expect(count(concepts('heir'), 'dollars')).toBe(3)
    expect(concepts('heir')[0]).toBe('jeune')
    expect(count(concepts('modest'), 'dollars')).toBe(1)
    expect(concepts('modest')).not.toContain('enfants')
    expect(concepts('downsizer')).toEqual(expect.arrayContaining(['avance', 'maison']))
    expect(count(concepts('rich'), 'dollars')).toBe(3)
  })
})

describe('a household with nothing in it yet', () => {
  it('draws the one person and nothing else', () => {
    const tokens = pictogramOf(defaultProfile({ year: YEAR }), YEAR)
    expect(tokens.map((t) => t.id)).toEqual(['person-0'])
  })
})
