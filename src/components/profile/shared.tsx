import type { ReactNode } from 'react'
import type { Person } from '../../engine/types'
import type { IconName } from '../Icon'
import { FAMILY_HUE, type ConceptId, type Family } from '../../lib/concepts'
import { SectionHeader } from '../SectionHeader'

// What every section of a person's form receives: the person, and `edit` — « change this person » — which the
// page turns into one store update (lib/profileEdit.ts). A section never touches the store itself.
export interface PersonEditor {
  person: Person
  edit: (change: (person: Person) => Person) => void
}

// The card every section sits in: a header, then the fields. The section is named by its own title, so a
// screen reader lists the form by its parts.
// `concept` puts the idea's pip before the title; `family` also draws the family's hue as a rule down the card's edge (the Glossaire's groups).
export function Section({ id, title, subtitle, icon, concept, family, children }: { id?: string; title: string; subtitle?: ReactNode; icon?: IconName; concept?: ConceptId; family?: Family; children: ReactNode }) {
  return (
    <section id={id} className={'profile-section surface' + (family ? ` fam-rule fam--${FAMILY_HUE[family]}` : '')} aria-label={title}>
      <SectionHeader title={title} subtitle={subtitle} icon={icon} concept={concept} />
      <div className="profile-section__body">{children}</div>
    </section>
  )
}
