import { useSyncExternalStore } from 'react'
import { readProfileJson } from './migrations.ts'
import { defaultProfile, type Profile } from './schema.ts'
import { today } from './today.ts'

// THE ONE PLACE A PROFILE LIVES. In memory it is a single immutable object that components read through
// `useProfile()`; on this device it is one localStorage entry, written a moment after the last edit and again
// the instant the page is hidden. Nothing here touches a network — a profile leaves the device only when its
// owner exports it (lib/noNetwork.test.ts holds that line).
//
// A profile that cannot be read is NEVER silently thrown away: the unreadable text is copied to a second key
// before a blank profile takes its place, and the Données page says so.

const KEY = 'horizon-profile'
const UNREADABLE_KEY = 'horizon-profile-unreadable'
const SAVE_DELAY_MS = 250

export type StorageIssue = 'unavailable' | 'unreadable' | null

let issue: StorageIssue = null
let current: Profile = load()
let timer: ReturnType<typeof setTimeout> | undefined
const listeners = new Set<() => void>()

function load(): Profile {
  let text: string | null
  try {
    text = localStorage.getItem(KEY)
  } catch {
    issue = 'unavailable'
    return defaultProfile(today())
  }
  if (text === null) return defaultProfile(today())
  const result = readProfileJson(text)
  if (result.ok) return result.profile
  try {
    localStorage.setItem(UNREADABLE_KEY, text)
  } catch {
    /* nothing more to do: the blank profile below is still honest about it */
  }
  issue = 'unreadable'
  return defaultProfile(today())
}

function notify(): void {
  for (const l of listeners) l()
}

function save(): void {
  timer = undefined
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
    if (issue === 'unavailable') {
      issue = null
      notify()
    }
  } catch {
    if (issue !== 'unavailable') {
      issue = 'unavailable'
      notify()
    }
  }
}

/** Write now, if a write is pending. Called when the page is hidden and by tests. */
export function flushProfile(): void {
  if (timer !== undefined) {
    clearTimeout(timer)
    save()
  }
}

export const getProfile = (): Profile => current
export const getStorageIssue = (): StorageIssue => issue

function subscribe(l: () => void): () => void {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const useProfile = (): Profile => useSyncExternalStore(subscribe, getProfile, getProfile)
export const useStorageIssue = (): StorageIssue => useSyncExternalStore(subscribe, getStorageIssue, getStorageIssue)

/** Replace the profile (an import, the example, a reset). Saved immediately: these are deliberate acts. */
export function replaceProfile(next: Profile): void {
  current = next
  if (timer !== undefined) clearTimeout(timer)
  save()
  notify()
}

/** Change the profile. `change` gets the current one and returns the next — never mutate in place. */
export function updateProfile(change: (p: Profile) => Profile): void {
  const next = change(current)
  if (next === current) return
  current = next
  if (timer !== undefined) clearTimeout(timer)
  timer = setTimeout(save, SAVE_DELAY_MS)
  notify()
}

/** Forget everything on this device: the profile and the unreadable copy. */
export function clearProfile(): void {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(UNREADABLE_KEY)
  } catch {
    /* storage unavailable: there is nothing stored to clear */
  }
  if (timer !== undefined) clearTimeout(timer)
  timer = undefined
  issue = null
  current = defaultProfile(today())
  notify()
}

/** Re-read storage (another tab saved, or a test seeded it). */
export function reloadProfile(): void {
  issue = null
  current = load()
  notify()
}

export const exportProfileJson = (p: Profile): string => JSON.stringify(p, null, 2) + '\n'
export const exportFileName = (): string => `horizon-${new Date().toISOString().slice(0, 10)}.json`

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushProfile)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushProfile()
  })
  // Another tab saved: take its profile rather than overwrite it with a stale one on the next edit.
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) reloadProfile()
  })
}
