import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AboutSection } from '../components/profile/AboutSection'
import { FamilySection } from '../components/profile/FamilySection'
import { AccountsSection, OasSection } from '../components/profile/OasAccountsSections'
import { PensionPlans } from '../components/profile/PensionPlans'
import { RrqSection } from '../components/profile/RrqSection'
import { Cluster } from '../components/Layout'
import { FieldRow } from '../components/FieldRow'
import { NextStep } from '../components/NextStep'
import { NumberField } from '../components/NumberField'
import { PageHead } from '../components/PageHead'
import type { PersonId } from '../engine/types'
import { useT } from '../i18n'
import { hasSpouse, mapPerson, setSpending } from '../lib/profileEdit'
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
      {gaps.length > 0 && (
        // First visit: a blank form is a wall. The three numbers a first verdict needs are typed HERE — a short-form
        // view of the same stored fields as the form below, gone as soon as the verdict has what it needs.
        <aside className="welcome surface">
          <h2 className="welcome__title">{t.profile.welcome.title}</h2>
          <p className="welcome__body">{t.profile.welcome.body}</p>
          <QuickStart />
          <Cluster>
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

// The quick start: birth year, work income, retired spending — the three numbers `profileGaps` asks for before the
// results page gives a verdict. They write the same store as the full form below (and as Hypothèses for the spending).
function QuickStart() {
  const t = useT()
  const profile = useProfile()
  const self = profile.household.persons[0]
  const edit = (change: Parameters<typeof mapPerson>[2]) => updateProfile((p) => mapPerson(p, 'self', change))
  return (
    <div className="welcome__fields">
      <FieldRow label={t.profile.welcome.birth}>
        {(w) => <NumberField kind="year" min={1900} max={2100} value={self.birth.year} onChange={(year) => edit((x) => ({ ...x, birth: { ...x.birth, year } }))} id={w.id} />}
      </FieldRow>
      <FieldRow label={t.profile.welcome.salary}>
        {(w) => <NumberField kind="money" max={1e8} value={self.salaryToday} onChange={(salaryToday) => edit((x) => ({ ...x, salaryToday }))} id={w.id} />}
      </FieldRow>
      <FieldRow label={t.profile.welcome.spending}>
        {(w) => <NumberField kind="money" max={1e8} value={profile.household.spending.retiredToday} onChange={(retiredToday) => updateProfile((p) => setSpending(p, { retiredToday }))} id={w.id} />}
      </FieldRow>
    </div>
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
