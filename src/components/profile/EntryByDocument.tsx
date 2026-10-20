import { useEffect, useState, type ReactNode, lazy, Suspense } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Person } from '../../engine/types'
import { AboutSection } from './AboutSection'
import { BudgetSection } from './BudgetSection'
import { FamilySection } from './FamilySection'
import { HomeSection } from './HomeSection'
import { AccountsSection, OasSection } from './OasAccountsSections'
import { PensionPlans } from './PensionPlans'
import { RrqSection } from './RrqSection'
import { TaxFields } from './TaxFields'
import type { PersonEditor } from './shared'
import { AccordionItem } from '../Accordion'
import { Chip } from '../Chip'
import { ConceptPip } from '../ConceptPip'
import { Cluster, Rail } from '../Layout'
import { SubTabs } from '../SubTabs'
import { DocumentsChecklist } from './DocumentsChecklist'
import { GuideBar } from './GuideBar'
import { StatusMessage } from '../StatusMessage'
import { useLang, useT } from '../../i18n'
import { useTicks } from '../../lib/documentsTicks'
import { ENTRY_COPY } from '../../lib/entryCopy'
import { GATHER, lastStep, rememberStep, stepById, stepFactIds, stepProgress, stepsFor, type Step } from '../../lib/entrySteps'
import { applies, useYes } from '../../lib/situation'
import { GUIDE_COPY } from '../../lib/guideCopy'
import { mapPerson, setFacts } from '../../lib/profileEdit'
import { updateProfile, useProfile } from '../../lib/store'
import type { DocId } from '../../lib/facts'

// « Par document » — the second way to fill Profil (the first is by topic): typing a full profile when the documents are in hand: ONE DOCUMENT AT A TIME, the step showing only the figures that
// document holds, for each person side by side, with a single tap to confirm them all. The fields are the profile's own (the same sections, the same
// store, the same confirmation marks): this page only gathers them in the order a person holds the papers. The step lives in the address (`?etape=`) and
// is remembered on this device, so a person can leave and come back.

function Persons({ render }: { render: (person: Person, edit: PersonEditor['edit']) => ReactNode }) {
  const t = useT()
  const profile = useProfile()
  const couple = profile.household.persons.length > 1
  return (
    <div className={'persons' + (couple ? ' persons--two persons--aligned' : '')}>
      {profile.household.persons.map((p, i) => {
        const name = p.name.trim() || (i === 0 ? t.profile.self : t.profile.spouse)
        return (
          // The person's column opens with the same card head as on « Par sujet » (pip · name), then the document's cards.
          <AccordionItem key={p.id} id={`etape-${p.id}`} title={name} concept="personne" plain className={`person who who--${Math.min(i, 1)}`}>
            {render(p, (change) => updateProfile((x) => mapPerson(x, p.id, change)))}
          </AccordionItem>
        )
      })}
    </div>
  )
}

// The household's first step is where « Ma situation » is answered: what it says decides which documents the next steps are about.
function StepBody({ step, view }: { step: Step; view: View }) {
  const profile = useProfile()
  const yes = useYes()
  switch (step.id) {
    case 'you':
      return (
        <>
          <FamilySection withKids={applies(profile, yes, 'kids')} />
          <Suspense fallback={null}>
            <SituationCard />
          </Suspense>
          <Persons render={(person, edit) => <AboutSection person={person} edit={edit} withoutSalary withoutPartTime={!applies(profile, yes, 'partTime', person.id)} />} />
        </>
      )
    case 'rrq':
      return view === 'document' ? (
        <Suspense fallback={null}>
          <Persons render={(person, edit) => <RrqFacsimile person={person} edit={edit} />} />
        </Suspense>
      ) : (
        <Persons render={(person, edit) => <RrqSection person={person} edit={edit} />} />
      )
    case 'tax':
      return view === 'document' ? (
        <Suspense fallback={null}>
          <Persons render={(person, edit) => <CraFacsimile person={person} edit={edit} />} />
        </Suspense>
      ) : (
        <Persons render={(person, edit) => <TaxFields person={person} edit={edit} />} />
      )
    case 'bank':
      return <Persons render={(person, edit) => <AccountsSection person={person} edit={edit} withoutRoom withNonReg={applies(profile, yes, 'nonReg', person.id)} />} />
    case 'employer':
      return <Persons render={(person, edit) => <PensionPlans person={person} edit={edit} />} />
    case 'home':
      return <HomeSection />
    case 'budget':
      return <BudgetSection withKids={applies(profile, yes, 'kids')} />
    case 'residence':
      return <Persons render={(person, edit) => <OasSection person={person} edit={edit} withoutResidence={!applies(profile, yes, 'abroad', person.id)} />} />
  }
}

const SituationCard = lazy(() => import('./SituationCard'))

// « Comme sur le document »: the two steps whose document is a table or a screen to copy get a second look, laid out like the paper. It is the page's
// own state, not an address key: a way of looking, not a place to come back to. The facsimiles (and their quoted words) load only when asked for.
type View = 'form' | 'document'
const FACSIMILE_STEPS: ReadonlySet<string> = new Set(['rrq', 'tax'])
const RrqFacsimile = lazy(() => import('./facsimile/RrqFacsimile').then((m) => ({ default: m.RrqFacsimile })))
const CraFacsimile = lazy(() => import('./facsimile/CraFacsimile').then((m) => ({ default: m.CraFacsimile })))

