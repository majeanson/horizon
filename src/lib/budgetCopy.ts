import type { Lang } from '../i18n.ts'

// THE WORDS OF « ENSEMBLE OU SÉPARÉ » on the Budget card: a couple can enter what the household spends as one figure, or by account — the joint account (the family's,
// outside the mortgage) and each person's own spending. Outside the eager dictionaries: only a couple ever reads them. The figures arrive formatted (lib/money.ts).

export interface BudgetWords {
  how: string
  together: string
  separate: string
  togetherHint: string
  separateHint: string
  joint: string
  personal: (name: string) => string
  total: (working: string, retired: string) => string
}

const FR: BudgetWords = {
  how: 'Comment entrez-vous vos dépenses ?',
  together: 'Ensemble',
  separate: 'Séparé',
  togetherHint: 'Un seul montant pour le ménage.',
  separateHint: 'Le compte conjoint (sans l’hypothèque) et les dépenses personnelles de chacun : le total alimente le plan. Les virements entre vos comptes ne sont pas des dépenses.',
  joint: 'Compte conjoint (sans l’hypothèque)',
  personal: (name) => `Dépenses personnelles de ${name}`,
  total: (working, retired) => `Total du ménage : ${working} en emploi, ${retired} à la retraite.`,
}

const EN: BudgetWords = {
  how: 'How do you enter your spending?',
  together: 'Together',
  separate: 'Separate',
  togetherHint: 'One figure for the household.',
  separateHint: 'The joint account (without the mortgage) and each person’s own spending: the total feeds the plan. Transfers between your accounts are not spending.',
  joint: 'Joint account (without the mortgage)',
  personal: (name) => `${name}’s own spending`,
  total: (working, retired) => `Household total: ${working} while working, ${retired} in retirement.`,
}

export const BUDGET_COPY: Record<Lang, BudgetWords> = { fr: FR, en: EN }
