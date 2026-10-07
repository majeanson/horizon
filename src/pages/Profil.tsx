import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AboutSection } from '../components/profile/AboutSection'
import { FamilySection } from '../components/profile/FamilySection'
import { AccountsSection, OasSection } from '../components/profile/OasAccountsSections'
import { PensionPlans } from '../components/profile/PensionPlans'
import { RrqSection } from '../components/profile/RrqSection'
import { Cluster } from '../components/Layout'
import { NextStep } from '../components/NextStep'
import { PageHead } from '../components/PageHead'
import type { PersonId } from '../engine/types'
import { useT } from '../i18n'
import { hasSpouse, mapPerson } from '../lib/profileEdit'
import { profileGaps } from '../lib/profileGaps'
import { updateProfile, useProfile } from '../lib/store'

// The profile: the household, then EVERY person's fields on the page — side by side on a wide
// screen, one after the other on a phone. Nothing sits behind a tab. Every field writes straight
// to the store through lib/profileEdit.ts; there is no « save » — a profile is always as typed.
export function Profil() {
  const t = useT()
  const profile = useProfile()
  const [params, setParams] = useSearchParams()
  const spouse = hasSpouse(profile)
  const gaps = profileGaps(profile)

  // Old deep links named one person (`?person=spouse`); both are on the page now, so the link
  // becomes a scroll to that column, and the key is dropped from the address.
  const linked = params.get('person')
  useEffect(() => {
    if (linked === null) return
    document.getElementById(linked === 'spouse' && spouse ? 'person-spouse' : 'person-self')?.scrollIntoView({ block: 'start' })
    setParams(
      () => {
        const next = new URLSearchParams(window.location.search)
        next.delete('person')
        return next
      },
      { replace: true },
    )
  }, [linked, spouse, setParams])

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
            <button type="button" className="btn btn--sm" onClick={() => document.getElementById('person-self')?.scrollIntoView({ block: 'start' })}>
              {t.profile.welcome.start}
            </button>
            <Link className="btn btn--sm btn--ghost" to="/donnees">
              {t.profile.welcome.example}
            </Link>
          </Cluster>
        </aside>
      )}
      <FamilySection />
      <div className={'persons' + (spouse ? ' persons--two' : '')}>
        {profile.household.persons.map((p, i) => {
          const name = p.name.trim() || (i === 0 ? t.profile.self : t.profile.spouse)
          return (
            // Keyed by person: a removed spouse unmounts, so no typed-but-uncommitted text crosses over.
            <section key={p.id} id={`person-${p.id}`} className="person" aria-label={name}>
              {spouse && <h2 className="person__title">{name}</h2>}
              <PersonFields id={p.id} />
            </section>
          )
        })}
      </div>
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
