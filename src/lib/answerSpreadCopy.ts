import type { Lang } from '../i18n.ts'

// THE WORDS OF THE ANSWER'S RANGE LINE, under the big age. Outside the eager dictionaries: only Résultats reads them.

export interface AnswerSpreadCopy {
  /** « Selon les scénarios et les marchés : de 57 à 64 ans. » */
  range: (low: number, high: number) => string
  /** One of them has no age that works up to `max`. */
  open: (low: number, max: number) => string
}

const FR: AnswerSpreadCopy = {
  range: (low, high) => `Selon les trois scénarios et les parcours de marché : de ${low} à ${high} ans.`,
  open: (low, max) => `Selon les trois scénarios et les parcours de marché : de ${low} ans à plus de ${max} ans.`,
}

const EN: AnswerSpreadCopy = {
  range: (low, high) => `Across the three scenarios and the market paths: from ${low} to ${high}.`,
  open: (low, max) => `Across the three scenarios and the market paths: from ${low} to over ${max}.`,
}

export const ANSWER_SPREAD_COPY: Record<Lang, AnswerSpreadCopy> = { fr: FR, en: EN }
