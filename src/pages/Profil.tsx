import { useSearchParams } from 'react-router-dom'
import { AboutSection } from '../components/profile/AboutSection'
import { FamilySection } from '../components/profile/FamilySection'
import { AccountsSection, OasSection } from '../components/profile/OasAccountsSections'
import { PensionPlans } from '../components/profile/PensionPlans'
import { RrqSection } from '../components/profile/RrqSection'
import { PageHead } from '../components/PageHead'
import { SubTabs } from '../components/SubTabs'
import type { PersonId } from '../engine/types'
import { useT } from '../i18n'
import { hasSpouse, mapPerson } from '../lib/profileEdit'
import { updateProfile, useProfile } from '../lib/store'

// The profile: the household, then one person at a time (« Moi » / « Conjoint·e », `?person=`). Every field
// writes straight to the store through lib/profileEdit.ts; there is no « save » — a profile is always as typed.
export function Profil() {
  const t = useT()
  const profile = useProfile()
  const [params, setParams] = useSearchParams()
  const spouse = hasSpouse(profile)
  const id: PersonId = spouse && params.get('person') === 'spouse' ? 'spouse' : 'self'
  const person = profile.household.persons.find((x) => x.id === id)

  return (
    <section className="page-body">
      <PageHead title={t.profile.title} subtitle={t.profile.subtitle} />
      <FamilySection />
      {spouse && (
        <SubTabs
          ariaLabel={t.profile.persons}
          value={id}
          onSelect={(key) => setParams(key === 'self' ? {} : { person: key }, { replace: true })}
          options={[
            { key: 'self', label: t.profile.self, icon: 'user-bold' },
            { key: 'spouse', label: t.profile.spouse, icon: 'users-three-bold' },
          ]}
        />
      )}
      {person && (
        // Keyed by person: switching tabs remounts the fields, so no typed-but-uncommitted text crosses over.
        <PersonFields key={id} id={id} />
      )}
    </section>
  )
}

function PersonFields({ id }: { id: PersonId }) {
  const profile = useProfile()
  const person = profile.household.persons.find((x) => x.id === id)!
  const edit = (change: Parameters<typeof mapPerson>[2]) => updateProfile((p) => mapPerson(p, id, change))
  return (
    <>
      <AboutSection person={person} edit={edit} />
      <RrqSection person={person} edit={edit} />
      <OasSection person={person} edit={edit} />
      <AccountsSection person={person} edit={edit} />
      <PensionPlans person={person} edit={edit} />
    </>
  )
}
