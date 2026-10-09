// The words only the RESULTS page reads — the three questions, the headline, the « each of us » lines — in both languages.
//
// They live HERE and not in the eager dictionaries on purpose: the French dictionary is paid by every page of the app
// (check-bundle.mjs holds it to a budget), while this is fetched with the results page that uses it. The English copy is
// typed as the French one, so the two cannot drift apart; lib/resultsCopy.test.ts holds them to non-empty and translated.
//
// ONE WORD PER IDEA (the glossary the review settled): the three ready-made sets of assumptions are « scénarios »
// (Prudent · Neutre · Audacieux, named in the dictionary); an age being compared is a « départ »; the sentence at the top
// is « la réponse », never a verdict; the money « dure jusqu’à » an age or a year, it does not « tenir » or « manquer ».

/** Where the age sits inside the headline sentence: the page draws that part large. */
export const AGE_TOKEN = '\u0000'

const FR_RESULTS = {
  tabs: { label: 'Vues des résultats', answer: 'Réponse', strategies: 'Stratégies', verify: 'Vérifier' },
  orders: {
    title: 'Dans quel ordre puiser ?',
    hint: (age: number) => `Votre plan, retraite à ${age} ans, refait avec chacun des six ordres de retrait des comptes. Les retraits sont recalculés année par année avec l’impôt, la RRQ, la PSV et le SRG.`,
    keep: 'Votre ordre actuel est le meilleur, ou l’écart est trop petit pour valoir un changement.',
    better: (name: string, bestAge: number | null, ownAge: number | null, saved: string) => {
      const years = (n: number) => `${n} ${n > 1 ? 'ans' : 'an'}`
      if (bestAge !== null && (ownAge === null || bestAge < ownAge)) {
        return `« ${name} » permet de prendre sa retraite ${ownAge === null ? `à ${bestAge} ans, alors que votre ordre ne dure à aucun âge` : `${years(ownAge - bestAge)} plus tôt`}.`
      }
      return `« ${name} » coûte environ ${saved} d’impôt de moins sur tout le plan (en dollars d’aujourd’hui).`
    },
    order: 'Ordre',
    earliest: 'Retraite au plus tôt',
    tax: 'Impôt sur tout le plan',
    worth: 'Valeur nette à la fin du plan',
    use: 'Choisir cet ordre',
    yours: '(votre ordre)',
    ahead: '(en tête)',
    age: (n: number) => `${n} ans`,
    updating: 'Mise à jour…',
    caveat:
      'Le classement se fait d’abord sur l’âge, puis sur l’impôt : la valeur nette compte le REER à sa pleine valeur, sans l’impôt qui reste à payer dessus. Le retrait minimum du FERR (le REER converti en revenu) est versé dans tous les cas.',
  },
  /** The plan leaving the device: on paper, or as a spreadsheet — no network either way. */
  out: {
    print: 'Imprimer le plan',
    csv: 'Télécharger en tableur (CSV)',
    csvDone: 'Tableau exporté',
    csvFile: (label: string) => `horizon-annee-par-annee-${label}.csv`,
  },
  pensions: {
    title: 'Quand commencer mes rentes ?',
    hint: 'Chaque façon de commencer vos rentes, et ce qu’elle fait à tout le plan.',
  },
  refine: {
    title: 'Préciser le calcul',
    hint: 'Votre réponse est déjà solide. Ces chiffres la rendraient plus précise.',
    /** When the answer is « the money does not last », nothing is « solid ». */
    hintNone: 'Ces chiffres rendraient le calcul plus précis.',
    statement: 'Vos revenus admissibles de votre relevé RRQ, année par année.',
    accounts: 'Les soldes de vos comptes : REER, CELI, non enregistré.',
    spendingWork: 'Vos dépenses pendant les années de travail.',
    toProfile: 'Ouvrir le profil',
    toAssumptions: 'Ouvrir les hypothèses',
  },
  /** The page's map: one short noun per section, the same word as the section's own title. */
  nav: {
    label: 'Sections des résultats',
    reponse: 'La réponse',
    solidite: 'Solidité',
    comparer: 'Comparer',
    rentes: 'Rentes',
    ajuster: 'Ajuster',
    chiffres: 'Mes chiffres',
    ordre: 'Ordre de retrait',
    tableau: 'Année par année',
    sensibilite: 'Sensibilité',
    parametres: 'Paramètres',
  },
  questions: {
    tabs: { save: 'Combien épargner ?', spend: 'Et si je dépensais moins ?' },
    spend: {
      label: 'Dépenses à la retraite',
      hint: 'Glissez : l’âge est recalculé pour ce montant. Rien n’est enregistré tant que vous ne gardez pas le montant.',
      at: (amount: string, age: number) => `À ${amount} par année : dès ${age} ans.`,
      now: (amount: string) => `À ${amount} par année : dès maintenant.`,
      none: (amount: string, max: number) => `À ${amount} par année, l’argent ne dure à aucun âge jusqu’à ${max} ans.`,
      perMonth: (amount: string) => `Soit ${amount} par mois, en dollars d’aujourd’hui.`,
      /** On the profile's own amount the answer is the one above: the slider is an invitation, not a repeat. */
      current: 'Glissez pour voir l’âge à un autre montant.',
      sameAmount: 'C’est le montant de vos hypothèses.',
      years: (n: number) => `${n} ${n > 1 ? 'ans' : 'an'}`,
      earlier: (years: string, current: string) => `${years} plus tôt qu’avec les ${current} de vos hypothèses.`,
      later: (years: string, current: string) => `${years} plus tard qu’avec les ${current} de vos hypothèses.`,
      sameAge: (current: string) => `Le même âge qu’avec les ${current} de vos hypothèses.`,
      keep: 'Garder ce montant dans mes hypothèses',
      kept: 'Dépenses à la retraite mises à jour',
      updating: 'Mise à jour du calcul…',
      caveat: 'Les dépenses pendant le travail et les autres hypothèses ne bougent pas.',
    },
    save: {
      age: 'Partir à (âge)',
      amount: (amount: string) => `${amount} de plus par année`,
      perMonth: (amount: string) => `Soit environ ${amount} par mois, pendant que vous travaillez.`,
      why: (age: number) => `C’est le plus petit montant qui fait durer l’argent jusqu’à la fin du plan en partant à ${age} ans. Il est pris sur vos dépenses d’aujourd’hui et placé dans un compte non enregistré.`,
      nothing: (age: number) => `Rien de plus : à ${age} ans, l’argent dure déjà.`,
      nothingWhy: 'Vous épargnez déjà assez, selon ces hypothèses.',
      unreachable: (age: number) => `À ${age} ans, l’argent ne dure pas.`,
      unreachableWhy: 'Épargner davantage ne suffit pas à cet âge. Un âge un peu plus tard, ou des dépenses plus basses, change tout.',
      already: (amount: string) => `Vous épargnez déjà ${amount} par année.`,
      updating: 'Mise à jour du calcul…',
      caveat: 'Un compte enregistré ferait un peu mieux : ce montant est donc prudent.',
    },
    /** The answer's age, in dates, on the answer card itself. */
    stop: {
      title: 'En dates',
      when: (name: string, year: string) => `${name} : en ${year}`,
      share: (pct: string, year: string) => `En ${year}, vos rentes, après impôt, couvrent ${pct} de vos dépenses ; le reste vient de votre épargne.`,
      shareNone: (year: string) => `En ${year}, aucune rente n’a encore commencé : tout vient de votre épargne.`,
      shareAll: (pct: string, year: string) => `Une fois toutes vos rentes commencées, en ${year}, elles couvrent ${pct} de vos dépenses, après impôt.`,
      coversFrom: (year: string) => `Dès ${year}, vos rentes seules, après impôt, couvrent vos dépenses.`,
      neverCovers: 'Vos rentes ne couvrent jamais seules vos dépenses : vous puisez dans l’épargne jusqu’à la fin.',
    },
  },
  headline: {
    confidence: (confirmed: number, total: number) => `Votre profil : ${confirmed} sur ${total} chiffres confirmés ; le reste est estimé.`,
    confidenceAll: 'Tous les chiffres de votre profil sont confirmés par vos documents.',
    confidenceLink: 'Rendre mon profil exact',
    now: 'Vous pouvez déjà prendre votre retraite.',
    retired: (together: boolean): string => (together ? 'Vous êtes déjà tous les deux à la retraite.' : 'Vous êtes déjà à la retraite.'),
    runsOut: (year: string) => `Mais l’argent ne durerait que jusqu’en ${year}.`,
    retiredPrudent: (name: string, ok: boolean, year: string | null) => (ok ? `Sous le scénario ${name} : l’argent dure aussi.` : `Sous le scénario ${name} : l’argent dure jusqu’en ${year}.`),
    /** The age is drawn large: `ageText` is the formatted « 59 ans », placed where AGE_TOKEN sits. */
    ageText: (age: number) => `${age} ans`,
    at: (ageText: string, together: boolean) => `Vous pouvez prendre votre retraite à ${ageText}${together ? ', tous les deux' : ''}.`,
    none: (to: number) => `Avec ces hypothèses, l’argent ne suffit pas encore, même à ${to} ans.`,
    holds: (horizon: number) => `Et l’argent dure jusqu’à ${horizon} ans.`,
    scenario: (name: string) => `Selon le scénario ${name}.`,
    scenarioCustom: 'Selon vos hypothèses personnalisées.',
    /** The heading of the three labelled figures; the preset names come from the dictionary's own `assumptions.presets`. */
    /** The card under the answer: how far it moves with the scenario, a hard market, a change of plan. */
    firmTitle: 'Solidité de la réponse',
    adjustTitle: 'Et si je change mon plan ?',
    rangeTitle: 'Selon le scénario',
    rangeAge: (age: number) => `${age} ans`,
    rangeNone: (max: number) => `aucun âge jusqu’à ${max} ans`,
    rangeGap: 'L’écart avec le scénario Prudent est marqué : la sensibilité montre comment l’âge bouge quand chaque hypothèse bouge.',
    trySensitivity: 'Voir la sensibilité',
    sensitivityDetail: 'Comment l’âge de la réponse bouge quand le rendement, l’inflation et l’âge de fin du plan bougent.',
    /** Under « Comparer » : why this age and not the one before. `year` is the LAST year the money lasts, with its ages. */
    earlier: (age: number, year: string) => `À ${age} ans, l’argent ne durerait que jusqu’en ${year}.`,
    /** The accessible suffix on the compare rail's marked chip — the answer's own age among the others. */
    earliestChip: 'le plus tôt qui dure',
    tryThis: 'Voici ce qui peut changer la donne : baisser les dépenses à la retraite, ou épargner davantage.',
    tryLedger: 'Ajuster mes chiffres',
    trySpend: 'Et si je dépensais moins ?',
  },
  each: {
    title: 'Chacun de son côté',
    hint: 'Le plus tôt où chacun peut partir si l’autre part à l’âge de son profil. Les deux réponses ne se combinent pas : comparez la paire sous « Comparer ».',
    line: (name: string, age: number, other: string, held: number) => `${name} : dès ${age} ans, si ${other} part à ${held} ans`,
    none: (name: string, to: number, other: string, held: number) => `${name} : l’argent ne dure à aucun âge jusqu’à ${to} ans, si ${other} part à ${held} ans`,
    compare: 'Comparer',
    compareFull: 'Les quatre comparaisons sont déjà utilisées : retirez-en une pour ajouter celle-ci.',
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
    worth: 'Net worth at the end of the plan',
    use: 'Choose this order',
    yours: '(your order)',
    ahead: '(ahead)',
    age: (n: number) => `${n}`,
    updating: 'Updating…',
    caveat:
      'The ranking goes first to the age, then to the tax: net worth counts the RRSP at its full value, without the tax still owed on it. The minimum RRIF payment (the RRSP turned into income) is made in every case.',
  },
  out: {
    print: 'Print the plan',
    csv: 'Download as a spreadsheet (CSV)',
    csvDone: 'Table exported',
    csvFile: (label: string) => `horizon-year-by-year-${label}.csv`,
  },
  pensions: {
    title: 'When should my pensions start?',
    hint: 'Each way of starting your pensions, and what it does to the whole plan.',
  },
  refine: {
    title: 'Refine the calculation',
    hint: 'Your answer already stands. These numbers would make it more precise.',
    hintNone: 'These numbers would make the calculation more precise.',
    statement: 'Your pensionable earnings from your QPP statement, year by year.',
    accounts: 'Your account balances: RRSP, TFSA, non-registered.',
    spendingWork: 'Your spending during the working years.',
    toProfile: 'Open the profile',
    toAssumptions: 'Open the assumptions',
  },
  nav: {
    label: 'Results sections',
    reponse: 'The answer',
    solidite: 'How firm',
    comparer: 'Compare',
    rentes: 'Pensions',
    ajuster: 'Adjust',
    chiffres: 'My figures',
    ordre: 'Withdrawal order',
    tableau: 'Year by year',
    sensibilite: 'Sensitivity',
    parametres: 'Parameters',
  },
  questions: {
    tabs: { save: 'How much to save?', spend: 'What if I spent less?' },
    spend: {
      label: 'Spending in retirement',
      hint: 'Drag: the age is recomputed for that amount. Nothing is saved until you keep the amount.',
      at: (amount: string, age: number) => `At ${amount} a year: from age ${age}.`,
      now: (amount: string) => `At ${amount} a year: right now.`,
      none: (amount: string, max: number) => `At ${amount} a year, the money lasts at no age up to ${max}.`,
      perMonth: (amount: string) => `That is ${amount} a month, in today’s dollars.`,
      current: 'Drag to see the age at another amount.',
      sameAmount: 'This is the amount in your assumptions.',
      years: (n: number) => `${n} year${n > 1 ? 's' : ''}`,
      earlier: (years: string, current: string) => `${years} earlier than with the ${current} in your assumptions.`,
      later: (years: string, current: string) => `${years} later than with the ${current} in your assumptions.`,
      sameAge: (current: string) => `The same age as with the ${current} in your assumptions.`,
      keep: 'Keep this amount in my assumptions',
      kept: 'Retirement spending updated',
      updating: 'Updating the calculation…',
      caveat: 'Spending while working and the other assumptions do not move.',
    },
    save: {
      age: 'Retire at (age)',
      amount: (amount: string) => `${amount} more per year`,
      perMonth: (amount: string) => `About ${amount} a month, while you work.`,
      why: (age: number) => `The smallest amount that makes the money last to the end of the plan when retiring at ${age}. It is taken out of today’s spending and put in a non-registered account.`,
      nothing: (age: number) => `Nothing more: at ${age}, the money already lasts.`,
      nothingWhy: 'You already save enough, under these assumptions.',
      unreachable: (age: number) => `At ${age}, the money does not last.`,
      unreachableWhy: 'Saving more is not enough at that age. A slightly later age, or lower spending, changes everything.',
      already: (amount: string) => `You already save ${amount} a year.`,
      updating: 'Updating the calculation…',
      caveat: 'A registered account would do a little better, so this amount is cautious.',
    },
    stop: {
      title: 'In dates',
      when: (name: string, year: string) => `${name}: in ${year}`,
      share: (pct: string, year: string) => `In ${year}, your pensions, after tax, cover ${pct} of your spending; the rest comes from your savings.`,
      shareNone: (year: string) => `In ${year}, no pension has started yet: everything comes from your savings.`,
      shareAll: (pct: string, year: string) => `Once all your pensions have started, in ${year}, they cover ${pct} of your spending, after tax.`,
      coversFrom: (year: string) => `From ${year}, your pensions alone, after tax, cover your spending.`,
      neverCovers: 'Your pensions never cover your spending on their own: you draw on savings to the end.',
    },
  },
  headline: {
    confidence: (confirmed: number, total: number) => `Your profile: ${confirmed} of ${total} figures confirmed; the rest is estimated.`,
    confidenceAll: 'Every figure in your profile is confirmed by your documents.',
    confidenceLink: 'Make my profile exact',
    now: 'You can already retire.',
    retired: (together: boolean): string => (together ? 'You are both already retired.' : 'You are already retired.'),
    runsOut: (year: string) => `But the money would only last until ${year}.`,
    retiredPrudent: (name: string, ok: boolean, year: string | null) => (ok ? `Under the ${name} scenario: the money lasts too.` : `Under the ${name} scenario: the money lasts until ${year}.`),
    ageText: (age: number) => `age ${age}`,
    at: (ageText: string, together: boolean) => `You can retire at ${ageText}${together ? ', both of you' : ''}.`,
    none: (to: number) => `Under these assumptions, the money is not enough yet, even at ${to}.`,
    scenario: (name: string) => `Under the ${name} scenario.`,
    scenarioCustom: 'Under your own assumptions.',
    firmTitle: 'How firm the answer is',
    adjustTitle: 'What if I change the plan?',
    rangeTitle: 'By scenario',
    rangeAge: (age: number) => `age ${age}`,
    rangeNone: (max: number) => `no age up to ${max}`,
    rangeGap: 'The gap with the Conservative scenario is wide: the sensitivity shows how the age moves as each assumption moves.',
    trySensitivity: 'See the sensitivity',
    sensitivityDetail: 'How the answer’s age moves when returns, inflation and the plan’s end age move.',
    holds: (horizon: number) => `And the money lasts to age ${horizon}.`,
    earlier: (age: number, year: string) => `At ${age}, the money would only last until ${year}.`,
    earliestChip: 'the earliest that lasts',
    tryThis: 'Here is what can change the picture: lower spending in retirement, or save more.',
    tryLedger: 'Adjust my figures',
    trySpend: 'What if I spent less?',
  },
  each: {
    title: 'Each on their own',
    hint: 'The earliest each person can leave if the other leaves at their profile age. The two answers do not add up to a plan: compare the pair under “Compare”.',
    line: (name: string, age: number, other: string, held: number) => `${name}: from age ${age}, if ${other} leaves at ${held}`,
    none: (name: string, to: number, other: string, held: number) => `${name}: the money lasts at no age up to ${to}, if ${other} leaves at ${held}`,
    compare: 'Compare',
    compareFull: 'All four comparisons are already used: remove one to add this one.',
    compareLabel: (name: string, age: number, other: string, held: number) => `Compare ${name} at ${age} and ${other} at ${held}`,
    busy: 'Working it out…',
  },
}

export const RESULTS_COPY = { fr: FR_RESULTS, en: EN_RESULTS }
