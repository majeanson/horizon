import type { Lang } from '../i18n.ts'
import type { ExpenseSegment, SourceSegment } from './chartData.ts'

// THE WORDS OF « OÙ VA L’ARGENT » AND « UNE ANNÉE EN DÉTAIL »: the second chart of the « Détail » view (the budget, the mortgage, tax, what comes off the pay, what is saved)
// and the year-at-a-time reading under it, which says in words what the two charts draw — a bar is hard to read on a phone, a sentence is not. Lazy with the section.
// The figures arrive formatted (lib/money.ts): nothing here types a number.

export interface FlowWords {
  title: string
  /** The household's budget is one: with one person picked, the second chart says it stays the household's. */
  hint: string
  personNote: string
  perMonthHint: string
  segment: Record<ExpenseSegment, string>
  figure: (first: number, last: number, perMonth: boolean) => string
  readout: {
    title: string
    hint: string
    year: string
    comesIn: string
    goesOut: string
    total: (amount: string, perMonth: boolean) => string
    none: string
    source: Record<SourceSegment, string>
    unmet: (amount: string, perMonth: boolean) => string
  }
}

const FR: FlowWords = {
  title: 'Où va l’argent, année par année',
  hint: 'Chaque barre est une année : ce que coûte la vie courante, ce que coûtent les enfants, les soins et les événements datés, l’hypothèque, l’impôt, les retenues sur la paie, et ce qui est mis de côté. Ce qui entre et ce qui sort s’égalent, au cent près.',
  personNote: 'Les dépenses sont celles du ménage : ce graphique reste celui des deux, même quand une seule personne est choisie plus haut.',
  perMonthHint: 'Par mois : les mêmes montants, divisés par douze.',
  segment: {
    living: 'Dépenses courantes',
    children: 'Enfants',
    events: 'Soins et événements',
    mortgage: 'Hypothèque',
    tax: 'Impôt',
    deductions: 'Retenues sur la paie',
    saved: 'Mis de côté',
    unmet: 'Non couvert',
  },
  figure: (first, last, perMonth) => `Où va l’argent du ménage, de ${first} à ${last}, ${perMonth ? 'par mois' : 'par année'}, par catégorie de dépense.`,
  readout: {
    title: 'Une année en détail',
    hint: 'Choisissez une année : ce qui entre et ce qui sort, dit en toutes lettres.',
    year: 'Année',
    comesIn: 'Ce qui entre',
    goesOut: 'Ce qui sort',
    total: (amount, perMonth) => `${amount} ${perMonth ? 'par mois' : 'par année'}`,
    none: 'rien cette année',
    source: { work: 'Salaire et autres revenus', db: 'Rente d’employeur', rrq: 'RRQ', oas: 'PSV et SRG', nest: 'Retiré de l’épargne' },
    unmet: (amount, perMonth) => `Les dépenses ne sont pas toutes couvertes : il manque ${amount} ${perMonth ? 'par mois' : 'par année'}.`,
  },
}

const EN: FlowWords = {
  title: 'Where the money goes, year by year',
  hint: 'Each bar is a year: everyday living costs, what the children cost, care and dated events, the mortgage, tax, what comes off the pay, and what is put aside. What comes in and what goes out are equal, to the cent.',
  personNote: 'Spending is the household’s: this chart stays the whole household’s, even when one person is picked above.',
  perMonthHint: 'Per month: the same amounts, divided by twelve.',
  segment: {
    living: 'Living costs',
    children: 'Children',
    events: 'Care and events',
    mortgage: 'Mortgage',
    tax: 'Tax',
    deductions: 'Deductions from pay',
    saved: 'Put aside',
    unmet: 'Not covered',
  },
  figure: (first, last, perMonth) => `Where the household’s money goes, from ${first} to ${last}, ${perMonth ? 'per month' : 'per year'}, by kind of spending.`,
  readout: {
    title: 'One year in detail',
    hint: 'Pick a year: what comes in and what goes out, in words.',
    year: 'Year',
    comesIn: 'What comes in',
    goesOut: 'What goes out',
    total: (amount, perMonth) => `${amount} ${perMonth ? 'a month' : 'a year'}`,
    none: 'nothing this year',
    source: { work: 'Pay and other income', db: 'Employer pension', rrq: 'QPP', oas: 'OAS and GIS', nest: 'Drawn from savings' },
    unmet: (amount, perMonth) => `Spending is not all covered: ${amount} ${perMonth ? 'a month' : 'a year'} is missing.`,
  },
}

export const FLOW_COPY: Record<Lang, FlowWords> = { fr: FR, en: EN }
