import type { Lang } from '../i18n.ts'

// THE WORDS OF TWO SECTIONS OF HYPOTHÈSES: where the money left over goes, and the path the markets take. Outside the eager dictionaries on
// purpose (the first screen never needs them); they arrive with the Hypothèses page, whose chunk imports this module.

export interface MarketCopy {
  surplus: { title: string; on: string; hint: string }
  income: { line: (age: number, perMonth: string, planned: string) => string; none: (age: number) => string; note: string }
  stress: { title: string; active: (name: string) => string; none: (max: number) => string; age: (n: number) => string; hint: string; link: string }
  path: {
    title: string
    hint: string
    names: Record<'smooth' | 'badStart' | 'lostDecade' | 'boomBust' | 'custom', string>
    about: Record<'smooth' | 'badStart' | 'lostDecade' | 'boomBust' | 'custom', string>
    year: (n: number) => string
    add: string
    remove: string
    countsFrom: string
  }
}

const FR: MarketCopy = {
  surplus: {
    title: 'L’argent qui reste',
    on: 'Placer d’abord le surplus dans le REER',
    hint: 'L’argent qui reste à la fin d’une année de travail va d’abord au REER (la déduction baisse l’impôt), puis au CELI, puis au compte non enregistré. Désactivé : au CELI d’abord.',
  },
  income: {
    line: (age, perMonth, planned) => `À ${age} ans, le plan peut financer jusqu’à ${perMonth} par mois (après impôt) — vous prévoyez ${planned}.`,
    none: (age) => `À ${age} ans, le plan ne finance aucune dépense à la retraite.`,
    note: 'En dollars d’aujourd’hui, pour toutes les années de la retraite, avec vos hypothèses.',
  },
  stress: {
    title: 'Si les marchés tournent mal',
    active: (name) => `Le calcul ci-dessus suit le parcours « ${name} ».`,
    none: (max) => `aucun âge jusqu’à ${max} ans`,
    age: (n) => `${n} ans`,
    hint: 'Le même plan, avec un parcours de marché difficile en début de retraite. Ce sont des exemples, pas des prévisions.',
    link: 'Choisir ou modifier le parcours',
  },
  path: {
    title: 'Le parcours des marchés',
    hint: 'Les rendements ci-dessus sont des moyennes. Mais l’ordre des années compte : une baisse au début de la retraite coûte bien plus cher qu’une baisse vingt ans plus tard. Choisissez un parcours pour voir si votre plan tient.',
    names: { smooth: 'Lisse', badStart: 'Mauvais départ', lostDecade: 'Décennie perdue', boomBust: 'Boom puis correction', custom: 'Personnalisé' },
    about: {
      smooth: 'Le rendement moyen, chaque année. C’est ce qui est calculé tant que vous n’en choisissez pas d’autre.',
      badStart: 'Une chute de 15 % la première année de retraite, puis une reprise lente. Un exemple, pas une prévision.',
      lostDecade: 'Dix années qui n’avancent presque pas, avec deux baisses. Un exemple, pas une prévision.',
      boomBust: 'Trois belles années, puis une correction de 25 %. Un exemple, pas une prévision.',
      custom: 'Vos propres rendements, année par année. Une année que vous n’indiquez pas reçoit le rendement moyen.',
    },
    year: (n) => (n === 1 ? 'Année 1 de retraite' : `Année ${n} de retraite`),
    add: 'Ajouter une année',
    remove: 'Retirer la dernière',
    countsFrom: 'Les années se comptent à partir de la première année où quelqu’un est à la retraite, et le même rendement s’applique à tous les comptes.',
  },
}

const EN: MarketCopy = {
  surplus: {
    title: 'The money left over',
    on: 'Put the surplus in the RRSP first',
    hint: 'The money left at the end of a working year goes to the RRSP first (the deduction lowers the tax), then the TFSA, then the non-registered account. Off: the TFSA first.',
  },
  income: {
    line: (age, perMonth, planned) => `At ${age}, the plan can fund up to ${perMonth} a month (after tax) — you plan ${planned}.`,
    none: (age) => `At ${age}, the plan funds no retirement spending at all.`,
    note: 'In today’s dollars, for every year of retirement, under your assumptions.',
  },
  stress: {
    title: 'If the markets go badly',
    active: (name) => `The calculation above follows the “${name}” path.`,
    none: (max) => `no age up to ${max}`,
    age: (n) => `age ${n}`,
    hint: 'The same plan, with a hard market path early in retirement. These are examples, not forecasts.',
    link: 'Choose or edit the path',
  },
  path: {
    title: 'The path the markets take',
    hint: 'The returns above are averages. But the order of the years matters: a fall at the start of retirement costs far more than the same fall twenty years later. Pick a path to see whether your plan holds.',
    names: { smooth: 'Smooth', badStart: 'Bad start', lostDecade: 'Lost decade', boomBust: 'Boom then correction', custom: 'Custom' },
    about: {
      smooth: 'The average return, every year. This is what is calculated until you pick another.',
      badStart: 'A 15% fall in the first year of retirement, then a slow recovery. An example, not a forecast.',
      lostDecade: 'Ten years that go almost nowhere, with two falls. An example, not a forecast.',
      boomBust: 'Three good years, then a 25% correction. An example, not a forecast.',
      custom: 'Your own returns, year by year. A year you leave out earns the average return.',
    },
    year: (n) => `Retirement year ${n}`,
    add: 'Add a year',
    remove: 'Remove the last',
    countsFrom: 'Years are counted from the first year anyone is retired, and the same return applies to every account.',
  },
}

export const MARKET_COPY: Record<Lang, MarketCopy> = { fr: FR, en: EN }
