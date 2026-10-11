import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useLang } from '../../i18n'
import { accuracyOf, factsOf } from '../../lib/facts'
import { GUIDE_COPY } from '../../lib/guideCopy'
import { estimateMissing } from '../../lib/estimates'
import type { Profile } from '../../lib/schema'
import { today } from '../../lib/today'
import { replaceProfile, updateProfile, useProfile } from '../../lib/store'
import { Chip } from '../Chip'
import { Cluster } from '../Layout'
import { GuideBar } from './GuideBar'
import { StatusMessage } from '../StatusMessage'
import { Section } from './shared'

// « Rendre mon profil exact » — the way from an estimated profile to one that stands on the person's own documents.
//
//   · a METER: how many of the figures this household has are confirmed (read off a document) rather than estimated;
//   · two chips: fill what is still blank with an ESTIMATE (and take it back), or walk EVERY unconfirmed figure with the guide;
//   · a door to « Par document »: the documents that hold the real numbers, what each settles, how to get it and its official page — one step per document;
//   · the GUIDE (components/profile/GuideBar.tsx): a card docked at the bottom that walks the real form, one unconfirmed figure at a time.
//
// It reads the list of facts (lib/facts.ts) and writes only `confirmed`; it never touches a figure's value. It sits AFTER
// the form: the first visit's path already was the quick way, and a returning reader comes to change a number.

export default function AccuracyGuide() {
  const { lang } = useLang()
  const c = GUIDE_COPY[lang]
  const profile = useProfile()
  const facts = useMemo(() => factsOf(profile), [profile])
  const acc = useMemo(() => accuracyOf(profile), [profile])
  // The guide in progress: the figures it will visit (fixed when it starts, so confirming one does not reshuffle the others), and where it is.
  const [tour, setTour] = useState<{ ids: string[]; at: number } | null>(null)
  // What the estimate just did, said once under its chip — with the profile as it was, so one tap takes it back.
  const [estimated, setEstimated] = useState<{ note: string; before: Profile | null } | null>(null)

  const start = (ids: string[]) => ids.length > 0 && setTour({ ids, at: 0 })
  const unconfirmed = () => facts.filter((f) => !f.confirmed).map((f) => f.id)
  // « Par document »: the same profile, one paper at a time (its first step is the list to gather). The address keeps it; the step is the first one.
  const [, setParams] = useSearchParams()
  const byDocument = () =>
    setParams(
      () => {
        const next = new URLSearchParams(window.location.search)
        next.set('par', 'document')
        next.delete('etape')
        return next
      },
      { replace: false },
    )
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

        {/* The documents themselves — what each settles, where to get it, its official page, its figures — are the steps of « Par document »: one list, not two. */}
        <Cluster>
          <Chip icon="identification-card-bold" onClick={byDocument}>
            {c.panel.byDocument}
          </Chip>
        </Cluster>
      </Section>
      {tour && <GuideBar ids={tour.ids} at={tour.at} setAt={(at) => setTour({ ids: tour.ids, at })} onClose={() => setTour(null)} />}
    </>
  )
}
