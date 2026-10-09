import type { Household, PersonId } from '../engine/types.ts'

// THE PLAN IN ONE LINE — from today to the end of the plan, each person's life in three stretches: still WORKING, living on the NEST (retired and no
// pension paying yet — the bridge years), and on PENSIONS (the first of the QPP, the OAS or an employer pension is being paid; the nest tops it up).
// Pure arithmetic on the ages the profile states: no projection, no assumption, so the strip says exactly what the profile says.

export type PhaseKind = 'work' | 'bridge' | 'pensions'

export interface Phase {
  kind: PhaseKind
  fromAge: number
  toAge: number
}

export type MarkKind = 'retire' | 'rrq' | 'oas'

export interface PersonTimeline {
  id: PersonId
  birthYear: number
  nowAge: number
  endAge: number
  phases: Phase[]
  /** The dates worth naming that are still ahead: retiring, the QPP start, the OAS start. */
  marks: { kind: MarkKind; age: number }[]
}

export function timelineOf(h: Household, todayYear: number, horizonAge: number): PersonTimeline[] {
  return h.persons.map((p) => {
    const nowAge = todayYear - p.birth.year
    const endAge = Math.max(nowAge + 1, p.horizonAge ?? horizonAge)
    const retire = Math.max(nowAge, p.retirementAge)
    // The first pension of any kind: a pension already in pay counts from now.
    const starts = [p.rrq.startAge, p.oas.startAge, ...p.pensions.map((d) => (d.inPay ? nowAge : d.startAge))]
    const firstPension = Math.max(retire, Math.min(...starts))
    const phases: Phase[] = []
    const add = (kind: PhaseKind, fromAge: number, toAge: number) => {
      const from = Math.max(nowAge, fromAge)
      const to = Math.min(endAge, toAge)
      if (to > from) phases.push({ kind, fromAge: from, toAge: to })
    }
    add('work', nowAge, retire)
    add('bridge', retire, firstPension)
    add('pensions', firstPension, endAge)
    const marks: PersonTimeline['marks'] = []
    if (p.retirementAge > nowAge && p.retirementAge < endAge) marks.push({ kind: 'retire', age: p.retirementAge })
    if (p.rrq.startAge > nowAge && p.rrq.startAge < endAge) marks.push({ kind: 'rrq', age: p.rrq.startAge })
    if (p.oas.startAge > nowAge && p.oas.startAge < endAge) marks.push({ kind: 'oas', age: p.oas.startAge })
    marks.sort((a, b) => a.age - b.age)
    return { id: p.id, birthYear: p.birth.year, nowAge, endAge, phases, marks }
  })
}
