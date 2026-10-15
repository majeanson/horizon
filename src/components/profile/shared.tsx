import type { ReactNode } from 'react'
import type { Person } from '../../engine/types'
import type { IconName } from '../Icon'
import { useT } from '../../i18n'
import { FAMILY_HUE, type ConceptId, type Family } from '../../lib/concepts'
import { Fold } from '../Fold'
import { SectionHeader } from '../SectionHeader'

// What every section of a person's form receives: the person, and `edit` — « change this person » — which the
// page turns into one store update (lib/profileEdit.ts). A section never touches the store itself.
export interface PersonEditor {
  person: Person
  edit: (change: (person: Person) => Person) => void
}

// The card every section sits in — ONE anatomy, always in this order:
//   1. the title (with its pip),
//   2. `subtitle`: one short sentence saying what the card is for,
//   3. `details`: everything longer (a caveat, a method, where the numbers come from), folded under « En savoir plus »,
//   4. the fields (`children`), each a FieldRow with its ⓘ.
// The section is named by its own title, so a screen reader lists the form by its parts.
// `concept` puts the idea's pip before the title; `family` also draws the family's hue as a rule down the card's edge (the Glossaire's groups).
export function Section({ id, title, subtitle, details, icon, concept, family, children }: { id?: string; title: string; subtitle?: ReactNode; details?: ReactNode; icon?: IconName; concept?: ConceptId; family?: Family; children: ReactNode }) {
  const t = useT()
  return (
    <section id={id} className={'profile-section surface' + (family ? ` fam-rule fam--${FAMILY_HUE[family]}` : '')} aria-label={title}>
      <SectionHeader title={title} subtitle={subtitle} icon={icon} concept={concept} />
      {details != null && (
        <Fold className="profile-section__details" summary={t.common.moreDetails}>
          {details}
        </Fold>
      )}
      <div className="profile-section__body">{children}</div>
    </section>
  )
}
