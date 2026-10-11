import { useEffect, type RefObject } from 'react'
import { useT } from '../../i18n'
import { SectionNav, type SectionLink } from '../SectionNav'

// The map of Profil: one chip per block of the form, in the order they are on the page, pinned under « Votre réponse » (a long page — a couple's is
// twenty screens on a phone — needs a « where am I »). The pin's offset is MEASURED, not guessed: the answer strip is silent until the profile holds
// enough, and wraps when it says how far an edit moved it, so the page's `--live-h` follows its real height (the map sticks below it, and a tapped
// section stops below both — styles/revamp.css).
export function ProfileMap({ people, withHome, withEvents, withExact, page }: { people: ReadonlyArray<{ id: string; name: string }>; withHome: boolean; withEvents: boolean; withExact: boolean; page: RefObject<HTMLElement | null> }) {
  const t = useT()
  const n = t.profile.nav
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
  // The map is for FINDING a block, not for reading beside it: pinned, it took a fifth of a phone's height under the answer strip. It slides away while the reader scrolls down
  // (a hand on the screen, the wheel or a key — never the page's own scroll, so a tap on a chip does not hide it) and comes back at the first move up or at the top.
  useEffect(() => {
    const root = document.getElementById('root')
    const nav = page.current?.querySelector<HTMLElement>('.section-nav')
    if (!root || !nav) return
    let last = root.scrollTop
    let gesture = 0
    const mark = () => {
      gesture = Date.now()
    }
    const onScroll = () => {
      const y = root.scrollTop
      const dy = y - last
      last = y
      if (Date.now() - gesture > 250) return
      if (y < 160 || dy < -6) nav.removeAttribute('data-away')
      else if (dy > 6) nav.setAttribute('data-away', '')
    }
    const gestures = ['wheel', 'touchmove', 'keydown'] as const
    for (const ev of gestures) root.addEventListener(ev, mark, { passive: true })
    window.addEventListener('keydown', mark, { passive: true })
    root.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      for (const ev of gestures) root.removeEventListener(ev, mark)
      window.removeEventListener('keydown', mark)
      root.removeEventListener('scroll', onScroll)
    }
  }, [page])
  const links: SectionLink[] = [
    { id: 'famille', label: n.family },
    { id: 'situation', label: n.situation },
    ...people.map((p) => ({ id: `person-${p.id}`, label: p.name })),
    { id: 'budget', label: n.budget },
    ...(withHome ? [{ id: 'maison', label: n.home }] : []),
    ...(withEvents ? [{ id: 'evenements', label: n.events }] : []),
    ...(withExact ? [{ id: 'exact', label: n.exact }] : []),
  ]
  return (
    <div className="profile-map">
      <SectionNav links={links} ariaLabel={n.label} />
    </div>
  )
}
