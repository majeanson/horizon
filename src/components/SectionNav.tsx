import { Fragment, useEffect, useRef, useState } from 'react'
import { scrollToSection } from '../lib/motion'
import { Chip } from './Chip'
import { Rail } from './Layout'

// The map of a long page: one chip per section, in reading order, in a sticky Rail under the top
// bar. A tap scrolls to the section (the page keeps its address — nothing to bookmark here, the
// sections are always on the page); the chip of the section in view is marked `aria-current` (a
// location, not a toggle). Mouse, touch and keyboard all work: the chips are buttons, and the map is ONE LINE that scrolls sideways on a narrow
// screen (as the view tabs do), with the soft edge fade saying there is more — four wrapped lines of chips ate a phone's first screen. The chip of the
// section in view is brought into the line as the page scrolls, so « where am I » is always on screen.

export interface SectionLink {
  id: string
  label: string
  /** Opens a new group in the map: a quiet label drawn before this chip (the page's story arcs). */
  arc?: string
}

export function SectionNav({ links, ariaLabel }: { links: readonly SectionLink[]; ariaLabel: string }) {
  const [inView, setInView] = useState<string | null>(null)
  const ids = links.map((l) => l.id).join('|')
  const nav = useRef<HTMLElement>(null)

  useEffect(() => {
    // The marked chip is the topmost section currently on screen — watched, not computed on scroll.
    const seen = new Map<string, boolean>()
    const order = ids.split('|')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting)
        setInView(order.find((id) => seen.get(id)) ?? null)
      },
      { rootMargin: '-15% 0px -60% 0px' },
    )
    for (const id of order) {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [ids])

  // Keep the marked chip inside the line — SIDEWAYS INSIDE THE LINE ONLY: `scrollIntoView` would scroll every ancestor too, the page included.
  useEffect(() => {
    const rail = nav.current?.querySelector<HTMLElement>('.rail')
    const chip = rail?.querySelector<HTMLElement>('[aria-current]')
    if (!rail || !chip) return
    const c = chip.getBoundingClientRect()
    const box = rail.getBoundingClientRect()
    if (c.left < box.left || c.right > box.right) rail.scrollTo({ left: Math.max(0, rail.scrollLeft + (c.left - box.left) - (box.width - c.width) / 2) })
  }, [inView])

  return (
    <nav ref={nav} className="section-nav" aria-label={ariaLabel}>
      <Rail>
        {links.map((l) => (
          <Fragment key={l.id}>
            {l.arc != null && (
              // Plain text, NOT aria-hidden: the grouping is wayfinding for a screen-reader user too.
              <span className="section-nav__arc mono">{l.arc}</span>
            )}
            <Chip current={inView === l.id} onClick={() => scrollToSection(l.id)}>
              {l.label}
            </Chip>
          </Fragment>
        ))}
      </Rail>
    </nav>
  )
}
