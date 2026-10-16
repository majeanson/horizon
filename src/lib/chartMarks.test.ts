import { describe, expect, it } from 'vitest'
import { EXAMPLES, EXAMPLE_IDS } from '../engine/golden/examples.ts'
import { project } from '../engine/projection.ts'
import { agesByYear, startMarkers } from './chartMarks.ts'

// THE LABELS A CHART DECIDES FOR ITSELF. Which pension-start lines the picture shows and what ages stand under a year: decided in the panels, now in two plain functions, held here — by hand-checked
// cases, and against the real rows of every example household.

const labels = { rrq: 'QPP', oas: 'OAS' }
const all = () => true
const yearOf = (age: number) => 1990 + age

describe('startMarkers', () => {
  it('two different start ages are two lines, each named, placed where `at` puts them', () => {
    expect(startMarkers({ rrq: 65, oas: 70 }, all, labels, yearOf)).toEqual([
      { x: 2055, label: 'QPP', colour: 'accent', named: true },
      { x: 2060, label: 'OAS', colour: 'accent', named: true },
    ])
  })

  it('the same start age is ONE line with both names, not two on top of each other', () => {
    expect(startMarkers({ rrq: 65, oas: 65 }, all, labels, yearOf)).toEqual([{ x: 2055, label: 'QPP + OAS', colour: 'accent', named: true }])
  })

  it('a start outside the years on screen is not drawn; the other still is', () => {
    const upTo67 = (age: number) => age <= 67
    expect(startMarkers({ rrq: 65, oas: 70 }, upTo67, labels, yearOf).map((m) => m.label)).toEqual(['QPP'])
    expect(startMarkers({ rrq: 70, oas: 65 }, upTo67, labels, yearOf).map((m) => m.label)).toEqual(['OAS'])
    expect(startMarkers({ rrq: 70, oas: 71 }, upTo67, labels, yearOf)).toEqual([])
  })

  it('the shared line is drawn only when that age is on screen', () => {
    expect(startMarkers({ rrq: 70, oas: 70 }, (age) => age <= 67, labels, yearOf)).toEqual([])
  })

  it('the bars, keyed by age, put the line at the age itself', () => {
    expect(startMarkers({ rrq: 62, oas: 67 }, all, labels, (age) => age).map((m) => m.x)).toEqual([62, 67])
  })
})

describe('agesByYear', () => {
  it('a couple is « first / second », in the order they are listed; a person alone is one number; a gone person is skipped', () => {
    const rows = [
      { year: 2040, persons: { self: { age: 62 }, spouse: { age: 58 } } },
      { year: 2041, persons: { self: { age: 63 }, spouse: undefined } },
    ]
    expect([...agesByYear(rows)]).toEqual([[2040, '62 / 58'], [2041, '63']])
  })

  it('no rows, no ages', () => expect(agesByYear([]).size).toBe(0))
})

describe('on every example household, the ages under the axis are the people’s real ages that year', { timeout: 120_000 }, () => {
  for (const id of EXAMPLE_IDS) {
    it(id, () => {
      const { household, assumptions } = EXAMPLES[id]
      const rows = project(household, assumptions)
      const ages = agesByYear(rows)
      expect(ages.size).toBe(rows.length)
      for (const r of rows) {
        const expected = household.persons.filter((p) => r.persons[p.id]).map((p) => r.year - p.birth.year)
        expect(ages.get(r.year), `${id} ${r.year}`).toBe(expected.join(' / '))
      }
    })
  }
})
