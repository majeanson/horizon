import type { Lang } from '../i18n.ts'
import type { TimeBudget } from './timeBudget.ts'

// THE WORDS OF « COMBIEN DE TEMPS AVEZ-VOUS ? » (its part of the front door's dialog, components/WelcomeDialog.tsx, and the row on the settings page). Outside
// the eager dictionaries: the front door and the settings page are lazy chunks. The English is written for an English reader, not carried over word
// by word, and the French keeps its non-breaking spaces (lib/frenchSpacing.test.ts).

export interface TimeBudgetCopy {
  title: string
  /** One sentence under the title: what the choice does, and that it can be changed. */
  text: string
  options: Record<TimeBudget, { label: string; hint: string }>
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
    settings: { label: 'Time available', hint: 'The way in that the home page and the Profile tab suggest.' },
  },
}
