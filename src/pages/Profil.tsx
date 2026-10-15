import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useSearchParams } from 'react-router-dom'
import { AboutSection } from '../components/profile/AboutSection'
import { BudgetSection } from '../components/profile/BudgetSection'
import { HomeSection } from '../components/profile/HomeSection'
import { LifeSection } from '../components/profile/LifeSection'
import { FamilySection } from '../components/profile/FamilySection'
import { AccountsSection, CashBufferReadout, OasSection } from '../components/profile/OasAccountsSections'
import { PensionPlans } from '../components/profile/PensionPlans'
import { RrqSection } from '../components/profile/RrqSection'
import { BackupLine } from '../components/profile/BackupLine'
import { ProfileMap } from '../components/profile/ProfileMap'
import { ENTRY_COPY } from '../lib/entryCopy'
import { Chip } from '../components/Chip'
import { LiveAnswer } from '../components/LiveAnswer'
import { Loading } from '../components/Loading'
import { NextStep } from '../components/NextStep'
import { PageHead } from '../components/PageHead'
import { SubTabs } from '../components/SubTabs'
import { SectionLevel } from '../components/SectionHeader'
import type { PersonId } from '../engine/types'
import { useLang, useT } from '../i18n'
import { accuracyOf } from '../lib/facts'
import { bringIntoView, setGuided } from '../lib/guide'
import { GUIDE_COPY } from '../lib/guideCopy'
import { scrollBehavior } from '../lib/motion'
import { hasSpouse, mapPerson } from '../lib/profileEdit'
import { profileGaps } from '../lib/profileGaps'
import { applies, useYes } from '../lib/situation'
import { updateProfile, useProfile } from '../lib/store'
import { TIME_BUDGET_PATH, useTimeBudget } from '../lib/timeBudget'

const EntryByDocument = lazy(() => import('../components/profile/EntryByDocument'))
const AccuracyGuide = lazy(() => import('../components/profile/AccuracyGuide'))
const Onboarding = lazy(() => import('../components/Onboarding'))
const FillBlanks = lazy(() => import('../components/profile/FillBlanks'))
const SituationCard = lazy(() => import('../components/profile/SituationCard'))

