import { useEffect, type RefObject } from 'react'
import { SectionNav, type SectionLink } from './SectionNav'

// The map of a LONG PAGE that also carries « Votre réponse » (Profil, Hypothèses): one chip per block, in the order they are on the page, pinned under the answer strip. The pin's
// offset is MEASURED, not guessed: the answer strip is silent until the profile holds enough, and wraps when it says how far an edit moved it, so the page's `--live-h` follows its
// real height (the map sticks below it, and a tapped block stops below both — styles/revamp.css). Like everything pinned at the top it slides away while the reader scrolls down
// (lib/useHeadroom.ts).
export function PinnedMap({ links, ariaLabel, page }: { links: readonly SectionLink[]; ariaLabel: string; page: RefObject<HTMLElement | null> }) {
  useEffect(() => {
    const root = page.current
    if (!root) return
    const measure = () => {
      const live = root.querySelector<HTMLElement>('.live-answer')
      root.style.setProperty('--live-h', `${live ? Math.ceil(live.getBoundingClientRect().height) : 0}px`)
      const map = root.querySelector<HTMLElement>('.section-nav')
      root.style.setProperty('--map-h', `${map ? Math.ceil(map.getBoundingClientRect().height) : 0}px`)
    }
    measure()
    const resize = new ResizeObserver(measure)
    for (const el of root.querySelectorAll('.live-answer, .section-nav')) resize.observe(el)
    // The answer strip appears (and goes) with the profile's completeness: watch the page's own children for it.
    const mutation = new MutationObserver(() => {
      measure()
      for (const el of root.querySelectorAll('.live-answer')) resize.observe(el)
    })
    mutation.observe(root, { childList: true })
    return () => {
      resize.disconnect()
      mutation.disconnect()
    }
  }, [page])
  return (
    <div className="pinned-map">
      <SectionNav links={links} ariaLabel={ariaLabel} />
    </div>
  )
}
