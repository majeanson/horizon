import type { Lang } from '../i18n.ts'

// THE ONE SENTENCE UNDER EACH CARD'S TITLE. Every card of Profil and Hypothèses reads in one order (components/profile/shared.tsx `Section`): the title,
// ONE short sentence saying what the card is for, « En savoir plus » folding the longer explanation, then the fields with their ⓘ. These are the
// sentences; the longer explanations stay where they were (the dictionaries, lifeCopy, plansCopy…) and become the card's `details`.
//
// Outside the eager dictionary: it is at its cap and holds what the front door needs, while these are read on Profil and Hypothèses only.
// One sentence each, by rule (cardCopy.test.ts): a second sentence belongs in the details.

export type CardId =
  | 'family'
  | 'about'
  | 'person'
  | 'situation'
  | 'exact'
  | 'rrq'
  | 'oas'
  | 'accounts'
  | 'budget'
  | 'home'
  | 'events'
  | 'plans'
  | 'levels'
  | 'scenario'
  | 'prices'
  | 'markets'
  | 'horizon'
  | 'drift'
  | 'options'

const FR: Record<CardId, string> = {
  family: 'Qui vit avec vous : un ou une partenaire, et les enfants.',
  about: 'Qui vous êtes, et l’âge où votre salaire s’arrête.',
  person: 'Âge, salaire, comptes, régime d’employeur, RRQ et PSV de cette personne.',
  situation: 'Ce qui vous concerne : vos réponses choisissent les sections du formulaire.',
  exact: 'Confirmer chaque chiffre avec le document où il est écrit.',
  rrq: 'La rente du Québec : quand la commencer, et les gains qui la calculent.',
  oas: 'La pension fédérale, selon vos années vécues au Canada.',
  accounts: 'Ce que vous avez déjà mis de côté, compte par compte.',
  budget: 'Ce que le ménage dépense par année, aujourd’hui et à la retraite.',
  home: 'La maison, et ce qui reste à payer dessus.',
  events: 'Les grosses dépenses et les revenus qui ont leurs propres années.',
  plans: 'Plusieurs versions de votre plan, chacune sous un nom.',
  levels: 'Des estimations pour les chiffres vides, quand vos documents ne sont pas sous la main.',
  scenario: 'Un point de départ pour l’avenir, en un seul choix.',
  prices: 'Ce qui fait monter vos dépenses et votre salaire avec les années.',
  markets: 'L’ordre des bonnes et des mauvaises années, pas seulement leur moyenne.',
  horizon: 'L’âge jusqu’où le plan doit tenir, pour chacun.',
  drift: 'Dépenser un peu moins en vieillissant, si vous le pensez.',
  options: 'Des choix d’impôt : ils peuvent déplacer la réponse d’un an ou deux.',
}

const EN: Record<CardId, string> = {
  family: 'Who lives with you: a partner, and the children.',
  about: 'Who you are, and the age your salary stops.',
  person: 'This person’s age, pay, accounts, employer plan, QPP and OAS.',
  situation: 'What applies to you: your answers choose the sections of the form.',
  exact: 'Confirm each figure against the document it is written on.',
  rrq: 'The Québec pension: when to start it, and the earnings it is built on.',
  oas: 'The federal pension, based on your years lived in Canada.',
  accounts: 'What you have already set aside, account by account.',
  budget: 'What the household spends in a year, today and once retired.',
  home: 'The house, and what is still owed on it.',
  events: 'The big expenses and the income that have years of their own.',
  plans: 'Several versions of your plan, each under a name.',
  levels: 'Estimates for the blank figures, when your documents are not at hand.',
  scenario: 'A starting point for the future, in a single choice.',
  prices: 'What makes your spending and your salary rise over the years.',
  markets: 'The order of the good and the bad years, not just their average.',
  horizon: 'The age the plan must last to, for each of you.',
  drift: 'Spending a little less as you age, if you expect to.',
  options: 'Tax choices: they can move the answer by a year or two.',
}

export const CARD_COPY: Record<Lang, Record<CardId, string>> = { fr: FR, en: EN }
