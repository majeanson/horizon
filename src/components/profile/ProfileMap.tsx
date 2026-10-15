import type { RefObject } from 'react'
import { useT } from '../../i18n'
import { PinnedMap } from '../PinnedMap'
import type { SectionLink } from '../SectionNav'

// The map of Profil: one chip per block of the form, in the order they are on the page (a couple's profile is twenty screens on a phone and needs a « where am I »).
export function ProfileMap({ people, withHome, withEvents, withExact, page }: { people: ReadonlyArray<{ id: string; name: string }>; withHome: boolean; withEvents: boolean; withExact: boolean; page: RefObject<HTMLElement | null> }) {
  const t = useT()
  const n = t.profile.nav
  const links: SectionLink[] = [
    { id: 'famille', label: n.family, concept: 'famille' },
    ...people.map((p) => ({ id: `person-${p.id}`, label: p.name, concept: 'personne' as const })),
    { id: 'budget', label: n.budget, concept: 'budget' },
    ...(withHome ? [{ id: 'maison', label: n.home, concept: 'maison' as const }] : []),
    ...(withEvents ? [{ id: 'evenements', label: n.events, concept: 'evenements' as const }] : []),
    ...(withExact ? [{ id: 'exact', label: n.exact, concept: 'documents' as const }] : []),
  ]
  return <PinnedMap links={links} ariaLabel={n.label} page={page} />
}
