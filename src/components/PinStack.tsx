import { useEffect, useRef, type ReactNode } from 'react'

// THE PINNED CHROME OF A PAGE, in one box. Whatever a page keeps pinned under the top bar — the views' tabs, the sections' map, a glossary's chips — lives in ONE `PinStack`, never as
// separate sticky rows: separate rows each stuck, hid and returned by their own rule, and drifted — a row that scrolled with the page slid UNDER one that was pinned, half a row showed
// through, and on the way out two rows travelled different distances (IMG_6812, 2026-10-16). One box has one stuck position, one z-order and one way out: lib/useHeadroom.ts rolls the
// bar and the stack up together as one piece when the reader scrolls down (styles/revamp.css « Headroom »), and unrolls them at the first move up.
//
// Rows inside a stack are plain, in-flow rows (`.results-pin`, `.section-nav` — a `.section-nav` is no longer sticky by itself: a stack makes it so). The stack MEASURES itself into the
// page's `--pin-h` (and `--map-h`), the room a tapped section must leave under the top bar: it follows the text size, the language and a wrapped row instead of a typed rem.
//
//   <PinStack>
//     <div className="results-pin"><SubTabs … /></div>
//     <SectionNav … />
//   </PinStack>
export function PinStack({ children, className }: { children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = box.current
    const page = el?.parentElement
    if (!el || !page) return
    const measure = () => {
      const h = `${Math.ceil(el.getBoundingClientRect().height)}px`
      page.style.setProperty('--pin-h', h)
      page.style.setProperty('--map-h', h)
    }
    measure()
    const watch = new ResizeObserver(measure)
    watch.observe(el)
    return () => {
      watch.disconnect()
      page.style.removeProperty('--pin-h')
      page.style.removeProperty('--map-h')
    }
  }, [])
  return (
    <div ref={box} className={'pin-stack' + (className ? ` ${className}` : '')}>
      {children}
    </div>
  )
}
