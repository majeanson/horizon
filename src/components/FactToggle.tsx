import { useLang } from '../i18n'
import { GUIDE_COPY } from '../lib/guideCopy'
import { toggleFact } from '../lib/profileEdit'
import { updateProfile, useProfile } from '../lib/store'
import { Icon } from './Icon'

// The check beside a figure: « I read this on a document » (confirmed) or « this is from memory or an estimate » (estimated).
// A toggle, never automatic — nothing is assumed real. Lazy-loaded with its words (FieldRow), so the first screen does not carry
// them. The mark is a full touch target like the ⓘ beside it, and says its state in words, not in colour alone.

export default function FactToggle({ id, label, line = false }: { id: string; label: string; line?: boolean }) {
  const { lang } = useLang()
  const c = GUIDE_COPY[lang].fact
  const confirmed = useProfile().confirmed.includes(id)
  const button = (
    <button
      type="button"
      className={'fact-btn' + (confirmed ? ' is-on' : '')}
      aria-pressed={confirmed}
      aria-label={confirmed ? c.confirmed(label) : c.estimated(label)}
      title={confirmed ? c.confirmedShort : c.estimatedShort}
      onClick={() => updateProfile((p) => toggleFact(p, id))}
    >
      <span className="fact-btn__mark">{confirmed && <Icon name="check-bold" size={14} />}</span>
    </button>
  )
  // The line form says the state in words beside the mark: « Historique de revenus : estimé ».
  if (!line) return button
  return (
    <div className="fact-line__row">
      {button}
      <span className="fact-line__text">
        {label} : <strong>{confirmed ? GUIDE_COPY[lang].panel.legendConfirmed.toLowerCase() : GUIDE_COPY[lang].panel.legendEstimated.toLowerCase()}</strong>
      </span>
    </div>
  )
}
