// WHAT THE NEXT PRINT PRINTS. « Imprimer » is one chip with a short list of pages a household can put on paper; the browser's own Ctrl+P (and the print of any other page) prints
// the one-page plan, as it always did. The choice is made a moment before `window.print()` and read when `beforeprint` mounts the paper page (lib/usePrinting.ts), so it lives
// here, outside React: it is not a screen state, it is the ticket for one print. `usePrinting` hands it back on `afterprint`.

export const PRINT_KINDS = ['summary', 'calendar', 'leaflet', 'dossier', 'years', 'sources'] as const
export type PrintKind = (typeof PRINT_KINDS)[number]

let chosen: PrintKind = 'summary'

export const currentPrintKind = (): PrintKind => chosen

export function choosePrintKind(kind: PrintKind): void {
  chosen = kind
}

/** After a print, however it ended: the next Ctrl+P is the one-page plan again. */
export function resetPrintKind(): void {
  chosen = 'summary'
}

/** What the page has worked out, as far as a print can tell: undefined `range` / `stress` = still being worked out. */
export interface PrintInputs {
  answerPending: boolean
  runsPending: boolean
  runs: number
  retiredNow: boolean
  range: unknown
  stress: unknown
}

/**
 * Whether a page can go to paper NOW: every figure it prints is in. The plan prints the scenario range and the market stress (« Solidité »: they start only
 * once the answer is in, so printing on the answer printed « … » for all three scenarios) and the ages compared; « years » prints the runs. The other pages read
 * the answer alone.
 */
export function printReady(kind: PrintKind, m: PrintInputs): boolean {
  if (m.answerPending) return false
  if (kind === 'years') return !m.runsPending && m.runs > 0
  if (kind === 'summary') return !m.runsPending && (m.retiredNow || (m.range !== undefined && m.stress !== undefined))
  return true
}
