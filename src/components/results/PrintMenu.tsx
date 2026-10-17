import { useState } from 'react'
import { flushSync } from 'react-dom'
import { useLang } from '../../i18n'
import { choosePrintKind, currentPrintKind, PRINT_KINDS, type PrintKind } from '../../lib/printKind'
import { PRINT_MENU_COPY } from '../../lib/printMenuCopy'
import type { ResultsModel } from '../../lib/useResultsPage'
import { Chip } from '../Chip'
import { Modal } from '../Modal'
import { PrintPlan } from './PrintPlan'

// « Imprimer… » — ONE chip that lists the pages a household can put on paper (lib/printKind.ts): the plan on one page, its calendar, a leaflet to fold, the year-by-year table, the sources. Choosing one closes the
// list, remembers the choice for the one print that follows, and asks the browser to print; the browser's own Ctrl+P still prints the plan. Everything stays on the device.
//
// The pages other than the plan ride a chunk of their own (PrintKinds.tsx). The menu FETCHES it before it prints: `beforeprint` mounts the paper page at once and the browser
// takes its snapshot as soon as that returns, so a page that was still loading would print as a blank. That is also why the loaded module is kept here and not behind `lazy()`.

let kinds: typeof import('./PrintKinds') | null = null
const loadKinds = async () => (kinds ??= await import('./PrintKinds'))

/** The paper page of the print in progress: the kind the menu chose, or the one-page plan. */
export function PrintKindView({ m }: { m: ResultsModel }) {
  const kind = currentPrintKind()
  if (kind === 'calendar' && kinds) return <kinds.PrintCalendar m={m} />
  if (kind === 'leaflet' && kinds) return <kinds.PrintLeaflet m={m} />
  if (kind === 'dossier' && kinds) return <kinds.PrintDossier m={m} />
  if (kind === 'years' && kinds) return <kinds.PrintYears m={m} />
  if (kind === 'sources' && kinds) return <kinds.PrintSources m={m} />
  return <PrintPlan m={m} />
}

export function PrintMenu({ m }: { m: ResultsModel }) {
  const { lang } = useLang()
  const c = PRINT_MENU_COPY[lang]
  const [open, setOpen] = useState(false)
  const [failed, setFailed] = useState(false)
  const ready = (kind: PrintKind) => kind !== 'years' || (!m.runsPending && m.runs.length > 0)
  const print = async (kind: PrintKind) => {
    if (!ready(kind)) return setFailed(true)
    try {
      if (kind !== 'summary') await loadKinds()
    } catch {
      return setFailed(true)
    }
    flushSync(() => setOpen(false))
    choosePrintKind(kind)
    // A turn of the event loop: the dialog's cleanup (the page behind it is inert while it is open) runs before the browser lays the page out for paper.
    setTimeout(() => window.print(), 0)
  }
  return (
    <>
      <Chip
        icon="printer-bold"
        onClick={() => {
          setFailed(false)
          setOpen(true)
          // The pages are fetched while the list is read, so a choice prints at once.
          void loadKinds().catch(() => undefined)
        }}
      >
        {c.button}
      </Chip>
      <Modal open={open} onClose={() => setOpen(false)} title={c.title}>
        <p className="field-row__hint">{c.lead}</p>
        <ul className="print-menu">
          {PRINT_KINDS.map((kind) => (
            <li key={kind}>
              <button type="button" className="btn print-menu__item" disabled={!ready(kind)} onClick={() => void print(kind)}>
                <span className="print-menu__name">{c.kinds[kind].name}</span>
                <span className="print-menu__hint">{c.kinds[kind].hint}</span>
              </button>
            </li>
          ))}
        </ul>
        {(failed || !ready('years')) && (
          <p className="field-row__hint" role="status">
            {c.notReady}
          </p>
        )}
      </Modal>
    </>
  )
}
