import { useCallback, useRef } from 'react'

// How much of the screen the pinned chrome of the Résultats page covers, MEASURED rather than guessed: the views row
// (`.results-pin`) always sticks under the top bar; the section map (`.section-nav`) sticks under the views row from
// 860 px up and scrolls away on a phone, where every pinned pixel is a pixel of the plan not read. The page's own CSS
// reads the two custom properties set here —
//   --tabs-h  the views row: where the map sticks
//   --pin-h   everything pinned under the top bar: how far a tapped section must stop below it (scroll-margin-top)
// — so the number follows the text size, the language and a wrapped row instead of a hard-coded rem that is right
// only at one of them.
//
//   const pinned = usePinOffset()
//   <section ref={pinned}> … <div className="results-pin">…</div> <SectionNav/> … </section>

const WIDE = '(min-width: 860px)'

export function usePinOffset(): (node: HTMLElement | null) => void {
  const stop = useRef<(() => void) | null>(null)
  return useCallback((node: HTMLElement | null) => {
    stop.current?.()
    stop.current = null
    if (!node) return
    const measure = () => {
      const pin = node.querySelector<HTMLElement>('.results-pin')
      const nav = node.querySelector<HTMLElement>('.section-nav')
      const tabs = pin ? pin.getBoundingClientRect().height : 0
      const navPinned = nav !== null && getComputedStyle(nav).position === 'sticky'
      node.style.setProperty('--tabs-h', `${Math.ceil(tabs)}px`)
      node.style.setProperty('--pin-h', `${Math.ceil(tabs + (navPinned && nav ? nav.getBoundingClientRect().height : 0))}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    for (const el of node.querySelectorAll('.results-pin, .section-nav')) observer.observe(el)
    const media = window.matchMedia(WIDE)
    media.addEventListener('change', measure)
    stop.current = () => {
      observer.disconnect()
      media.removeEventListener('change', measure)
    }
  }, [])
}
