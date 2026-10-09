import type { Lang } from '../i18n.ts'

// THE WORDS OF « SAISIE PAR DOCUMENT ». The documents' own names, what each is for and where to find it are the profile guide's (lib/guideCopy.ts).

export interface EntryCopy {
  title: string
  subtitle: string
  intro: string
  youTitle: string
  youHint: string
  stepOf: (n: number, total: number) => string
  nav: string
  prev: string
  next: string
  finish: string
  confirmAll: string
  unconfirmAll: string
  confirmedOf: (confirmed: number, total: number) => string
  notGathered: string
  resume: (stepName: string) => string
  resumeGo: string
  documents: string
  taxTitle: string
  taxHint: string
  readOff: string
  where: string
  openOfficial: string
}

const FR: EntryCopy = {
  title: 'Saisie par document',
  subtitle: 'Un document à la fois : ouvrez-le, tapez ce qu’il contient, confirmez, passez au suivant.',
  intro: 'Chaque étape ne montre que les chiffres du document en main, pour vous et votre partenaire côte à côte. Tout s’enregistre à mesure, sur cet appareil ; vous pouvez partir et revenir.',
  youTitle: 'Vous et votre ménage',
  youHint: 'Qui est dans le ménage, la naissance de chacun et l’âge de retraite visé : rien à lire sur un document.',
  stepOf: (n, total) => `Étape ${n} sur ${total}`,
  nav: 'Les étapes de la saisie',
  prev: 'Précédent',
  next: 'Suivant',
  finish: 'Terminer et voir le résultat',
  confirmAll: 'Tout confirmé pour ce document',
  unconfirmAll: 'Retirer la confirmation',
  confirmedOf: (confirmed, total) => `${confirmed} sur ${total} chiffres confirmés pour ce document`,
  notGathered: 'Vous n’avez pas coché ce document dans la liste : si vous ne l’avez pas encore, passez à la suite, les chiffres resteront estimés.',
  resume: (stepName) => `Vous en étiez à : ${stepName}.`,
  resumeGo: 'Reprendre',
  documents: 'Liste des documents',
  taxTitle: 'Revenu et droits de cotisation',
  taxHint: 'Les deux viennent de l’avis de cotisation et du compte de l’ARC.',
  readOff: 'Vous y lirez',
  where: 'Où le trouver',
  openOfficial: 'Ouvrir la page officielle',
}

const EN: EntryCopy = {
  title: 'Entry by document',
  subtitle: 'One document at a time: open it, type what it holds, confirm, move on.',
  intro: 'Each step shows only the figures of the document in hand, for you and your partner side by side. Everything is saved as you go, on this device; you can leave and come back.',
  youTitle: 'You and your household',
  youHint: 'Who is in the household, everyone’s birth and the retirement age you aim for: nothing to read off a document.',
  stepOf: (n, total) => `Step ${n} of ${total}`,
  nav: 'The steps of the entry',
  prev: 'Back',
  next: 'Next',
  finish: 'Finish and see the result',
  confirmAll: 'All confirmed for this document',
  unconfirmAll: 'Remove the confirmation',
  confirmedOf: (confirmed, total) => `${confirmed} of ${total} figures confirmed for this document`,
  notGathered: 'You did not tick this document in the list: if you do not have it yet, move on, the figures will stay estimated.',
  resume: (stepName) => `You were at: ${stepName}.`,
  resumeGo: 'Resume',
  documents: 'List of documents',
  taxTitle: 'Income and contribution room',
  taxHint: 'Both come from the notice of assessment and the CRA account.',
  readOff: 'You will read',
  where: 'Where to find it',
  openOfficial: 'Open the official page',
}

export const ENTRY_COPY: Record<Lang, EntryCopy> = { fr: FR, en: EN }
