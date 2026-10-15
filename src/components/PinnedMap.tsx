import { useEffect, type RefObject } from 'react'
import { SectionNav, type SectionLink } from './SectionNav'

// The map of a LONG PAGE (Profil, Hypothèses): one chip per block, in the order they are on the page, pinned under the top bar. Its height is MEASURED, not
// guessed: the chips wrap on a narrow screen, so the page's `--map-h` follows the map's real height (a tapped block stops below it — styles/revamp.css). Like
// everything pinned at the top it slides away while the reader scrolls down (lib/useHeadroom.ts).
export function PinnedMap({ links, ariaLabel, page }: { links: readonly SectionLink[]; ariaLabel: string; page: RefObject<HTMLElement | null> }) {
  useEffect(() => {
    const root = page.current
    if (!root) return
    const measure = () => {
      const map = root.querySelector<HTMLElement>('.section-nav')
      root.style.setProperty('--map-h', `${map ? Math.ceil(map.getBoundingClientRect().height) : 0}px`)
    }
    measure()
    const resize = new ResizeObserver(measure)
    for (const el of root.querySelectorAll('.section-nav')) resize.observe(el)
    return () => resize.disconnect()
  }, [page])
  return (
    <div className="pinned-map">
      <SectionNav links={links} ariaLabel={ariaLabel} />
    </div>
  )
}
