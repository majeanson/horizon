import type { Lang } from '../i18n'
import type { Level } from './levels'

// « Je ne connais pas mes chiffres » — the words of the level picker, of the helper under a figure, and of the range on the results page.
// Lazy with the screens that use them, so the first screen's code does not carry them.

interface LevelsCopy {
  title: string
  lead: string
  /** The three levels: a name and one line of what it stands for. */
  levels: Record<Level, { name: string; says: string }>
  pick: string
  /** What the pick just filled, said once: how many figures. */
  filled: (n: number) => string
  nothing: string
  undo: string
  matches: (name: string) => string
  /** How the retirement budget is set from the working one. */
  basis: { title: string; observed: (pct: number) => string; cautious: (pct: number) => string; why: (observedPct: number, cautiousPct: number) => string }
  /** The helper under one figure. */
  helper: { ask: string; change: string; estimated: (name: string) => string; group: string }
  /** What a level fills, by name of figure. */
  kind: { rrspBalance: string; tfsaBalance: string; nonRegBalance: string; homeValue: string; spendingWorking: string; spendingRetired: string }
  how: { open: string; lines: string[]; table: string; per: string; sources: string; official: string; notOfficial: string }
  /** The range on the results page. */
  range: { title: string; lead: string; earliest: (age: number) => string; monthly: (amount: string) => string; none: string; now: string; busy: string; note: string; fix: string; yearsOf: (a: number, b: number) => string }
}

const FR: LevelsCopy = {
  title: 'Je ne connais pas mes chiffres',
  lead: 'Pas de document sous la main? Choisissez un niveau : Horizon remplit ce qui est vide avec ce que détiennent des ménages canadiens de votre âge. Ce sont des estimations, à corriger quand vous aurez lu vos documents.',
  levels: {
    modest: { name: 'Modeste', says: 'Un ménage du 2e cinquième selon l’avoir net : un peu sous le centre.' },
    average: { name: 'Moyen', says: 'Le ménage du milieu : autant de ménages au-dessus qu’au-dessous.' },
    comfortable: { name: 'Aisé', says: 'Un ménage du 4e cinquième : nettement au-dessus du centre.' },
  },
  pick: 'Niveau de vie',
  filled: (n) => (n === 1 ? '1 chiffre rempli' : `${n} chiffres remplis`) + ' avec ce niveau. Tout reste « estimé » tant que vous ne l’avez pas lu sur un document.',
  nothing: 'Rien à remplir : chaque chiffre est déjà saisi ou confirmé. Un chiffre que vous avez tapé n’est jamais remplacé.',
  undo: 'Annuler',
  matches: (name) => `Les chiffres estimés correspondent au niveau « ${name} ».`,
  basis: {
    title: 'Budget à la retraite',
    observed: (pct) => `Comme observé : ${pct} % du budget d’avant`,
    cautious: (pct) => `Prudent : au moins ${pct} %`,
    why: (observedPct, cautiousPct) =>
      `Les ménages de 65 ans et plus dépensent environ ${observedPct} % de ce que dépensent ceux de 55 à 64 ans (Statistique Canada). Mais ils sont plus petits : un couple qui prend sa retraite ensemble baisse moins que la moyenne. Un budget trop bas rend la réponse trop optimiste, alors le choix prudent garde au moins ${cautiousPct} %. Ce seuil est un choix d’Horizon, pas un chiffre officiel.`,
  },
  helper: { ask: 'Je ne sais pas', change: 'Changer', estimated: (name) => `Estimé : niveau « ${name} », d’après des ménages canadiens de votre âge.`, group: 'Estimation selon un niveau de vie' },
  kind: {
    rrspBalance: 'Solde du REER',
    tfsaBalance: 'Solde du CELI',
    nonRegBalance: 'Comptes bancaires et non enregistrés',
    homeValue: 'Valeur de la maison',
    spendingWorking: 'Dépenses pendant le travail',
    spendingRetired: 'Dépenses à la retraite',
  },
  how: {
    open: 'D’où viennent ces chiffres?',
    lines: [
      'REER, CELI, comptes en banque et maison : la valeur médiane chez les ménages qui en ont, selon l’âge (Enquête sur la sécurité financière, 2023).',
      'Le niveau déplace ce chiffre selon l’écart entre le cinquième de ménages choisi (le 2e, celui du milieu ou le 4e selon l’avoir net) et l’ensemble des ménages.',
      'Dépenses : la dépense courante moyenne d’un ménage comme le vôtre (une personne, un couple, avec ou sans enfants), déplacée selon le cinquième de revenu; à la retraite, l’écart observé entre les ménages de 65 ans et plus et ceux de 55 à 64 ans (Enquête sur les dépenses des ménages, 2023).',
      'Le calcul du niveau est celui d’Horizon, pas une statistique officielle : voilà pourquoi tout reste « estimé ».',
    ],
    table: 'Ce que chaque niveau donne pour votre ménage',
    per: 'par an',
    sources: 'Tableaux de Statistique Canada',
    official: 'Ouvrir',
    notOfficial: 'seulement en anglais',
  },
  range: {
    title: 'Selon le niveau de vie',
    lead: 'Vos chiffres vides ou estimés pèsent sur la réponse. La voici selon chaque niveau, tout le reste étant tel que vous l’avez saisi.',
    earliest: (age) => `dès ${age} ans`,
    monthly: (amount) => `${amount} par mois`,
    none: 'pas avant 70 ans',
    now: 'dès maintenant',
    busy: 'Calcul des trois niveaux…',
    note: 'Estimations à partir de ménages canadiens de votre âge (Statistique Canada). Lisez vos documents pour remplacer l’écart par votre réponse.',
    fix: 'Rassembler mes documents',
    yearsOf: (a, b) => `${b - a} ans d’écart entre le niveau modeste et le niveau aisé`,
  },
}

