import { Fragment, useEffect, useState } from 'react'
import { Chip } from './Chip'
import { Rail } from './Layout'

// The map of a long page: one chip per section, in reading order, in a sticky Rail under the top
// bar. A tap scrolls to the section (the page keeps its address — nothing to bookmark here, the
// sections are always on the page); the chip of the section in view is marked. Mouse, touch and
// keyboard all work: the chips are buttons, and the Rail scrolls sideways on a phone.

export interface SectionLink {
  id: string
  label: string
  /** Opens a new group in the map: a quiet label drawn before this chip (the page's story arcs). */
  arc?: string
}

export function SectionNav({ links, ariaLabel }: { links: readonly SectionLink[]; ariaLabel: string }) {
  const [inView, setInView] = useState<string | null>(null)
  const ids = links.map((l) => l.id).join('|')

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

  return (
    <nav className="section-nav" aria-label={ariaLabel}>
      <Rail>
        {links.map((l) => (
          <Fragment key={l.id}>
            {l.arc != null && (
              <span className="section-nav__arc mono" aria-hidden="true">
                {l.arc}
              </span>
            )}
            <Chip selected={inView === l.id} onClick={() => document.getElementById(l.id)?.scrollIntoView({ block: 'start' })}>
              {l.label}
            </Chip>
          </Fragment>
        ))}
      </Rail>
    </nav>
  )
}
