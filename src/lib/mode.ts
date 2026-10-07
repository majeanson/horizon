import { useSyncExternalStore } from 'react'

// Simple ↔ Full: how much of the app is shown. A choice about THIS device (like the theme and the text size), not about
// the household, so it lives beside them in localStorage and never in the versioned profile. Nothing is deleted by
// Simple: what it hides is folded behind a visible « Voir les détails » (components/Advanced.tsx).
//
// First launch: a device with no stored choice and no saved profile starts Simple (the short way in); a device that
// already holds a profile starts Full (nothing changes under someone who has been using it). The resolved default is
// written at once, so a first-time visitor who types a profile and reloads does not flip to Full.
export type Mode = 'simple' | 'full'
export const MODE_KEY = 'horizon-mode'
const PROFILE_KEY = 'horizon-profile'

function resolve(): Mode {
  try {
    const stored = localStorage.getItem(MODE_KEY)
    if (stored === 'simple' || stored === 'full') return stored
    const mode: Mode = localStorage.getItem(PROFILE_KEY) === null ? 'simple' : 'full'
    localStorage.setItem(MODE_KEY, mode)
    return mode
  } catch {
    return 'full' // storage blocked: show everything rather than hide it
  }
}

let current: Mode = typeof localStorage === 'undefined' ? 'full' : resolve()
const listeners = new Set<() => void>()

const subscribe = (l: () => void): (() => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const getMode = (): Mode => current

export function setMode(next: Mode): void {
  current = next
  try {
    localStorage.setItem(MODE_KEY, next)
  } catch {
    /* storage blocked — the choice just does not persist */
  }
  for (const l of listeners) l()
}

export const useMode = (): Mode => useSyncExternalStore(subscribe, getMode, getMode)

if (typeof window !== 'undefined') {
  // Another tab switched: follow it.
  window.addEventListener('storage', (e) => {
    if (e.key !== MODE_KEY || (e.newValue !== 'simple' && e.newValue !== 'full') || e.newValue === current) return
    current = e.newValue
    for (const l of listeners) l()
  })
}
