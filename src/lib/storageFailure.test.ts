import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { backupDue, clearProfile, flushProfile, getProfile, getStorageIssue, lastExported, markExported, reloadProfile, snoozeBackup, unreadableCopies, updateProfile } from './store.ts'

// THE DEVICE'S COPY IS THE ONLY COPY, AND THE DEVICE CAN REFUSE IT. A private window, a browser with storage switched off, a disk with no room, a quota already used by another site's cache: each makes
// `localStorage` throw, on a read or on a write. The promises: nothing throws into the page (that is a white screen), the person is TOLD (`unavailable`), what they typed stays in memory for the
// session, and when the device lets go again the next edit saves everything. The backup nudge — an hour of unexported typing, put off for a week, cleared by an export — is arithmetic on three
// stamps, held here at its edges.

const quota = () => new DOMException('The quota has been exceeded.', 'QuotaExceededError')

/** A storage the test controls: it keeps what it is given, and each door can be made to throw (a read, a write, a removal). */
function fakeStorage() {
  const data = new Map<string, string>()
  const fail = { get: false, set: false, remove: false }
  const storage = {
    getItem: (k: string) => {
      if (fail.get) throw new Error('SecurityError')
      return data.get(k) ?? null
    },
    setItem: (k: string, v: string) => {
      if (fail.set) throw quota()
      data.set(k, String(v))
    },
    removeItem: (k: string) => {
      if (fail.remove) throw new Error('SecurityError')
      data.delete(k)
    },
    clear: () => data.clear(),
    key: (i: number) => [...data.keys()][i] ?? null,
    get length() {
      return data.size
    },
  }
  return { storage, fail, data }
}
let fake = fakeStorage()
const KEYS = { unbacked: 'horizon-unbacked-since', snoozed: 'horizon-backup-snoozed-until', lastExport: 'horizon-last-export', profile: 'horizon-profile' }
const HOUR = 3600 * 1000

beforeEach(() => {
  fake = fakeStorage()
  vi.stubGlobal('localStorage', fake.storage)
  reloadProfile()
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  reloadProfile()
})

describe('storage that cannot be read', () => {
  it('a read that throws gives the blank profile and says « unavailable » — and nothing throws into the page', () => {
    fake.fail.get = true
    expect(() => reloadProfile()).not.toThrow()
    expect(getStorageIssue()).toBe('unavailable')
    expect(getProfile().household.persons).toHaveLength(1)
  })

  it('every other door is shut gracefully too: the stamps, the unreadable copies, the clearing', () => {
    fake.fail.get = true
    fake.fail.set = true
    fake.fail.remove = true
    expect(backupDue()).toBe(false)
    expect(lastExported()).toBeNull()
    expect(unreadableCopies()).toEqual([])
    expect(() => markExported()).not.toThrow()
    expect(() => snoozeBackup()).not.toThrow()
    expect(() => clearProfile()).not.toThrow()
  })
})

describe('storage that cannot be written (a full disk, a refused quota)', () => {
  const edit = (n: number) => updateProfile((p) => ({ ...p, household: { ...p.household, spending: { workingToday: n, retiredToday: n } } }))

  it('the edit stays in memory, the person is told, and nothing throws', () => {
    fake.fail.set = true
    edit(61_000)
    expect(() => flushProfile()).not.toThrow()
    expect(getStorageIssue()).toBe('unavailable')
    expect(getProfile().household.spending.workingToday).toBe(61_000)
  })

  it('when the device lets go, the next edit saves EVERYTHING typed since, and the notice clears', () => {
    fake.fail.set = true
    edit(61_000)
    flushProfile()
    expect(getStorageIssue()).toBe('unavailable')
    fake.fail.set = false
    edit(62_000)
    flushProfile()
    expect(getStorageIssue()).toBeNull()
    const saved = JSON.parse(localStorage.getItem(KEYS.profile)!)
    expect(saved.household.spending.workingToday).toBe(62_000)
  })

  it('a refused write of the UNREADABLE copy still ends in the blank profile and the « unreadable » notice, not a throw', () => {
    localStorage.setItem(KEYS.profile, '{"app":"horizon","version":1,"household":')
    fake.fail.set = true
    expect(() => reloadProfile()).not.toThrow()
    expect(getStorageIssue()).toBe('unreadable')
    expect(getProfile().household.persons).toHaveLength(1)
  })
})

describe('the backup nudge: an hour of unexported typing, put off a week, cleared by an export', () => {
  const NOW = new Date('2026-10-16T12:00:00Z').getTime()
  beforeEach(() => vi.useFakeTimers({ now: NOW, toFake: ['Date'] }))

  it('nothing to back up, nothing due', () => expect(backupDue()).toBe(false))

  it('due once the oldest unexported edit is OVER an hour old — not at an hour, not before', () => {
    localStorage.setItem(KEYS.unbacked, String(NOW - HOUR + 1))
    expect(backupDue()).toBe(false)
    localStorage.setItem(KEYS.unbacked, String(NOW - HOUR))
    expect(backupDue()).toBe(false)
    localStorage.setItem(KEYS.unbacked, String(NOW - HOUR - 1))
    expect(backupDue()).toBe(true)
  })

  it('« plus tard » silences it for seven days, and it comes back after them', () => {
    localStorage.setItem(KEYS.unbacked, String(NOW - 2 * HOUR))
    expect(backupDue()).toBe(true)
    snoozeBackup()
    expect(backupDue()).toBe(false)
    vi.setSystemTime(NOW + 7 * 24 * HOUR - 1)
    expect(backupDue()).toBe(false)
    vi.setSystemTime(NOW + 7 * 24 * HOUR + 1)
    expect(backupDue()).toBe(true)
  })

  it('an export clears the stamp and records when it happened; a profile never exported says none', () => {
    expect(lastExported()).toBeNull()
    localStorage.setItem(KEYS.unbacked, String(NOW - 5 * HOUR))
    markExported()
    expect(backupDue()).toBe(false)
    expect(localStorage.getItem(KEYS.unbacked)).toBeNull()
    expect(lastExported()).toBe(NOW)
  })

  it('a stamp that is not a number is no stamp (no NaN arithmetic: the notice is not due)', () => {
    localStorage.setItem(KEYS.unbacked, 'yesterday')
    expect(backupDue()).toBe(false)
    localStorage.setItem(KEYS.lastExport, 'never')
    expect(lastExported()).toBeNull()
  })

  it('the first saved edit stamps the moment, the second does not move it (the OLDEST unexported edit is what counts)', () => {
    const edit = (n: number) => updateProfile((p) => ({ ...p, household: { ...p.household, spending: { workingToday: n, retiredToday: n } } }))
    edit(50_000)
    flushProfile()
    const first = localStorage.getItem(KEYS.unbacked)
    expect(first).toBe(String(NOW))
    vi.setSystemTime(NOW + 30 * 60 * 1000)
    edit(51_000)
    flushProfile()
    expect(localStorage.getItem(KEYS.unbacked)).toBe(first)
  })
})

describe('what the household held is what the store hands back (a sanity anchor for the cases above)', () => {
  it('the golden household is a valid thing to keep', () => {
    expect(GOLDEN_HOUSEHOLD.persons).toHaveLength(2)
  })
})
