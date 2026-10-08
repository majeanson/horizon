import type { Lang } from '../i18n.ts'
import type { LeverId } from '../engine/levers.ts'

// THE WORDS OF « CE QUI CHANGE LE PLUS ». Outside the eager dictionaries: they arrive with the results page.

export interface LeversCopy {
  title: string
  hint: string
  names: Record<LeverId, string>
  gain: (years: number, age: number) => string
  same: string
  later: (years: number, age: number) => string
  none: string
  found: (age: number) => string
  pending: string
}

const FR: LeversCopy = {
  title: 'Ce qui change le plus',
  hint: 'Chaque changement est essayé seul, sur votre plan tel qu’il est. Ce sont des essais, pas des conseils.',
  names: {
    spend10: 'Dépenser 10 % de moins à la retraite',
    save500: 'Épargner 500 $ de plus par mois (CELI)',
    returns1: 'Un point de rendement de plus par année',
    pensions70: 'Commencer la RRQ et la PSV à 70 ans',
  },
  gain: (years, age) => `${years} ${years === 1 ? 'an' : 'ans'} plus tôt — ${age} ans`,
  same: 'pas de changement',
  later: (years, age) => `${years} ${years === 1 ? 'an' : 'ans'} plus tard — ${age} ans`,
  none: 'aucun âge jusqu’à 70 ans',
  found: (age) => `un âge existe : ${age} ans`,
  pending: '…',
}

const EN: LeversCopy = {
  title: 'What moves it most',
  hint: 'Each change is tried alone, on your plan as it stands. They are experiments, not advice.',
  names: {
    spend10: 'Spend 10% less in retirement',
    save500: 'Save $500 more a month (TFSA)',
    returns1: 'One more point of return a year',
    pensions70: 'Start the QPP and OAS at 70',
  },
  gain: (years, age) => `${years} ${years === 1 ? 'year' : 'years'} earlier — age ${age}`,
  same: 'no change',
  later: (years, age) => `${years} ${years === 1 ? 'year' : 'years'} later — age ${age}`,
  none: 'no age up to 70',
  found: (age) => `an age exists: ${age}`,
  pending: '…',
}

export const LEVERS_COPY: Record<Lang, LeversCopy> = { fr: FR, en: EN }
