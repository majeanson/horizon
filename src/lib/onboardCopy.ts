import type { Lang } from '../i18n.ts'

// THE WORDS OF THE FIRST VISIT: one question per screen, each with the one line of why it is asked. Outside the eager dictionaries
// on purpose — a returning visitor never sees them, so they arrive only with the path that needs them.

export interface OnboardCopy {
  title: string
  subtitle: string
  progress: (n: number, of: number) => string
  back: string
  next: string
  skip: string
  example: string
  who: { q: string; why: string; alone: string; couple: string }
  birth: { q: string; why: string; year: string; month: string }
  spouseBirth: { q: string; why: string }
  income: { q: string; why: string; label: string }
  spouseIncome: { q: string; why: string }
  savings: { q: string; why: string; total: string }
  spouseSavings: { q: string; why: string }
  retire: { q: string; why: string; you: string; spouse: string }
  spending: { q: string; why: string; label: string; estimate: string; estimated: (amount: string) => string }
  home: { q: string; why: string; no: string; yes: string; value: string; balance: string; payment: string }
  done: {
    q: string
    why: string
    see: string
    refine: string
    missing: string
    back: string
    summary: {
      birth: (year: number) => string
      income: (amount: string) => string
      savings: (amount: string) => string
      retire: (age: number) => string
      spending: (amount: string) => string
      home: (value: string) => string
      spouse: string
    }
  }
}

const FR: OnboardCopy = {
  title: 'Pour commencer',
  subtitle: 'Quelques questions, une à la fois. Rien de ce que vous écrivez ne quitte cet appareil.',
  progress: (n, of) => `Question ${n} sur ${of}`,
  back: 'Précédent',
  next: 'Suivant',
  skip: 'Passer au formulaire complet',
  example: 'Voir un exemple',
  who: {
    q: 'Pour qui faisons-nous le calcul ?',
    why: 'Un couple se calcule ensemble : deux revenus, deux retraites, un seul budget.',
    alone: 'Moi seul·e',
    couple: 'Moi et mon·ma conjoint·e',
  },
  birth: { q: 'Quelle est votre année de naissance ?', why: 'Elle fixe vos âges, donc le moment de chaque rente.', year: 'Année de naissance', month: 'Mois de naissance (1 à 12)' },
  spouseBirth: { q: 'Quelle est l’année de naissance de votre conjoint·e ?', why: 'Chaque personne a ses propres âges et ses propres rentes.' },
  income: { q: 'Combien gagnez-vous par année ?', why: 'Votre revenu de travail avant impôt, en dollars d’aujourd’hui. Écrivez 0 si vous ne travaillez plus.', label: 'Revenu de travail par année' },
  spouseIncome: { q: 'Combien gagne votre conjoint·e par année ?', why: 'Avant impôt, en dollars d’aujourd’hui. 0 si cette personne ne travaille pas.' },
  savings: { q: 'Que contiennent vos comptes d’épargne ?', why: 'Le total de chaque type de compte, comme sur votre dernier relevé. 0 si vous n’en avez pas.', total: 'Solde' },
  spouseSavings: { q: 'Et ceux de votre conjoint·e ?', why: 'Le total de chaque type de compte. 0 s’il n’y en a pas.' },
  retire: { q: 'À quel âge pensez-vous arrêter de travailler ?', why: 'C’est votre plan : les résultats comparent aussi d’autres âges.', you: 'Vous', spouse: 'Votre conjoint·e' },
  spending: {
    q: 'Combien dépensez-vous par année ?',
    why: 'Tout ce que le ménage dépense, sans l’impôt ni l’épargne. On suppose la même chose à la retraite ; vous pourrez distinguer les deux plus tard.',
    label: 'Dépenses par année',
    estimate: 'Estimer : 60 % du revenu brut',
    estimated: (amount) => `Estimation : ${amount}. À remplacer par vos vrais chiffres.`,
  },
  home: {
    q: 'Êtes-vous propriétaire de votre résidence ?',
    why: 'La maison compte comme une richesse, et l’hypothèque comme une dépense qui prend fin.',
    no: 'Non, je suis locataire',
    yes: 'Oui, je suis propriétaire',
    value: 'Valeur de la maison',
    balance: 'Solde de l’hypothèque',
    payment: 'Paiement mensuel',
  },
  done: {
    q: 'C’est assez pour un premier résultat',
    why: 'Ces chiffres sont des estimations tant que vous ne les confirmez pas : le profil vous guidera, document par document.',
    see: 'Voir mon résultat',
    refine: 'Préciser mon profil',
    missing: 'Il manque encore :',
    back: 'Revenir',
    summary: {
      birth: (year) => `Né·e en ${year}`,
      income: (amount) => `Revenu : ${amount} par année`,
      savings: (amount) => `Épargne : ${amount}`,
      retire: (age) => `Retraite visée à ${age} ans`,
      spending: (amount) => `Dépenses : ${amount} par année`,
      home: (value) => `Maison : ${value}`,
      spouse: 'Avec votre conjoint·e',
    },
  },
}

const EN: OnboardCopy = {
  title: 'Let’s start',
  subtitle: 'A few questions, one at a time. Nothing you write leaves this device.',
  progress: (n, of) => `Question ${n} of ${of}`,
  back: 'Previous',
  next: 'Next',
  skip: 'Go to the full form',
  example: 'See an example',
  who: {
    q: 'Who is this calculation for?',
    why: 'A couple is worked out together: two incomes, two retirements, one budget.',
    alone: 'Just me',
    couple: 'Me and my spouse',
  },
  birth: { q: 'What year were you born?', why: 'It sets your ages, so when each pension starts.', year: 'Year of birth', month: 'Month of birth (1 to 12)' },
  spouseBirth: { q: 'What year was your spouse born?', why: 'Each person has their own ages and their own pensions.' },
  income: { q: 'How much do you earn a year?', why: 'Your work income before tax, in today’s dollars. Write 0 if you no longer work.', label: 'Work income per year' },
  spouseIncome: { q: 'How much does your spouse earn a year?', why: 'Before tax, in today’s dollars. 0 if they do not work.' },
  savings: { q: 'What do your savings accounts hold?', why: 'The total of each kind of account, as on your latest statement. 0 if you have none.', total: 'Balance' },
  spouseSavings: { q: 'And your spouse’s?', why: 'The total of each kind of account. 0 if there are none.' },
  retire: { q: 'At what age do you plan to stop working?', why: 'This is your plan: the results compare other ages too.', you: 'You', spouse: 'Your spouse' },
  spending: {
    q: 'How much do you spend a year?',
    why: 'Everything the household spends, leaving out tax and savings. The same is assumed in retirement; you can tell the two apart later.',
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
    q: 'That is enough for a first result',
    why: 'These figures are estimates until you confirm them: the profile will guide you, document by document.',
    see: 'See my result',
    refine: 'Make my profile exact',
    missing: 'Still missing:',
    back: 'Go back',
    summary: {
      birth: (year) => `Born in ${year}`,
      income: (amount) => `Income: ${amount} a year`,
      savings: (amount) => `Savings: ${amount}`,
      retire: (age) => `Planning to stop at ${age}`,
      spending: (amount) => `Spending: ${amount} a year`,
      home: (value) => `Home: ${value}`,
      spouse: 'With your spouse',
    },
  },
}

export const ONBOARD_COPY: Record<Lang, OnboardCopy> = { fr: FR, en: EN }
