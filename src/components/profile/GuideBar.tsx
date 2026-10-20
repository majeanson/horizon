import { Fragment, useEffect } from 'react'
import { useLang, useT } from '../../i18n'
import { accuracyOf, blockOfFact, factsOf } from '../../lib/facts'
import { bringIntoView, setGuided } from '../../lib/guide'
import { GUIDE_COPY } from '../../lib/guideCopy'
import { setFacts } from '../../lib/profileEdit'
import { updateProfile, useProfile } from '../../lib/store'
import { useAccordion } from '../Accordion'
import { Chip } from '../Chip'
import { Icon } from '../Icon'

// THE GUIDE: a card docked at the bottom that walks the real form, one unconfirmed figure at a time — scrolling to it, saying where it is and in which words
// the document prints it (the ⓘ's own text), and confirming it on a tap. Started from « Rendre mon profil exact » (every figure) and from a step of
// « Par document » (the figures of that document); it reads the figures' ids it is given and writes only `confirmed`.
// The card docked at the bottom while the guide runs: one figure at a time, on the real form. Three actions, not four:
// « C'est confirmé », « Plus tard » and the close — a « Précédent » in a bar already crowded on a phone was the one nobody used.
export function GuideBar({ ids, at, setAt, onClose }: { ids: string[]; at: number; setAt: (at: number) => void; onClose: () => void }) {
  const t = useT()
  const { lang } = useLang()
  const c = GUIDE_COPY[lang]
  const profile = useProfile()
  const facts = factsOf(profile)
  const accordion = useAccordion()
  const finished = at >= ids.length
  const fact = finished ? null : (facts.find((f) => f.id === ids[at]) ?? null)

  // Light the field and bring it on screen at each step; nothing is lit when the guide ends or closes.
  useEffect(() => {
    if (fact === null) {
      setGuided(null)
      return
    }
    setGuided(fact.id)
    // The form is an accordion: open the block the figure lives in first (a phone shows one at a time; a finished block folds on a wide screen).
    const block = blockOfFact(profile, fact.id)
    if (block !== null) accordion?.reveal(block)
    bringIntoView(fact.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // `--p` is how far along the figures the guide is (0 → 1): a thin meter along the card's top edge (styles/revamp.css), decoration beside the words « 3 / 19 ».
    <aside className="guide-bar" role="region" aria-label={c.guide.label} aria-live="polite" style={{ ['--p' as string]: finished ? 1 : at / Math.max(1, ids.length) }}>
      {finished || fact === null ? (
        <>
          <p className="guide-bar__title">{c.guide.finished}</p>
          <p className="field-row__hint">{c.guide.finishedNote(acc.confirmed, acc.total)}</p>
          <div className="guide-bar__actions">
            <Chip onClick={onClose}>{c.guide.close}</Chip>
          </div>
        </>
      ) : (
        // Keyed on the figure: each step's words settle into place (styles/motion.css) instead of swapping under the reader's eye.
        <Fragment key={fact.id}>
          {/* One line says where the guide is and lets it be closed; the figure's name is the heading; the paper and where to read the figure on it are ONE paragraph. The card is a strip at the foot of the screen,
              not a page: the figure it is asking about stays in view above it (lib/guide.ts). */}
          <div className="guide-bar__head">
            <p className="guide-bar__step">
              {c.guide.step(at + 1, ids.length)} · {owner}
            </p>
            <button type="button" className="btn btn--icon btn--ghost guide-bar__close" onClick={onClose} aria-label={c.guide.close} title={c.guide.close}>
              <Icon name="x-bold" size={18} />
            </button>
          </div>
          <p className="guide-bar__title">{c.kind[fact.kind]}</p>
          <p className="guide-bar__where">
            <strong>{c.guide.document}{t.common.colon}</strong> {c.docs[fact.doc].name}. <strong>{c.guide.whereIs}{t.common.colon}</strong> {where}
            {entry?.label ? (
              <>
                {' '}
                <strong>{c.guide.wording}{t.common.colon}</strong> « {entry.label} »
              </>
            ) : null}
            {entry?.url ? (
              <>
                {' '}
                <a className="info-note__link" href={entry.url} target="_blank" rel="noopener noreferrer">
                  {c.panel.openPage}
                  <Icon name="arrow-up-right-bold" size={14} />
                </a>
              </>
            ) : null}
          </p>
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
          </div>
        </Fragment>
      )}
    </aside>
  )
}
