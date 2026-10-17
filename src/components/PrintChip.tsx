import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../i18n'
import { PRINT_KINDS, type PrintKind } from '../lib/printKind'
import { PRINT_MENU_COPY } from '../lib/printMenuCopy'
import { profileGaps } from '../lib/profileGaps'
import { useProfile } from '../lib/store'
import { Chip } from './Chip'
import { Modal } from './Modal'

// « Imprimer… » — ONE chip that lists the pages a household can put on paper (lib/printKind.ts). It lives on « Ma fiche » and in the settings, not on the results page: choosing a page goes to
// the results page with `?imprimer=<page>` (pages/Resultats.tsx `usePrintRequest`), which holds the numbers the paper page is drawn from, waits for them, asks the browser to print and clears the
// address. Nothing here loads the paper pages: this chip is light, and the results page fetches them. Until the profile holds enough to mean something the chip says so instead of printing a blank.

export function PrintChip() {
  const { lang } = useLang()
  const c = PRINT_MENU_COPY[lang]
  const navigate = useNavigate()
  const profile = useProfile()
  const [open, setOpen] = useState(false)
  const gaps = profileGaps(profile).length > 0
  const pick = (kind: PrintKind) => {
    setOpen(false)
    navigate(`/resultats?imprimer=${kind}`)
  }
  return (
    <>
      <Chip icon="printer-bold" onClick={() => setOpen(true)}>
        {c.button}
      </Chip>
      <Modal open={open} onClose={() => setOpen(false)} title={c.title}>
        <p className="field-row__hint">{c.lead}</p>
        <ul className="print-menu">
          {PRINT_KINDS.map((kind) => (
            <li key={kind}>
              <button type="button" className="btn print-menu__item" disabled={gaps} onClick={() => pick(kind)}>
                <span className="print-menu__name">{c.kinds[kind].name}</span>
                <span className="print-menu__hint">{c.kinds[kind].hint}</span>
              </button>
            </li>
          ))}
        </ul>
        {gaps && (
          <p className="field-row__hint" role="status">
            {c.needsProfile}
          </p>
        )}
      </Modal>
    </>
  )
}
