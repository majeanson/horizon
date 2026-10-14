import type { Lang } from '../i18n.ts'

// THE WORDS OF THE LINE UNDER « HAUSSE DES SALAIRES ». Outside the eager dictionaries: only Hypothèses reads them.

export interface RealWageCopy {
  /** « Après inflation : +0,6 % par année. Retraite Québec suppose +0,6 %. » — both already formatted. */
  line: (real: string, reference: string) => string
  /** The figure is clearly above the reference. */
  above: string
}

const FR: RealWageCopy = {
  line: (real, reference) => `Après inflation : ${real} par année. Retraite Québec suppose ${reference} pour la rente du RRQ (évaluation actuarielle de 2024).`,
  above: 'Plus haut que son hypothèse : la rente du RRQ projetée en profite.',
}

const EN: RealWageCopy = {
  line: (real, reference) => `After inflation: ${real} a year. Retraite Québec assumes ${reference} for the QPP pension (2024 actuarial valuation).`,
  above: 'Higher than its assumption: the projected QPP pension benefits.',
}

export const REAL_WAGE_COPY: Record<Lang, RealWageCopy> = { fr: FR, en: EN }
