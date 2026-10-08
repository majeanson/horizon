import { useSyncExternalStore } from 'react'
import { readProfileJson } from './migrations.ts'
import { defaultProfile, validateProfile, type Profile } from './schema.ts'
import { today } from './today.ts'

// THE ONE PLACE A PROFILE LIVES. In memory it is a single immutable object that components read through
// `useProfile()`; on this device it is one localStorage entry, written a moment after the last edit and again
// the instant the page is hidden. Nothing here touches a network — a profile leaves the device only when its
// owner exports it (lib/noNetwork.test.ts holds that line).
//
// A profile that cannot be read is NEVER silently thrown away: the unreadable text is copied to a second key
// before a blank profile takes its place (the copy it displaces is kept one generation back), and the Données page
// hands both back as a download. And a profile is never WRITTEN unless it would read back: `save()` checks it against
// the schema first, because a stored profile the schema refuses is blanked at the next launch.

const KEY = 'horizon-profile'
const UNREADABLE_KEY = 'horizon-profile-unreadable'
const UNREADABLE_OLDER_KEY = 'horizon-profile-unreadable-older'
const SAVE_DELAY_MS = 250

/**
 * What the store has to tell the person, if anything:
 *   unavailable · this browser does not keep data (private browsing, a full disk)
 *   unreadable  · the stored profile could not be read; a blank one was loaded, a copy is kept
 *   newer       · the stored profile was written by a LATER version of the app; same, and the message says so
 *   unsaved     · the profile on screen would not read back (a figure outside its limits): it was NOT written
 *   conflict    · another tab saved while this one had an edit pending; the other tab's profile was taken
 */
export type StorageIssue = 'unavailable' | 'unreadable' | 'newer' | 'unsaved' | 'conflict' | null

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
    // A second unreadable profile must not erase the first one's copy: that one may never have been rescued.
    const earlier = localStorage.getItem(UNREADABLE_KEY)
    if (earlier !== null && earlier !== text) localStorage.setItem(UNREADABLE_OLDER_KEY, earlier)
    localStorage.setItem(UNREADABLE_KEY, text)
  } catch {
    /* nothing more to do: the blank profile below is still honest about it */
  }
  issue = result.reason === 'newer' ? 'newer' : 'unreadable'
  return defaultProfile(today())
}

/** The unreadable profile(s) kept on this device, newest first — what « télécharger la copie illisible » hands back. */
export function unreadableCopies(): string[] {
  try {
    return [localStorage.getItem(UNREADABLE_KEY), localStorage.getItem(UNREADABLE_OLDER_KEY)].filter((t): t is string => t !== null)
  } catch {
    return []
  }
}

function notify(): void {
  for (const l of listeners) l()
}

function save(): void {
  timer = undefined
  // NEVER WRITE WHAT WOULD NOT READ BACK. A profile with a figure outside the schema's limits saved fine and blanked the
  // whole plan at the next launch. The pages hold the same limits at the keyboard (numberFieldBounds.test.ts); this is
  // the net under them, so an edit that slips past them costs one unsaved figure, not the household's plan.
  const check = validateProfile(current)
  if (!check.ok) {
    console.error('[horizon] not saved — the profile would not read back:', check.problems.map((p) => `${p.path} (${p.problem})`).join(', '))
    if (issue !== 'unsaved') {
      issue = 'unsaved'
      notify()
    }
    return
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
    noteUnbackedEdit()
    if (issue === 'unavailable' || issue === 'unsaved' || issue === 'conflict') {
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

// THE BACKUP NUDGE. The device's copy is the only copy: « clear site data », a private window or a browser's idle-site
// eviction takes it with no warning. Two small stamps (their own keys — the schema is untouched) say when the OLDEST
// edit not yet exported was made; past BACKUP_AFTER_MS the shell asks for an export. The first successful save also asks
// the browser to treat the storage as durable, which spares it the idle-site eviction.
const UNBACKED_KEY = 'horizon-unbacked-since'
const BACKUP_AFTER_MS = 30 * 24 * 3600 * 1000
let persistAsked = false

function noteUnbackedEdit(): void {
  try {
    if (localStorage.getItem(UNBACKED_KEY) === null) localStorage.setItem(UNBACKED_KEY, String(Date.now()))
    if (!persistAsked) {
      persistAsked = true
      void navigator.storage?.persist?.().catch(() => undefined)
    }
  } catch {
    /* a browser that keeps nothing cannot be nudged either; the 'unavailable' notice already says so */
  }
}

/** Called when a profile file has just been handed to its owner. */
export function markExported(): void {
  try {
    localStorage.removeItem(UNBACKED_KEY)
  } catch {
    /* see noteUnbackedEdit */
  }
  notify()
}

export function backupDue(): boolean {
  try {
    const since = Number(localStorage.getItem(UNBACKED_KEY))
    return since > 0 && Date.now() - since > BACKUP_AFTER_MS
  } catch {
    return false
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
export const useBackupDue = (): boolean => useSyncExternalStore(subscribe, backupDue, backupDue)
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

/** Forget everything on this device: the profile and the unreadable copies. */
export function clearProfile(): void {
  try {
    localStorage.removeItem(KEY)
    localStorage.removeItem(UNREADABLE_KEY)
    localStorage.removeItem(UNREADABLE_OLDER_KEY)
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
  // Another tab saved: take its profile rather than overwrite it with a stale one on the next edit. If THIS tab had an
  // edit waiting to be written (the 250 ms window), that edit is the one that loses — say so, instead of dropping it.
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY) return
    const hadPendingEdit = timer !== undefined
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
    reloadProfile()
    if (hadPendingEdit) {
      issue = 'conflict'
      notify()
    }
  })
}
