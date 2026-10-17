import type { PrintKind } from './printKind'

// The words of « Imprimer »: the chip, the dialog that lists what can be put on paper, and the heading each kind of page carries. Both languages, written for a
// reader of each (the English is not the French carried over). Lazy with the results page, like every other lib/*Copy.ts.

interface Kind {
  name: string
  hint: string
}

interface PrintMenuCopy {
  button: string
  title: string
  lead: string
  kinds: Record<PrintKind, Kind>
  /** The heading of each page but the plan (which keeps the results copy's), over the household and the date. */
  headings: Record<Exclude<PrintKind, 'summary'>, string>
  /** A kind that cannot be printed yet (its numbers are still being worked out). */
  notReady: string
}

export const PRINT_MENU_COPY: { fr: PrintMenuCopy; en: PrintMenuCopy } = {
  fr: {
    button: 'Imprimer…',
    title: 'Imprimer',
    lead: 'Tout se passe sur votre appareil : le navigateur imprime la page, ou l’enregistre en PDF.',
    kinds: {
      summary: { name: 'Le plan en une page', hint: 'La réponse et ses dates, les hypothèses, les chiffres du profil et la solidité.' },
      years: { name: 'Année par année', hint: 'Le tableau de l’âge choisi dans Preuve : revenus, impôt, dépenses et avoir, pour chaque année.' },
      sources: { name: 'Les sources', hint: 'Chaque chiffre du gouvernement que le calcul lit, sa page officielle et le jour où elle a été lue.' },
    },
    headings: {
      years: 'Horizon — année par année',
      sources: 'Horizon — les sources des chiffres',
    },
    notReady: 'Ce tableau se prépare encore. Réessayez dans un instant.',
  },
  en: {
    button: 'Print…',
    title: 'Print',
    lead: 'It all happens on your device: the browser prints the page, or saves it as a PDF.',
    kinds: {
      summary: { name: 'The plan on one page', hint: 'The answer and its dates, the assumptions, the figures in the profile and how firm it is.' },
      years: { name: 'Year by year', hint: 'The table for the age chosen in Proof: income, tax, spending and net worth for every year.' },
      sources: { name: 'The sources', hint: 'Every government figure the calculation reads, its official page and the day it was read.' },
    },
    headings: {
      years: 'Horizon — year by year',
      sources: 'Horizon — where the figures come from',
    },
    notReady: 'This table is still being worked out. Try again in a moment.',
  },
}
