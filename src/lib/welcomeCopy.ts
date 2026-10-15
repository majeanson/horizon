import type { Lang } from '../i18n.ts'
import type { TimeBudget } from './timeBudget.ts'

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
  steps: { title: string; text: string; to: string }[]
  /** « Comment s'y retrouver »: the whole app in a few lines — each place, and what it is for. */
  guideTitle: string
  guide: { name: string; text: string; to: string | null }[]
  goodToKnow: string
  facts: { title: string; text: string; link: string; to: string }[]
  /** The one question of a returning visit (components/DripQuestion.tsx): the unconfirmed figure that most narrows the answer. */
  drip: { title: string; swing: (years: number) => string; go: string; all: string; later: string }
  /** The first visit's demo card (components/DemoAnswer.tsx): a real answer for an example household. The households' names and stories are exampleCopy's. */
  demo: { title: string; pick: string; frame: string; try: string }
  /** The three doors in, by effort — one per time budget (lib/timeBudget.ts, whose paths timeBudget.test.ts holds equal to these). `to` is a route of the app (welcomeCopy.test.ts holds it to one). */
  doorsTitle: string
  doors: { budget: TimeBudget; label: string; hint: string; to: string }[]
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
    { title: 'Vos chiffres', text: 'Quelques questions simples : votre âge, votre revenu, votre épargne, vos dépenses. Vous pouvez compléter plus tard.', to: '/profil' },
    { title: 'Vos hypothèses', text: 'Facultatif. Le scénario Neutre est déjà choisi ; changez-le pour essayer un autre avenir.', to: '/hypotheses' },
    { title: 'Votre réponse', text: 'L’âge le plus tôt où l’argent dure, en graphique et année par année, avec ce que ça donne à 60 ans et à 65 ans.', to: '/resultats' },
  ],
  guideTitle: 'Comment s’y retrouver',
  guide: [
    { name: 'Profil', text: 'Vos chiffres. Remplissez-les par sujet, ou document par document : un chiffre reste « estimé » tant que vous ne l’avez pas confirmé sur un document.', to: '/profil' },
    { name: 'Hypothèses', text: 'Ce que vous supposez de l’avenir : prix, rendements, âge de fin du plan. Le scénario Neutre est déjà choisi.', to: '/hypotheses' },
    { name: 'Résultats › Réponse', text: 'L’âge le plus tôt où l’argent dure jusqu’à la fin du plan. Comparez des âges de départ, voyez quels chiffres préciser en premier.', to: '/resultats' },
    { name: 'Résultats › Décider', text: 'Ce que vous pourriez changer pour partir plus tôt (dépenser moins, épargner plus, des soins plus coûteux), puis quand commencer vos rentes (RRQ et PSV), dans quel ordre puiser dans vos comptes et jusqu’où fondre le REER.', to: '/resultats?v=decide' },
    { name: 'Résultats › Preuve', text: 'Si la réponse est solide, ce qui a été vérifié, et chaque chiffre avec son calcul.', to: '/resultats?v=proof' },
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
  drip: {
    title: 'Une question pour préciser votre réponse',
    swing: (years) => `Le confirmer pourrait resserrer la réponse d’environ ${years} ${years === 1 ? 'an' : 'ans'}.`,
    go: 'Confirmer ce chiffre',
    all: 'Voir tout ce qui reste estimé',
    later: 'Plus tard',
  },
  demo: {
    title: 'Voyez à quoi ressemble une réponse',
    pick: 'Choisir un ménage exemple',
    frame: 'Un exemple, pas votre situation',
    try: 'Essayer avec ce ménage',
  },
  doorsTitle: 'Par où commencer ?',
  doors: [
    { budget: '2', label: 'J’ai 2 minutes', hint: 'Quelques questions, et une première réponse tout de suite.', to: '/profil?debut=rapide' },
    { budget: '15', label: 'Je prends le temps (≈ 15 minutes)', hint: 'Une question à la fois, avec la raison de chacune.', to: '/profil?debut=complet' },
    { budget: '30', label: 'J’ai mes documents en main', hint: 'Avec le relevé de Retraite Québec et vos avis de cotisation, les chiffres sont exacts dès le départ.', to: '/profil?form=1&par=document&etape=gather' },
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
    { title: 'Your figures', text: 'A few simple questions: your age, income, savings and spending. You can finish later.', to: '/profil' },
    { title: 'Your assumptions', text: 'Optional. The Neutral scenario is already chosen; change it to try another future.', to: '/hypotheses' },
    { title: 'Your answer', text: 'The earliest age the money lasts, as a chart and year by year, with what it looks like at 60 and at 65.', to: '/resultats' },
  ],
  guideTitle: 'Finding your way',
  guide: [
    { name: 'Profile', text: 'Your figures. Fill them in by topic, or document by document: a figure stays “estimated” until you confirm it on a document.', to: '/profil' },
    { name: 'Assumptions', text: 'What you assume about the future: prices, returns, the age the plan runs to. The Neutral scenario is already chosen.', to: '/hypotheses' },
    { name: 'Results › Answer', text: 'The earliest age at which the money lasts to the end of the plan. Compare departure ages, see which figures to confirm first.', to: '/resultats' },
    { name: 'Results › Decide', text: 'What you could change to leave earlier (spend less, save more, costlier care), then when to start your pensions (QPP and OAS), in which order to draw your accounts and how far to melt down the RRSP.', to: '/resultats?v=decide' },
    { name: 'Results › Proof', text: 'Whether the answer is firm, what was checked, and every figure with its calculation.', to: '/resultats?v=proof' },
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
  drip: {
    title: 'One question to sharpen your answer',
    swing: (years) => `Confirming it could narrow the answer by about ${years} ${years === 1 ? 'year' : 'years'}.`,
    go: 'Confirm this figure',
    all: 'See everything still estimated',
    later: 'Later',
  },
  demo: {
    title: 'See what an answer looks like',
    pick: 'Choose an example household',
    frame: 'An example, not your situation',
    try: 'Try it with this household',
  },
  doorsTitle: 'Where to start?',
  doors: [
    { budget: '2', label: 'I have 2 minutes', hint: 'A few questions, and a first answer right away.', to: '/profil?debut=rapide' },
    { budget: '15', label: 'I will take my time (≈ 15 minutes)', hint: 'One question at a time, with the reason for each.', to: '/profil?debut=complet' },
    { budget: '30', label: 'I have my documents at hand', hint: 'With the Retraite Québec statement and your notices of assessment, the figures are exact from the start.', to: '/profil?form=1&par=document&etape=gather' },
  ],
}

export const WELCOME_COPY: Record<Lang, WelcomeCopy> = { fr: FR, en: EN }
