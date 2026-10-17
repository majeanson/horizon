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
