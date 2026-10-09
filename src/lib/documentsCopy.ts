import type { Lang } from '../i18n.ts'
import type { DocId } from './facts.ts'

// THE WORDS OF « DOCUMENTS À RASSEMBLER » (the page of that name). The documents' own names, what each is for and how to get it are the profile guide's
// (lib/guideCopy.ts): one wording, so the list and the guide can never disagree.

export interface DocumentsCopy {
  title: string
  subtitle: string
  intro: string
  progress: (done: number, total: number) => string
  progressAll: string
  print: string
  download: string
  reset: string
  have: string
  readOff: string
  where: string
  official: string
  openOfficial: string
  noPage: string
  when: Partial<Record<DocId, string>>
  forWho: (name: string) => string
  household: string
  file: string
  fileTitle: string
  fileIntro: string
  glossaryNote: string
  glossaryLink: string
  next: string
  nextGo: string
  /** The way from the checklist to typing: one document at a time. */
  entry: string
  entryHint: string
  /** The small link to this page, from Profil, the first visit and the glossary. */
  link: string
  downloaded: string
}

const FR: DocumentsCopy = {
  title: 'Documents à rassembler',
  subtitle: 'Tout ce qu’il faut pour un profil complet.',
  intro: 'Cochez au fur et à mesure, téléchargez ou imprimez la liste, rassemblez vos documents, puis saisissez les chiffres dans Profil quand vous voulez. Une fois ouvert, Horizon fonctionne sans connexion, et rien de ce que vous saisissez ne quitte l’appareil.',
  progress: (done, total) => `${done} sur ${total} rassemblés`,
  progressAll: 'Tout est rassemblé : vous pouvez saisir.',
  print: 'Imprimer la liste',
  download: 'Télécharger la liste',
  reset: 'Tout décocher',
  have: 'Je l’ai',
  readOff: 'Vous y lirez',
  where: 'Où le trouver',
  official: 'Page officielle',
  openOfficial: 'Ouvrir la page officielle',
  noPage: 'Pas de page officielle : c’est votre propre document.',
  when: {
    employer: 'Seulement si vous avez un régime de retraite d’employeur.',
    home: 'Seulement si vous êtes propriétaire.',
    residence: 'Seulement si vous n’êtes pas né au Canada.',
    budget: 'Les 12 derniers mois, si possible.',
  },
  forWho: (name) => `Pour ${name}`,
  household: 'Pour le ménage',
  file: 'horizon-documents.txt',
  fileTitle: 'Horizon : documents à rassembler',
  fileIntro: 'Cochez [x] ce que vous avez. Chaque document dit ce qu’on y lit et où le trouver. Rien de ce que vous saisissez ensuite ne quitte votre appareil.',
  glossaryNote: 'Un sigle vous échappe ?',
  glossaryLink: 'Le glossaire les explique',
  next: 'Quand tout est rassemblé',
  nextGo: 'Commencer avec Profil',
  entry: 'Saisie par document',
  entryHint: 'Une étape par document : seuls ses chiffres s’affichent, pour vous et votre partenaire côte à côte.',
  link: 'Documents à rassembler',
  downloaded: 'Liste téléchargée.',
}

const EN: DocumentsCopy = {
  title: 'Documents to gather',
  subtitle: 'Everything a full profile needs.',
  intro: 'Tick as you go, download or print the list, gather your documents, then type the figures into Profile whenever you like. Once open, Horizon works without a connection, and nothing you type leaves the device.',
  progress: (done, total) => `${done} of ${total} gathered`,
  progressAll: 'Everything is gathered: you can start typing.',
  print: 'Print the list',
  download: 'Download the list',
  reset: 'Untick all',
  have: 'I have it',
  readOff: 'You will read',
  where: 'Where to find it',
  official: 'Official page',
  openOfficial: 'Open the official page',
  noPage: 'No official page: it is your own document.',
  when: {
    employer: 'Only if you have an employer pension plan.',
    home: 'Only if you own your home.',
    residence: 'Only if you were not born in Canada.',
    budget: 'The last 12 months, if possible.',
  },
  forWho: (name) => `For ${name}`,
  household: 'For the household',
  file: 'horizon-documents.txt',
  fileTitle: 'Horizon: documents to gather',
  fileIntro: 'Tick [x] what you have. Each document says what you read off it and where to find it. Nothing you type afterwards leaves your device.',
  glossaryNote: 'An abbreviation puzzles you?',
  glossaryLink: 'The glossary explains them',
  next: 'When everything is gathered',
  nextGo: 'Start with Profile',
  entry: 'Entry by document',
  entryHint: 'One step per document: only its figures are shown, for you and your partner side by side.',
  link: 'Documents to gather',
  downloaded: 'List downloaded.',
}

export const DOCUMENTS_COPY: Record<Lang, DocumentsCopy> = { fr: FR, en: EN }
