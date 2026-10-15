import { useState } from 'react'
import { DisplayControls } from './DisplayControls'
import { SubTabs } from './SubTabs'
import { useLang, type Lang } from '../i18n'
import { markReadingHelpDone, readingHelpDone } from '../lib/readingHelp'
import { READING_HELP_COPY } from '../lib/readingHelpCopy'

// ReadingHelp — the front door's first offer, above everything else: the language, the size of the letters, the contrast and day / night, in plain words, before a
// single question. It shows until the visitor says « C'est bien comme ça » (kept on this device, lib/readingHelp.ts); the same controls live on the settings page for good.
export function ReadingHelp() {
  const { lang, setLang } = useLang()
  const c = READING_HELP_COPY[lang]
  const [away, setAway] = useState(readingHelpDone)
  if (away) return null
  return (
    <section className="surface reading-help" aria-labelledby="reading-help-title">
      <h2 id="reading-help-title" className="welcome__title">
        {c.title}
      </h2>
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
        <button
          type="button"
          className="btn btn--primary"
          onClick={() => {
            markReadingHelpDone()
            setAway(true)
          }}
        >
          {c.done}
        </button>
      </div>
    </section>
  )
}
