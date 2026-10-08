import { lazy, Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AboutSection } from '../components/profile/AboutSection'
import { HomeSection } from '../components/profile/HomeSection'
import { FamilySection } from '../components/profile/FamilySection'
import { AccountsSection, OasSection } from '../components/profile/OasAccountsSections'
import { PensionPlans } from '../components/profile/PensionPlans'
import { RrqSection } from '../components/profile/RrqSection'
import { Loading } from '../components/Loading'
import { NextStep } from '../components/NextStep'
import { PageHead } from '../components/PageHead'
import { SectionLevel } from '../components/SectionHeader'
import type { PersonId } from '../engine/types'
import { useT } from '../i18n'
import { hasSpouse, mapPerson } from '../lib/profileEdit'
import { profileGaps } from '../lib/profileGaps'
import { updateProfile, useProfile } from '../lib/store'

const AccuracyGuide = lazy(() => import('../components/profile/AccuracyGuide'))
const Onboarding = lazy(() => import('../components/Onboarding'))

// The profile: the household, then EVERY person's fields on the page — side by side on a wide
// screen, one after the other on a phone. Nothing sits behind a tab. Every field writes straight
// to the store through lib/profileEdit.ts; there is no « save » — a profile is always as typed.
export function Profil() {
  const t = useT()
  const profile = useProfile()
  const [params, setParams] = useSearchParams()
  const spouse = hasSpouse(profile)
  const gaps = profileGaps(profile)
  // The welcome card's fate is decided at arrival: a first visit keeps it for the WHOLE visit, so
  // committing the last number (Enter or blur — possibly in a field inside the card) swaps its
  // content to « c'est assez » instead of yanking the card, and the focus with it, out of the page.
  const [welcome] = useState(gaps.length > 0)

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

  // First visit: a blank form is a wall. The page IS one question at a time (components/Onboarding.tsx) until the person finishes it or
  // asks for the full form (`?form=1`, which the path writes and a link can carry). Decided at arrival, like the card it replaces: a
  // person who types the last number is not yanked out from under their finger — the path itself says when it is enough.
  if (welcome && params.get('form') !== '1') {
    return (
      <section className="page-body">
        <PageHead title={t.profile.welcome.title} />
        <Suspense fallback={<Loading />}>
          <Onboarding
            onSkip={() =>
              setParams(
                () => {
                  const next = new URLSearchParams(window.location.search)
                  next.set('form', '1')
                  return next
                },
                { replace: true },
              )
            }
          />
        </Suspense>
      </section>
    )
  }

  return (
    <section className="page-body">
      <PageHead title={t.profile.title} subtitle={t.profile.subtitle} />
      {/* « Rendre mon profil exact »: the meter, the documents and the guide — loaded on its own, the form never waits for it. */}
      <Suspense fallback={null}>
        <AccuracyGuide />
      </Suspense>
      <FamilySection />
      <HomeSection />
      <div className={'persons' + (spouse ? ' persons--two persons--aligned' : '')}>
        {profile.household.persons.map((p, i) => {
          const name = p.name.trim() || (i === 0 ? t.profile.self : t.profile.spouse)
          return (
            // Keyed by person: a removed spouse unmounts, so no typed-but-uncommitted text crosses over.
            <section key={p.id} id={`person-${p.id}`} className={`person who who--${Math.min(i, 1)}`} aria-label={name}>
              <h2 className="person__title">{name}</h2>
              <SectionLevel.Provider value={3}>
                <PersonFields id={p.id} />
              </SectionLevel.Provider>
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
