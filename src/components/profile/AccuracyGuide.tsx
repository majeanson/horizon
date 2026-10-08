import { useEffect, useMemo, useState } from 'react'
import { useLang, useT } from '../../i18n'
import { accuracyOf, DOC_IDS, factsOf, type DocId, type Fact } from '../../lib/facts'
import { setGuided } from '../../lib/guide'
import { GUIDE_COPY } from '../../lib/guideCopy'
import { scrollBehavior } from '../../lib/motion'
import { estimateMissing } from '../../lib/estimates'
import { setFacts } from '../../lib/profileEdit'
import type { Profile } from '../../lib/schema'
import { today } from '../../lib/today'
import { replaceProfile, updateProfile, useProfile } from '../../lib/store'
import { Chip } from '../Chip'
import { Cluster } from '../Layout'
import { Icon } from '../Icon'
import { StatusMessage } from '../StatusMessage'
import { Section } from './shared'

// « Rendre mon profil exact » — the way from an estimated profile to one that stands on the person's own documents.
//
//   · a METER: how many of the figures this household has are confirmed (read off a document) rather than estimated;
//   · two chips: fill what is still blank with an ESTIMATE (and take it back), or walk EVERY unconfirmed figure with the guide;
//   · the CHECKLIST of documents that hold the real numbers: what each settles, how to get it, its official page, and the
//     figures it confirms, each a link to its field;
//   · the GUIDE: a card docked at the bottom that walks the real form, one unconfirmed figure at a time — scrolling to it,
//     saying where it is and in which words the document prints it (the ⓘ's own text), and confirming it on a tap.
//
// It reads the list of facts (lib/facts.ts) and writes only `confirmed`; it never touches a figure's value. It sits AFTER
// the form: the first visit's path already was the quick way, and a returning reader comes to change a number.

// Bring a figure's field on screen: centred, unless it is a tall block (the earnings list) — then its TOP, where its header and its
// mark are, since the guide's card is docked over the lower part of the window.
function bringIntoView(id: string): void {
  const el = document.querySelector(`[data-fact="${id}"]`)
  if (!el) return
  const tall = el.getBoundingClientRect().height > window.innerHeight * 0.4
  el.scrollIntoView({ behavior: scrollBehavior(), block: tall ? 'start' : 'center' })
}

