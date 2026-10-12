import type { Lang } from '../i18n.ts'

// THE WORDS OF HYPOTHÈSES' MAP. Outside the eager dictionaries on purpose (the first screen never needs them): one short noun per block of the page, in the order they stand — the
// scenario first, then what it sets.

export interface HypothesesCopy {
  nav: { label: string; scenario: string; prices: string; returns: string; markets: string; age: string; spending: string; options: string }
}

export const HYPOTHESES_COPY: Record<Lang, HypothesesCopy> = {
  fr: { nav: { label: 'Sections des hypothèses', scenario: 'Scénario', prices: 'Prix', returns: 'Placements', markets: 'Marchés', age: 'Âge de fin', spending: 'Dépenses', options: 'Options' } },
  en: { nav: { label: 'Assumption sections', scenario: 'Scenario', prices: 'Prices', returns: 'Returns', markets: 'Markets', age: 'End age', spending: 'Spending', options: 'Options' } },
}
