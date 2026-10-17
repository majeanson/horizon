// The words of « Arrêter à l’âge de mon choix » (components/results/ReverseView.tsx): the plan asked the other way round (engine/reverse.ts), and what waiting a year is worth
// (engine/regret.ts). Both languages, each written for its reader. Every amount arrives already formatted; the copy only says what it means.

const ansFr = (n: number) => (n === 1 ? 'an' : 'ans')
const yrsEn = (n: number) => (n === 1 ? 'year' : 'years')

interface ReverseCopy {
  title: string
  age: string
  updating: string
  /** The plan holds at that age as it stands, and how much more could even be spent. */
  works: (age: number) => string
  margin: (amount: string) => string
  /** The plan does not hold: four changes, each enough on its own. */
  needs: (age: number) => string
  spend: (current: string, max: string, less: string) => string
  spendNone: string
  save: (perYear: string, perMonth: string) => string
  saveNone: string
  work: (age: number, years: number) => string
  workNone: string
  returns: (points: string) => string
  returnsNone: (points: string) => string
  alone: string
  /** What one more year of work buys. */
  waitTitle: string
  waitHint: string
  waitRow: (age: number, gain: string) => string
  waitKnee: (age: number, threshold: string) => string
  waitStill: (threshold: string) => string
  waitNone: string
}

export const REVERSE_COPY: { fr: ReverseCopy; en: ReverseCopy } = {
  fr: {
    title: 'Arrêter à l’âge de mon choix',
    age: 'Je veux arrêter à',
    updating: 'Mise à jour…',
    works: (age) => `À ${age} ${ansFr(age)}, votre plan tient déjà tel quel.`,
    margin: (amount) => `Vous pourriez même dépenser jusqu’à ${amount} par année à la retraite.`,
    needs: (age) => `Pour arrêter à ${age} ${ansFr(age)}, il faudrait l’une de ces choses — chacune suffit seule.`,
    spend: (current, max, less) => `Dépenser ${max} par année à la retraite au lieu de ${current} (${less} de moins).`,
    spendNone: 'Dépenser moins ne suffit pas : même sans rien dépenser, l’argent ne tient pas jusque-là.',
    save: (perYear, perMonth) => `Mettre ${perYear} de plus de côté chaque année en travaillant (${perMonth} par mois), pris sur les dépenses.`,
    saveNone: 'Épargner davantage ne suffit pas, même en y mettant toutes les dépenses du travail.',
    work: (age, years) => `Travailler jusqu’à ${age} ans (${years} ${ansFr(years)} de plus).`,
    workNone: 'Aucun âge jusqu’à 70 ans ne fait tenir le plan tel quel.',
    returns: (points) => `Que chaque compte rapporte ${points} points de plus par année.`,
    returnsNone: (points) => `Même ${points} points de plus par année ne suffiraient pas.`,
    alone: 'Chaque changement est essayé seul, le reste du plan inchangé : on ne les additionne pas.',
    waitTitle: 'Attendre une année de plus',
    waitHint: 'Ce que chaque année de travail supplémentaire laisse en plus à la fin du plan, en dollars d’aujourd’hui.',
    waitRow: (age, gain) => `Arrêter à ${age} ans plutôt qu’un an avant : ${gain} de plus à la fin.`,
    waitKnee: (age, threshold) => `Passé ${age} ans, une année de travail de plus laisse moins qu’une année de vie à la retraite (${threshold}).`,
    waitStill: (threshold) => `Jusqu’à 70 ans, chaque année de travail laisse encore plus qu’une année de vie à la retraite (${threshold}).`,
    waitNone: 'Aucun âge jusqu’à 70 ans ne fait tenir le plan : il n’y a pas de courbe à lire.',
  },
  en: {
    title: 'Stop at the age I choose',
    age: 'I want to stop at',
    updating: 'Updating…',
    works: (age) => `At ${age}, your plan already holds as it stands.`,
    margin: (amount) => `You could even spend up to ${amount} a year in retirement.`,
    needs: (age) => `To stop at ${age}, one of these would have to be true — each is enough on its own.`,
    spend: (current, max, less) => `Spend ${max} a year in retirement instead of ${current} (${less} less).`,
    spendNone: 'Spending less is not enough: even spending nothing, the money does not last that far.',
    save: (perYear, perMonth) => `Put ${perYear} more aside each year while you work (${perMonth} a month), taken out of spending.`,
    saveNone: 'Saving more is not enough, even moving all of the working years’ spending.',
    work: (age, years) => `Work until ${age} (${years} ${yrsEn(years)} longer).`,
    workNone: 'No age up to 70 makes the plan hold as it stands.',
    returns: (points) => `Every account would have to earn ${points} points more a year.`,
    returnsNone: (points) => `Even ${points} points more a year would not be enough.`,
    alone: 'Each change is tried on its own, the rest of the plan left alone: they are not added together.',
    waitTitle: 'Waiting one more year',
    waitHint: 'What each extra year of work leaves on top at the end of the plan, in today’s dollars.',
    waitRow: (age, gain) => `Stopping at ${age} rather than a year before: ${gain} more at the end.`,
    waitKnee: (age, threshold) => `After ${age}, one more year of work leaves less than a year of living in retirement (${threshold}).`,
    waitStill: (threshold) => `Up to 70, each year of work still leaves more than a year of living in retirement (${threshold}).`,
    waitNone: 'No age up to 70 makes the plan hold, so there is no curve to read.',
  },
}
