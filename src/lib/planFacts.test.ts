import { describe, expect, it } from 'vitest'
import { EXAMPLES, EXAMPLE_IDS, type ExampleId } from '../engine/golden/examples.ts'
import { exampleProfile } from './example.ts'
import { planFacts, whatIfFacts } from './planFacts.ts'

// THE FACTS THE PLAIN-LANGUAGE TEXTS STAND ON. These hold for any household (so they will hold for the one on this device) and are pinned for the fourteen examples:
// when an engine change moves one of the pinned facts, the example's story (exampleStory.ts) is read again by a person, not silently kept — that is what this table is for.

const nowOf = (id: ExampleId) => EXAMPLES[id].assumptions.today

/** What each example's facts were when its story was written: [kind, earliest age, the plan as entered holds, first shortfall year]. */
const PINNED: Record<ExampleId, ['now' | 'at', number, boolean, number | null]> = {
  golden: ['at', 60, true, null],
  average: ['at', 60, true, null],
  modest: ['at', 63, true, null],
  rich: ['at', 57, true, null],
  behind: ['at', 69, false, 2036],
  retired: ['now', 68, true, null],
  newcomer: ['at', 62, true, null],
  heir: ['now', 27, true, null],
  downsizer: ['at', 58, true, null],
  planner: ['at', 57, true, null],
  family: ['at', 59, true, null],
  melter: ['now', 60, true, null],
  couple62: ['at', 64, false, 2032],
  early: ['at', 45, true, null],
}

describe('the facts of the fourteen examples', { timeout: 300_000 }, () => {
  it('every example is pinned, and the pins are what the engine says today', () => {
    expect(Object.keys(PINNED).sort()).toEqual([...EXAMPLE_IDS].sort())
    for (const id of EXAMPLE_IDS) {
      const f = planFacts(exampleProfile(id), nowOf(id))
      expect([f.kind, f.earliest, f.ownPlanHolds, f.firstShortfallYear], `${id}: the facts moved — re-read its story in exampleStory.ts`).toEqual(PINNED[id])
    }
  })

  it('are consistent with each other and in one money basis (today\'s dollars, whole thousands)', () => {
    for (const id of EXAMPLE_IDS) {
      const f = planFacts(exampleProfile(id), nowOf(id))
      expect(f.ownPlanHolds, id).toBe(f.firstShortfallYear === null)
      expect(f.kind === 'none', id).toBe(f.earliest === null)
      expect(f.nestEnd % 1000, `${id} nestEnd`).toBe(0)
      expect(f.nestEnd, `${id} nestEnd`).toBeGreaterThanOrEqual(0)
      if (!f.ownPlanHolds) expect(f.nestEnd, `${id}: a plan that runs short ends with nothing`).toBe(0)
      for (const l of f.levers) if (l.endGain !== null) expect(l.endGain % 1000, `${id} ${l.id}`).toBe(0)
    }
  })

  it('a household that has already stopped working is read on its own plan (does the money last?), not on the headline: one of them can hold and the other not', () => {
    const retired = EXAMPLE_IDS.filter((id) => planFacts(exampleProfile(id), nowOf(id)).everyoneRetired)
    expect(retired.sort()).toEqual(['couple62', 'melter', 'retired'])
    expect(planFacts(exampleProfile('couple62'), nowOf('couple62')).ownPlanHolds).toBe(false)
    expect(planFacts(exampleProfile('retired'), nowOf('retired')).ownPlanHolds).toBe(true)
  })
})

describe('the what-if facts of the fourteen examples', { timeout: 300_000 }, () => {
  it('a crash at the start of retirement never makes the answer EARLIER, and never invents an answer', () => {
    for (const id of EXAMPLE_IDS) {
      const w = whatIfFacts(exampleProfile(id), nowOf(id)).crash
      if (w.base === null) expect(w.earliest, `${id}: no age works as it stands, so none works after a crash`).toBeNull()
      else if (w.earliest !== null) expect(w.earliest, id).toBeGreaterThanOrEqual(w.base)
      expect(w.nestEnd % 1000, id).toBe(0)
    }
  })

  it('a death is offered only to a couple, at an age still ahead of the person and inside their own plan', () => {
    for (const id of EXAMPLE_IDS) {
      const profile = exampleProfile(id)
      const d = whatIfFacts(profile, nowOf(id)).death
      if (profile.household.persons.length === 1) {
        expect(d, `${id} is one person`).toBeNull()
        continue
      }
      expect(d, `${id} is a couple`).not.toBeNull()
      const p = profile.household.persons.find((x) => x.id === d!.who)!
      expect(d!.age, id).toBeGreaterThan(nowOf(id).year - p.birth.year)
      expect(d!.nestEnd % 1000, id).toBe(0)
      expect(d!.nestEndBase % 1000, id).toBe(0)
    }
  })
})
