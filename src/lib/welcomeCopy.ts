import type { Lang } from '../i18n.ts'
import type { ConceptId } from './concepts.ts'

// THE WORDS OF THE FRONT DOOR (« Accueil », the page at `/`): what Horizon is and the two promises it keeps, one button to begin, an example
// answer, and — each in its own fold — how it works and where things are. Outside the eager dictionaries — the page is a lazy chunk, and so are its words.

export interface WelcomeCopy {
  title: string
  subtitle: string
  /** A first visit's hero, under the title: what Horizon does, and the two promises it keeps — three short lines, always in view. */
  promises: string[]
  /** The hero's two buttons: « Commencer » opens the dialog (components/WelcomeDialog.tsx), the other scrolls to the example answer. */
  begin: string
  example: string
  /** The dialog « Commencer » opens: its title, and the one line that says nothing is lost by stopping. */
  dialog: { title: string; lead: string }
  /** A returning visit's two buttons. */
  seeAnswer: string
  editProfile: string
  stepsTitle: string
  /** The three steps, each a card that is a door: its concept's pip leads the title (the same pip the page it opens wears). */
  steps: { title: string; text: string; to: string; concept: ConceptId }[]
  /** « Comment s'y retrouver »: the whole app in a few lines — each place, and what it is for. */
  guideTitle: string
  guide: { name: string; text: string; to: string | null }[]
  /** The one question of a returning visit (components/DripQuestion.tsx): the unconfirmed figure that most narrows the answer. */
  drip: { title: string; swing: (years: number) => string; go: string; all: string; later: string }
  /** The first visit's demo card (components/DemoAnswer.tsx): a real answer for an example household. The households' names and stories are exampleCopy's. */
  demo: { title: string; pick: string; frame: string; try: string }
}

const FR: WelcomeCopy = {
  title: 'Quand pouvez-vous prendre votre retraite ?',
  subtitle: 'Horizon calcule l’âge le plus tôt où l’argent suffit, pour un ménage du Québec.',
  begin: 'Commencer',
  example: 'Voir un exemple',
  seeAnswer: 'Voir ma réponse',
  editProfile: 'Modifier mon profil',
  promises: [
    'Vos rentes (RRQ, PSV), vos impôts et vos comptes (REER, CELI), calculés ensemble, année par année.',
    'Tout reste sur cet appareil : aucun compte, aucun serveur.',
    'Chaque montant du gouvernement vient d’une page officielle, citée.',
  ],
  dialog: {
    title: 'Par où commencer ?',
    lead: 'Vous pourrez arrêter et reprendre quand vous voulez : tout reste sur cet appareil.',
  },
  stepsTitle: 'Comment ça marche',
  steps: [
    { title: 'Vos chiffres', text: 'Quelques questions simples : votre âge, votre revenu, votre épargne, vos dépenses. Vous pouvez compléter plus tard.', to: '/profil', concept: 'personne' },
    { title: 'Vos hypothèses', text: 'Facultatif. Le scénario Neutre est déjà choisi ; changez-le pour essayer un autre avenir.', to: '/hypotheses', concept: 'hypotheses' },
    { title: 'Votre réponse', text: 'L’âge le plus tôt où l’argent dure, en graphique et année par année, avec ce que ça donne à 60 ans et à 65 ans.', to: '/resultats', concept: 'reponse' },
  ],
  guideTitle: 'Comment s’y retrouver',
  guide: [
    { name: 'Profil', text: 'Vos chiffres. Remplissez-les par sujet, ou document par document : un chiffre reste « estimé » tant que vous ne l’avez pas confirmé sur un document.', to: '/profil' },
    { name: 'Hypothèses', text: 'Ce que vous supposez de l’avenir : prix, rendements, âge de fin du plan. Le scénario Neutre est déjà choisi.', to: '/hypotheses' },
    { name: 'Résultats', text: 'L’âge le plus tôt où l’argent dure jusqu’à la fin du plan, comparé à d’autres âges de départ, puis sa preuve : si la réponse est solide, et chaque chiffre avec son calcul.', to: '/resultats' },
    { name: 'Décider', text: 'Ce que vous pourriez changer pour partir plus tôt (dépenser moins, épargner plus, des soins plus coûteux), puis quand commencer vos rentes (RRQ et PSV), dans quel ordre puiser dans vos comptes et jusqu’où fondre le REER.', to: '/decider' },
    { name: 'Votre réponse', text: 'L’âge dans la barre du haut, à côté du nom : il bouge à mesure que vous tapez, et un appui ouvre les Résultats.', to: null },
    { name: 'Ma fiche', text: 'Votre ménage d’un coup d’œil : la réponse et sa solidité, le plan en une ligne, ce que vous détenez et les chiffres à confirmer en premier. Chaque carte mène au champ qui la change.', to: '/fiche' },
    { name: 'En haut', text: 'Le glossaire des sigles et les réglages (copies de sauvegarde, plans, exemples). Les barres du haut se cachent quand vous descendez et reviennent quand vous remontez.', to: null },
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
}

const EN: WelcomeCopy = {
  title: 'When can you retire?',
  subtitle: 'Horizon finds the earliest age at which the money lasts, for a Québec household.',
  begin: 'Get started',
  example: 'See an example',
  seeAnswer: 'See my answer',
  editProfile: 'Edit my profile',
  promises: [
    'Your pensions (QPP, OAS), taxes and accounts (RRSP, TFSA), worked out together, year by year.',
    'Everything stays on this device: no account, no server.',
    'Every government amount comes from a cited official page.',
  ],
  dialog: {
    title: 'Where to start?',
    lead: 'You can stop and come back whenever you like: everything stays on this device.',
  },
  stepsTitle: 'How it works',
  steps: [
    { title: 'Your figures', text: 'A few simple questions: your age, income, savings and spending. You can finish later.', to: '/profil', concept: 'personne' },
    { title: 'Your assumptions', text: 'Optional. The Neutral scenario is already chosen; change it to try another future.', to: '/hypotheses', concept: 'hypotheses' },
    { title: 'Your answer', text: 'The earliest age the money lasts, as a chart and year by year, with what it looks like at 60 and at 65.', to: '/resultats', concept: 'reponse' },
  ],
  guideTitle: 'Finding your way',
  guide: [
    { name: 'Profile', text: 'Your figures. Fill them in by topic, or document by document: a figure stays “estimated” until you confirm it on a document.', to: '/profil' },
    { name: 'Assumptions', text: 'What you assume about the future: prices, returns, the age the plan runs to. The Neutral scenario is already chosen.', to: '/hypotheses' },
    { name: 'Results', text: 'The earliest age at which the money lasts to the end of the plan, set beside other departure ages, then its proof: whether the answer is firm, and every figure with its calculation.', to: '/resultats' },
    { name: 'Decide', text: 'What you could change to leave earlier (spend less, save more, costlier care), then when to start your pensions (QPP and OAS), in which order to draw your accounts and how far to melt down the RRSP.', to: '/decider' },
    { name: 'Your answer', text: 'The age in the top bar, beside the name: it moves as you type, and a tap opens the Results.', to: null },
    { name: 'My sheet', text: 'Your household at a glance: the answer and how sturdy it is, the plan in one line, what you hold and the figures to confirm first. Each card leads to the field that changes it.', to: '/fiche' },
    { name: 'At the top', text: 'The glossary of acronyms and the settings (backup copies, plans, examples). The top bars hide as you scroll down and come back as you scroll up.', to: null },
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
}

export const WELCOME_COPY: Record<Lang, WelcomeCopy> = { fr: FR, en: EN }
