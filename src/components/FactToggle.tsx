import { useState } from 'react'
import { useLang } from '../i18n'
import { GUIDE_COPY } from '../lib/guideCopy'
import { toggleFact } from '../lib/profileEdit'
import { updateProfile, useProfile } from '../lib/store'
import { Icon } from './Icon'

// The mark beside a figure: « I read this on a document » (confirmed) or « this is from memory or an estimate »
// (estimated). A toggle, never automatic — nothing is assumed real. Lazy-loaded with its words (FieldRow), so the first
// screen does not carry them. It SAYS its state, in a word on the pill (« Estimé » / « Confirmé »): an empty circle whose
// meaning lived in a tooltip never showed it on a phone. A full touch target like the ⓘ it sits beside.

export default function FactToggle({ id, label, line = false }: { id: string; label: string; line?: boolean }) {
  const { lang } = useLang()
  const c = GUIDE_COPY[lang]
  const confirmed = useProfile().confirmed.includes(id)
  // A tap that CONFIRMS draws the tick on (styles/motion.css); a figure that arrives already confirmed just shows it. Reset by the next tap, never by a timer.
  const [fresh, setFresh] = useState(false)
  const button = (
    <button
      type="button"
      className={'fact-btn' + (confirmed ? ' is-on' : '') + (confirmed && fresh ? ' is-fresh' : '')}
      aria-pressed={confirmed}
      aria-label={confirmed ? c.fact.confirmed(label) : c.fact.estimated(label)}
      title={confirmed ? c.fact.confirmedShort : c.fact.estimatedShort}
      onClick={() => {
        setFresh(!confirmed)
        updateProfile((p) => toggleFact(p, id))
      }}
    >
      <span className="fact-btn__mark" aria-hidden="true">
        {confirmed &&
          (fresh ? (
            <svg className="fact-btn__tick" viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
              <path d="M2 6.4 4.9 9.2 10 3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" pathLength="1" />
            </svg>
          ) : (
            <Icon name="check-bold" size={12} />
          ))}
      </span>
      <span className="fact-btn__word" aria-hidden="true">
        {confirmed ? c.panel.legendConfirmed : c.panel.legendEstimated}
      </span>
    </button>
  )
  // The line form carries the figure's name too: « Historique de revenus — Estimé ».
  if (!line) return button
  return (
    <div className="fact-line__row">
      <span className="fact-line__text">{label}</span>
      {button}
    </div>
  )
}
