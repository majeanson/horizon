// The words of « Mes données » (components/results/LedgerPanel.tsx), in both languages. Like bridgeCopy.ts it lives outside the
// eager dictionaries (only the results page reads it). Every function takes already-formatted STRINGS — the panel formats
// the money, the percentages and the dates for the reader's language and the copy never retypes a cited rate.

export interface LedgerCopy {
  title: string
  hint: string
  person: (name: string) => string
  retireLabel: string
  rrqLabel: string
  oasLabel: string
  age: (age: string) => string
  /** The calculation line under each age. */
  retireCalc: (lastPay: string) => string
  rrqCalc: (start: string, base: string, first: string, second: string, adjustment: string, monthly: string) => string
  oasCalc: (start: string, full: string, residence: string, multiplier: string, monthly: string) => string
  oasNone: (start: string) => string
  /** The result line: the monthly amount in today's money. */
  rrqResult: (monthly: string) => string
  oasResult: (monthly: string) => string
  retireResult: (ageText: string) => string
  /** Against the figure when the panel opened. */
  moreMonth: (amount: string) => string
  lessMonth: (amount: string) => string
  /** The plan, live. */
  glanceHolds: (worth: string) => string
  glanceFails: (year: string) => string
  glanceMore: (amount: string) => string
  glanceLess: (amount: string) => string
  glanceNote: string
  edits: string
}

export const LEDGER_COPY: { fr: LedgerCopy; en: LedgerCopy } = {
  fr: {
    title: 'Mes données et leur calcul',
    hint: 'Les trois âges qui font bouger le plus. Glissez un curseur : le calcul, le montant et l’effet sur le plan suivent, et le verdict plus haut se met à jour quand vous relâchez. Le changement est enregistré dans votre profil.',
    person: (name) => `Âges de ${name}`,
    retireLabel: 'Âge de la retraite',
    rrqLabel: 'Début du RRQ',
    oasLabel: 'Début de la PSV',
    age: (age) => `${age} ans`,
    retireCalc: (lastPay) => `Dernier salaire : ${lastPay}. Ensuite, plus de salaire ni de cotisations (RRQ, assurance-emploi, RQAP, régime de retraite), ni d’épargne.`,
    rrqCalc: (start, base, first, second, adjustment, monthly) => `Première rente : ${start}. (Base ${base} + 1ʳᵉ supplémentaire ${first} + 2ᵉ supplémentaire ${second}) × ajustement ${adjustment} = ${monthly} par mois.`,
    oasCalc: (start, full, residence, multiplier, monthly) => `Première pension : ${start}. ${full} par mois × résidence ${residence} × report ${multiplier} = ${monthly} par mois.`,
    oasNone: (start) => `Première pension : ${start}. Moins de dix ans de résidence après 18 ans : aucune pension.`,
    rrqResult: (monthly) => `${monthly} par mois, en dollars d’aujourd’hui`,
    oasResult: (monthly) => `${monthly} par mois, en dollars d’aujourd’hui`,
    retireResult: (ageText) => `Dernier salaire à ${ageText}`,
    moreMonth: (amount) => `${amount} de plus par mois qu’à l’ouverture`,
    lessMonth: (amount) => `${amount} de moins par mois qu’à l’ouverture`,
    glanceHolds: (worth) => `Le plan tient jusqu’à l’horizon ; valeur nette à la fin : ${worth} (dollars d’aujourd’hui).`,
    glanceFails: (year) => `Le plan manque d’argent en ${year}.`,
    glanceMore: (amount) => `${amount} de plus qu’à l’ouverture.`,
    glanceLess: (amount) => `${amount} de moins qu’à l’ouverture.`,
    glanceNote: 'Un seul calcul : le plan tel que vous le décrivez. Le verdict plus haut cherche l’âge le plus tôt.',
    edits: 'Les mêmes âges se changent aussi dans Profil et dans « Mes années 60 à 70 ».',
  },
  en: {
    title: 'My data and its calculation',
    hint: 'The three ages that move the plan most. Drag a slider: the calculation, the amount and the effect on the plan follow, and the verdict above updates when you let go. The change is saved in your profile.',
    person: (name) => `${name}’s ages`,
    retireLabel: 'Retirement age',
    rrqLabel: 'QPP start',
    oasLabel: 'OAS start',
    age: (age) => `age ${age}`,
    retireCalc: (lastPay) => `Last pay: ${lastPay}. After that, no pay, no contributions (QPP, employment insurance, QPIP, pension plan) and no savings.`,
    rrqCalc: (start, base, first, second, adjustment, monthly) => `First payment: ${start}. (Base ${base} + 1st additional ${first} + 2nd additional ${second}) × adjustment ${adjustment} = ${monthly} a month.`,
    oasCalc: (start, full, residence, multiplier, monthly) => `First payment: ${start}. ${full} a month × residence ${residence} × deferral ${multiplier} = ${monthly} a month.`,
    oasNone: (start) => `First payment: ${start}. Under ten years of residence after 18: no pension.`,
    rrqResult: (monthly) => `${monthly} a month, in today’s dollars`,
    oasResult: (monthly) => `${monthly} a month, in today’s dollars`,
    retireResult: (ageText) => `Last pay at ${ageText}`,
    moreMonth: (amount) => `${amount} a month more than when opened`,
    lessMonth: (amount) => `${amount} a month less than when opened`,
    glanceHolds: (worth) => `The plan lasts to the horizon; net worth at the end: ${worth} (today’s dollars).`,
    glanceFails: (year) => `The plan runs out of money in ${year}.`,
    glanceMore: (amount) => `${amount} more than when opened.`,
    glanceLess: (amount) => `${amount} less than when opened.`,
    glanceNote: 'One calculation: the plan as you describe it. The verdict above searches for the earliest age.',
    edits: 'The same ages can also be changed in Profile and in « My years 60 to 70 ».',
  },
}
