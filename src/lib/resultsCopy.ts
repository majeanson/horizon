// The words only the RESULTS page reads — the three questions, the headline, the « each of us » lines — in both languages.
//
// They live HERE and not in the eager dictionaries on purpose: the French dictionary is paid by every page of the app
// (check-bundle.mjs holds it to a budget), while this is fetched with the results page that uses it. The English copy is
// typed as the French one, so the two cannot drift apart; lib/resultsCopy.test.ts holds them to non-empty and translated.

const FR_RESULTS = {
  questions: {
    label: 'Ma question',
    tabs: { when: 'Quand prendre ma retraite ?', save: 'Combien épargner ?', stop: 'Quand arrêter de travailler ?' },
    save: {
      age: 'Partir à (âge)',
      amount: (amount: string) => `${amount} de plus par année`,
      perMonth: (amount: string) => `Soit environ ${amount} par mois, pendant que vous travaillez.`,
      why: (age: number) => `C’est le plus petit montant qui fait tenir le plan à ${age} ans. Il est pris sur vos dépenses d’aujourd’hui et placé dans un compte non enregistré.`,
      nothing: (age: number) => `Rien de plus : à ${age} ans, le plan tient déjà.`,
      nothingWhy: 'Vous épargnez déjà assez, selon ces hypothèses.',
      unreachable: (age: number) => `À ${age} ans, le plan ne tient pas.`,
      unreachableWhy: 'Même en mettant de côté toutes vos dépenses du temps où vous travaillez, il manquerait de l’argent. Essayez un âge plus tardif.',
      already: (amount: string) => `Vous épargnez déjà ${amount} par année.`,
      caveat: 'Un compte enregistré ferait un peu mieux : ce montant est donc prudent.',
    },
    stop: {
      age: (age: number, together: boolean) => `Dès ${age} ans${together ? ', tous les deux' : ''}.`,
      when: (name: string, year: number) => `${name} : en ${year}`,
      share: (pct: string, year: number) => `En ${year}, vos rentes, après impôt, couvrent ${pct} de vos dépenses ; le reste vient de votre épargne.`,
      coversFrom: (year: number) => `Dès ${year}, vos rentes seules, après impôt, couvrent vos dépenses.`,
      neverCovers: 'Vos rentes ne couvrent jamais seules vos dépenses : vous puisez dans l’épargne jusqu’à la fin.',
    },
  },
  headline: {
    now: 'Vous pouvez déjà prendre votre retraite.',
    at: (age: number, together: boolean) => `Vous pouvez prendre votre retraite à ${age} ans${together ? ', tous les deux' : ''}.`,
    none: (to: number) => `Avec ces hypothèses, la retraite ne tient pas, même à ${to} ans.`,
    holds: (horizon: number) => `Et l’argent dure jusqu’à ${horizon} ans.`,
    scenario: (name: string) => `Selon le scénario ${name}.`,
    scenarioCustom: 'Selon vos hypothèses personnalisées.',
    underPrudent: (age: number | null, name: string, max: number) =>
      age === null ? `Sous le scénario ${name.toLowerCase()}, aucun âge ne tient, même à ${max} ans.` : `Sous le scénario ${name.toLowerCase()} : ${age} ans.`,
    earlier: (age: number, year: number) => `À ${age} ans, l’argent viendrait à manquer dès ${year}.`,
    tryThis: 'Essayez de baisser les dépenses à la retraite, ou d’épargner davantage.',
    separately: 'Chacun de son côté :',
  },
  each: {
    title: 'Chacun de son côté',
    hint: 'Le plus tôt où chacun peut partir si l’autre part à l’âge de son profil. Les deux réponses ne se combinent pas : comparez la paire sous « Comparer des âges de départ ».',
    line: (name: string, age: number, other: string, held: number) => `${name} : dès ${age} ans, si ${other} part à ${held} ans`,
    none: (name: string, to: number, other: string, held: number) => `${name} : aucun âge jusqu’à ${to} ans ne tient, si ${other} part à ${held} ans`,
    compare: 'Comparer',
    compareFull: 'Les quatre comparaisons sont déjà utilisées : retirez-en une pour ajouter celle-ci.',
    compareLabel: (name: string, age: number, other: string, held: number) => `Comparer ${name} à ${age} ans et ${other} à ${held} ans`,
    busy: 'Calcul en cours…',
  },
}

const EN_RESULTS: typeof FR_RESULTS = {
  questions: {
    label: 'My question',
    tabs: { when: 'When can I retire?', save: 'How much to save?', stop: 'When can I stop working?' },
    save: {
      age: 'Retire at (age)',
      amount: (amount: string) => `${amount} more per year`,
      perMonth: (amount: string) => `About ${amount} a month, while you work.`,
      why: (age: number) => `The smallest amount that makes the plan last at ${age}. It is taken out of today’s spending and put in a non-registered account.`,
      nothing: (age: number) => `Nothing more: at ${age}, the plan already lasts.`,
      nothingWhy: 'You already save enough, under these assumptions.',
      unreachable: (age: number) => `At ${age}, the plan does not last.`,
      unreachableWhy: 'Even setting aside all of your spending while you work, money would run short. Try a later age.',
      already: (amount: string) => `You already save ${amount} a year.`,
      caveat: 'A registered account would do a little better, so this amount is cautious.',
    },
    stop: {
      age: (age: number, together: boolean) => `From ${age}${together ? ', both of you' : ''}.`,
      when: (name: string, year: number) => `${name}: in ${year}`,
      share: (pct: string, year: number) => `In ${year}, your pensions, after tax, cover ${pct} of your spending; the rest comes from your savings.`,
      coversFrom: (year: number) => `From ${year}, your pensions alone, after tax, cover your spending.`,
      neverCovers: 'Your pensions never cover your spending on their own: you draw on savings to the end.',
    },
  },
  headline: {
    now: 'You can already retire.',
    at: (age: number, together: boolean) => `You can retire at ${age}${together ? ', both of you' : ''}.`,
    none: (to: number) => `Under these assumptions, retiring does not work, even at ${to}.`,
    scenario: (name: string) => `Under the ${name} scenario.`,
    scenarioCustom: 'Under your own assumptions.',
    underPrudent: (age: number | null, name: string, max: number) =>
      age === null ? `Under the ${name} scenario no age works, even at ${max}.` : `Under the ${name} scenario: ${age}.`,
    holds: (horizon: number) => `And the money lasts to age ${horizon}.`,
    earlier: (age: number, year: number) => `At ${age}, the money would run short from ${year}.`,
    tryThis: 'Try lowering spending in retirement, or saving more.',
    separately: 'Each on their own:',
  },
  each: {
    title: 'Each on their own',
    hint: 'The earliest each person can leave if the other leaves at their profile age. The two answers do not add up to a plan: compare the pair under “Compare retirement ages”.',
    line: (name: string, age: number, other: string, held: number) => `${name}: from age ${age}, if ${other} leaves at ${held}`,
    none: (name: string, to: number, other: string, held: number) => `${name}: no age up to ${to} lasts, if ${other} leaves at ${held}`,
    compare: 'Compare',
    compareFull: 'All four comparisons are already used: remove one to add this one.',
    compareLabel: (name: string, age: number, other: string, held: number) => `Compare ${name} at ${age} and ${other} at ${held}`,
    busy: 'Working it out…',
  },
}

export const RESULTS_COPY = { fr: FR_RESULTS, en: EN_RESULTS }
