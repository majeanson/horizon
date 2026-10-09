import { describe, expect, it } from 'vitest'
import { EXAMPLES } from '../engine/golden/examples.ts'
import { GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { timelineOf } from './timeline.ts'

const TODAY = 2026

describe('the plan in one line', () => {
  it('every person: the stretches follow each other without a gap or an overlap, from today to the end of the plan', () => {
    const all = [GOLDEN_HOUSEHOLD, ...Object.values(EXAMPLES).map((e) => e.household)]
    for (const h of all) {
      for (const t of timelineOf(h, TODAY, 95)) {
        expect(t.phases.length).toBeGreaterThan(0)
        expect(t.phases[0].fromAge).toBe(t.nowAge)
        expect(t.phases[t.phases.length - 1].toAge).toBe(t.endAge)
        for (let i = 1; i < t.phases.length; i++) expect(t.phases[i].fromAge).toBe(t.phases[i - 1].toAge)
        for (const ph of t.phases) expect(ph.toAge).toBeGreaterThan(ph.fromAge)
      }
    }
  })

  it('the golden couple: Camille works to 60, then her employer pension (from 60) is the first pension — no bridge years', () => {
    const [camille, alex] = timelineOf(GOLDEN_HOUSEHOLD, TODAY, 95)
    expect(camille.phases.map((p) => [p.kind, p.fromAge, p.toAge])).toEqual([
      ['work', 48, 60],
      ['pensions', 60, 95],
    ])
    expect(camille.marks.map((m) => [m.kind, m.age])).toEqual([['retire', 60], ['rrq', 65], ['oas', 65]])
    expect(alex.phases[0]).toEqual({ kind: 'work', fromAge: 45, toAge: 62 })
  })

  it('someone with no pension before 65 lives on the nest in between', () => {
    const [p] = timelineOf(EXAMPLES.average.household, TODAY, 95).slice(0, 1)
    const bridge = p.phases.find((x) => x.kind === 'bridge')
    expect(bridge).toBeDefined()
    expect(bridge!.toAge).toBeGreaterThan(bridge!.fromAge)
  })

  it('someone already retired has no working stretch, and a pension already in pay starts the pensions at once', () => {
    for (const t of timelineOf(EXAMPLES.retired.household, TODAY, 95)) {
      expect(t.phases.some((x) => x.kind === 'work')).toBe(false)
      expect(t.phases[0].fromAge).toBe(t.nowAge)
    }
  })

  it('a person’s own horizon age ends their line; marks are only dates still ahead', () => {
    const h = { ...GOLDEN_HOUSEHOLD, persons: GOLDEN_HOUSEHOLD.persons.map((p, i) => (i === 0 ? { ...p, horizonAge: 88 } : p)) }
    const [a, b] = timelineOf(h, TODAY, 95)
    expect(a.endAge).toBe(88)
    expect(b.endAge).toBe(95)
    for (const t of timelineOf(EXAMPLES.retired.household, TODAY, 95)) for (const m of t.marks) expect(m.age).toBeGreaterThan(t.nowAge)
  })
})