const EN: LevelsCopy = {
  title: 'I do not know my numbers',
  lead: 'No documents at hand? Pick a level: Horizon fills what is blank with what Canadian households of your age hold. These are estimates, to correct once you have read your documents.',
  levels: {
    modest: { name: 'Modest', says: 'A household in the 2nd fifth by net worth: a little below the middle.' },
    average: { name: 'Average', says: 'The middle household: as many above as below.' },
    comfortable: { name: 'Comfortable', says: 'A household in the 4th fifth: well above the middle.' },
  },
  pick: 'Standard of living',
  filled: (n) => (n === 1 ? '1 figure filled' : `${n} figures filled`) + ' with this level. Everything stays “estimated” until you have read it off a document.',
  nothing: 'Nothing to fill: every figure is already typed or confirmed. A figure you typed is never replaced.',
  undo: 'Undo',
  matches: (name) => `The estimated figures match the “${name}” level.`,
  basis: {
    title: 'Retirement budget',
    observed: (pct) => `As observed: ${pct}% of the budget before`,
    cautious: (pct) => `Cautious: at least ${pct}%`,
    why: (observedPct, cautiousPct) =>
      `Households aged 65 and over spend about ${observedPct}% of what those aged 55 to 64 spend (Statistics Canada). But they are smaller: a couple retiring together drops less than the average. A budget set too low makes the answer too optimistic, so the cautious choice keeps at least ${cautiousPct}%. That floor is Horizon’s own choice, not an official figure.`,
  },
  helper: { ask: 'I don’t know', change: 'Change', estimated: (name) => `Estimated: “${name}” level, from Canadian households of your age.`, group: 'Estimate by standard of living' },
  kind: {
    rrspBalance: 'RRSP balance',
    tfsaBalance: 'TFSA balance',
    nonRegBalance: 'Bank and non-registered accounts',
    homeValue: 'Home value',
    spendingWorking: 'Spending while working',
    spendingRetired: 'Spending in retirement',
  },
  how: {
    open: 'Where do these figures come from?',
    lines: [
      'RRSP, TFSA, bank accounts and home: the median value among households that have one, by age (Survey of Financial Security, 2023).',
      'The level moves that figure by how the chosen fifth of households (the 2nd, the middle or the 4th by net worth) compares with all households.',
      'Spending: the average current spending of a household like yours (one person, a couple, with or without children), moved by the income fifth; in retirement, the gap seen between households aged 65 and over and those aged 55 to 64 (Survey of Household Spending, 2023).',
      'The level calculation is Horizon’s own, not an official statistic: that is why everything stays “estimated”.',
    ],
    table: 'What each level gives for your household',
    per: 'a year',
    sources: 'Statistics Canada tables',
    official: 'Open',
    notOfficial: 'English only',
  },
  range: {
    title: 'By standard of living',
    lead: 'Your blank or estimated figures weigh on the answer. Here it is at each level, everything else as you entered it.',
    earliest: (age) => `from age ${age}`,
    monthly: (amount) => `${amount} a month`,
    none: 'not before 70',
    now: 'right now',
    busy: 'Working out the three levels…',
    note: 'Estimates from Canadian households of your age (Statistics Canada). Read your documents to replace the spread with your own answer.',
    fix: 'Gather my documents',
    yearsOf: (a, b) => `${b - a} years apart between the modest and the comfortable level`,
  },
}

export const LEVELS_COPY: Record<Lang, LevelsCopy> = { fr: FR, en: EN }
