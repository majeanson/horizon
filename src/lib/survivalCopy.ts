// The words of the chance of reaching an age, under « Jusqu’à quel âge planifier » (pages/Hypotheses.tsx; engine/survival.ts). Both languages, each written for its reader. Figures arrive formatted.
// It is an average of all Québécois of that age — never a prediction for this person — and every sentence that gives a chance says so or sits beside the one that does.

interface SurvivalCopy {
  /** One person: at this age now, the chance of being alive at the plan's age. */
  one: (age: number, horizon: number, chance: string) => string
  /** A couple: the chance that at least one of them is alive in the plan's last year. */
  couple: (year: number, chance: string) => string
  /** Why it is only an average. */
  average: string
}

export const SURVIVAL_COPY: { fr: SurvivalCopy; en: SurvivalCopy } = {
  fr: {
    one: (age, horizon, chance) => `Une personne de ${age} ans a environ ${chance} de chances d’être encore en vie à ${horizon} ans.`,
    couple: (year, chance) => `Dans un couple, il y a environ ${chance} de chances qu’au moins l’un des deux soit encore en vie en ${year}, dernière année du plan.`,
    average: 'C’est la moyenne des Québécois et Québécoises du même âge, selon Statistique Canada. Votre santé, votre sexe et votre mode de vie la changent beaucoup : ce n’est pas une prévision pour vous.',
  },
  en: {
    one: (age, horizon, chance) => `A ${age}-year-old has about a ${chance} chance of still being alive at ${horizon}.`,
    couple: (year, chance) => `In a couple, there is about a ${chance} chance that at least one of the two is still alive in ${year}, the last year of the plan.`,
    average: 'It is the average of all Quebecers of the same age, from Statistics Canada. Your health, your sex and your way of life change it a lot: it is not a forecast for you.',
  },
}
