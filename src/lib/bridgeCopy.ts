// The words of « Mes années 60 à 70 » (components/results/BridgePanel.tsx), in both languages.
//
// It lives HERE and not in the i18n dictionaries on purpose: only the results page reads it, and ~5 KB of French in the
// eager dictionary would be paid by every page of the app (check-bundle.mjs holds that dictionary to a budget — see
// deferralCopy.ts, which does the same). The shape is the interface below, so the two languages cannot drift apart;
// lib/bridgeCopy.test.ts holds them to non-empty, genuinely translated, and saying what the engine pins.

import type { StrategyKey, YearStatus } from '../engine/bridge.ts'
import type { Verdict } from './bridgeModel.ts'

export interface BridgeCopy {
  hint: string
  /** Shown while a new answer is being worked out and the old one is still on screen. */
  updating: string
  person: string
  /** Whose ages the page uses, for a couple: « Âges : ceux de Camille. » */
  /** The three levers. */
  /** The ages in force, read from the profile: edited in « Mes données » and Profil, not here. */
  agesLine: (retire: string, rrq: string, oas: string) => string
  /** The couple's « for both of us » toggle. */
  bothLabel: string
  bothHint: string
  age: (age: number) => string
  /** The strategies: a name and one line each. */
  strategyTitle: string
  strategyName: Record<StrategyKey, string>
  strategyLine: Record<StrategyKey, string>
  custom: string
  /** After a card writes the profile: what changed and from what — with the one-tap way back beside it. */
  applied: (f: { name: string | null; rrq: string; oas: string; prevRrq: string; prevOas: string; both: boolean }) => string
  appliedUndo: string
  /** The scorecard. */
  lowestNestLabel: string
  selectedName: string
  worth95: string
  noWorth: string
  lifetime: string
  /** The unit of every dollar figure on the cards. */
  todayNote: string
  /** The standard row when the person's own plan IS the standard. */
  standardIsMine: string
  extraDrawn: (amount: string) => string
  lessDrawn: (amount: string) => string
  sameDrawn: string
  breakEvenLater: (age: number) => string
  breakEvenEarlier: (age: number) => string
  breakEvenNone: string
  breakEvenSelf: string
  /** `who`: the person the ages are counted for (a couple's view names one of them); null for a person alone. */
  verdict: (v: Verdict, who?: string | null) => string
  /** The year table and charts. */
  windowLabel: string
  windowBridge: string
  windowPlan: string
  tableTitle: string
  colAge: string
  colNeed: string
  colWork: string
  colDb: string
  colRrq: string
  colOas: string
  colGis: string
  colDraw: string
  colTax: string
  colNest: string
  colStatus: string
  status: Record<YearStatus, string>
  colNonReg: string
  colRrsp: string
  colTfsa: string
  householdNote: string
  barsTitle: string
  barsHint: string
  barsFigure: (from: number, to: number) => string
  segment: { work: string; db: string; rrq: string; oas: string; nest: string }
  needLine: string
  nestTitle: string
  nestHint: (rrq: number, oas: number) => string
  nestFigure: (from: number, to: number) => string
  markerRrq: string
  markerOas: string
  tooltip: (age: number, year: number) => string
  /** « Pourquoi ? ». */
  whyTitle: string
  whyCost: (amount: string) => string
  whyCostNone: string
  whyGis: (gis: string, recovery: string) => string
  /** The cited rates, already formatted for the reader's language. */
  why: (f: { rrqPerMonth: string; rrqMax: string; oasPerMonth: string; oasMax: string }) => string[]
  caveatTitle: string
  caveats: string[]
  /** On each card: the same way of starting under each of the three scenarios, one mark per scenario. */
  marksTitle: string
  /** The way whose money lasts under the most scenarios, said above the cards, and the badge on its card. `holds`: scenarios it holds under (of three); `next`: the runner-up's. */
  sturdiest: (name: string, holds: number, next: number) => string
  sturdiestBadge: string
  marksHint: (name: string) => string
  marksPending: string
  matrixHolds: string
  matrixFails: (age: number) => string
}

