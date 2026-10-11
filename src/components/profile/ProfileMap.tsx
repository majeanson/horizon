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