export default function AccuracyGuide() {
  const t = useT()
  const { lang } = useLang()
  const c = GUIDE_COPY[lang]
  const profile = useProfile()
  const facts = useMemo(() => factsOf(profile), [profile])
  const acc = useMemo(() => accuracyOf(profile), [profile])
  // The guide in progress: the figures it will visit (fixed when it starts, so confirming one does not reshuffle the others), and where it is.
  const [tour, setTour] = useState<{ ids: string[]; at: number } | null>(null)
  // What the estimate just did, said once under its chip — with the profile as it was, so one tap takes it back.
  const [estimated, setEstimated] = useState<{ note: string; before: Profile | null } | null>(null)

  const nameOf = (owner: Fact['owner']): string =>
    owner === 'household' ? c.guide.householdOwner : c.guide.owner(profile.household.persons.find((p) => p.id === owner)?.name.trim() || (owner === 'self' ? t.profile.self : t.profile.spouse))

  const jump = (id: string) => {
    setGuided(id)
    bringIntoView(id)
    // Outside the guide the light is a flash, not a state.
    window.setTimeout(() => setGuided(null), 2500)
  }
  const start = (ids: string[]) => ids.length > 0 && setTour({ ids, at: 0 })
  const unconfirmed = (doc?: DocId) => facts.filter((f) => !f.confirmed && (doc === undefined || f.doc === doc)).map((f) => f.id)
  const pct = acc.total === 0 ? 0 : Math.round((100 * acc.confirmed) / acc.total)
  const estimate = () => {
    const e = estimateMissing(profile, today())
    if (e.years === 0 && e.rooms === 0) return setEstimated({ note: c.panel.estimateNothing, before: null })
    updateProfile((p) => estimateMissing(p, today()).profile)
    setEstimated({ note: c.panel.estimateDone(e.years, e.rooms), before: profile })
  }
  const undoEstimate = () => {
    if (estimated?.before) replaceProfile(estimated.before)
    setEstimated(null)
  }

  return (
    <>
      <Section id="exact" title={c.panel.title} subtitle={c.panel.lead} icon="check-bold">
        <div className="accuracy__meter">
          <div className="meter" role="progressbar" aria-valuemin={0} aria-valuemax={acc.total} aria-valuenow={acc.confirmed} aria-label={c.panel.count(acc.confirmed, acc.total)}>
            <span className="meter__fill" style={{ width: `${pct}%` }} />
          </div>
          <p className="accuracy__count">
            <strong>{c.panel.count(acc.confirmed, acc.total)}</strong>
            <span className="accuracy__legend">
              <span className="fact-dot is-on" aria-hidden="true" /> {c.panel.legendConfirmed}
              <span className="fact-dot" aria-hidden="true" /> {c.panel.legendEstimated}
            </span>
          </p>
          <p className="field-row__hint">{acc.confirmed === 0 ? c.panel.none : acc.confirmed === acc.total ? c.panel.allDone : c.panel.estimatedNote(acc.total - acc.confirmed)}</p>
        </div>

        <Cluster>
          {acc.confirmed < acc.total && (
            <Chip icon="arrow-right-bold" onClick={() => start(unconfirmed())}>
              {c.panel.guideAll}
            </Chip>
          )}
          <Chip onClick={estimate}>{c.panel.estimate}</Chip>
        </Cluster>
        <p className="field-row__hint">{c.panel.quickDoes}</p>
        {estimated && (
          <Cluster>
            <StatusMessage tone="info">{estimated.note}</StatusMessage>
            {estimated.before !== null && <Chip onClick={undoEstimate}>{c.panel.estimateUndo}</Chip>}
          </Cluster>
        )}

        <ol className="docs">
          {DOC_IDS.map((doc) => {
            const d = c.docs[doc]
            const mine = facts.filter((f) => f.doc === doc)
            if (mine.length === 0) return null
            const done = acc.byDoc[doc].confirmed
            const page = d.link ? t.info[d.link].url : ''
            return (
              <li key={doc} className={'doc' + (done === mine.length ? ' doc--done' : '')}>
                <div className="doc__head">
                  <h3 className="doc__name">{d.name}</h3>
                  <span className="doc__count mono" aria-label={c.panel.count(done, mine.length)}>
                    {done}/{mine.length}
                  </span>
                </div>
                <p className="doc__what">{d.what}</p>
                <p className="field-row__hint">{d.how}</p>
                <ul className="doc__facts" aria-label={c.panel.fills}>
                  {mine.map((f) => (
                    <li key={f.id}>
                      <button type="button" className={'doc__fact' + (f.confirmed ? ' is-on' : '')} onClick={() => jump(f.id)} aria-label={`${c.panel.show} : ${c.kind[f.kind]}, ${nameOf(f.owner)}, ${f.confirmed ? c.panel.legendConfirmed : c.panel.legendEstimated}`}>
                        <span className={'fact-dot' + (f.confirmed ? ' is-on' : '')} aria-hidden="true">
                          {f.confirmed && <Icon name="check-bold" size={10} />}
                        </span>
                        {c.kind[f.kind]}
                        {profile.household.persons.length > 1 && f.owner !== 'household' && <span className="doc__owner"> · {profile.household.persons.find((p) => p.id === f.owner)?.name.trim() || (f.owner === 'self' ? t.profile.self : t.profile.spouse)}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="doc__actions">
                  {done < mine.length && (
                    <Chip icon="arrow-right-bold" onClick={() => start(unconfirmed(doc))}>
                      {c.panel.guideMe}
                    </Chip>
                  )}
                  {page && (
                    <a className="info-note__link" href={page} target="_blank" rel="noopener noreferrer">
                      {c.panel.openPage}
                      <Icon name="arrow-up-right-bold" size={14} />
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </Section>
      {tour && <GuideBar ids={tour.ids} at={tour.at} setAt={(at) => setTour({ ids: tour.ids, at })} onClose={() => setTour(null)} />}
    </>
  )
}

// The card docked at the bottom while the guide runs: one figure at a time, on the real form. Three actions, not four:
// « C'est confirmé », « Plus tard » and the close — a « Précédent » in a bar already crowded on a phone was the one nobody used.
function GuideBar({ ids, at, setAt, onClose }: { ids: string[]; at: number; setAt: (at: number) => void; onClose: () => void }) {
  const t = useT()
  const { lang } = useLang()
  const c = GUIDE_COPY[lang]
  const profile = useProfile()
  const facts = factsOf(profile)
  const finished = at >= ids.length
  const fact = finished ? null : (facts.find((f) => f.id === ids[at]) ?? null)

  // Light the field and bring it on screen at each step; nothing is lit when the guide ends or closes.
  useEffect(() => {
    if (fact === null) {
      setGuided(null)
      return
    }
    setGuided(fact.id)
    bringIntoView(fact.id)
  }, [fact?.id])
  useEffect(() => () => setGuided(null), [])
  // A figure that stopped applying while the guide was on it (its account was emptied…) is skipped.
  useEffect(() => {
    if (!finished && fact === null) setAt(at + 1)
  }, [finished, fact, at, setAt])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const owner = fact === null ? '' : fact.owner === 'household' ? c.guide.householdOwner : c.guide.owner(profile.household.persons.find((p) => p.id === fact.owner)?.name.trim() || (fact.owner === 'self' ? t.profile.self : t.profile.spouse))
  const entry = fact?.info ? t.info[fact.info] : null
  const where = fact === null ? '' : (entry?.where ?? c.where[fact.kind] ?? '')
  const acc = accuracyOf(profile)

  return (
    <aside className="guide-bar" role="region" aria-label={c.guide.label} aria-live="polite">
      {finished || fact === null ? (
        <>
          <p className="guide-bar__title">{c.guide.finished}</p>
          <p className="field-row__hint">{c.guide.finishedNote(acc.confirmed, acc.total)}</p>
          <div className="guide-bar__actions">
            <Chip onClick={onClose}>{c.guide.close}</Chip>
          </div>
        </>
      ) : (
        <>
          <p className="guide-bar__step">
            {c.guide.step(at + 1, ids.length)} · {owner}
          </p>
          <p className="guide-bar__title">{c.kind[fact.kind]}</p>
          <p className="guide-bar__doc">
            <strong>{c.guide.document} :</strong> {c.docs[fact.doc].name}
          </p>
          <p className="guide-bar__where">
            <strong>{c.guide.whereIs} :</strong> {where}
            {entry?.label ? (
              <>
                {' '}
                <strong>{c.guide.wording} :</strong> « {entry.label} »
              </>
            ) : null}
          </p>
          {entry?.url ? (
            <a className="info-note__link" href={entry.url} target="_blank" rel="noopener noreferrer">
              {c.panel.openPage}
              <Icon name="arrow-up-right-bold" size={14} />
            </a>
          ) : null}
          <div className="guide-bar__actions">
            <Chip
              icon="check-bold"
              selected={fact.confirmed}
              onClick={() => {
                updateProfile((p) => setFacts(p, [fact.id], true))
                setAt(at + 1)
              }}
            >
              {fact.confirmed ? c.guide.confirmed : c.guide.confirm}
            </Chip>
            <Chip onClick={() => setAt(at + 1)}>{fact.confirmed ? c.guide.next : c.guide.skip}</Chip>
            <Chip icon="x-bold" onClick={onClose} ariaLabel={c.guide.close}>
              {c.guide.close}
            </Chip>
          </div>
        </>
      )}
    </aside>
  )
}
