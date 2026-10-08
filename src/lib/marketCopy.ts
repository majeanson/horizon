import type { Lang } from '../i18n.ts'

// THE WORDS OF TWO SECTIONS OF HYPOTHÈSES: where the money left over goes, and the path the markets take. Outside the eager dictionaries on
// purpose (the first screen never needs them); they arrive with the Hypothèses page, whose chunk imports this module.

export interface MarketCopy {
  surplus: { title: string; on: string; hint: string }
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
    hint: 'Quand une année de travail laisse de l’argent de côté et qu’il reste des droits de cotisation REER, cet argent va d’abord au REER (la déduction fait baisser l’impôt), puis au CELI, puis au compte non enregistré. Désactivé, il va d’abord au CELI.',
  },
  path: {
    title: 'Le parcours des marchés',
    hint: 'Les rendements ci-dessus sont des moyennes. Mais l’ordre des années compte : une baisse au début de la retraite coûte bien plus cher qu’une baisse vingt ans plus tard. Choisissez un parcours pour voir si votre plan tient.',
    names: { smooth: 'Lisse', badStart: 'Mauvais départ', lostDecade: 'Décennie perdue', boomBust: 'Boom puis correction', custom: 'Personnalisé' },
    about: {
      smooth: 'Le rendement moyen, chaque année. C’est ce qui est calculé tant que vous n’en choisissez pas d’autre.',
      badStart: 'Une chute de 15 % la première année de retraite, puis une reprise lente. Un exemple, pas une prévision.',
      lostDecade: 'Dix années qui n’avancent presque pas, avec deux baisses. Un exemple, pas une prévision.',
      boomBust: 'Trois belles années, puis une correction de 25 %. Un exemple, pas une prévision.',
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
    hint: 'When a working year leaves money over and RRSP room is open, it goes to the RRSP first (the deduction lowers the tax), then the TFSA, then the non-registered account. Off, it goes to the TFSA first.',
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
