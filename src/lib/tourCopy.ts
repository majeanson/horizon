// The words of « Visite guidée » (components/results/TourBar.tsx), in both languages. Like ledgerCopy.ts it lives outside the eager dictionaries
// (only the results page reads it). Every function takes already-formatted STRINGS — the bar formats the ages, the years and the money for the
// reader's language from the page's own model, and the copy never retypes a figure. French punctuation is written with its non-breaking spaces
// (  before « : »,   before « ; » and inside « … »), as lib/frenchSpacing.test.ts requires.

export interface TourCopy {
  /** The chip that opens the tour (on the answer card). */
  open: string
  /** The bar's region name. */
  label: string
  next: string
  /** On the last step, « Suivant » has nowhere to go: it finishes. */
  done: string
  close: string
  /** « 2 de 4 ». */
  step: (n: string, total: string) => string
  /** 1 — the answer restated. `answer` is the formatted age (null when everyone can already stop); `range` the formatted range, or null when every figure is confirmed. */
  verdict: (answer: string | null, range: string | null) => string
  /** …the range, closed (« entre 58 et 63 ans… ») and open (« …peut-être aucun âge avant 70 »). */
  range: (low: string, high: string) => string
  rangeOpen: (low: string, max: string) => string
  /** 2 — the plan's line, to the year the plan ends (formatted with its ages). */
  timeline: (endYear: string) => string
  /** 3 — the two outermost compared departures (their labels) and what is left at the end of the plan with each. */
  compare: (low: string, high: string, horizonAge: string, worthLow: string, worthHigh: string) => string
  /** …when only one departure is compared. */
  compareOne: string
  /** 4 — how many figures are confirmed and which one, confirmed, would narrow the answer most (`gain` is the Préciser section's own phrase). */
  precision: (confirmed: string, total: string, name: string, gain: string) => string
  precisionAll: string
  precisionNone: (confirmed: string, total: string) => string
  precisionWait: (confirmed: string, total: string) => string
}

export const TOUR_COPY: { fr: TourCopy; en: TourCopy } = {
  fr: {
    open: 'Visite guidée',
    label: 'Visite guidée de votre réponse',
    next: 'Suivant',
    done: 'Terminer',
    close: 'Fermer',
    step: (n, total) => `${n} de ${total}`,
    verdict: (answer, range) => {
      const head = answer === null ? 'Votre réponse : vous pouvez déjà prendre votre retraite' : `Votre réponse : ${answer}`
      return range === null ? `${head}.` : `${head} — ${range}.`
    },
    range: (low, high) => `entre ${low} et ${high} ans selon vos chiffres estimés`,
    rangeOpen: (low, max) => `entre ${low} ans et peut-être aucun âge avant ${max}, selon vos chiffres estimés`,
    timeline: (endYear) => `La ligne de votre plan : le travail, puis les années sur le nid, puis les rentes, jusqu’à la fin du plan en ${endYear}.`,
    compare: (low, high, horizonAge, worthLow, worthHigh) => `Comparer : de « ${low} » à « ${high} ». À ${horizonAge} ans, il reste ${worthLow} avec le premier départ, ${worthHigh} avec le second.`,
    compareOne: 'Un seul départ est comparé pour l’instant. Ajoutez-en un autre pour voir ce que change l’âge de départ.',
    precision: (confirmed, total, name, gain) => `Précision : ${confirmed} sur ${total} chiffres confirmés. Le plus utile à confirmer : ${name}, qui ${gain}.`,
    precisionAll: 'Précision : tous vos chiffres sont confirmés par vos documents. Il n’y a rien d’autre à préciser.',
    precisionNone: (confirmed, total) => `Précision : ${confirmed} sur ${total} chiffres confirmés. Aucun des autres ne déplacerait beaucoup la réponse.`,
    precisionWait: (confirmed, total) => `Précision : ${confirmed} sur ${total} chiffres confirmés. Le calcul de ce qui compte le plus est en cours.`,
  },
  en: {
    open: 'Guided tour',
    label: 'Guided tour of your answer',
    next: 'Next',
    done: 'Finish',
    close: 'Close',
    step: (n, total) => `${n} of ${total}`,
    verdict: (answer, range) => {
      const head = answer === null ? 'Your answer: you can already retire' : `Your answer: ${answer}`
      return range === null ? `${head}.` : `${head} — ${range}.`
    },
    range: (low, high) => `between age ${low} and ${high}, depending on your estimated figures`,
    rangeOpen: (low, max) => `from age ${low} to possibly no age before ${max}, depending on your estimated figures`,
    timeline: (endYear) => `Your plan in one line: working, then the years on the nest, then the pensions, to the end of the plan in ${endYear}.`,
    compare: (low, high, horizonAge, worthLow, worthHigh) => `Comparing: from “${low}” to “${high}”. At age ${horizonAge}, ${worthLow} is left with the first departure, ${worthHigh} with the second.`,
    compareOne: 'Only one departure is compared for now. Add another to see what the departure age changes.',
    precision: (confirmed, total, name, gain) => `Precision: ${confirmed} of ${total} figures confirmed. The most useful to confirm: ${name}, which ${gain}.`,
    precisionAll: 'Precision: every figure is confirmed by your documents. There is nothing else to pin down.',
    precisionNone: (confirmed, total) => `Precision: ${confirmed} of ${total} figures confirmed. None of the others would move the answer much.`,
    precisionWait: (confirmed, total) => `Precision: ${confirmed} of ${total} figures confirmed. What matters most is still being worked out.`,
  },
}
