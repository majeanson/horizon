import type { Lang } from '../i18n.ts'

// THE WORDS OF « COLLER MON RELEVÉ ». Outside the eager dictionaries (the first screen never needs them).

export interface PasteCopy {
  open: string
  hint: string
  label: string
  placeholder: string
  nothing: string
  found: (n: number, first: number, last: number, skipped: number) => string
  column: (n: number, sample: string) => string
  apply: string
  applied: (n: number) => string
  cancel: string
  replaces: (n: number) => string
}

const FR: PasteCopy = {
  open: 'Coller mon relevé',
  hint: 'Dans votre relevé de participation de Retraite Québec, copiez le tableau des gains (toutes les lignes) et collez-le ici. Rien ne quitte votre appareil.',
  label: 'Tableau copié du relevé de participation',
  placeholder: '2019\t52 300 $\n2020\t54 100 $\n…',
  nothing: 'Aucune année lue pour l’instant : chaque ligne doit commencer par (ou contenir) l’année, suivie d’un montant.',
  found: (n, first, last, skipped) => `${n} ${n === 1 ? 'année lue' : 'années lues'} (${first}–${last})${skipped > 0 ? `, ${skipped} ${skipped === 1 ? 'ligne ignorée' : 'lignes ignorées'}` : ''}.`,
  column: (n, sample) => `Montant n° ${n} de chaque ligne — par exemple ${sample}`,
  apply: 'Importer ces années',
  applied: (n) => `${n} ${n === 1 ? 'année importée' : 'années importées'} et marquées comme confirmées.`,
  cancel: 'Annuler',
  replaces: (n) => `${n} ${n === 1 ? 'année déjà saisie sera remplacée' : 'années déjà saisies seront remplacées'}.`,
}

const EN: PasteCopy = {
  open: 'Paste my statement',
  hint: 'In your Retraite Québec statement of participation, copy the table of earnings (every row) and paste it here. Nothing leaves your device.',
  label: 'Table copied from the statement of participation',
  placeholder: '2019\t52,300 $\n2020\t54,100 $\n…',
  nothing: 'No year read yet: each line must start with (or contain) the year, followed by an amount.',
  found: (n, first, last, skipped) => `${n} ${n === 1 ? 'year read' : 'years read'} (${first}–${last})${skipped > 0 ? `, ${skipped} ${skipped === 1 ? 'line ignored' : 'lines ignored'}` : ''}.`,
  column: (n, sample) => `Amount no. ${n} of each line — for example ${sample}`,
  apply: 'Import these years',
  applied: (n) => `${n} ${n === 1 ? 'year imported' : 'years imported'} and marked as confirmed.`,
  cancel: 'Cancel',
  replaces: (n) => `${n} ${n === 1 ? 'year already entered will be replaced' : 'years already entered will be replaced'}.`,
}

export const PASTE_COPY: Record<Lang, PasteCopy> = { fr: FR, en: EN }
