import type { Lang } from '../i18n.ts'

// THE WORDS OF THE FIRST VISIT: one question per screen, each with the one line of why it is asked. Outside the eager dictionaries
// on purpose — a returning visitor never sees them, so they arrive only with the path that needs them.

export interface OnboardCopy {
  /** The promise, over the first question: how many questions, and what comes out. */
  promise: (questions: number) => string
  privacy: string
  progress: (n: number, of: number) => string
  back: string
  next: string
  skip: string
  example: string
  who: { q: string; why: string; alone: string; couple: string; dropSpouse: string; dropSpouseLabel: string }
  birth: { q: string; why: string; year: string; placeholder: string }
  spouseBirth: { q: string; why: string }
  income: { q: string; why: string; label: string }
  spouseIncome: { q: string; why: string }
  savings: { q: string; why: string; rrsp: string; tfsa: string; nonReg: string }
  spouseSavings: { q: string; why: string }
  pension: { q: string; spouseQ: string; why: string; none: string; rregop: string; other: string; service: string; otherNote: string }
  retire: { q: string; why: string; you: string; spouse: string }
  spending: { q: string; why: string; label: string; estimate: string; estimated: (amount: string) => string }
  home: { q: string; why: string; no: string; yes: string; value: string; balance: string; payment: string }
  done: {
    q: string
    /** The last screen when something a result needs is still blank. */
    qMissing: string
    why: string
    see: string
    refine: string
    missing: string
    /** On each missing item: the way back to its question. */
    fix: string
    summary: {
      birth: (year: number) => string
      income: (amount: string) => string
      savings: (amount: string) => string
      pension: (name: string) => string
      retire: (age: number) => string
      spending: (amount: string) => string
      home: (value: string) => string
      spouse: string
    }
  }
}

const FR: OnboardCopy = {
  promise: (n) => `${n} questions, et vous saurez à quel âge l’argent suffit.`,
  privacy: 'Rien de ce que vous écrivez ne quitte cet appareil.',
  progress: (n, of) => `Question ${n} sur ${of}`,
  back: 'Précédent',
  next: 'Suivant',
  skip: 'Passer au formulaire complet',
  example: 'Voir un exemple',
  who: {
    q: 'Pour qui faisons-nous le calcul ?',
    why: 'Un couple se calcule ensemble : deux revenus, deux retraites, un seul budget.',
    alone: 'Juste moi',
    couple: 'Moi et mon ou ma partenaire',
    dropSpouse: 'Revenir à « Juste moi » ? Ce que vous avez écrit pour votre partenaire sera effacé.',
    dropSpouseLabel: 'Effacer',
  },
  birth: { q: 'Quelle est votre année de naissance ?', why: 'Elle fixe vos âges, donc le moment de chaque rente.', year: 'Année de naissance', placeholder: 'ex. 1975' },
  spouseBirth: { q: 'Quelle est l’année de naissance de votre partenaire ?', why: 'Chaque personne a ses propres âges et ses propres rentes.' },
  income: { q: 'Combien gagnez-vous par année ?', why: 'Votre revenu de travail avant impôt, en dollars d’aujourd’hui. Écrivez 0 si vous ne travaillez plus.', label: 'Revenu de travail par année' },
  spouseIncome: { q: 'Combien gagne votre partenaire par année ?', why: 'Avant impôt, en dollars d’aujourd’hui. 0 si cette personne ne travaille pas.' },
  savings: {
    q: 'Que contiennent vos comptes d’épargne ?',
    why: 'Le total de chaque type de compte, comme sur votre dernier relevé. 0 si vous n’en avez pas.',
    rrsp: 'REER (épargne-retraite)',
    tfsa: 'CELI (épargne libre d’impôt)',
    nonReg: 'Autres placements, hors REER et CELI',
  },
  spouseSavings: { q: 'Et les comptes de votre partenaire ?', why: 'Le total de chaque type de compte. 0 s’il n’y en a pas.' },
  pension: {
    q: 'Avez-vous un régime de retraite d’employeur ?',
    spouseQ: 'Et votre partenaire, un régime de retraite d’employeur ?',
    why: 'Une rente d’employeur (le RREGOP du secteur public, par exemple) pèse souvent plus que l’épargne : elle compte dès la première réponse.',
    none: 'Non, ou je ne sais pas',
    rregop: 'Oui, le RREGOP',
    other: 'Oui, un autre régime',
    service: 'Années de service (sur votre relevé)',
    otherNote: 'Vous l’ajouterez dans le profil, avec les règles de votre livret. La première réponse se fait sans.',
  },
  retire: { q: 'À quel âge pensez-vous arrêter de travailler ?', why: 'C’est votre plan : la réponse compare aussi d’autres âges.', you: 'Vous', spouse: 'Votre partenaire' },
  spending: {
    q: 'Combien dépensez-vous par année ?',
    why: 'Tout ce que le ménage dépense, sans l’impôt ni l’épargne. On suppose la même chose à la retraite.',
    label: 'Dépenses par année',
    estimate: 'Estimer : 60 % du revenu brut',
    estimated: (amount) => `Estimation : ${amount}. À remplacer par vos vrais chiffres.`,
  },
  home: {
    q: 'Êtes-vous propriétaire de votre résidence ?',
    why: 'La maison compte comme une richesse, et l’hypothèque comme une dépense qui prend fin.',
    no: 'Non, je suis locataire',
    yes: 'Oui, je suis propriétaire',
    value: 'Valeur de la maison',
    balance: 'Solde de l’hypothèque',
    payment: 'Paiement mensuel',
  },
  done: {
    q: 'C’est assez pour une première réponse',
    qMissing: 'Il manque une réponse',
    why: 'Ces chiffres sont des estimations tant que vous ne les confirmez pas : le profil vous guidera, document par document.',
    see: 'Voir ma réponse',
    refine: 'Préciser mon profil',
    missing: 'Il manque encore :',
    fix: 'Répondre',
    summary: {
      birth: (year) => `Année de naissance : ${year}`,
      income: (amount) => `Revenu : ${amount} par année`,
      savings: (amount) => `Épargne : ${amount}`,
      pension: (name) => `Régime d’employeur : ${name}`,
      retire: (age) => `Retraite visée à ${age} ans`,
      spending: (amount) => `Dépenses : ${amount} par année`,
      home: (value) => `Maison : ${value}`,
      spouse: 'Avec votre partenaire',
    },
  },
}

