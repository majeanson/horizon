import type { Lang } from '../i18n.ts'

// THE WORDS OF TWO SECTIONS OF HYPOTHÈSES: where the money left over goes, and the path the markets take. Outside the eager dictionaries on
// purpose (the first screen never needs them); they arrive with the Hypothèses page, whose chunk imports this module.

export interface MarketCopy {
  surplus: { title: string; on: string; hint: string }
}

const FR: MarketCopy = {
  surplus: {
    title: 'L’argent qui reste',
    on: 'Placer d’abord le surplus dans le REER',
    hint: 'Quand une année de travail laisse de l’argent de côté et qu’il reste des droits de cotisation REER, cet argent va d’abord au REER (la déduction fait baisser l’impôt), puis au CELI, puis au compte non enregistré. Désactivé, il va d’abord au CELI.',
  },
}

const EN: MarketCopy = {
  surplus: {
    title: 'The money left over',
    on: 'Put the surplus in the RRSP first',
    hint: 'When a working year leaves money over and RRSP room is open, it goes to the RRSP first (the deduction lowers the tax), then the TFSA, then the non-registered account. Off, it goes to the TFSA first.',
  },
}

export const MARKET_COPY: Record<Lang, MarketCopy> = { fr: FR, en: EN }
