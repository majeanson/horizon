import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readProfileJson } from './migrations.ts'
import { savePlan } from './profileEdit.ts'
import { defaultProfile } from './schema.ts'
import { flushProfile, getProfile, getStorageIssue, reloadProfile, unreadableCopies, updateProfile } from './store.ts'

// A NAMED PLAN THAT CANNOT BE READ. A plan is a whole profile of its own (migrations.ts reads each one alone), and one that fails is left out so it cannot
// refuse the profile around it. It used to be left out SILENTLY: the profile loaded, the first edit saved it without the plan, and the plan was gone — unlike an
// unreadable profile, nothing was copied to the rescue key. Now the file as it was is kept there (« Copie illisible », page Données) before anything is saved.

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    data,
    storage: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, String(v)),
      removeItem: (k: string) => void data.delete(k),
      clear: () => data.clear(),
      key: (i: number) => [...data.keys()][i] ?? null,
      get length() {
        return data.size
      },
    },
  }
}

const TODAY = { year: 2026 }
/** A profile with two plans, the second one broken (a figure the schema refuses). */
function withBrokenPlan(): string {
  const p = savePlan(savePlan(defaultProfile(TODAY), 'Prudent'), 'Abîmé')
  const raw = JSON.parse(JSON.stringify(p))
  raw.plans[1].profile.assumptions.survivorSpending = 0 // under the 30 % the schema accepts
  return JSON.stringify(raw)
}

let mem = memoryStorage()
beforeEach(() => {
  mem = memoryStorage()
  vi.stubGlobal('localStorage', mem.storage)
})
afterEach(() => {
  vi.unstubAllGlobals()
  reloadProfile()
})

describe('a named plan that cannot be read', () => {
  it('the reader says how many plans it left out (and none for a sound file)', () => {
    const r = readProfileJson(withBrokenPlan())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.profile.plans.map((x) => x.name)).toEqual(['Prudent'])
      expect(r.droppedPlans).toBe(1)
    }
    const sound = readProfileJson(JSON.stringify(savePlan(defaultProfile(TODAY), 'Prudent')))
    expect(sound.ok && sound.droppedPlans).toBe(0)
  })

  it('the profile still loads — and the file as it was is kept for rescue BEFORE the next save writes it without the plan', () => {
    const original = withBrokenPlan()
    mem.data.set('horizon-profile', original)
    reloadProfile()
    expect(getStorageIssue()).toBeNull()
    expect(getProfile().plans.map((x) => x.name)).toEqual(['Prudent'])
    expect(unreadableCopies()).toEqual([original])
    // the next edit saves without the plan; the rescue copy is still the original, plan included
    updateProfile((p) => ({ ...p, household: { ...p.household, spending: { ...p.household.spending, workingToday: 50_000 } } }))
    flushProfile()
    expect(JSON.parse(mem.data.get('horizon-profile')!).plans).toHaveLength(1)
    expect(JSON.parse(unreadableCopies()[0]).plans).toHaveLength(2)
  })

  it('a sound file keeps nothing aside', () => {
    mem.data.set('horizon-profile', JSON.stringify(savePlan(defaultProfile(TODAY), 'Prudent')))
    reloadProfile()
    expect(unreadableCopies()).toEqual([])
  })
})
