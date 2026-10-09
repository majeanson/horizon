import type { Lang } from '../i18n'

// The mortgage's terms on the home card: how the payment is counted, a renewal, and what owning costs that are not here. Lazy with the Profil page.

interface HomeCopy {
  frequencyTitle: string
  frequency: { monthly: string; biweekly: string; weekly: string }
  payment: { monthly: string; biweekly: string; weekly: string }
  equals: (monthly: string) => string
  renewal: {
    toggle: string
    year: string
    yearHint: string
    rate: string
    keepTitle: string
    keepAmortization: string
    keepPayment: string
    effectPayment: (amount: string, year: string) => string
    effectPayoff: (now: string, was: string) => string
    effectNever: string
    effectNone: string
  }
  nudge: string
}

const FR: HomeCopy = {
  frequencyTitle: 'Fréquence du paiement',
  frequency: { monthly: 'Chaque mois', biweekly: 'Aux 2 semaines', weekly: 'Chaque semaine' },
  payment: { monthly: 'Paiement mensuel', biweekly: 'Paiement aux 2 semaines', weekly: 'Paiement hebdomadaire' },
  equals: (monthly) => `Soit environ ${monthly} par mois, comptés sur l’année entière.`,
  renewal: {
    toggle: 'Le taux sera renégocié à l’échéance du terme',
    year: 'Année du renouvellement',
    yearHint: 'Le nouveau taux s’applique dès janvier de cette année-là.',
    rate: 'Nouveau taux (annuel)',
    keepTitle: 'Au renouvellement',
    keepAmortization: 'Garder la date de fin (le paiement change)',
    keepPayment: 'Garder mon paiement (la date de fin bouge)',
    effectPayment: (amount, year) => `Votre paiement passerait à environ ${amount} par mois dès ${year}.`,
    effectPayoff: (now, was) => (now === was ? `Le prêt reste payé en ${now}.` : `Le prêt serait payé en ${now}, au lieu de ${was} sans renouvellement.`),
    effectNever: 'À ce taux, votre paiement ne couvre plus les intérêts : le prêt ne se rembourse jamais.',
    effectNone: 'Le prêt est payé avant ce renouvellement.',
  },
  nudge: 'Les taxes foncières, l’assurance habitation et l’entretien ne sont pas comptés ici : mettez-les dans vos dépenses (Budget).',
}

const EN: HomeCopy = {
  frequencyTitle: 'Payment frequency',
  frequency: { monthly: 'Monthly', biweekly: 'Every 2 weeks', weekly: 'Weekly' },
  payment: { monthly: 'Monthly payment', biweekly: 'Payment every 2 weeks', weekly: 'Weekly payment' },
  equals: (monthly) => `That is about ${monthly} a month, counted over the whole year.`,
  renewal: {
    toggle: 'The rate will be renegotiated when the term ends',
    year: 'Year of the renewal',
    yearHint: 'The new rate applies from January of that year.',
    rate: 'New rate (annual)',
    keepTitle: 'At renewal',
    keepAmortization: 'Keep the payoff date (the payment changes)',
    keepPayment: 'Keep my payment (the payoff date moves)',
    effectPayment: (amount, year) => `Your payment would become about ${amount} a month from ${year}.`,
    effectPayoff: (now, was) => (now === was ? `The loan is still paid off in ${now}.` : `The loan would be paid off in ${now}, instead of ${was} without a renewal.`),
    effectNever: 'At that rate your payment no longer covers the interest: the loan is never paid off.',
    effectNone: 'The loan is paid off before this renewal.',
  },
  nudge: 'Property tax, home insurance and upkeep are not counted here: put them in your spending (Budget).',
}

export const HOME_COPY: Record<Lang, HomeCopy> = { fr: FR, en: EN }
