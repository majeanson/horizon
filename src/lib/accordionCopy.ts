import type { Lang } from '../i18n.ts'

// THE WORDS OF THE ACCORDION (components/Accordion.tsx): the two chips at the foot of an open block, the switch between « one block at a time » and « every block », and
// the line a finished block shows while closed. Outside the eager dictionaries: every page that folds its blocks is a lazy chunk.

export interface AccordionCopy {
  previous: string
  next: string
  /** The switch: every block open at once, or every block closed. */
  openAll: string
  closeAll: string
  /** A block whose figures are all confirmed, while it is closed: « 9 chiffres confirmés ». */
  done: (n: number) => string
  /** The accessible name of the switch's group. */
  modeLabel: string
}

export const ACCORDION_COPY: Record<Lang, AccordionCopy> = {
  fr: {
    previous: 'Précédent',
    next: 'Suivant',
    openAll: 'Tout ouvrir',
    closeAll: 'Tout fermer',
    done: (n) => (n === 1 ? '1 chiffre confirmé' : `${n} chiffres confirmés`),
    modeLabel: 'Façon d’afficher les blocs',
  },
  en: {
    previous: 'Previous',
    next: 'Next',
    openAll: 'Open everything',
    closeAll: 'Close everything',
    done: (n) => (n === 1 ? '1 figure confirmed' : `${n} figures confirmed`),
    modeLabel: 'How the blocks are shown',
  },
}
