import type { ReactNode } from 'react'
import type { Person } from '../../engine/types'
import type { IconName } from '../Icon'
import { SectionHeader } from '../SectionHeader'

// What every section of a person's form receives: the person, and `edit` — « change this person » — which the
// page turns into one store update (lib/profileEdit.ts). A section never touches the store itself.
export interface PersonEditor {
  person: Person
  edit: (change: (person: Person) => Person) => void
}

// The card every section sits in: a header, then the fields. The section is named by its own title, so a
// screen reader lists the form by its parts.
export function Section({ title, subtitle, icon, children }: { title: string; subtitle?: ReactNode; icon?: IconName; children: ReactNode }) {
  return (
    <section className="profile-section surface" aria-label={title}>
      <SectionHeader title={title} subtitle={subtitle} icon={icon} />
      <div className="profile-section__body">{children}</div>
    </section>
  )
}
