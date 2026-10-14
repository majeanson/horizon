import type { Lang } from '../i18n.ts'

// THE WORDS OF « VÉRIFIER AVEC MES RELEVÉS »: the net pay and the deposits, set beside what the plan says. Outside the eager dictionaries: only Profil reads them.

export interface PersonChecksCopy {
  summary: string
  netPay: {
    label: string
    hint: string
    same: (expected: string) => string
    fewer: (expected: string, gap: string) => string
    more: (expected: string, gap: string) => string
    /** When the gap is withheld money and an RRSP contribution is planned: it may be part of it. */
    rrsp: (contribution: string) => string
  }
  deposits: {
    label: (account: string) => string
    hint: string
    line: (deposited: string, balance: string, change: string) => string
    below: (assumed: string) => string
  }
}

const FR: PersonChecksCopy = {
  summary: 'Vérifier avec mes relevés',
  netPay: {
    label: 'Paie nette reçue par année',
    hint: 'Le total des dépôts de paie des douze derniers mois. Un repère de contrôle : le calcul ne s’en sert pas.',
    same: (expected) => `Le calcul donne ${expected} par année après impôt et cotisations : la même chose, à peu de chose près.`,
    fewer: (expected, gap) => `Le calcul donne ${expected} par année après impôt et cotisations, soit ${gap} de plus que votre paie nette. L’écart est ce qui est retenu en plus à la source (régime de retraite, REER, assurances), et que le plan ne voit pas.`,
    more: (expected, gap) => `Votre paie nette dépasse de ${gap} ce que le calcul donne (${expected}) : votre salaire est peut-être plus haut que celui du profil, ou une partie de la paie n’est pas imposée.`,
    rrsp: (contribution) => `Votre cotisation REER prévue est de ${contribution} par année : si elle passe par la paie, elle est comprise dans l’écart.`,
  },
  deposits: {
    label: (account) => `Total déposé (${account})`,
    hint: 'Ce que vous y avez mis, moins ce que vous en avez sorti. Un repère de contrôle : le calcul ne s’en sert pas.',
    line: (deposited, balance, change) => `Vous y avez mis ${deposited}, le compte vaut ${balance} (${change}).`,
    below: (assumed) => `Le compte vaut nettement moins que ce qu’il a reçu. Le plan suppose ${assumed} par année pour ce type de compte : si vos placements restent les mêmes, ce n’est pas ce qu’ils vous ont donné.`,
  },
}

const EN: PersonChecksCopy = {
  summary: 'Check against my statements',
  netPay: {
    label: 'Net pay received in a year',
    hint: 'The total of your pay deposits over the last twelve months. A check: the calculation does not use it.',
    same: (expected) => `The calculation gives ${expected} a year after tax and contributions: the same, near enough.`,
    fewer: (expected, gap) => `The calculation gives ${expected} a year after tax and contributions, ${gap} more than your net pay. The gap is what is also withheld at the source (a pension plan, an RRSP, insurance), which the plan does not see.`,
    more: (expected, gap) => `Your net pay is ${gap} more than the calculation gives (${expected}): your salary may be higher than the profile's, or part of your pay is not taxed.`,
    rrsp: (contribution) => `Your planned RRSP contribution is ${contribution} a year: if it goes through payroll, it is part of the gap.`,
  },
  deposits: {
    label: (account) => `Total deposited (${account})`,
    hint: 'What you put in, less what you took out. A check: the calculation does not use it.',
    line: (deposited, balance, change) => `You put in ${deposited}, the account is worth ${balance} (${change}).`,
    below: (assumed) => `The account is worth clearly less than it received. The plan assumes ${assumed} a year for this kind of account: if your investments stay the same, that is not what they gave you.`,
  },
}

export const PERSON_CHECKS_COPY: Record<Lang, PersonChecksCopy> = { fr: FR, en: EN }
