import { describe, expect, it } from 'vitest'
import { knownYear } from '../engine/params/index.ts'
import { SURVIVAL_COPY } from './survivalCopy.ts'
import { survivalView } from './survivalView.ts'

// WHAT THE PAGE SAYS ABOUT REACHING THE PLAN'S AGE: one line per person, and for a couple the chance at least one is alive in the plan's last year. Arithmetic on the profile and Statistics Canada's table.

const T = knownYear(2026).mortality.survivors
const TODAY = 2026

describe('the chance of reaching the plan’s age', () => {
  it('a person of 65 planning to 90: the ratio of the table’s survivors', () => {
    const v = survivalView([{ id: 'self', birth: { year: 1961 } }], 90, TODAY, T)!
    expect(v.people).toHaveLength(1)
    expect(v.people[0]).toMatchObject({ age: 65, horizon: 90 })
    expect(v.people[0].chance).toBeCloseTo(31_400 / 90_864, 10)
    expect(v.couple).toBeNull()
  })

  it('a person’s own age wins over the scenario’s', () => {
    const v = survivalView([{ id: 'self', birth: { year: 1961 }, horizonAge: 95 }], 90, TODAY, T)!
    expect(v.people[0].horizon).toBe(95)
    expect(v.people[0].chance).toBeCloseTo(13_015 / 90_864, 10)
  })

  it('a couple: the last year of the plan is the later of the two horizons, and the chance is that at least one is alive then', () => {
    const v = survivalView(
      [
        { id: 'self', birth: { year: 1961 } },
        { id: 'spouse', birth: { year: 1966 }, horizonAge: 92 },
      ],
      90,
      TODAY,
      T,
    )!
    // the first plans to 2051 (90), the second to 2058 (92): the last year is 2058
    expect(v.couple!.year).toBe(2058)
    const first = T[97] / T[65] // alive at 97 in 2058, aged 65 now
    const second = T[92] / T[60]
    expect(v.couple!.chance).toBeCloseTo(1 - (1 - first) * (1 - second), 10)
  })

  it('nobody with an age the table covers: nothing to say', () => {
    expect(survivalView([{ id: 'self', birth: { year: 2020 } }], 90, TODAY, T)).toBeNull()
    expect(survivalView([], 90, TODAY, T)).toBeNull()
  })

  it('the sentences print the figures they are given, in both languages', () => {
    for (const lang of ['fr', 'en'] as const) {
      const c = SURVIVAL_COPY[lang]
      expect(c.one(65, 90, '35%')).toContain('65')
      expect(c.one(65, 90, '35%')).toContain('90')
      expect(c.one(65, 90, '35%')).toContain('35%')
      expect(c.couple(2058, '57%')).toContain('2058')
      expect(c.couple(2058, '57%')).toContain('57%')
      expect(c.average.length).toBeGreaterThan(40)
    }
  })
})
