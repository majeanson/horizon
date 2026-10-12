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
  /** « Comment s'y retrouver »: the whole app in a few lines — each place, and what it is for. */
  guideTitle: string
  guide: { name: string; text: string; to: string | null }[]
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
  guideTitle: 'Comment s’y retrouver',
  guide: [
    { name: 'Profil', text: 'Vos chiffres. Remplissez-les par sujet, ou document par document : un chiffre reste « estimé » tant que vous ne l’avez pas confirmé sur un document.', to: '/profil' },
    { name: 'Hypothèses', text: 'Ce que vous supposez de l’avenir : prix, rendements, âge de fin du plan. Le scénario Neutre est déjà choisi.', to: '/hypotheses' },
    { name: 'Résultats › Réponse', text: 'L’âge le plus tôt où l’argent dure jusqu’à la fin du plan. Comparez des âges de départ, voyez quels chiffres préciser en premier.', to: '/resultats' },
    { name: 'Résultats › Essayer', text: 'Ce que vous pourriez changer pour partir plus tôt : dépenser moins, épargner plus, des soins plus coûteux.', to: '/resultats?v=adjust' },
    { name: 'Résultats › Stratégies', text: 'Quand commencer vos rentes (RRQ et PSV) et dans quel ordre puiser dans vos comptes.', to: '/resultats?v=strategies' },
    { name: 'Résultats › Vérifier', text: 'Si la réponse est solide, ce qui a été vérifié, et chaque chiffre avec son calcul.', to: '/resultats?v=verify' },
    { name: 'Votre réponse', text: 'La ligne en haut de Profil et d’Hypothèses : elle bouge à mesure que vous tapez.', to: null },
    { name: 'Ma fiche', text: 'Votre ménage d’un coup d’œil : la réponse et sa solidité, le plan en une ligne, ce que vous détenez et les chiffres à confirmer en premier. Chaque carte mène au champ qui la change.', to: '/fiche' },
    { name: 'En haut', text: 'Le glossaire des sigles et les réglages (copies de sauvegarde, plans, exemples). Les barres du haut se cachent quand vous descendez et reviennent quand vous remontez.', to: null },
  ],
  goodToKnow: 'Bon à savoir',
  facts: [
    { title: 'Tout reste sur cet appareil', text: 'Aucun compte, aucun serveur : vos chiffres ne quittent jamais votre appareil. Gardez une copie de sauvegarde.', link: 'Sauvegarde et réglages', to: '/donnees' },
    { title: 'Chaque chiffre a sa source', text: 'Les montants du gouvernement viennent d’une page officielle, citée, que n’importe qui peut vérifier.', link: 'Glossaire des sigles', to: '/glossaire' },
    { title: 'Mieux vaut des documents en main', text: 'Le relevé de Retraite Québec et vos avis de cotisation rendent les chiffres exacts.', link: 'Documents à rassembler', to: '/profil?form=1&par=document&etape=gather' },
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
  guideTitle: 'Finding your way',
  guide: [
    { name: 'Profile', text: 'Your figures. Fill them in by topic, or document by document: a figure stays “estimated” until you confirm it on a document.', to: '/profil' },
    { name: 'Assumptions', text: 'What you assume about the future: prices, returns, the age the plan runs to. The Neutral scenario is already chosen.', to: '/hypotheses' },
    { name: 'Results › Answer', text: 'The earliest age at which the money lasts to the end of the plan. Compare departure ages, see which figures to confirm first.', to: '/resultats' },
    { name: 'Results › Try', text: 'What you could change to leave earlier: spend less, save more, costlier care.', to: '/resultats?v=adjust' },
    { name: 'Results › Strategies', text: 'When to start your pensions (QPP and OAS) and in which order to draw your accounts.', to: '/resultats?v=strategies' },
    { name: 'Results › Check', text: 'Whether the answer is firm, what was checked, and every figure with its calculation.', to: '/resultats?v=verify' },
    { name: 'Your answer', text: 'The line at the top of Profile and Assumptions: it moves as you type.', to: null },
    { name: 'My sheet', text: 'Your household at a glance: the answer and how sturdy it is, the plan in one line, what you hold and the figures to confirm first. Each card leads to the field that changes it.', to: '/fiche' },
    { name: 'At the top', text: 'The glossary of acronyms and the settings (backup copies, plans, examples). The top bars hide as you scroll down and come back as you scroll up.', to: null },
  ],
  goodToKnow: 'Good to know',
  facts: [
    { title: 'Everything stays on this device', text: 'No account, no server: your figures never leave your device. Keep a backup copy.', link: 'Backup and settings', to: '/donnees' },
    { title: 'Every figure has a source', text: 'Government amounts come from a cited official page that anyone can check.', link: 'Glossary of acronyms', to: '/glossaire' },
    { title: 'Documents in hand help', text: 'The Retraite Québec statement and your notices of assessment make the figures exact.', link: 'Documents to gather', to: '/profil?form=1&par=document&etape=gather' },
  ],
}

export const WELCOME_COPY: Record<Lang, WelcomeCopy> = { fr: FR, en: EN }
