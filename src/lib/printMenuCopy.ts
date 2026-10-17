import type { Family } from './figuresUsed'
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
  /** The line at the foot of the proof file that sends to the next page for every other government figure. */
  dossierSources: string
  /** The share link's code on the leaflet: the words under it and its accessible name. */
  qr: string
  qrAria: string
  /** The page of the figures that apply: what it says about the rows it left out, and the name of each family left out. */
  figuresLeft: (names: string, count: number) => string
  families: Record<Family, string>
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
      calendar: { name: 'Le calendrier', hint: 'Les dates de votre plan, année par année, avec les âges de chacun.' },
      leaflet: { name: 'Le dépliant', hint: 'Une page à plier en trois : la réponse, le calendrier et les hypothèses.' },
      dossier: { name: 'Le dossier de preuve', hint: 'Chaque chiffre du profil, le calcul de chaque rente avec vos nombres, et la page officielle de la règle.' },
      years: { name: 'Année par année', hint: 'Le tableau de l’âge choisi dans Preuve : revenus, impôt, dépenses et avoir, pour chaque année.' },
      sources: { name: 'Les sources', hint: 'Les chiffres du gouvernement qui s’appliquent à votre ménage, chacun avec sa page officielle et le jour où elle a été lue.' },
    },
    headings: {
      calendar: 'Horizon — le calendrier du plan',
      leaflet: 'Horizon — mon plan en un dépliant',
      dossier: 'Horizon — le dossier de preuve',
      years: 'Horizon — année par année',
      sources: 'Horizon — les sources des chiffres',
    },
    dossierSources: 'Chaque autre chiffre du gouvernement que le calcul lit, avec sa page officielle, est sur la page « Les sources ».',
    qr: 'Scannez pour ouvrir ce scénario : seuls l’âge, le type de ménage et la langue sont dans le lien.',
    qrAria: 'Code QR du lien de partage de ce scénario',
    figuresLeft: (names, count) => `Laissés de côté, parce que votre profil ne les concerne pas : ${names} (${count} chiffres). La liste complète est sur la page « Les sources ».`,
    families: { children: 'enfants et congé parental', survivor: 'rente de survivant', couple: 'barèmes de couple', alone: 'montant pour personne vivant seule', work: 'cotisations des travailleurs' },
    notReady: 'Ce tableau se prépare encore. Réessayez dans un instant.',
  },
  en: {
    button: 'Print…',
    title: 'Print',
    lead: 'It all happens on your device: the browser prints the page, or saves it as a PDF.',
    kinds: {
      summary: { name: 'The plan on one page', hint: 'The answer and its dates, the assumptions, the figures in the profile and how firm it is.' },
      calendar: { name: 'The calendar', hint: 'The dates of your plan, year by year, with each person’s age.' },
      leaflet: { name: 'The leaflet', hint: 'One page to fold in three: the answer, the calendar and the assumptions.' },
      dossier: { name: 'The proof file', hint: 'Every figure in the profile, the calculation of each pension with your numbers, and the official page of the rule.' },
      years: { name: 'Year by year', hint: 'The table for the age chosen in Proof: income, tax, spending and net worth for every year.' },
      sources: { name: 'The sources', hint: 'The government figures that apply to your household, each with its official page and the day it was read.' },
    },
    headings: {
      calendar: 'Horizon — the plan’s calendar',
      leaflet: 'Horizon — my plan as a leaflet',
      dossier: 'Horizon — the proof file',
      years: 'Horizon — year by year',
      sources: 'Horizon — where the figures come from',
    },
    dossierSources: 'Every other government figure the calculation reads, with its official page, is on the “The sources” page.',
    qr: 'Scan to open this scenario: only the age, the household type and the language are in the link.',
    qrAria: 'QR code of this scenario’s share link',
    figuresLeft: (names, count) => `Left out because your profile does not involve them: ${names} (${count} figures). The full list is on the “The sources” page.`,
    families: { children: 'children and parental leave', survivor: 'survivor pension', couple: 'couple scales', alone: 'living-alone amount', work: 'payroll contributions' },
    notReady: 'This table is still being worked out. Try again in a moment.',
  },
}
