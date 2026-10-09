import { useState } from 'react'
import { useLang } from '../../i18n'
import { RESULTS_COPY } from '../../lib/resultsCopy'
import { Chip } from '../Chip'

// « Comment lire cette page ? » — one small chip under the answer. Closed by default, so nobody who knows the page reads past it; opened, it says
// in one line each what the page's parts are for. Local to the visit: nothing is stored, nothing is remembered.
export function HowToRead() {
  const { lang } = useLang()
  const c = RESULTS_COPY[lang].howto
  const [open, setOpen] = useState(false)
  return (
    <div className="how-to-read">
      <Chip expanded={open} onClick={() => setOpen((v) => !v)}>
        {c.open}
      </Chip>
      {open && (
        <ul className="how-to-read__list">
          {c.items.map(([name, text]) => (
            <li key={name}>
              <strong>{name}</strong> — {text}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
