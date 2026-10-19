// The words of « Mes données » (components/results/LedgerPanel.tsx), in both languages. Like bridgeCopy.ts it lives outside the
// eager dictionaries (only the results page reads it). Every function takes already-formatted STRINGS — the panel formats
// the money, the percentages and the dates for the reader's language and the copy never retypes a cited rate.

export interface LedgerCopy {
  title: string
  hint: string
  editProfile: string
  editSpending: string
  editAssumptions: string
  person: (name: string) => string
  retireLabel: string
  rrqLabel: string
  oasLabel: string
  age: (age: string) => string
  /** Beside an age that has already happened. */
  done: string
  /** The calculation line under each age. */
  retireCalc: (lastPay: string) => string
  oasNone: (start: string) => string
  /** After a pension's amount (a Figure: the calculation lives in its note, lib/traceCopy.ts): what the amount is. */
  perMonthToday: string
  /** For reference, under a pension far above today's maximum: what is paid today at that age, and why the person's is higher (wages outrun prices; the enhanced plan completes). */
  rrqContext: (max: string, gap: string) => string
  /** Spending and the economy. */
  moneyTitle: string
  spendWorkLabel: string
  spendRetLabel: string
  spendCalc: (yearly: string, monthly: string) => string
  inflationLabel: string
  inflationCalc: (rate: string, cost: string) => string
  returnLabel: { rrsp: string; tfsa: string; nonReg: string }
  returnCalc: (rate: string, real: string) => string
}

export const LEDGER_COPY: { fr: LedgerCopy; en: LedgerCopy } = {
  fr: {
    title: 'Mes chiffres et leur calcul',
    hint: 'Chaque chiffre qui fixe la réponse, avec son calcul. Les résultats se lisent, ils ne se modifient pas : pour en changer un, passez par Profil (vos chiffres) ou Hypothèses (ce que vous supposez).',
    editProfile: 'Modifier dans le profil',
    editSpending: 'Modifier les dépenses',
    editAssumptions: 'Modifier dans les hypothèses',
    person: (name) => `Âges de ${name}`,
    retireLabel: 'Âge de retraite visé',
    rrqLabel: 'Début du RRQ',
    oasLabel: 'Début de la PSV',
    age: (age) => `${age} ans`,
    done: 'déjà passé',
    retireCalc: (lastPay) => `Dernier salaire : ${lastPay}.`,
    oasNone: (start) => `Première pension : ${start}. Moins de dix ans de résidence après 18 ans : aucune pension.`,
    perMonthToday: 'par mois, en dollars d’aujourd’hui',
    rrqContext: (max, gap) => `Pour repère : le maximum versé aujourd’hui à ce même âge de départ est de ${max} par mois. Le vôtre est plus haut parce que, dans vos hypothèses, les salaires montent de ${gap} de plus que les prix chaque année, et que le régime bonifié se complète d’ici là.`,
    moneyTitle: 'Dépenses et hypothèses',
    spendWorkLabel: 'Dépenses pendant le travail',
    spendRetLabel: 'Dépenses à la retraite',
    spendCalc: (yearly, monthly) => `${yearly} par année, soit ${monthly} par mois, en dollars d’aujourd’hui. Elles montent avec l’inflation.`,
    inflationLabel: 'Inflation',
    inflationCalc: (rate, cost) => `Les prix montent de ${rate} par an : ce qui coûte 1 000 $ aujourd’hui en coûte ${cost} dans dix ans.`,
    returnLabel: { rrsp: 'Rendement du REER', tfsa: 'Rendement du CELI', nonReg: 'Rendement du compte non enregistré' },
    returnCalc: (rate, real) => `Le compte grimpe de ${rate} par an ; une fois l’inflation retirée : ${real}.`,
  },
  en: {
    title: 'My figures and their calculation',
    hint: 'Every figure that sets the answer, with its calculation. Results are for reading, not editing: to change one, go to Profile (your figures) or Assumptions (what you suppose).',
    editProfile: 'Edit in the profile',
    editSpending: 'Edit the spending',
    editAssumptions: 'Edit in the assumptions',
    person: (name) => `${name}’s ages`,
    retireLabel: 'Target retirement age',
    rrqLabel: 'QPP start',
    oasLabel: 'OAS start',
    age: (age) => `age ${age}`,
    done: 'already behind you',
    retireCalc: (lastPay) => `Last pay: ${lastPay}.`,
    oasNone: (start) => `First payment: ${start}. Under ten years of residence after 18: no pension.`,
    perMonthToday: 'a month, in today’s dollars',
    rrqContext: (max, gap) => `For reference: the most paid today for a start at the same age is ${max} a month. Yours is higher because, in your assumptions, wages rise ${gap} faster than prices each year, and the enhanced plan completes by then.`,
    moneyTitle: 'Spending and assumptions',
    spendWorkLabel: 'Spending while working',
    spendRetLabel: 'Spending in retirement',
    spendCalc: (yearly, monthly) => `${yearly} a year, or ${monthly} a month, in today’s dollars. It rises with inflation.`,
    inflationLabel: 'Inflation',
    inflationCalc: (rate, cost) => `Prices rise ${rate} a year: what costs $1,000 today costs ${cost} in ten years.`,
    returnLabel: { rrsp: 'RRSP return', tfsa: 'TFSA return', nonReg: 'Non-registered account return' },
    returnCalc: (rate, real) => `The account grows ${rate} a year; after inflation: ${real}.`,
  },
}