// The profile: the household's facts (who is in it, what it spends, the home), then EVERY person's fields on the page —
// side by side on a wide screen, one after the other on a phone — then « Rendre mon profil exact », the documents that
// confirm each figure. Nothing sits behind a tab. Every field writes straight to the store through lib/profileEdit.ts;
// there is no « save » — a profile is always as typed. The form comes FIRST and the meter is one quiet line above it: a
// returning reader is here to change a number, not to be told their score.
export function Profil() {
  const t = useT()
  const { lang } = useLang()
  const profile = useProfile()
  const [params, setParams] = useSearchParams()
  const spouse = hasSpouse(profile)
  const yes = useYes()
  const gaps = profileGaps(profile)
  const acc = useMemo(() => accuracyOf(profile), [profile])
  const g = GUIDE_COPY[lang].panel
  // The welcome card's fate is decided at arrival: a first visit keeps it for the WHOLE visit, so
  // committing the last number (Enter or blur — possibly in a field inside the card) swaps its
  // content to « c'est assez » instead of yanking the card, and the focus with it, out of the page.
  const [welcome] = useState(gaps.length > 0)
  const budget = useTimeBudget()
  const page = useRef<HTMLElement>(null)
  // Two ways to fill the SAME profile: by topic (the form below) or by document (one paper at a time, the first step being the list of what to gather). The address keeps it.
  const byDoc = params.get('par') === 'document'
  const entry = ENTRY_COPY[lang]
  const setMode = (mode: 'topic' | 'doc') =>
    setParams(
      () => {
        const next = new URLSearchParams(window.location.search)
        next.delete('etape')
        if (mode === 'doc') next.set('par', 'document')
        else next.delete('par')
        return next
      },
      { replace: false },
    )

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

  // A link from the results page to ONE figure (`?fact=self:rrspBalance`, the ids of lib/facts.ts): scroll to its field and light it for
  // a moment, then drop the key from the address. Waits a beat for the page's sections to be on screen.
  const wantedFact = params.get('fact')
  useEffect(() => {
    if (wantedFact === null) return
    // No cleanup on purpose: dropping the key re-renders with `wantedFact` null, and a cleanup would cancel the very timers started here.
    window.setTimeout(() => {
      setGuided(wantedFact)
      bringIntoView(wantedFact)
    }, 250)
    window.setTimeout(() => setGuided(null), 3000)
    setParams(
      () => {
        const next = new URLSearchParams(window.location.search)
        next.delete('fact')
        return next
      },
      { replace: true },
    )
  }, [wantedFact, setParams])

  // `/profil#exact` (the front door's « Voir tout ce qui reste estimé »): the figure guide loads on its own, after the form, so the browser's own jump to the anchor finds nothing — wait for it.
  const { hash } = useLocation()
  useEffect(() => {
    if (hash !== '#exact') return
    let tries = 0
    const timer = window.setInterval(() => {
      const el = document.getElementById('exact')
      if (el) el.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
      if (el || ++tries > 20) window.clearInterval(timer)
    }, 150)
    return () => window.clearInterval(timer)
  }, [hash])

  // A first visit that arrives with NO way in named (the Profil tab, a bare link) takes the one the person's time allows — asked on the front door
  // (lib/timeBudget.ts): two minutes is the quick path, thirty is by document, and the address says so (a reload keeps it). Fifteen is the full
  // questions, which a bare /profil already is. A door that names its path (`debut`, `par`, `form`) is never overridden.
  if (welcome && budget !== null && budget !== '15' && !['form', 'par', 'debut'].some((k) => params.has(k))) return <Navigate to={TIME_BUDGET_PATH[budget]} replace />

  // First visit: a blank form is a wall. The page IS one question at a time (components/Onboarding.tsx) until the person finishes it or
  // asks for the full form (`?form=1`, which the path writes and a link can carry). Decided at arrival, like the card it replaces: a
  // person who types the last number is not yanked out from under their finger — the path itself says when it is enough.
  if (welcome && params.get('form') !== '1') {
    return (
      <section className="page-body">
        <PageHead title={t.profile.welcome.title} />
        <Suspense fallback={<Loading />}>
          <Onboarding
            // `?debut=rapide` is the quick path (« J'ai 2 minutes »); any other value is the full one.
            mode={params.get('debut') === 'rapide' ? 'quick' : 'full'}
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
    <section className="page-body" ref={page}>
      <LiveAnswer />
      <PageHead title={t.profile.title} subtitle={t.profile.subtitle} />
      <SubTabs
        ariaLabel={entry.modes.label}
        value={byDoc ? 'doc' : 'topic'}
        onSelect={setMode}
        options={[
          { key: 'topic' as const, label: entry.modes.topic },
          { key: 'doc' as const, label: entry.modes.doc },
        ]}
      />
      {byDoc ? (
        <Suspense fallback={<Loading />}>
          <EntryByDocument />
        </Suspense>
      ) : (
        <>
      {/* A couple's profile is twenty screens on a phone: the map says where each block is, and which one the reader is in. */}
      <ProfileMap
        page={page}
        people={profile.household.persons.map((p, i) => ({ id: p.id, name: p.name.trim() || (i === 0 ? t.profile.self : t.profile.spouse) }))}
        withHome={applies(profile, yes, 'home')}
        withEvents={applies(profile, yes, 'events')}
        withExact={acc.total > 0}
      />
      {/* First the household (who), then « Ma situation » (what applies to it): the questions answered here decide which sections of everything below are shown, so they come before it. */}
      <FamilySection withKids={applies(profile, yes, 'kids')} />
      {/* « Ma situation »: a few yes / no questions that decide which sections below are shown. */}
      <Suspense fallback={null}>
        <SituationCard />
      </Suspense>
      {/* One line: how much of the profile stands on documents, and the door to the section that makes it exact. */}
      {acc.total > 0 && (
        <div className="accuracy-line">
          <span className="accuracy-line__text">{acc.confirmed === acc.total ? g.allDone : g.count(acc.confirmed, acc.total)}</span>
          {acc.confirmed < acc.total && (
            <Chip icon="caret-down-bold" onClick={() => document.getElementById('exact')?.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })}>
              {g.title}
            </Chip>
          )}
        </div>
      )}
      {/* « Remplir ce qui manque »: a level of living or an estimate fills what is blank; loaded on its own (it carries the official tables). */}
      <Suspense fallback={null}>
        <FillBlanks />
      </Suspense>
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
      <CashBufferReadout />
      {/* The household’s own costs come after the people, as on the first visit: the retirement ages are known by the time a budget is asked. */}
      <BudgetSection withKids={applies(profile, yes, 'kids')} />
      {applies(profile, yes, 'home') && <HomeSection />}
      {applies(profile, yes, 'events') && <LifeSection />}
      <BackupLine />
      {/* « Rendre mon profil exact »: the meter, the documents and the guide — after the form, loaded on its own, the form never waits for it. */}
      <Suspense fallback={null}>
        <AccuracyGuide />
      </Suspense>
      {/* The one next thing: the answer. Hypothèses is optional (the defaults are the Neutre scenario) and reachable from the answer. */}
      <NextStep to={gaps.length === 0 ? '/resultats' : '/profil'} label={gaps.length === 0 ? t.next.toResults : t.next.toProfile}>
        {gaps.length === 0 ? (
          <p>{t.next.profileReady}</p>
        ) : (
          <>
            <p>{t.results.gaps.lead}</p>
            <ul className="next__gaps">
              {gaps.map((g) => (
                <li key={g}>{t.results.gaps[g]}</li>
              ))}
            </ul>
          </>
        )}
      </NextStep>
        </>
      )}
    </section>
  )
}

function PersonFields({ id }: { id: PersonId }) {
  const profile = useProfile()
  const person = profile.household.persons.find((x) => x.id === id)!
  const yes = useYes()
  const edit = (change: Parameters<typeof mapPerson>[2]) => updateProfile((p) => mapPerson(p, id, change))
  return (
    <>
      <AboutSection person={person} edit={edit} withoutPartTime={!applies(profile, yes, 'partTime', id)} />
      {/* What the person holds, then what they will be paid: accounts, an employer plan, then the QPP and the OAS. */}
      <AccountsSection person={person} edit={edit} withNonReg={applies(profile, yes, 'nonReg', id)} />
      {applies(profile, yes, 'pension', id) && <PensionPlans person={person} edit={edit} />}
      <RrqSection person={person} edit={edit} />
      <OasSection person={person} edit={edit} withoutResidence={!applies(profile, yes, 'abroad', id)} />
    </>
  )
}
