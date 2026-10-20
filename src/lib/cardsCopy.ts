import type { Lang } from '../i18n.ts'

// THE WORDS OF THE RESULTS CARDS: the one line each card of Réponse and Décider shows while it is closed, and the three tiles of the glance at the top of the answer. Both languages, each written for its
// reader. The title of every card is the title it always had (the section's own copy); only what a closed card says lives here. Outside the eager dictionaries, like every results copy.

export interface CardsCopy {
  /** The one line under a closed card — Réponse's, Décider's what-ifs and strategies, Preuve's blocks. A strategy whose verdict is in says that instead. */
  closed: {
    comparer: string
    annee: string
    ajuster: string
    viser: string
    epargner: string
    depenser: string
    soins: string
    ordre: string
    fonte: string
    equilibre: string
    solidite: string
    donneesCalcul: string
    tableau: string
    precision: string
    parametres: string
  }
  /** The glance: three tiles under the sentence of the answer. */
  glance: {
    label: string
    start: string
    lasts: string
    margin: string
    /** « jusqu’à 95 ans ». */
    holdsTo: (age: number) => string
    /** The margin: what the plan could fund each month against what it is asked to, or a plain word when the search gave no figure. */
    fundsOf: (funds: string, asked: string) => string
    noFigure: string
    now: string
  }
}

export const CARDS_COPY: Record<Lang, CardsCopy> = {
  fr: {
    closed: {
      comparer: 'Votre âge de départ placé à côté d’autres, en cartes et en graphique.',
      annee: 'Le changement qui gagne le plus et les décisions qui ont leur propre carte.',
      ajuster: 'Chaque changement essayé seul, rangé selon les années qu’il fait gagner.',
      viser: 'Un âge visé, et ce qu’il faudrait pour arrêter à ce moment.',
      epargner: 'L’épargne qu’il faut chaque mois pour atteindre un âge donné.',
      depenser: 'Ce que dépenser un peu moins ferait à votre âge de départ.',
      soins: 'Des soins qui font coûter plus cher les dernières années.',
      ordre: 'Dans quels comptes puiser d’abord, et ce que chaque ordre laisse à la fin.',
      fonte: 'Combien tirer du REER chaque année de retraite, et l’impôt que chaque façon coûte.',
      equilibre: 'Le plan refait avec deux REER de taille semblable, et l’impôt que ça change.',
      solidite: 'Si la réponse tient selon les trois scénarios et les marchés.',
      donneesCalcul: 'Chaque chiffre qui fixe la réponse, avec son calcul.',
      tableau: 'Le plan année par année : revenus, impôts, retraits et soldes.',
      precision: 'Contre quoi le calcul a été vérifié, et ce qu’il simplifie.',
      parametres: 'Les montants officiels utilisés, chacun avec sa page source.',
    },
    glance: {
      label: 'En un coup d’œil',
      start: 'Départ',
      lasts: 'L’argent dure',
      margin: 'Marge par mois',
      holdsTo: (age) => `jusqu’à ${age} ans`,
      fundsOf: (funds, asked) => `${funds} possibles pour ${asked} demandés`,
      noFigure: 'à préciser',
      now: 'dès maintenant',
    },
  },
  en: {
    closed: {
      comparer: 'Your departure age set beside others, as cards and as a chart.',
      annee: 'The change that gains the most and the decisions that have a card of their own.',
      ajuster: 'Each change tried alone, ranked by the years it gains.',
      viser: 'An age to aim at, and what it would take to stop then.',
      epargner: 'The monthly saving an age needs.',
      depenser: 'What spending a little less would do to your departure age.',
      soins: 'The last years costing more: a care.',
      ordre: 'Which accounts to draw from first, and what each order leaves at the end.',
      fonte: 'How much to draw from the RRSP each retired year, and the tax each way costs.',
      equilibre: 'The plan run again with two RRSPs of similar size, and the tax it changes.',
      solidite: 'Whether the answer holds across the three scenarios and the markets.',
      donneesCalcul: 'Every figure that sets the answer, with its calculation.',
      tableau: 'The plan year by year: income, tax, withdrawals and balances.',
      precision: 'What the calculation was checked against, and what it simplifies.',
      parametres: 'The official amounts used, each with its source page.',
    },
    glance: {
      label: 'At a glance',
      start: 'Start',
      lasts: 'The money lasts',
      margin: 'Margin a month',
      holdsTo: (age) => `to age ${age}`,
      fundsOf: (funds, asked) => `${funds} possible against ${asked} asked`,
      noFigure: 'to be pinned down',
      now: 'right now',
    },
  },
}
