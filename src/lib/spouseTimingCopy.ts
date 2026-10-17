// The words of « Qui devrait commencer sa rente du RRQ en premier » (components/results/SpouseTimingPanel.tsx): a couple's two start ages tried together (engine/spouseTiming.ts).
// Both languages, each written for its reader. Amounts arrive formatted; the copy says what they mean.

interface SpouseTimingCopy {
  title: string
  hint: (deathAge: number) => string
  caption: string
  corner: string
  /** A row or column header: the person and the age they start at. */
  start: (name: string, age: number) => string
  fails: string
  best: string
  current: string
  bestIsCurrent: string
  /** The read of the grid. */
  /** Each argument is a header already said (`start`): « Camille, à 65 ans ». */
  bestLine: (first: string, second: string) => string
  sameLine: string
  noneLine: string
  currentLine: (worst: string) => string
  currentFails: string
  gainLine: (amount: string) => string
  only: string
  updating: string
}

export const SPOUSE_TIMING_COPY: { fr: SpouseTimingCopy; en: SpouseTimingCopy } = {
  fr: {
    title: 'Qui commence en premier',
    hint: (age) =>
      `Neuf façons de combiner l’âge de départ de chacun. Chacune est essayée trois fois — vous deux en vie, puis l’un de vous décédant à ${age} ans, puis l’autre — et on garde le pire des trois : un choix ne vaut que sa pire chance.`,
    caption: 'Ce qu’il reste à la fin du plan, au pire (en dollars d’aujourd’hui)',
    corner: 'Début de la rente du RRQ',
    start: (name, age) => `${name}, à ${age} ans`,
    fails: 'ne tient pas',
    best: 'le meilleur',
    current: 'votre choix',
    bestIsCurrent: 'votre choix, le meilleur',
    bestLine: (first, second) => `Le meilleur choix pour vous deux — ${first} ; ${second}.`,
    sameLine: 'Votre choix actuel est déjà le meilleur de ces neuf.',
    noneLine: 'Aucune de ces neuf combinaisons ne tient dans les trois cas.',
    currentLine: (worst) => `Avec vos âges actuels, il reste au pire ${worst} à la fin du plan.`,
    currentFails: 'Avec vos âges actuels, l’argent ne tient pas dans l’un des trois cas.',
    gainLine: (amount) => `Le meilleur laisse ${amount} de plus, au pire, que votre choix.`,
    only: 'Seul le début du RRQ change ; la retraite, la PSV et le reste du plan restent tels quels.',
    updating: 'Calcul en cours…',
  },
  en: {
    title: 'Who starts first',
    hint: (age) =>
      `Nine ways of combining each person’s start age. Each is tried three times — both of you alive, then one of you dying at ${age}, then the other — and the worst of the three is kept: a choice is only as good as its worst luck.`,
    caption: 'What is left at the end of the plan, at worst (in today’s dollars)',
    corner: 'QPP pension starts',
    start: (name, age) => `${name}, at ${age}`,
    fails: 'does not last',
    best: 'the best',
    current: 'your choice',
    bestIsCurrent: 'your choice, the best',
    bestLine: (first, second) => `The best choice for the two of you — ${first}; ${second}.`,
    sameLine: 'Your current choice is already the best of these nine.',
    noneLine: 'None of these nine combinations lasts in all three cases.',
    currentLine: (worst) => `With your current ages, ${worst} is left at the end of the plan, at worst.`,
    currentFails: 'With your current ages, the money does not last in one of the three cases.',
    gainLine: (amount) => `The best leaves ${amount} more, at worst, than your choice.`,
    only: 'Only the QPP start changes; retiring, the OAS and the rest of the plan stay as they are.',
    updating: 'Working it out…',
  },
}
