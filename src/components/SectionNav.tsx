import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { scrollToSection } from '../lib/motion'
import { Chip } from './Chip'
import { Icon } from './Icon'
import type { Progress } from '../lib/mapProgress'
import type { ConceptId } from '../lib/concepts'
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
  /** The idea the section is about: its pip leads the chip. */
  concept?: ConceptId
  /** How much of the section's figures is confirmed: a quiet « 3/7 » after the name, a ✓ once all are. Decorative — the page says it in words
   *  (« 3 sur 19 chiffres confirmés »), and the chip keeps its own name for a screen reader and for the specs that find it by name. */
  progress?: Progress
  /** Opens a new group in the map: a quiet label drawn before this chip (the page's story arcs). */
  arc?: string
}

export function SectionNav({
  links,
  ariaLabel,
  onPick,
  celebrate,
  end,
}: {
  links: readonly SectionLink[]
  ariaLabel: string
  /** The page's first answer on this device: the chips' pips pop one after another, once (styles/motion.css). Decoration only. */
  celebrate?: boolean
  /** Called with the section's id BEFORE the scroll: a page whose blocks open one at a time (an accordion) opens the one the chip names, so the landing finds it open. */
  onPick?: (id: string) => void
  /** A small control at the end of the map row, beside the scrolling chips (the accordion's « tout ouvrir » icon). */
  end?: ReactNode
}) {
  const [inView, setInView] = useState<string | null>(null)
  const ids = links.map((l) => l.id).join('|')
  const nav = useRef<HTMLElement>(null)

  useEffect(() => {
    // The marked chip is the LAST section (in reading order) that touches the reading band — watched, not computed on scroll. A tall section still
    // crossing the band from above must not outrank the one the reader just scrolled to or tapped.
    const seen = new Map<string, boolean>()
    const order = ids.split('|')
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(e.target.id, e.isIntersecting)
        setInView([...order].reverse().find((id) => seen.get(id)) ?? null)
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
    <nav ref={nav} className={'section-nav' + (celebrate ? ' is-celebrating' : '')} aria-label={ariaLabel}>
      <Rail>
        {links.map((l) => (
          <Fragment key={l.id}>
            {l.arc != null && (
              // Plain text, NOT aria-hidden: the grouping is wayfinding for a screen-reader user too.
              <span className="section-nav__arc mono">{l.arc}</span>
            )}
            <Chip
              current={inView === l.id}
              concept={l.concept}
              onClick={() => {
                onPick?.(l.id)
                scrollToSection(l.id)
              }}
            >
              {l.label}
              {l.progress && l.progress.total > 0 && (
                // Keyed on the count: it settles anew (styles/motion.css) when a figure is confirmed, and the ✓ lands once the block is complete.
                <span key={`${l.progress.done}/${l.progress.total}`} className={'section-nav__progress' + (l.progress.done === l.progress.total ? ' is-done' : '')} aria-hidden="true">
                  {l.progress.done === l.progress.total ? <Icon name="check-bold" size={14} /> : `${l.progress.done}/${l.progress.total}`}
                </span>
              )}
            </Chip>
          </Fragment>
        ))}
      </Rail>
      {end}
    </nav>
  )
}