export default function EntryByDocument() {
  const t = useT()
  const { lang } = useLang()
  const c = ENTRY_COPY[lang]
  const guide = GUIDE_COPY[lang]
  const profile = useProfile()
  const ticks = useTicks()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const asked = params.get('etape')
  const gather = asked === GATHER
  const step = stepById(asked)
  const yes = useYes()
  const steps = stepsFor(profile, yes, step.id)
  const at = steps.findIndex((s) => s.id === step.id)
  const total = steps.length
  const nameOf = (s: Step): string => (s.doc === null ? c.youTitle : guide.docs[s.doc].name)
  const doc = step.doc === null ? null : guide.docs[step.doc]
  const infoUrl = doc?.link ? (t.info[doc.link].url ?? null) || null : null
  const progress = stepProgress(step, profile)
  const ids = stepFactIds(step, profile)
  const allConfirmed = ids.length > 0 && progress.confirmed === ids.length
  // The checklist's ticks say which documents the person has gathered: a step whose document was never ticked says so (once any is).
  const gathered = (d: DocId) => [...ticks].some((id) => id.startsWith(`${d}:`))
  const anyTicked = ticks.size > 0
  const saved = lastStep()
  // « Me guider »: the guide of « Rendre mon profil exact », for the figures of THIS document only (fixed when it starts, so confirming one does not reshuffle the rest).
  const [view, setView] = useState<View>('form')
  const [tour, setTour] = useState<{ ids: string[]; at: number } | null>(null)
  const todo = ids.filter((id) => !new Set(profile.confirmed).has(id))

  useEffect(() => {
    rememberStep(step.id)
    setTour(null) // a guide belongs to the step it was started on
    setView('form') // …and a look is chosen per step
  }, [step.id])

  const go = (id: string) =>
    setParams(
      () => {
        const next = new URLSearchParams(window.location.search)
        next.set('etape', id)
        return next
      },
      { replace: false },
    )

  return (
    <section className="saisie" aria-label={c.title}>
      <p className="docs-page__intro">{c.intro}</p>
      {asked === null && saved !== null && saved !== 'you' && (
        <Cluster>
          <StatusMessage tone="info">{c.resume(nameOf(stepById(saved)))}</StatusMessage>
          <Chip onClick={() => go(saved)}>{c.resumeGo}</Chip>
        </Cluster>
      )}
      <nav className="saisie__steps" aria-label={c.nav}>
        <Rail>
          <Chip current={gather} onClick={() => go(GATHER)}>
            {c.gatherTitle}
          </Chip>
          {steps.map((s, i) => {
            const p = stepProgress(s, profile)
            const done = p.total > 0 && p.confirmed === p.total
            return (
              <Chip key={s.id} current={!gather && s.id === step.id} onClick={() => go(s.id)} ariaLabel={`${i + 1}. ${nameOf(s)}${done ? ' ✓' : ''}`}>
                {i + 1}. {nameOf(s)}
                {done ? ' ✓' : ''}
              </Chip>
            )
          })}
        </Rail>
      </nav>

      {gather ? (
        <DocumentsChecklist onNext={() => go(steps[0].id)} />
      ) : (
        <>
      {/* The step is a card like the blocks under it (Profil is one family of cards): its number, its pip and title, then what the document is and where each figure sits — in view, not
          under « En savoir plus »: it is what the reader is looking at while typing. */}
      <header className="saisie__head surface">
        <p className="field-row__hint">{c.stepOf(at + 1, total)}</p>
        <div className="saisie__title-row">
          <ConceptPip id={doc === null ? 'famille' : 'documents'} />
          <h2 className="saisie__title">{nameOf(step)}</h2>
        </div>
        {doc === null ? (
          <p>{c.youHint}</p>
        ) : (
          <>
            <p>{doc.what}</p>
            <p>
              <strong>{c.where}</strong> {doc.how}
            </p>
            {infoUrl !== null && (
              <a className="info-note__link" href={infoUrl} target="_blank" rel="noopener noreferrer">
                {c.openOfficial}
              </a>
            )}
            {anyTicked && step.doc !== null && !gathered(step.doc) && <StatusMessage tone="info">{c.notGathered}</StatusMessage>}
          </>
        )}
      </header>

      {FACSIMILE_STEPS.has(step.id) && (
        <SubTabs
          size="mini"
          ariaLabel={c.views.label}
          value={view}
          onSelect={setView}
          options={[
            { key: 'form', label: c.views.form },
            { key: 'document', label: c.views.document },
          ]}
        />
      )}
      <StepBody step={step} view={FACSIMILE_STEPS.has(step.id) ? view : 'form'} />

      {ids.length > 0 && (
        <div className="saisie__confirm surface">
          <p>{c.confirmedOf(progress.confirmed, ids.length)}</p>
          <Cluster>
            <Chip selected={allConfirmed} onClick={() => updateProfile((p) => setFacts(p, ids, !allConfirmed))}>
              {allConfirmed ? c.unconfirmAll : c.confirmAll}
            </Chip>
            {todo.length > 0 && (
              <Chip icon="arrow-right-bold" onClick={() => setTour({ ids: todo, at: 0 })}>
                {guide.panel.guideMe}
              </Chip>
            )}
          </Cluster>
        </div>
      )}

      <Cluster className="saisie__nav" justify="between">
        <Chip onClick={() => go(at === 0 ? GATHER : steps[at - 1].id)}>
          {c.prev}
        </Chip>
        {at < total - 1 ? (
          <Chip onClick={() => go(steps[at + 1].id)}>{c.next}</Chip>
        ) : (
          <button type="button" className="btn btn--primary" onClick={() => navigate('/resultats')}>
            {c.finish}
          </button>
        )}
      </Cluster>
        </>
      )}
      {tour && <GuideBar ids={tour.ids} at={tour.at} setAt={(at) => setTour({ ids: tour.ids, at })} onClose={() => setTour(null)} />}
    </section>
  )
}
