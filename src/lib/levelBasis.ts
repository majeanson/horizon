import { useSyncExternalStore } from 'react'
import type { RetiredBasis } from './levels.ts'

// How the retirement budget is set when a level fills it (lib/levels.ts RetiredBasis): the observed drop, or a cautious one. A choice about HOW to estimate,
// not a profile figure — kept on this device under its own key, so the picker, the helper under a figure and the range on the results page all agree.

const KEY = 'horizon-level-basis'
const listeners = new Set<() => void>()

function read(): RetiredBasis {
  try {
    return localStorage.getItem(KEY) === 'cautious' ? 'cautious' : 'observed'
  } catch {
    return 'observed'
  }
}

let memory: RetiredBasis | null = null
const get = (): RetiredBasis => memory ?? read()

export function setBasis(next: RetiredBasis): void {
  memory = next
  try {
    localStorage.setItem(KEY, next)
  } catch {
    /* nothing kept: the choice lives until the page closes */
  }
  listeners.forEach((l) => l())
}

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export const useBasis = (): RetiredBasis => useSyncExternalStore(subscribe, get, get)
