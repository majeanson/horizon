import type { Lang } from '../i18n.ts'

// THE WORDS OF THE LIVE ANSWER — the age in the top bar (components/BarAnswer.tsx) and the strip under the first-visit path's question
// (components/LiveAnswer.tsx). Outside the eager dictionaries: both are lazy chunks (a worker is not the shell's business), and so are their words.

export interface LiveCopy {
  label: string
  /** The answer, short: « 59 ans », « dès maintenant », « aucun âge jusqu’à 70 ans ». */
  at: (age: number) => string
  now: string
  none: (max: number) => string
  /** Against the answer on arrival: how an edit moved it. */
  earlier: (years: number) => string
  later: (years: number) => string
  /** From « no age » to an age, and back. */
  found: string
  lost: string
  see: string
  working: string
  /** The top bar: room for two words, and the link's full name for a screen reader. */
  bar: { none: string; aria: (said: string) => string }
}

const FR: LiveCopy = {
  label: 'Votre réponse',
  at: (age) => `${age} ans`,
  now: 'dès maintenant',
  none: (max) => `aucun âge jusqu’à ${max} ans`,
  earlier: (years) => `${years} ${years === 1 ? 'an' : 'ans'} plus tôt qu’à votre arrivée`,
  later: (years) => `${years} ${years === 1 ? 'an' : 'ans'} plus tard qu’à votre arrivée`,
  found: 'un âge existe maintenant',
  lost: 'plus aucun âge ne fonctionne',
  see: 'Voir',
  working: '…',
  bar: { none: 'aucun âge', aria: (said) => `Votre réponse : ${said}. Voir les résultats` },
}

const EN: LiveCopy = {
  label: 'Your answer',
  at: (age) => `age ${age}`,
  now: 'right now',
  none: (max) => `no age up to ${max}`,
  earlier: (years) => `${years} ${years === 1 ? 'year' : 'years'} earlier than when you arrived`,
  later: (years) => `${years} ${years === 1 ? 'year' : 'years'} later than when you arrived`,
  found: 'an age works now',
  lost: 'no age works any more',
  see: 'See',
  working: '…',
  bar: { none: 'no age', aria: (said) => `Your answer: ${said}. See the results` },
}

export const LIVE_COPY: Record<Lang, LiveCopy> = { fr: FR, en: EN }
