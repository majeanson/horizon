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

/** Where the page's own pinned chrome ends: the lowest edge of the top bar and of the strips pinned under it (the map, the views). The scroller is #root. */
function pinnedBottom(): number {
  let bottom = 0
  for (const el of document.querySelectorAll<HTMLElement>('.shell__bar, .section-nav, .results-pin')) {
    const r = el.getBoundingClientRect()
    const pos = getComputedStyle(el).position
    if ((pos === 'sticky' || pos === 'fixed') && r.height > 0 && r.top < 240 && r.bottom > bottom) bottom = r.bottom
  }
  return bottom
}

/**
 * Bring a figure's field on screen — into the band that is FREE: below whatever is pinned at the top, above the guide's card at the foot. The card used to cover the very
 * figure it was asking about (the field was « centred » in a window half of which was chrome). Put at the top of the free band, the field reads first and the card, under it,
 * says what to do. A block taller than the band (the earnings list) goes to the top of the band too, where its header and its mark are.
 */
let settling: ReturnType<typeof setTimeout>[] = []

function place(id: string, correcting: boolean): void {
  const el = document.querySelector(`[data-fact="${id}"]`)
  const root = document.getElementById('root')
  if (!el || !root) return
  const delta = el.getBoundingClientRect().top - (pinnedBottom() + 12)
  // A correction only moves a figure that has drifted: the answer strip and the map mount a moment AFTER the first scroll (they wait for the worker) and push the page down.
  if (correcting && Math.abs(delta) < 6) return
  root.scrollTo({ top: root.scrollTop + delta, behavior: correcting ? 'auto' : scrollBehavior() })
}

export function bringIntoView(id: string): void {
  for (const t of settling) clearTimeout(t)
  place(id, false)
  // Once the chrome has settled, put the figure back where it belongs — unless the reader has taken the scroll in hand.
  settling = [900, 2200].map((ms) => setTimeout(() => place(id, true), ms))
  const release = () => {
    for (const t of settling) clearTimeout(t)
  }
  for (const ev of ['wheel', 'touchstart', 'keydown'] as const) window.addEventListener(ev, release, { once: true, passive: true })
}
