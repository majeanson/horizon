import { Link, useSearchParams } from 'react-router-dom'
import { AboutSection } from '../components/profile/AboutSection'
import { FamilySection } from '../components/profile/FamilySection'
import { AccountsSection, OasSection } from '../components/profile/OasAccountsSections'
import { PensionPlans } from '../components/profile/PensionPlans'
import { RrqSection } from '../components/profile/RrqSection'
import { Cluster } from '../components/Layout'
import { NextStep } from '../components/NextStep'
import { PageHead } from '../components/PageHead'
import { SubTabs } from '../components/SubTabs'
import type { PersonId } from '../engine/types'
import { useT } from '../i18n'
import { hasSpouse, mapPerson } from '../lib/profileEdit'
import { profileGaps } from '../lib/profileGaps'
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
  const gaps = profileGaps(profile)

  return (
    <section className="page-body">
      <PageHead title={t.profile.title} subtitle={t.profile.subtitle} />
      {profileGaps(profile).includes('income') && (
        // First visit: a blank form is a wall. Say where to start, and offer a finished example to look at instead.
        <aside className="welcome surface">
          <h2 className="welcome__title">{t.profile.welcome.title}</h2>
          <p className="welcome__body">{t.profile.welcome.body}</p>
          <Cluster>
            {/* The fields the card names sit a screen below it, under « Famille »: take the reader there. Scroll only —
                a tap that asks « where do I start » does not ask for the keyboard. */}
            <button type="button" className="btn btn--sm" onClick={() => document.getElementById('profile-about')?.scrollIntoView({ block: 'start' })}>
              {t.profile.welcome.start}
            </button>
            <Link className="btn btn--sm btn--ghost" to="/donnees">
              {t.profile.welcome.example}
            </Link>
          </Cluster>
        </aside>
      )}
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
      <NextStep to="/hypotheses" label={t.next.toAssumptions}>
        {gaps.length === 0 ? <p>{t.next.profileReady}</p> : <p>{t.results.gaps.lead} {gaps.map((g) => t.results.gaps[g]).join(' ')}</p>}
      </NextStep>
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
