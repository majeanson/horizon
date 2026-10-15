import { useState } from 'react'
import { DisplayControls } from './DisplayControls'
import { Modal } from './Modal'
import { useLang } from '../i18n'
import { markReadingHelpDone, readingHelpDone } from '../lib/readingHelp'
import { READING_HELP_COPY } from '../lib/readingHelpCopy'

// ReadingHelp — the front door's first offer, before anything else: the language, the size of the letters, the contrast and day / night, in plain words, before a
// single question. It is a FULL-SCREEN dialog, shown ONCE per device: « C'est bien comme ça », the ✕, Escape — any way out puts it away for good (lib/readingHelp.ts).
// It used to be a card among the page's own, which a reader who needed bigger letters had to find first. The same controls live on the settings page for good.
// `open` + `onClose` make it CONTROLLED (the kit's specimen opens it on demand and never marks anything done); left out, it is the one-time offer, and
// `onDone` says when it was put away — the front door's next question (components/TimeBudget.tsx) waits for that.
export function ReadingHelp({ open, onClose, onDone }: { open?: boolean; onClose?: () => void; onDone?: () => void } = {}) {
  const { lang } = useLang()
  const c = READING_HELP_COPY[lang]
  const [away, setAway] = useState(readingHelpDone)
  const close = () => {
    if (onClose) return onClose()
    markReadingHelpDone()
    setAway(true)
    onDone?.()
  }
  return (
    <Modal open={open ?? !away} onClose={close} title={c.title} className="kit-modal--full reading-help">
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
