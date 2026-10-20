import type { ReactNode, RefObject } from 'react'
import { useT } from '../../i18n'
import { accuracyOf } from '../../lib/facts'
import { mapProgress, type Progress } from '../../lib/mapProgress'
import { useProfile } from '../../lib/store'
import { useAccordion } from '../Accordion'
import { PinnedMap } from '../PinnedMap'
import type { SectionLink } from '../SectionNav'

// The map of Profil: one chip per block of the form, in the order they are on the page (a couple's profile is twenty screens on a phone and needs a « where am I »).
// Inside the form's accordion (components/Accordion.tsx): a chip opens the block it names — closed on a phone, or a finished block folded away on a wide screen — before scrolling to it.
export function ProfileMap({ people, withHome, withEvents, withExact, page, end }: { people: ReadonlyArray<{ id: string; name: string }>; withHome: boolean; withEvents: boolean; withExact: boolean; page: RefObject<HTMLElement | null>; end?: ReactNode }) {
  const t = useT()
  const n = t.profile.nav
  const acc = useAccordion()
  // Each chip says how much of its block is confirmed: where the gaps are, without scrolling the form.
  // « Rendre exact » counts the whole profile — the same « 3/19 » its block's head wears.
  const profile = useProfile()
  const confirmed = accuracyOf(profile)
  const progress: Record<string, Progress> = { ...mapProgress(profile), exact: { done: confirmed.confirmed, total: confirmed.total } }
  const links: SectionLink[] = [
    { id: 'famille', label: n.family, concept: 'famille' as const },
    ...people.map((p) => ({ id: `person-${p.id}`, label: p.name, concept: 'personne' as const })),
    { id: 'budget', label: n.budget, concept: 'budget' as const },
    ...(withHome ? [{ id: 'maison', label: n.home, concept: 'maison' as const }] : []),
    ...(withEvents ? [{ id: 'evenements', label: n.events, concept: 'evenements' as const }] : []),
    ...(withExact ? [{ id: 'exact', label: n.exact, concept: 'documents' as const }] : []),
  ].map((l): SectionLink => (progress[l.id] ? { ...l, progress: progress[l.id] } : l))
  return <PinnedMap links={links} ariaLabel={n.label} page={page} onPick={acc ? acc.reveal : undefined} end={end} />
}
