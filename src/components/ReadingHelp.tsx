import { useState } from 'react'
import { DisplayControls } from './DisplayControls'
import { Modal } from './Modal'
import { SubTabs } from './SubTabs'
import { useLang, type Lang } from '../i18n'
import { markReadingHelpDone, readingHelpDone } from '../lib/readingHelp'
import { READING_HELP_COPY } from '../lib/readingHelpCopy'

// ReadingHelp — the front door's first offer, before anything else: the language, the size of the letters, the contrast and day / night, in plain words, before a
// single question. It is a FULL-SCREEN dialog, shown ONCE per device: « C'est bien comme ça », the ✕, Escape — any way out puts it away for good (lib/readingHelp.ts).
// It used to be a card among the page's own, which a reader who needed bigger letters had to find first. The same controls live on the settings page for good.
// `open` + `onClose` make it CONTROLLED (the kit's specimen opens it on demand and never marks anything done); left out, it is the one-time offer.
export function ReadingHelp({ open, onClose }: { open?: boolean; onClose?: () => void } = {}) {
  const { lang, setLang } = useLang()
  const c = READING_HELP_COPY[lang]
  const [away, setAway] = useState(readingHelpDone)
  const close = () => {
    if (onClose) return onClose()
    markReadingHelpDone()
    setAway(true)
  }
  return (
    <Modal open={open ?? !away} onClose={close} title={c.title} className="kit-modal--full reading-help">
      <p className="field-row__hint">{c.text}</p>
      <div className="field-row">
        <p className="field-row__label">{c.language}</p>
        <SubTabs
          size="mini"
          ariaLabel={c.language}
          value={lang}
          onSelect={(l: Lang) => setLang(l)}
          options={[
            { key: 'fr', label: c.languages.fr },
            { key: 'en', label: c.languages.en },
          ]}
        />
      </div>
      <DisplayControls sizeLabels={c.sizes} />
      <p className="field-row__hint">{c.zoomTip}</p>
      <div className="welcome__go">
        <button type="button" className="btn btn--primary" onClick={close}>
          {c.done}
        </button>
      </div>
    </Modal>
  )
}
