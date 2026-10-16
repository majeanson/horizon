import type { ReactNode } from 'react'
import type { Person } from '../../engine/types'
import type { IconName } from '../Icon'
import type { ConceptId, Family } from '../../lib/concepts'
import { AccordionItem } from '../Accordion'

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
// The card is drawn by components/Accordion.tsx `AccordionItem`: on a page that reads its blocks one at a time (an `Accordion` around them, this
// section's `id` among its blocks) the same card closes to its title and opens on a tap; anywhere else it is the plain card it always was.
export function Section({ id, title, subtitle, details, icon, concept, family, children }: { id?: string; title: string; subtitle?: ReactNode; details?: ReactNode; icon?: IconName; concept?: ConceptId; family?: Family; children: ReactNode }) {
  return (
    <AccordionItem id={id ?? ''} title={title} subtitle={subtitle} details={details} icon={icon} concept={concept} family={family}>
      {children}
    </AccordionItem>
  )
}
