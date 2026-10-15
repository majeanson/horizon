import type { Lang } from '../i18n.ts'
import type { TimeBudget } from './timeBudget.ts'

// THE WORDS OF « COMBIEN DE TEMPS AVEZ-VOUS ? » (components/TimeBudget.tsx, the line it leaves on the front door, the row on the settings page). Outside
// the eager dictionaries: the front door and the settings page are lazy chunks. The English is written for an English reader, not carried over word
// by word, and the French keeps its non-breaking spaces (lib/frenchSpacing.test.ts).

export interface TimeBudgetCopy {
  title: string
  /** One sentence under the title: what the choice does, and that it can be changed. */
  text: string
  options: Record<TimeBudget, { label: string; hint: string }>
  later: string
  /** The line on the front door once chosen: « Votre temps : 15 minutes ». */
  yours: (label: string) => string
  change: string
  start: string
  /** The fold holding the two doors not chosen. */
  otherWays: string
  /** The fold holding the explanations a two-minute reader did not ask for. */
  moreAbout: string
  /** The settings page's row. */
  settings: { label: string; hint: string }
}

export const TIME_BUDGET_COPY: Record<Lang, TimeBudgetCopy> = {
  fr: {
    title: 'Combien de temps avez-vous ?',
    text: 'Horizon vous propose la façon de commencer qui va avec votre temps. Vous pourrez changer d’avis à tout moment, sur l’accueil ou dans les Réglages.',
    options: {
      '2': { label: '2 minutes', hint: 'Cinq questions, et une première réponse tout de suite.' },
      '15': { label: '15 minutes', hint: 'Une question à la fois, avec la raison de chacune.' },
      '30': { label: '30 minutes et plus', hint: 'Avec vos documents en main : les chiffres sont exacts dès le départ.' },
    },
    later: 'Plus tard',
    yours: (label) => `Votre temps : ${label}`,
    change: 'Changer',
    start: 'Commencer',
    otherWays: 'Autres façons de commencer',
    moreAbout: 'En savoir plus sur Horizon',
    settings: { label: 'Temps disponible', hint: 'La façon de commencer que l’accueil et l’onglet Profil vous proposent.' },
  },
  en: {
    title: 'How much time do you have?',
    text: 'Horizon suggests the way in that fits your time. You can change your mind at any point, on the home page or in Settings.',
    options: {
      '2': { label: 'Two minutes', hint: 'Five questions, and a first answer right away.' },
      '15': { label: 'Fifteen minutes', hint: 'One question at a time, with the reason for each.' },
      '30': { label: 'Thirty minutes or more', hint: 'With your documents in hand: the figures are exact from the start.' },
    },
    later: 'Later',
    yours: (label) => `Your time: ${label}`,
    change: 'Change',
    start: 'Get started',
    otherWays: 'Other ways to begin',
    moreAbout: 'More about Horizon',
    settings: { label: 'Time available', hint: 'The way in that the home page and the Profile tab suggest.' },
  },
}
