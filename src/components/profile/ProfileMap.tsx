import type { RefObject } from 'react'
import { useT } from '../../i18n'
import { PinnedMap } from '../PinnedMap'
import type { SectionLink } from '../SectionNav'

// The map of Profil: one chip per block of the form, in the order they are on the page (a couple's profile is twenty screens on a phone and needs a « where am I »).
export function ProfileMap({ people, withHome, withEvents, withExact, page }: { people: ReadonlyArray<{ id: string; name: string }>; withHome: boolean; withEvents: boolean; withExact: boolean; page: RefObject<HTMLElement | null> }) {
  const t = useT()
  const n = t.profile.nav
  const links: SectionLink[] = [
    { id: 'famille', label: n.family },
    ...people.map((p) => ({ id: `person-${p.id}`, label: p.name })),
    { id: 'budget', label: n.budget },
    ...(withHome ? [{ id: 'maison', label: n.home }] : []),
    ...(withEvents ? [{ id: 'evenements', label: n.events }] : []),
    ...(withExact ? [{ id: 'exact', label: n.exact }] : []),
  ]
  return <PinnedMap links={links} ariaLabel={n.label} page={page} />
}
