import { useEffect, type RefObject } from 'react'

// HEADROOM — the pinned chrome (the top bar, the « Votre réponse » strip, the views' tabs, the sections' map) is for FINDING and CHANGING things, not for reading beside: pinned all the
// time, on a phone, it left a third of the screen to the page. It slides away while the reader scrolls DOWN and comes back at the first move UP (and at the top, and when a key
// focuses something inside it). The bottom navigation stays: it is where the thumb is.
//
// Only the READER'S scrolling counts. The page scrolls by itself too — a tap on a map chip, the figure guide, a deep link — and that must never hide the chrome the reader just
// used. So a scroll counts only when a gesture made it: a finger dragging (and the momentum that follows it), the wheel, or a key that scrolls. A tap has no drag; Enter on a chip is not a
// scrolling key. The state is one attribute on the shell (`data-away`); the CSS (styles/revamp.css) does the sliding.

const SCROLL_KEYS = new Set(['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '])
/** How long after the last drag or wheel tick a scroll is still the reader's (the momentum of a flick). */
const MOMENTUM_MS = 900
/** A move shorter than this is not a direction (a bounce, a sub-pixel settle). */
const MOVE = 6
/** The chrome is always shown this close to the top of the page. */
const TOP = 80

export function useHeadroom(shell: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const root = document.getElementById('root')
    const el = shell.current
    if (!root || !el) return
    let last = root.scrollTop
    let gesture = 0
    const mark = () => {
      gesture = Date.now()
    }
    const onKey = (e: KeyboardEvent) => {
      if (SCROLL_KEYS.has(e.key) && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) mark()
    }
    const onScroll = () => {
      const y = root.scrollTop
      const dy = y - last
      last = y
      if (y < TOP) return el.removeAttribute('data-away')
      if (Date.now() - gesture > MOMENTUM_MS) return
      if (dy > MOVE) el.setAttribute('data-away', '')
      else if (dy < -MOVE) el.removeAttribute('data-away')
    }
    root.addEventListener('wheel', mark, { passive: true })
    root.addEventListener('touchmove', mark, { passive: true })
    window.addEventListener('keydown', onKey, { passive: true })
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      root.removeEventListener('wheel', mark)
      root.removeEventListener('touchmove', mark)
      window.removeEventListener('keydown', onKey)
      root.removeEventListener('scroll', onScroll)
      el.removeAttribute('data-away')
    }
  }, [shell])
}