const EN: OnboardCopy = {
  promise: (n) => `${n} questions, and you will know at what age the money is enough.`,
  privacy: 'Nothing you write leaves this device.',
  progress: (n, of) => `Question ${n} of ${of}`,
  back: 'Previous',
  next: 'Next',
  skip: 'Go to the full form',
  example: 'See an example',
  who: {
    q: 'Who is this calculation for?',
    why: 'A couple is worked out together: two incomes, two retirements, one budget.',
    alone: 'Just me',
    couple: 'Me and my partner',
    dropSpouse: 'Back to “Just me”? What you wrote for your partner will be erased.',
    dropSpouseLabel: 'Erase',
  },
  birth: { q: 'What year were you born?', why: 'It sets your ages, so when each pension starts.', year: 'Year of birth', placeholder: 'e.g. 1975' },
  spouseBirth: { q: 'What year was your partner born?', why: 'Each person has their own ages and their own pensions.' },
  income: { q: 'How much do you earn a year?', why: 'Your work income before tax, in today’s dollars. Write 0 if you no longer work.', label: 'Work income per year' },
  spouseIncome: { q: 'How much does your partner earn a year?', why: 'Before tax, in today’s dollars. 0 if they do not work.' },
  savings: {
    q: 'What do your savings accounts hold?',
    why: 'The total of each kind of account, as on your latest statement. 0 if you have none.',
    rrsp: 'RRSP (retirement savings)',
    tfsa: 'TFSA (tax-free savings)',
    nonReg: 'Other investments, outside RRSP and TFSA',
  },
  spouseSavings: { q: 'And your partner’s accounts?', why: 'The total of each kind of account. 0 if there are none.' },
  pension: {
    q: 'Do you have an employer pension plan?',
    spouseQ: 'And your partner, an employer pension plan?',
    why: 'An employer pension (the public sector’s RREGOP, for one) often weighs more than savings: it counts from the first answer.',
    none: 'No, or I do not know',
    rregop: 'Yes, the RREGOP',
    other: 'Yes, another plan',
    service: 'Years of service (on your statement)',
    otherNote: 'You will add it in the profile, with the rules from your booklet. The first answer is made without it.',
  },
  retire: { q: 'At what age do you plan to stop working?', why: 'This is your plan: the answer compares other ages too.', you: 'You', spouse: 'Your partner' },
  spending: {
    q: 'How much do you spend a year?',
    why: 'Everything the household spends, leaving out tax and savings. The same is assumed in retirement.',
    label: 'Spending per year',
    estimate: 'Estimate: 60% of gross income',
    estimated: (amount) => `Estimate: ${amount}. Replace it with your real figures.`,
  },
  home: {
    q: 'Do you own your home?',
    why: 'The house counts as wealth, and the mortgage as a cost that ends.',
    no: 'No, I rent',
    yes: 'Yes, I own it',
    value: 'Value of the home',
    balance: 'Mortgage balance',
    payment: 'Monthly payment',
  },
  done: {
    q: 'That is enough for a first answer',
    qMissing: 'One answer is missing',
    why: 'These figures are estimates until you confirm them: the profile will guide you, document by document.',
    see: 'See my answer',
    refine: 'Make my profile exact',
    missing: 'Still missing:',
    fix: 'Answer',
    summary: {
      birth: (year) => `Year of birth: ${year}`,
      income: (amount) => `Income: ${amount} a year`,
      savings: (amount) => `Savings: ${amount}`,
      pension: (name) => `Employer plan: ${name}`,
      retire: (age) => `Planning to stop at ${age}`,
      spending: (amount) => `Spending: ${amount} a year`,
      home: (value) => `Home: ${value}`,
      spouse: 'With your partner',
    },
  },
}

export const ONBOARD_COPY: Record<Lang, OnboardCopy> = { fr: FR, en: EN }
