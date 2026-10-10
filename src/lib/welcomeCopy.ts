import type { Lang } from '../i18n.ts'

// THE WORDS OF THE FRONT DOOR (« Accueil », the page at `/`): what Horizon is, one button to begin, and three short things worth
// knowing before typing a figure. Outside the eager dictionaries — the page is a lazy chunk, and so are its words.

export interface WelcomeCopy {
  title: string
  subtitle: string
  /** The one button of a first visit, and the two of a returning one. */
  begin: string
  example: string
  seeAnswer: string
  editProfile: string
  stepsTitle: string
  steps: { title: string; text: string }[]
  goodToKnow: string
  facts: { title: string; text: string; link: string; to: string }[]
}

const FR: WelcomeCopy = {
  title: 'Quand pouvez-vous prendre votre retraite ?',
  subtitle: 'Horizon calcule l’âge le plus tôt où l’argent suffit, pour un ménage du Québec.',
  begin: 'Commencer',
  example: 'Voir un exemple',
  seeAnswer: 'Voir ma réponse',
  editProfile: 'Modifier mon profil',
  stepsTitle: 'Comment ça marche',
  steps: [
    { title: 'Vos chiffres', text: 'Quelques questions simples : votre âge, votre revenu, votre épargne, vos dépenses. Vous pouvez compléter plus tard.' },
    { title: 'Vos hypothèses', text: 'Facultatif. Le scénario Neutre est déjà choisi ; changez-le pour essayer un autre avenir.' },
    { title: 'Votre réponse', text: 'L’âge le plus tôt où l’argent dure, en graphique et année par année, avec ce que ça donne à 60 ans et à 65 ans.' },
  ],
  goodToKnow: 'Bon à savoir',
  facts: [
    { title: 'Tout reste sur cet appareil', text: 'Aucun compte, aucun serveur : vos chiffres ne quittent jamais votre appareil. Gardez une copie de sauvegarde.', link: 'Sauvegarde et réglages', to: '/donnees' },
    { title: 'Chaque chiffre a sa source', text: 'Les montants du gouvernement viennent d’une page officielle, citée, que n’importe qui peut vérifier.', link: 'Glossaire des sigles', to: '/glossaire' },
    { title: 'Mieux vaut des documents en main', text: 'Le relevé de Retraite Québec et vos avis de cotisation rendent les chiffres exacts.', link: 'Documents à rassembler', to: '/documents' },
  ],
}

const EN: WelcomeCopy = {
  title: 'When can you retire?',
  subtitle: 'Horizon finds the earliest age at which the money lasts, for a Québec household.',
  begin: 'Get started',
  example: 'See an example',
  seeAnswer: 'See my answer',
  editProfile: 'Edit my profile',
  stepsTitle: 'How it works',
  steps: [
    { title: 'Your figures', text: 'A few simple questions: your age, income, savings and spending. You can finish later.' },
    { title: 'Your assumptions', text: 'Optional. The Neutral scenario is already chosen; change it to try another future.' },
    { title: 'Your answer', text: 'The earliest age the money lasts, as a chart and year by year, with what it looks like at 60 and at 65.' },
  ],
  goodToKnow: 'Good to know',
  facts: [
    { title: 'Everything stays on this device', text: 'No account, no server: your figures never leave your device. Keep a backup copy.', link: 'Backup and settings', to: '/donnees' },
    { title: 'Every figure has a source', text: 'Government amounts come from a cited official page that anyone can check.', link: 'Glossary of acronyms', to: '/glossaire' },
    { title: 'Documents in hand help', text: 'The Retraite Québec statement and your notices of assessment make the figures exact.', link: 'Documents to gather', to: '/documents' },
  ],
}

export const WELCOME_COPY: Record<Lang, WelcomeCopy> = { fr: FR, en: EN }