export const BRIDGE_COPY: { fr: BridgeCopy; en: BridgeCopy } = {
  fr: {
    hint: 'Chaque année entre 60 et 70 ans : ce que le ménage dépense, ce que les rentes garanties paient, ce que le nid (vos REER, CELI et placements) doit couvrir, et ce qu’il en reste. Choisissez une façon de commencer vos rentes pour voir si l’argent dure. Tout est en dollars d’aujourd’hui.',
    updating: 'Mise à jour du calcul…',
    person: 'Pour',
    agesLine: (retire, rrq, oas) => `Vos âges : retraite à ${retire}, RRQ à ${rrq}, PSV à ${oas}. Pour les changer : « Mes chiffres », dans Vérifier.`,
    bothLabel: 'Pour les deux',
    bothHint: 'L’autre personne commence son RRQ et sa PSV aux mêmes âges ; son âge de retraite reste celui de son profil.',
    age: (age) => `${age} ans`,
    strategyTitle: 'Façons de commencer vos rentes',
    strategyName: { mine: 'Mon plan', asap: 'Tout dès que possible', standard: 'Standard', max: 'Reporter au maximum', bridge: 'Pont jusqu’à 70 ans', both: 'Les deux à 70 ans' },
    strategyLine: {
      mine: 'Les âges de début de votre profil.',
      asap: 'RRQ à 60 ans, PSV à 65 ans : le plus tôt permis.',
      standard: 'RRQ et PSV à 65 ans.',
      max: 'RRQ à 72 ans, PSV à 70 ans : les rentes les plus élevées.',
      bridge: 'Vivre du nid jusqu’à 70 ans, puis RRQ et PSV à 70 ans.',
      both: 'Comme le pont, mais l’autre personne reporte aussi son RRQ et sa PSV à 70 ans.',
    },
    custom: 'Vos choix ne correspondent à aucune de ces façons : ils sont montrés sous « Mon plan ».',
    applied: ({ name, rrq, oas, prevRrq, prevOas, both }) =>
      `Profil mis à jour${name ? ` pour ${name}` : ''} : RRQ à ${rrq}, PSV à ${oas} (avant : RRQ à ${prevRrq}, PSV à ${prevOas}).${both ? ' L’autre personne suit les mêmes âges.' : ''}`,
    appliedUndo: 'Annuler ce changement',
    lowestNestLabel: 'Nid le plus bas, de 60 à 70 ans',
    selectedName: 'Votre choix actuel',
    worth95: 'Valeur nette à 95 ans',
    noWorth: '—',
    lifetime: 'Encaissé sur tout le plan, après impôt',
    todayNote: 'Montants en dollars d’aujourd’hui ; « encaissé » compte aussi les retraits du nid.',
    standardIsMine: 'Standard (c’est aussi votre plan)',
    extraDrawn: (amount) => `${amount} de plus tirés du nid entre 60 et 69 ans que le standard`,
    lessDrawn: (amount) => `${amount} de moins tirés du nid entre 60 et 69 ans que le standard`,
    sameDrawn: 'Autant tiré du nid entre 60 et 69 ans que le standard',
    breakEvenLater: (age) => `Les rentes cumulées rattrapent le standard à ${age} ans`,
    breakEvenEarlier: (age) => `Attendre 65 ans rattrape cette façon à ${age} ans`,
    breakEvenNone: 'Pas de point d’équilibre avant la fin du plan',
    breakEvenSelf: 'La référence des comparaisons',
    // « L’horizon » is the verdict's own word for the plan's last year (the youngest person's 95): the age printed here is
    // the person looked at, which is NOT the youngest in a couple — so the person is named beside it.
    verdict: (v, who = null) =>
      v.kind === 'holds'
        ? v.defers
          ? `Vous pouvez reporter : votre nid dure jusqu’à la fin du plan (${who === null ? '' : `${who} : `}${v.horizonAge} ans).`
          : `Avec ce plan, l’argent dure jusqu’à la fin du plan (${who === null ? '' : `${who} : `}${v.horizonAge} ans).`
        : v.defers && v.standardHolds
          ? `Reporter épuise votre nid à ${v.age} ans ; prendre le RRQ et la PSV à 65 ans évite de manquer d’argent.`
          : v.defers && v.standardAge !== null
            ? `Reporter épuise votre nid à ${v.age} ans, et prendre les rentes à 65 ans ne règle rien : l’argent ne dure que jusqu’à ${v.standardAge} ans.`
            : `Avec ce plan, l’argent ne dure que jusqu’à ${v.age} ans.`,
    windowLabel: 'Années montrées',
    windowBridge: '60 à 70 ans',
    windowPlan: 'Jusqu’à la fin du plan',
    tableTitle: 'Année par année',
    colAge: 'Âge',
    colNeed: 'Dépenses',
    colWork: 'Travail',
    colDb: 'Rente de l’employeur',
    colRrq: 'RRQ',
    colOas: 'PSV',
    colGis: 'SRG et allocation',
    colDraw: 'Tiré du nid',
    colNonReg: 'dont non enregistré',
    colRrsp: 'dont REER / FERR',
    colTfsa: 'dont CELI',
    colTax: 'Impôt',
    colNest: 'Nid en fin d’année',
    colStatus: 'État',
    status: { covered: 'Couvert par les revenus', drawing: 'Le nid est mis à contribution', short: 'Nid épuisé : il manque de l’argent' },
    householdNote: 'Les revenus, les dépenses, l’impôt et le nid sont ceux du ménage ; l’âge est celui de la personne choisie.',
    barsTitle: 'D’où vient l’argent, année par année',
    barsHint: 'Chaque barre est une année : le travail, les rentes garanties et ce que le nid doit fournir. La ligne pointillée est ce qu’il faut couvrir (dépenses et impôt).',
    barsFigure: (from, to) => `Sources de revenus année par année, de ${from} à ${to} ans`,
    segment: { work: 'Travail', db: 'Rente de l’employeur', rrq: 'RRQ', oas: 'PSV, SRG et allocation', nest: 'Tiré du nid' },
    needLine: 'Dépenses + impôt',
    nestTitle: 'Le nid, selon la façon de commencer',
    nestHint: (rrq, oas) => `Traits pointillés : début du RRQ (${rrq} ans) et de la PSV (${oas} ans) de votre choix. Reporter creuse le nid d’abord, puis le fait remonter.`,
    nestFigure: (from, to) => `Nid en fin d’année selon la façon de commencer les rentes, de ${from} à ${to} ans`,
    markerRrq: 'RRQ',
    markerOas: 'PSV',
    tooltip: (age, year) => `${age} ans · ${year}`,
    whyTitle: 'Pourquoi ?',
    whyCost: (amount) => `Le pont puise ${amount} de plus dans le nid entre 60 et 69 ans, par rapport à prendre les rentes à 65 ans (dollars d’aujourd’hui).`,
    whyCostNone: 'Entre 60 et 69 ans, ce plan ne tire pas plus du nid que le standard.',
    whyGis: (gis, recovery) => `Sur tout le plan : ${gis} de Supplément de revenu garanti reçu et ${recovery} de PSV repris par l’impôt de récupération.`,
    why: (f) => [
      `Une rente reportée est plus élevée toute la vie et suit les prix : le RRQ gagne ${f.rrqPerMonth} par mois après 65 ans (jusqu’à ${f.rrqMax} de plus à 72 ans), la PSV ${f.oasPerMonth} par mois (jusqu’à ${f.oasMax} de plus à 70 ans).`,
      'Les années du pont sont payées par le nid : plus il est gros au départ, plus le report est possible. Un nid qui s’épuise avant 70 ans ne peut pas le porter.',
      'Le Supplément de revenu garanti se perd avec un revenu plus élevé : reporter la PSV reporte aussi le SRG qui l’accompagne. Au-delà d’un certain revenu, la PSV est reprise en partie par l’impôt de récupération.',
      'Retirer du REER/FERR pendant le pont peut baisser l’impôt plus tard : les retraits sont faits à un taux plus bas qu’avec toutes les rentes en plus.',
    ],
    caveatTitle: 'Ce que ces chiffres ne disent pas',
    caveats: [
      'Une durée de vie : le point d’équilibre est un pari sur la longévité, pas une certitude.',
      'Le décès du conjoint ou de la conjointe : la rente de survivant n’est pas calculée ici.',
      'Des marchés qui tournent mal au mauvais moment, et des dépenses qui changent avec l’âge : les scénarios Prudent, Neutre et Audacieux donnent une fourchette, pas une prévision.',
    ],
    marksTitle: 'Selon le scénario',
    sturdiest: (name, holds, next) =>
      `La plus solide selon vos hypothèses : « ${name} ». ${holds === 3 ? 'L’argent dure dans les trois scénarios' : `L’argent dure dans ${holds} scénario${holds > 1 ? 's' : ''} sur 3`}${next < holds ? `, là où la suivante en tient ${next}` : ', et c’est celle qui laisse le plus à la fin du plan'}. C’est une solidité, pas un gain : elle ne dit pas laquelle rapporte le plus sur une vie, ni quelle vie vous aurez.`,
    sturdiestBadge: 'La plus solide',
    marksHint: (name) => `Sous chaque façon de commencer : la même, avec les scénarios Prudent, Neutre et Audacieux de la page Hypothèses à la place de vos hypothèses. L’âge est celui de ${name}.`,
    marksPending: '…',
    matrixHolds: 'dure',
    matrixFails: (age) => `jusqu’à ${age} ans`,
  },
  en: {
    hint: 'Every year from 60 to 70: what the household spends, what the guaranteed pensions pay, what the nest egg (your RRSPs, TFSAs and investments) has to cover, and what is left. Pick a way of starting your pensions to see whether the money lasts. Everything is in today’s dollars.',
    updating: 'Updating the calculation…',
    person: 'For',
    agesLine: (retire, rrq, oas) => `Your ages: retire at ${retire}, QPP at ${rrq}, OAS at ${oas}. To change them: “My figures”, under Check.`,
    bothLabel: 'For both',
    bothHint: 'The other person starts their QPP and OAS at the same ages; their retirement age stays the one in their profile.',
    age: (age) => `age ${age}`,
    strategyTitle: 'Ways to start your pensions',
    strategyName: { mine: 'My plan', asap: 'Everything as early as possible', standard: 'Standard', max: 'Defer as far as possible', bridge: 'Bridge to 70', both: 'Both at 70' },
    strategyLine: {
      mine: 'The start ages in your profile.',
      asap: 'QPP at 60, OAS at 65: the earliest allowed.',
      standard: 'QPP and OAS at 65.',
      max: 'QPP at 72, OAS at 70: the largest pensions.',
      bridge: 'Live on the nest egg until 70, then QPP and OAS at 70.',
      both: 'Like the bridge, but the other person also defers their QPP and OAS to 70.',
    },
    custom: 'Your choices match none of these: they are shown under “My plan”.',
    applied: ({ name, rrq, oas, prevRrq, prevOas, both }) =>
      `Profile updated${name ? ` for ${name}` : ''}: QPP at ${rrq}, OAS at ${oas} (before: QPP at ${prevRrq}, OAS at ${prevOas}).${both ? ' The other person follows the same ages.' : ''}`,
    appliedUndo: 'Undo this change',
    lowestNestLabel: 'Lowest nest egg, ages 60 to 70',
    selectedName: 'Your current choice',
    worth95: 'Net worth at 95',
    noWorth: '—',
    lifetime: 'Cashed over the whole plan, after tax',
    todayNote: 'Amounts in today’s dollars; “cashed” also counts nest-egg withdrawals.',
    standardIsMine: 'Standard (it is also your plan)',
    extraDrawn: (amount) => `${amount} more drawn from the nest egg at 60 to 69 than the standard`,
    lessDrawn: (amount) => `${amount} less drawn from the nest egg at 60 to 69 than the standard`,
    sameDrawn: 'As much drawn from the nest egg at 60 to 69 as the standard',
    breakEvenLater: (age) => `Cumulative pensions catch up with the standard at ${age}`,
    breakEvenEarlier: (age) => `Waiting until 65 catches up with this at ${age}`,
    breakEvenNone: 'No break-even before the end of the plan',
    breakEvenSelf: 'The reference for the comparisons',
    verdict: (v, who = null) =>
      v.kind === 'holds'
        ? v.defers
          ? `You can defer: your nest egg lasts to the end of the plan (${who === null ? '' : `${who}: `}age ${v.horizonAge}).`
          : `With this plan, the money lasts to the end of the plan (${who === null ? '' : `${who}: `}age ${v.horizonAge}).`
        : v.defers && v.standardHolds
          ? `Deferring uses up your nest egg at ${v.age}; taking the QPP and OAS at 65 avoids running out of money.`
          : v.defers && v.standardAge !== null
            ? `Deferring uses up your nest egg at ${v.age}, and taking the pensions at 65 does not fix it: the money only lasts to ${v.standardAge}.`
            : `With this plan, the money only lasts to ${v.age}.`,
    windowLabel: 'Years shown',
    windowBridge: 'Ages 60 to 70',
    windowPlan: 'To the end of the plan',
    tableTitle: 'Year by year',
    colAge: 'Age',
    colNeed: 'Spending',
    colWork: 'Work',
    colDb: 'Employer pension',
    colRrq: 'QPP',
    colOas: 'OAS',
    colGis: 'GIS and Allowance',
    colDraw: 'Drawn from the nest egg',
    colNonReg: 'of which non-registered',
    colRrsp: 'of which RRSP / RRIF',
    colTfsa: 'of which TFSA',
    colTax: 'Tax',
    colNest: 'Nest egg at year end',
    colStatus: 'Status',
    status: { covered: 'Covered by income', drawing: 'The nest egg is being drawn', short: 'Nest egg empty: money runs short' },
    householdNote: 'Income, spending, tax and the nest egg are the household’s; the age is the chosen person’s.',
    barsTitle: 'Where the money comes from, year by year',
    barsHint: 'Each bar is a year: work, guaranteed pensions and what the nest egg has to supply. The dashed line is what has to be covered (spending and tax).',
    barsFigure: (from, to) => `Sources of income year by year, ages ${from} to ${to}`,
    segment: { work: 'Work', db: 'Employer pension', rrq: 'QPP', oas: 'OAS, GIS and Allowance', nest: 'Drawn from the nest egg' },
    needLine: 'Spending + tax',
    nestTitle: 'The nest egg, by way of starting',
    nestHint: (rrq, oas) => `Dashed lines: your chosen QPP start (${rrq}) and OAS start (${oas}). Deferring digs into the nest egg first, then lets it recover.`,
    nestFigure: (from, to) => `Nest egg at year end by way of starting the pensions, ages ${from} to ${to}`,
    markerRrq: 'QPP',
    markerOas: 'OAS',
    tooltip: (age, year) => `Age ${age} · ${year}`,
    whyTitle: 'Why?',
    whyCost: (amount) => `The bridge costs ${amount} more of the nest egg between 60 and 69 than taking the pensions at 65 (today’s dollars).`,
    whyCostNone: 'Between 60 and 69 this plan draws no more from the nest egg than the standard.',
    whyGis: (gis, recovery) => `Over the whole plan: ${gis} of Guaranteed Income Supplement received and ${recovery} of OAS taken back by the recovery tax.`,
    why: (f) => [
      `A deferred pension is larger for life and follows prices: the QPP gains ${f.rrqPerMonth} a month after 65 (up to ${f.rrqMax} more at 72), the OAS ${f.oasPerMonth} a month (up to ${f.oasMax} more at 70).`,
      'The bridge years are paid by the nest egg: the bigger it is at the start, the more feasible deferring is. A nest egg that runs out before 70 cannot carry it.',
      'The Guaranteed Income Supplement falls with income: deferring the OAS also defers the GIS that goes with it. Above a certain income part of the OAS is taken back by the recovery tax.',
      'Drawing on the RRSP/RRIF during the bridge can lower tax later: the withdrawals are taxed at a lower rate than with every pension on top.',
    ],
    caveatTitle: 'What these figures leave out',
    caveats: [
      'A length of life: a break-even is a bet on longevity, not a certainty.',
      'A spouse’s death: the survivor’s pension is not calculated here.',
      'Markets that go wrong at the wrong time, and spending that changes with age: the Conservative, Neutral and Aggressive scenarios give a range, not a forecast.',
    ],
    marksTitle: 'By scenario',
    sturdiest: (name, holds, next) =>
      `Sturdiest on your assumptions: “${name}”. The money lasts in ${holds === 3 ? 'all three scenarios' : `${holds} of 3 scenarios`}${next < holds ? `, where the next one holds in ${next}` : ', and it leaves the most at the end of the plan'}. That is sturdiness, not a payout: it does not say which pays most over a lifetime, or how long a life you will have.`,
    sturdiestBadge: 'Sturdiest',
    marksHint: (name) => `Under each way of starting: the same one, with the Conservative, Neutral and Aggressive scenarios from the Assumptions page in place of your assumptions. The age is ${name}’s.`,
    marksPending: '…',
    matrixHolds: 'lasts',
    matrixFails: (age) => `to age ${age}`,
  },
}
