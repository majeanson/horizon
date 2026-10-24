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
  /** The whole years the answer moved, signed, for the badge that flies off the pill (components/DeltaBadge.tsx): « −1 an », « +2 ans ». The money beside it
   *  needs no words (`formatSignedCompactMoney`). Not named `earlier` / `later`: those keys promise a direction word (directionWords.test.ts), this one is a figure. */
  deltaYears: (years: number) => string
  /** From « no age » to an age, and back. */
  found: string
  lost: string
  see: string
  working: string
  /** The top bar: room for two words, and the link's full name for a screen reader. `short` is the label that stays on a narrow phone, where `label` goes:
   *  a bare « 59 ans » beside the name reads as the visitor's own age. */
  bar: { short: string; none: string; aria: (said: string) => string }
}

const FR: LiveCopy = {
  label: 'Votre réponse',
  at: (age) => `${age} ans`,
  now: 'dès maintenant',
  none: (max) => `aucun âge jusqu’à ${max} ans`,
  earlier: (years) => `${years} ${years === 1 ? 'an' : 'ans'} plus tôt qu’à votre première réponse`,
  later: (years) => `${years} ${years === 1 ? 'an' : 'ans'} plus tard qu’à votre première réponse`,
  deltaYears: (years) => `${years < 0 ? '−' : '+'}${Math.abs(years)} ${Math.abs(years) === 1 ? 'an' : 'ans'}`,
  found: 'un âge existe maintenant',
  lost: 'plus aucun âge ne fonctionne',
  see: 'Voir',
  working: '…',
  bar: { short: 'Retraite', none: 'aucun âge', aria: (said) => `Votre réponse : ${said}. Voir les résultats` },
}

const EN: LiveCopy = {
  label: 'Your answer',
  at: (age) => `age ${age}`,
  now: 'right now',
  none: (max) => `no age up to ${max}`,
  earlier: (years) => `${years} ${years === 1 ? 'year' : 'years'} earlier than your first answer`,
  later: (years) => `${years} ${years === 1 ? 'year' : 'years'} later than your first answer`,
  deltaYears: (years) => `${years < 0 ? '−' : '+'}${Math.abs(years)} ${Math.abs(years) === 1 ? 'year' : 'years'}`,
  found: 'an age works now',
  lost: 'no age works any more',
  see: 'See',
  working: '…',
  bar: { short: 'Retire', none: 'no age', aria: (said) => `Your answer: ${said}. See the results` },
}

export const LIVE_COPY: Record<Lang, LiveCopy> = { fr: FR, en: EN }
