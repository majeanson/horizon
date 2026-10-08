import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AboutSection } from '../components/profile/AboutSection'
import { HomeSection } from '../components/profile/HomeSection'
import { FamilySection } from '../components/profile/FamilySection'
import { AccountsSection, OasSection } from '../components/profile/OasAccountsSections'
import { PensionPlans } from '../components/profile/PensionPlans'
import { RrqSection } from '../components/profile/RrqSection'
import { Cluster } from '../components/Layout'
import { FieldRow } from '../components/FieldRow'
import { NextStep } from '../components/NextStep'
import { NumberField } from '../components/NumberField'
import { PageHead } from '../components/PageHead'
import { SectionLevel } from '../components/SectionHeader'
import { StatusMessage } from '../components/StatusMessage'
import type { PersonId } from '../engine/types'
import { useT } from '../i18n'
import { hasSpouse, mapPerson, setSpending } from '../lib/profileEdit'
import { profileGaps } from '../lib/profileGaps'
import { updateProfile, useProfile } from '../lib/store'

const AccuracyGuide = lazy(() => import('../components/profile/AccuracyGuide'))

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

  return (
    <section className="page-body">
      <PageHead title={t.profile.title} subtitle={t.profile.subtitle} />
      {welcome && (
        // First visit: a blank form is a wall. The three numbers a first verdict needs are typed HERE — a short-form
        // view of the same stored fields as the form below. Once they are in, the card says so and points at the
        // verdict it promised; it leaves the page on the next visit, not under the reader's fingers.
        <aside className="welcome surface">
          <h2 className="welcome__title">{t.profile.welcome.title}</h2>
          <p className="welcome__body">{t.profile.welcome.body}</p>
          <QuickStart />
          {gaps.length === 0 ? (
            <>
              <StatusMessage tone="success">{t.profile.welcome.done}</StatusMessage>
              <Cluster>
                <Link className="btn btn--sm" to="/resultats">
                  {t.next.toResults}
                </Link>
              </Cluster>
            </>
          ) : (
            <Cluster>
              <Link className="btn btn--sm btn--ghost" to="/donnees">
                {t.profile.welcome.example}
              </Link>
            </Cluster>
          )}
        </aside>
      )}
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

// The quick start: birth year, work income, retired spending — the three numbers `profileGaps` asks for before the
// results page gives a verdict. They write the same store as the full form below (and as Hypothèses for the spending).
function QuickStart() {
  const t = useT()
  const profile = useProfile()
  const self = profile.household.persons[0]
  const edit = (change: Parameters<typeof mapPerson>[2]) => updateProfile((p) => mapPerson(p, 'self', change))
  return (
    <div className="welcome__fields">
      <FieldRow label={t.profile.welcome.birth} hint={t.profile.welcome.birthHint}>
        {(w) => (
          <NumberField kind="year" min={1900} max={2100} value={self.birth.year} onChange={(year) => edit((x) => ({ ...x, birth: { ...x.birth, year } }))} id={w.id} ariaDescribedBy={w.describedBy} />
        )}
      </FieldRow>
      <FieldRow label={t.profile.welcome.salary} infoId="salary">
        {(w) => <NumberField kind="money" max={1e8} value={self.salaryToday} onChange={(salaryToday) => edit((x) => ({ ...x, salaryToday }))} id={w.id} />}
      </FieldRow>
      {/* The three account totals: the other numbers a first verdict leans on. One box each (the form below splits room, cost base and contributions). */}
      {(['rrsp', 'tfsa', 'nonReg'] as const).map((kind) => (
        <FieldRow key={kind} label={`${t.profile.accounts[kind]} · ${t.profile.accounts.balance}`} infoId={kind === 'rrsp' ? 'rrspBalance' : kind === 'tfsa' ? 'tfsaBalance' : 'nonRegBalance'}>
          {(w) => <NumberField kind="money" max={1e9} value={self.accounts[kind].balance} onChange={(balance) => edit((x) => ({ ...x, accounts: { ...x.accounts, [kind]: { ...x.accounts[kind], balance } } }))} id={w.id} />}
        </FieldRow>
      ))}
      <FieldRow label={t.profile.welcome.spending} infoId="spendingRetired">
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
