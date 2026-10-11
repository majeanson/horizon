import type { Lang } from '../i18n.ts'

// THE WORDS OF HYPOTHÈSES' VIEWS. Outside the eager dictionaries on purpose (the first screen never needs them): the scenario comes first, always on screen, and what it
// sets is read in three views — the economy (prices and wages, returns, the market path), the length of the plan and what it spends, and the options.

export interface HypothesesCopy {
  views: { label: string; economy: string; life: string; options: string }
}

export const HYPOTHESES_COPY: Record<Lang, HypothesesCopy> = {
  fr: { views: { label: 'Ce que vous supposez', economy: 'Économie', life: 'Durée et dépenses', options: 'Options' } },
  en: { views: { label: 'What you assume', economy: 'Economy', life: 'Length and spending', options: 'Options' } },
}
