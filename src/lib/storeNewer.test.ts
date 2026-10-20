import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { savePlan } from './profileEdit.ts'
import { defaultProfile, SCHEMA_VERSION } from './schema.ts'
import { flushProfile, getStorageIssue, noteDroppedPlans, reloadProfile, replaceProfile, unreadableCopies, updateProfile } from './store.ts'

// A PROFILE THIS BUILD CANNOT READ IS NEVER WRITTEN OVER BY AN EDIT. Two tabs on either side of a schema change: the older one reads the newer file as
// « newer », shows a blank profile and says so. It used to SAVE that blank profile over the real one at the first edit — and every save from the newer
// tab re-ran its load, rotating the two rescue slots until the real profile was gone from every key.

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
const KEY = 'horizon-profile'
const TODAY = { year: 2026 }
/** A file a later version wrote: one version ahead, its own figures. */
const newerFile = (salary: number) => JSON.stringify({ ...defaultProfile(TODAY), version: SCHEMA_VERSION + 1, household: { ...defaultProfile(TODAY).household, persons: [{ ...defaultProfile(TODAY).household.persons[0], salaryToday: salary }] } })
const edit = () => {
  updateProfile((p) => ({ ...p, household: { ...p.household, spending: { ...p.household.spending, workingToday: 12_345 } } }))
  flushProfile()
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

describe('a stored profile from a newer version of the app', () => {
  it('is never written over by an edit: the file stays the newer one, and the notice stays', () => {
    const real = newerFile(91_000)
    mem.data.set(KEY, real)
    reloadProfile()
    expect(getStorageIssue()).toBe('newer')
    edit()
    expect(mem.data.get(KEY)).toBe(real)
    expect(getStorageIssue()).toBe('newer')
  })

  it('a deliberate replace (an import, the example, a reset) does take its place — and the notice is resolved', () => {
    mem.data.set(KEY, newerFile(91_000))
    reloadProfile()
    replaceProfile(defaultProfile(TODAY))
    expect(JSON.parse(mem.data.get(KEY)!).version).toBe(SCHEMA_VERSION)
    expect(getStorageIssue()).toBeNull()
  })

  it('saves from the newer tab do not rotate the rescue copies: an older rescued copy is never pushed out', () => {
    mem.data.set('horizon-profile-unreadable', 'an older unreadable profile, not yet rescued')
    mem.data.set(KEY, newerFile(91_000))
    reloadProfile() // this tab's own first read: the newer file is copied once
    for (const salary of [92_000, 93_000, 94_000]) {
      mem.data.set(KEY, newerFile(salary))
      reloadProfile(true) // the storage event a save in the other tab fires
    }
    expect(unreadableCopies()).toEqual([newerFile(91_000), 'an older unreadable profile, not yet rescued'])
  })
})

describe('an imported file that leaves a named plan out', () => {
  it('is kept for rescue and SAID — the same notice as at a load', () => {
    const text = JSON.stringify(savePlan(defaultProfile(TODAY), 'Prudent'))
    noteDroppedPlans(text)
    expect(getStorageIssue()).toBe('planDropped')
    expect(unreadableCopies()[0]).toBe(text)
  })
})
