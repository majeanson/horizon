import { useSyncExternalStore } from 'react'
import { scrollBehavior } from './motion'

// WHICH FIELD THE GUIDE IS ON. The step-by-step guide walks the real form, one figure at a time: this is the one fact it is
// pointing at right now (an id from lib/facts.ts), or null when no guide is open. A field that carries that id lights up and the
// page scrolls to it. It lives apart from the profile on purpose — where the guide is standing is never saved, never exported.

let current: string | null = null
const listeners = new Set<() => void>()

export const getGuided = (): string | null => current
export const setGuided = (id: string | null): void => {
  if (id === current) return
  current = id
  listeners.forEach((l) => l())
}
const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}
export const useGuided = (): string | null => useSyncExternalStore(subscribe, getGuided, getGuided)

/** Bring a figure's field on screen — centred, unless it is a tall block (the earnings list): then its TOP, where its header and its mark are. */
export function bringIntoView(id: string): void {
  const el = document.querySelector(`[data-fact="${id}"]`)
  if (!el) return
  const tall = el.getBoundingClientRect().height > window.innerHeight * 0.4
  el.scrollIntoView({ behavior: scrollBehavior(), block: tall ? 'start' : 'center' })
}
