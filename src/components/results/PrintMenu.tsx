import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { choosePrintKind, currentPrintKind, PRINT_KINDS, printReady } from '../../lib/printKind'
import type { ResultsModel } from '../../lib/useResultsPage'
import { PrintPlan } from './PrintPlan'

// The paper side of « Imprimer… » (the chip itself is components/PrintChip.tsx, on « Ma fiche » and in the settings). A choice arrives as `?imprimer=<page>`: this hook waits until the numbers
// that page is drawn from are in, fetches the pages other than the plan, remembers the choice for the one print that follows, asks the browser to print, and clears the address. The browser's own
// Ctrl+P still prints the plan. Everything stays on the device.
//
// The pages other than the plan ride a chunk of their own (PrintKinds.tsx). The hook FETCHES it before it prints: `beforeprint` mounts the paper page at once and the browser
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

/** Answers `?imprimer=<page>`: prints that page once the model can draw it, then clears the address so a reload does not print again. */
export function usePrintRequest(m: ResultsModel): void {
  const [params, setParams] = useSearchParams()
  const asked = PRINT_KINDS.find((k) => k === params.get('imprimer'))
  const raw = params.get('imprimer')
  const ready = asked !== undefined && printReady(asked, { answerPending: m.answerPending, runsPending: m.runsPending, runs: m.runs.length, retiredNow: m.retiredNow, range: m.range, stress: m.stress })
  const gaps = m.gaps.length > 0
  const clear = () =>
    setParams(
      () => {
        const url = new URLSearchParams(window.location.search)
        url.delete('imprimer')
        return url
      },
      { replace: true },
    )
  useEffect(() => {
    // An address that names no page, or a profile with nothing to print: drop the key and stay.
    if (raw !== null && (asked === undefined || gaps)) return clear()
    if (asked === undefined || !ready) return
    let cancelled = false
    void (async () => {
      try {
        if (asked !== 'summary') await loadKinds()
      } catch {
        return clear()
      }
      if (cancelled) return
      choosePrintKind(asked)
      clear()
      // A turn of the event loop: the address is rewritten before the browser lays the page out for paper.
      setTimeout(() => window.print(), 0)
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asked, raw, ready, gaps])
}
