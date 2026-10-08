// The words only the RESULTS page reads — the three questions, the headline, the « each of us » lines — in both languages.
//
// They live HERE and not in the eager dictionaries on purpose: the French dictionary is paid by every page of the app
// (check-bundle.mjs holds it to a budget), while this is fetched with the results page that uses it. The English copy is
// typed as the French one, so the two cannot drift apart; lib/resultsCopy.test.ts holds them to non-empty and translated.

const FR_RESULTS = {
  tabs: { label: 'Vues des résultats', answer: 'Réponse', strategies: 'Stratégies', verify: 'Vérifier' },
  orders: {
    title: 'Dans quel ordre puiser ?',
    hint: (age: number) => `Votre plan, retraite à ${age} ans, refait avec chacun des six ordres de retrait des comptes. Les retraits sont recalculés année par année avec l’impôt, la RRQ, la PSV et le SRG.`,
    keep: 'Votre ordre actuel est le meilleur, ou l’écart est trop petit pour valoir un changement.',
    better: (name: string, bestAge: number | null, ownAge: number | null, saved: string) => {
      const years = (n: number) => `${n} ${n > 1 ? 'ans' : 'an'}`
      if (bestAge !== null && (ownAge === null || bestAge < ownAge)) {
        return `« ${name} » permet de prendre sa retraite ${ownAge === null ? `à ${bestAge} ans, alors que votre ordre ne tient à aucun âge` : `${years(ownAge - bestAge)} plus tôt`}.`
      }
      return `« ${name} » coûte environ ${saved} d’impôt de moins sur tout le plan (en dollars d’aujourd’hui).`
    },
    order: 'Ordre',
    earliest: 'Retraite au plus tôt',
    tax: 'Impôt sur tout le plan',
    worth: 'Valeur nette à l’horizon',
    use: 'Utiliser',
    yours: '(votre ordre)',
    ahead: '(en tête)',
    age: (n: number) => `${n} ans`,
    updating: 'Mise à jour…',
    caveat:
      'La valeur nette compte ce qui reste dans le REER à sa pleine valeur, sans l’impôt qu’il faudrait encore payer : un ordre qui garde le REER pour la fin paraît plus riche qu’il ne l’est. Le classement va donc d’abord à l’âge, puis à l’impôt. « REER d’abord » est la forme simple d’une décumulation : le calcul ne remplit pas une tranche d’impôt pour s’arrêter ensuite. Le FERR minimum est versé dans tous les cas.',
  },
  /** The plan leaving the device: on paper, or as a spreadsheet — no network either way. */
  out: {
    print: 'Imprimer le plan',
    csv: 'Télécharger en tableur (CSV)',
    csvDone: 'Tableau exporté',
    csvFile: (label: string) => `horizon-annee-par-annee-${label}.csv`,
  },
  arcs: {
    answer: 'La réponse',
    pensions: 'Vos rentes publiques',
    verify: 'Vérifier et ajuster',
  },
  pensions: {
    title: 'Quand commencer mes rentes ?',
    hint: 'Une décision, deux vues : ce que chaque façon de commencer fait à tout le plan, puis la règle, rente par rente.',
    planView: 'L’effet sur tout le plan',
    ruleView: 'La règle, rente par rente',
  },
  refine: {
    title: 'Préciser le calcul',
    hint: 'Le verdict tient déjà debout ; ces chiffres le rendraient plus fidèle.',
    /** When the verdict is « ça ne tient pas », nothing « tient déjà debout ». */
    hintNone: 'Ces chiffres rendraient le calcul plus fidèle.',
    statement: 'La rente projetée de votre relevé RRQ, ou vos revenus admissibles année par année.',
    accounts: 'Les soldes de vos comptes — REER, CELI, non enregistré.',
    spendingWork: 'Vos dépenses pendant les années de travail.',
    toProfile: 'Ouvrir le profil',
    toAssumptions: 'Ouvrir les hypothèses',
  },
  nav: {
    label: 'Sections des résultats',
    verdict: 'Verdict',
    comparer: 'Comparer',
    rentes: 'Rentes : quand ?',
    epargner: 'Épargner',
    arreter: 'Arrêter',
    donneesCalcul: 'Mes données',
    ordre: 'Ordre de retrait',
    tableau: 'Année par année',
    sensibilite: 'Sensibilité',
    parametres: 'Paramètres',
  },
  questions: {
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
      updating: 'Mise à jour du calcul…',
      caveat: 'Un compte enregistré ferait un peu mieux : ce montant est donc prudent.',
    },
    stop: {
      hint: 'L’âge du verdict, mis en dates.',
      when: (name: string, year: string) => `${name} : en ${year}`,
      share: (pct: string, year: string) => `En ${year}, vos rentes, après impôt, couvrent ${pct} de vos dépenses ; le reste vient de votre épargne.`,
      coversFrom: (year: string) => `Dès ${year}, vos rentes seules, après impôt, couvrent vos dépenses.`,
      neverCovers: 'Vos rentes ne couvrent jamais seules vos dépenses : vous puisez dans l’épargne jusqu’à la fin.',
    },
  },
  headline: {
    now: 'Vous pouvez déjà prendre votre retraite.',
    retired: (together: boolean): string => (together ? 'Vous êtes déjà tous les deux à la retraite.' : 'Vous êtes déjà à la retraite.'),
    runsOut: (year: string) => `Mais l’argent viendrait à manquer dès ${year}.`,
    retiredPrudent: (name: string, ok: boolean, year: string | null) => (ok ? `Sous le scénario ${name.toLowerCase()} : l’argent dure aussi.` : `Sous le scénario ${name.toLowerCase()} : l’argent manque dès ${year}.`),
    at: (age: number, together: boolean) => `Vous pouvez prendre votre retraite à ${age} ans${together ? ', tous les deux' : ''}.`,
    none: (to: number) => `Avec ces hypothèses, la retraite ne tient pas, même à ${to} ans.`,
    holds: (horizon: number) => `Et l’argent dure jusqu’à ${horizon} ans.`,
    scenario: (name: string) => `Selon le scénario ${name}.`,
    scenarioCustom: 'Selon vos hypothèses personnalisées.',
    /** The heading of the three labelled figures; the preset names come from the dictionary's own `assumptions.presets`. */
    rangeTitle: 'Selon le scénario',
    rangeAge: (age: number) => `${age} ans`,
    rangeNone: (max: number) => `aucun âge jusqu’à ${max} ans`,
    rangeGap: 'L’écart avec le scénario prudent est marqué : « Sensibilité », plus bas, montre comment l’âge bouge quand chaque hypothèse bouge.',
    sensitivityDetail: 'Comment l’âge du verdict bouge quand le rendement, l’inflation et l’horizon bougent — ce qui sépare les trois scénarios du verdict.',
    earlier: (age: number, year: string) => `À ${age} ans, l’argent viendrait à manquer dès ${year}.`,
    /** The accessible suffix on the compare rail's marked chip — the verdict's own age among twenty look-alikes. */
    earliestChip: 'le plus tôt qui tient',
    tryThis: 'Essayez de baisser les dépenses à la retraite, ou d’épargner davantage.',
    tryLedger: 'Ajuster mes chiffres, plus bas',
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
  tabs: { label: 'Results views', answer: 'Answer', strategies: 'Strategies', verify: 'Check' },
  orders: {
    title: 'In which order should I draw?',
    hint: (age: number) => `Your plan, retiring at ${age}, rerun with each of the six orders of drawing the accounts. Withdrawals are recomputed year by year with tax, QPP, OAS and GIS.`,
    keep: 'Your current order is the best one, or the gap is too small to be worth a change.',
    better: (name: string, bestAge: number | null, ownAge: number | null, saved: string) => {
      const years = (n: number) => `${n} year${n > 1 ? 's' : ''}`
      if (bestAge !== null && (ownAge === null || bestAge < ownAge)) {
        return `“${name}” lets you retire ${ownAge === null ? `at ${bestAge}, where your order lasts at no age` : `${years(ownAge - bestAge)} earlier`}.`
      }
      return `“${name}” costs about ${saved} less tax over the whole plan (in today’s dollars).`
    },
    order: 'Order',
    earliest: 'Earliest retirement',
    tax: 'Tax over the plan',
    worth: 'Net worth at the horizon',
    use: 'Use',
    yours: '(your order)',
    ahead: '(ahead)',
    age: (n: number) => `${n}`,
    updating: 'Updating…',
    caveat:
      'Net worth counts what is left in the RRSP at its full value, without the tax still owed on it: an order that keeps the RRSP for last looks richer than it is. The ranking therefore goes first to the age, then to the tax. “RRSP first” is the plain form of a meltdown: the calculation does not fill a tax bracket and then stop. The minimum RRIF payment is made in every case.',
  },
  out: {
    print: 'Print the plan',
    csv: 'Download as a spreadsheet (CSV)',
    csvDone: 'Table exported',
    csvFile: (label: string) => `horizon-year-by-year-${label}.csv`,
  },
  arcs: {
    answer: 'The answer',
    pensions: 'Your public pensions',
    verify: 'Check and adjust',
  },
  pensions: {
    title: 'When should my pensions start?',
    hint: 'One decision, two views: what each way of starting does to the whole plan, then the rule, pension by pension.',
    planView: 'The effect on the whole plan',
    ruleView: 'The rule, pension by pension',
  },
  refine: {
    title: 'Refine the calculation',
    hint: 'The verdict already stands; these numbers would make it more faithful.',
    hintNone: 'These numbers would make the calculation more faithful.',
    statement: 'The projected pension from your QPP statement, or your pensionable earnings year by year.',
    accounts: 'Your account balances — RRSP, TFSA, non-registered.',
    spendingWork: 'Your spending during the working years.',
    toProfile: 'Open the profile',
    toAssumptions: 'Open the assumptions',
  },
  nav: {
    label: 'Results sections',
    verdict: 'Verdict',
    comparer: 'Compare',
    rentes: 'Pensions: when?',
    epargner: 'Save',
    arreter: 'Stop',
    donneesCalcul: 'My data',
    ordre: 'Withdrawal order',
    tableau: 'Year by year',
    sensibilite: 'Sensitivity',
    parametres: 'Parameters',
  },
  questions: {
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
      updating: 'Updating the calculation…',
      caveat: 'A registered account would do a little better, so this amount is cautious.',
    },
    stop: {
      hint: 'The verdict’s age, put in dates.',
      when: (name: string, year: string) => `${name}: in ${year}`,
      share: (pct: string, year: string) => `In ${year}, your pensions, after tax, cover ${pct} of your spending; the rest comes from your savings.`,
      coversFrom: (year: string) => `From ${year}, your pensions alone, after tax, cover your spending.`,
      neverCovers: 'Your pensions never cover your spending on their own: you draw on savings to the end.',
    },
  },
  headline: {
    now: 'You can already retire.',
    retired: (together: boolean): string => (together ? 'You are both already retired.' : 'You are already retired.'),
    runsOut: (year: string) => `But the money would run out in ${year}.`,
    retiredPrudent: (name: string, ok: boolean, year: string | null) => (ok ? `Under the ${name} scenario: the money lasts too.` : `Under the ${name} scenario: the money runs out in ${year}.`),
    at: (age: number, together: boolean) => `You can retire at ${age}${together ? ', both of you' : ''}.`,
    none: (to: number) => `Under these assumptions, retiring does not work, even at ${to}.`,
    scenario: (name: string) => `Under the ${name} scenario.`,
    scenarioCustom: 'Under your own assumptions.',
    rangeTitle: 'By scenario',
    rangeAge: (age: number) => `age ${age}`,
    rangeNone: (max: number) => `no age up to ${max}`,
    rangeGap: 'The gap with the conservative scenario is wide: “Sensitivity”, below, shows how the age moves as each assumption moves.',
    sensitivityDetail: 'How the verdict’s age moves when returns, inflation and the horizon move — what sets the three scenarios apart.',
    holds: (horizon: number) => `And the money lasts to age ${horizon}.`,
    earlier: (age: number, year: string) => `At ${age}, the money would run short from ${year}.`,
    earliestChip: 'the earliest that lasts',
    tryThis: 'Try lowering spending in retirement, or saving more.',
    tryLedger: 'Adjust my numbers, below',
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
