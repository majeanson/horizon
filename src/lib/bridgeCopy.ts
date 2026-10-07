// The words of « Mes années 60 à 70 » (components/results/BridgePanel.tsx), in both languages.
//
// It lives HERE and not in the i18n dictionaries on purpose: only the results page reads it, and ~5 KB of French in the
// eager dictionary would be paid by every page of the app (check-bundle.mjs holds that dictionary to a budget — see
// deferralCopy.ts, which does the same). The shape is the interface below, so the two languages cannot drift apart;
// lib/bridgeCopy.test.ts holds them to non-empty, genuinely translated, and saying what the engine pins.

import type { StrategyKey, YearStatus } from '../engine/bridge.ts'
import type { Verdict } from './bridgeModel.ts'

export interface BridgeCopy {
  title: string
  /** The line on the disclosure that opens the view in Simple mode. */
  open: string
  hint: string
  busy: string
  person: string
  /** The three levers. */
  retireLabel: string
  rrqLabel: string
  oasLabel: string
  leverHint: string
  age: (age: number) => string
  /** The strategies: a name and one line each. */
  strategyTitle: string
  strategyName: Record<StrategyKey, string>
  strategyLine: Record<StrategyKey, string>
  custom: string
  /** The scorecard. */
  lowestNestLabel: string
  selectedName: string
  worth85: string
  worth95: string
  noWorth: string
  lifetime: string
  extraDrawn: (amount: string) => string
  lessDrawn: (amount: string) => string
  sameDrawn: string
  breakEvenLater: (age: number) => string
  breakEvenEarlier: (age: number) => string
  breakEvenNone: string
  breakEvenSelf: string
  verdict: (v: Verdict) => string
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
  why: string[]
  caveatTitle: string
  caveats: string[]
  /** The three sets of assumptions. */
  matrixTitle: string
  matrixHint: string
  matrixBusy: string
  matrixHolds: string
  matrixFails: (age: number) => string
  presetName: Record<'prudent' | 'neutral' | 'bold', string>
  strategyCol: string
}

export const BRIDGE_COPY: { fr: BridgeCopy; en: BridgeCopy } = {
  fr: {
    title: 'Mes années 60 à 70',
    open: 'Mes années 60 à 70 : reporter ou prendre tôt ?',
    hint: 'Chaque année entre 60 et 70 ans : ce que le ménage dépense, ce que les rentes garanties paient, ce que le pécule doit couvrir, et ce qu’il en reste. Changez l’âge de la retraite et l’âge de début du RRQ et de la PSV pour voir si le plan tient. Tout est en dollars d’aujourd’hui.',
    busy: 'Calcul en cours…',
    person: 'Pour',
    retireLabel: 'Âge de la retraite',
    rrqLabel: 'Début du RRQ (rente du Régime de rentes du Québec)',
    oasLabel: 'Début de la PSV (pension de la Sécurité de la vieillesse)',
    leverHint: 'Le RRQ peut commencer de 60 à 72 ans, la PSV de 65 à 70 ans. Seule la personne choisie change ; l’autre garde les âges de son profil.',
    age: (age) => `${age} ans`,
    strategyTitle: 'Cinq façons de commencer vos rentes',
    strategyName: { mine: 'Mon plan', asap: 'Tout dès que possible', standard: 'Standard', max: 'Reporter au maximum', bridge: 'Pont jusqu’à 70 ans' },
    strategyLine: {
      mine: 'Les âges de début de votre profil.',
      asap: 'RRQ à 60 ans, PSV à 65 ans : le plus tôt permis.',
      standard: 'RRQ et PSV à 65 ans.',
      max: 'RRQ à 72 ans, PSV à 70 ans : les rentes les plus élevées.',
      bridge: 'Vivre du pécule jusqu’à 70 ans, puis RRQ et PSV à 70 ans.',
    },
    custom: 'Vos choix ne correspondent à aucune de ces cinq façons : ils sont montrés sous « Mon plan ».',
    lowestNestLabel: 'Pécule le plus bas, de 60 à 70 ans',
    selectedName: 'Votre choix actuel',
    worth85: 'Valeur à 85 ans',
    worth95: 'Valeur à 95 ans',
    noWorth: '—',
    lifetime: 'Revenu total après impôt, sur tout le plan (retraits compris)',
    extraDrawn: (amount) => `${amount} de plus tirés du pécule entre 60 et 69 ans que le standard`,
    lessDrawn: (amount) => `${amount} de moins tirés du pécule entre 60 et 69 ans que le standard`,
    sameDrawn: 'Autant tiré du pécule entre 60 et 69 ans que le standard',
    breakEvenLater: (age) => `Les rentes cumulées rattrapent le standard à ${age} ans`,
    breakEvenEarlier: (age) => `Attendre 65 ans rattrape cette façon à ${age} ans`,
    breakEvenNone: 'Pas de point d’équilibre avant l’horizon du plan',
    breakEvenSelf: 'La référence des comparaisons',
    verdict: (v) =>
      v.kind === 'holds'
        ? v.defers
          ? `Vous pouvez reporter : votre pécule tient jusqu’à ${v.horizonAge} ans.`
          : `Ce plan tient jusqu’à ${v.horizonAge} ans.`
        : v.defers && v.standardHolds
          ? `Reporter épuise votre pécule à ${v.age} ans ; prendre le RRQ et la PSV à 65 ans évite la pénurie.`
          : v.defers && v.standardAge !== null
            ? `Reporter épuise votre pécule à ${v.age} ans, et prendre les rentes à 65 ans ne règle rien : le manque vient à ${v.standardAge} ans.`
            : `Ce plan manque d’argent à ${v.age} ans.`,
    windowLabel: 'Années montrées',
    windowBridge: '60 à 70 ans',
    windowPlan: 'Jusqu’à l’horizon',
    tableTitle: 'Année par année',
    colAge: 'Âge',
    colNeed: 'Dépenses',
    colWork: 'Travail',
    colDb: 'Rente de l’employeur',
    colRrq: 'RRQ',
    colOas: 'PSV',
    colGis: 'SRG',
    colDraw: 'Tiré du pécule',
    colNonReg: 'dont non enregistré',
    colRrsp: 'dont REER / FERR',
    colTfsa: 'dont CELI',
    colTax: 'Impôt',
    colNest: 'Pécule en fin d’année',
    colStatus: 'État',
    status: { covered: 'Couvert par les revenus', drawing: 'Le pécule est mis à contribution', short: 'Pécule épuisé : pénurie' },
    householdNote: 'Les revenus, les dépenses, l’impôt et le pécule sont ceux du ménage ; l’âge est celui de la personne choisie.',
    barsTitle: 'D’où vient l’argent, année par année',
    barsHint: 'Chaque barre est une année : le travail, les rentes garanties et ce que le pécule doit fournir. La ligne pointillée est ce qu’il faut couvrir (dépenses et impôt).',
    barsFigure: (from, to) => `Sources de revenus année par année, de ${from} à ${to} ans`,
    segment: { work: 'Travail', db: 'Rente de l’employeur', rrq: 'RRQ', oas: 'PSV et SRG', nest: 'Tiré du pécule' },
    needLine: 'Dépenses + impôt',
    nestTitle: 'Le pécule, selon la façon de commencer',
    nestHint: (rrq, oas) => `Traits pointillés : début du RRQ (${rrq} ans) et de la PSV (${oas} ans) de votre choix. Reporter creuse le pécule d’abord, puis le fait remonter.`,
    nestFigure: (from, to) => `Pécule en fin d’année selon la façon de commencer les rentes, de ${from} à ${to} ans`,
    markerRrq: 'RRQ',
    markerOas: 'PSV',
    tooltip: (age, year) => `${age} ans · ${year}`,
    whyTitle: 'Pourquoi ?',
    whyCost: (amount) => `Le pont coûte ${amount} de pécule de plus entre 60 et 69 ans, par rapport à prendre les rentes à 65 ans (dollars d’aujourd’hui).`,
    whyCostNone: 'Entre 60 et 69 ans, ce plan ne tire pas plus du pécule que le standard.',
    whyGis: (gis, recovery) => `Sur tout le plan : ${gis} de Supplément de revenu garanti reçu et ${recovery} de PSV repris par l’impôt de récupération.`,
    why: [
      'Une rente reportée est plus élevée toute la vie et suit les prix : le RRQ gagne 0,7 % par mois après 65 ans (jusqu’à 58,8 % à 72 ans), la PSV 0,6 % par mois (jusqu’à 36 % à 70 ans).',
      'Les années du pont sont payées par le pécule : plus il est gros au départ, plus le report est possible. Un pécule qui s’épuise avant 70 ans ne peut pas le porter.',
      'Le Supplément de revenu garanti se perd avec un revenu plus élevé : reporter la PSV reporte aussi le SRG qui l’accompagne. Au-delà d’un certain revenu, la PSV est reprise en partie par l’impôt de récupération.',
      'Retirer du REER/FERR pendant le pont peut baisser l’impôt plus tard : les retraits sont faits à un taux plus bas qu’avec toutes les rentes en plus.',
    ],
    caveatTitle: 'Ce que ces chiffres ne disent pas',
    caveats: [
      'Une durée de vie : le point d’équilibre est un pari sur la longévité, pas une certitude.',
      'Le décès du conjoint : la rente de survivant n’est pas modélisée.',
      'Des marchés qui tournent mal au mauvais moment, et des dépenses qui changent avec l’âge : les jeux d’hypothèses prudentes, neutres et audacieuses donnent une fourchette, pas une prévision.',
    ],
    matrixTitle: 'Sous trois jeux d’hypothèses',
    matrixHint: 'Chaque façon de commencer, avec les hypothèses prudentes, neutres et audacieuses de la page Hypothèses à la place des vôtres.',
    matrixBusy: 'Calcul des quinze scénarios…',
    matrixHolds: 'Tient',
    matrixFails: (age) => `Manque à ${age} ans`,
    presetName: { prudent: 'Prudentes', neutral: 'Neutres', bold: 'Audacieuses' },
    strategyCol: 'Façon de commencer',
  },
  en: {
    title: 'My years from 60 to 70',
    open: 'My years from 60 to 70: defer or take early?',
    hint: 'Every year from 60 to 70: what the household spends, what the guaranteed pensions pay, what the nest has to cover, and what is left. Change the retirement age and the age the QPP and OAS start to see whether the plan holds. Everything is in today’s dollars.',
    busy: 'Working it out…',
    person: 'For',
    retireLabel: 'Retirement age',
    rrqLabel: 'QPP start (Québec Pension Plan)',
    oasLabel: 'OAS start (Old Age Security pension)',
    leverHint: 'The QPP can start from 60 to 72, the OAS from 65 to 70. Only the chosen person changes; the other keeps the ages from their profile.',
    age: (age) => `age ${age}`,
    strategyTitle: 'Five ways to start your pensions',
    strategyName: { mine: 'My plan', asap: 'Everything as early as possible', standard: 'Standard', max: 'Defer as far as possible', bridge: 'Bridge to 70' },
    strategyLine: {
      mine: 'The start ages in your profile.',
      asap: 'QPP at 60, OAS at 65: the earliest allowed.',
      standard: 'QPP and OAS at 65.',
      max: 'QPP at 72, OAS at 70: the largest pensions.',
      bridge: 'Live on the nest until 70, then QPP and OAS at 70.',
    },
    custom: 'Your choices match none of these five: they are shown under “My plan”.',
    lowestNestLabel: 'Lowest nest, ages 60 to 70',
    selectedName: 'Your current choice',
    worth85: 'Worth at 85',
    worth95: 'Worth at 95',
    noWorth: '—',
    lifetime: 'Total income after tax, over the whole plan (withdrawals included)',
    extraDrawn: (amount) => `${amount} more drawn from the nest at 60 to 69 than the standard`,
    lessDrawn: (amount) => `${amount} less drawn from the nest at 60 to 69 than the standard`,
    sameDrawn: 'As much drawn from the nest at 60 to 69 as the standard',
    breakEvenLater: (age) => `Cumulative pensions catch up with the standard at ${age}`,
    breakEvenEarlier: (age) => `Waiting until 65 catches up with this at ${age}`,
    breakEvenNone: 'No break-even before the plan’s horizon',
    breakEvenSelf: 'The reference for the comparisons',
    verdict: (v) =>
      v.kind === 'holds'
        ? v.defers
          ? `You can defer: your nest lasts to age ${v.horizonAge}.`
          : `This plan holds to age ${v.horizonAge}.`
        : v.defers && v.standardHolds
          ? `Deferring uses up your nest at ${v.age}; taking the QPP and OAS at 65 avoids the shortfall.`
          : v.defers && v.standardAge !== null
            ? `Deferring uses up your nest at ${v.age}, and taking the pensions at 65 does not fix it: the shortfall comes at ${v.standardAge}.`
            : `This plan runs out of money at ${v.age}.`,
    windowLabel: 'Years shown',
    windowBridge: 'Ages 60 to 70',
    windowPlan: 'To the horizon',
    tableTitle: 'Year by year',
    colAge: 'Age',
    colNeed: 'Spending',
    colWork: 'Work',
    colDb: 'Employer pension',
    colRrq: 'QPP',
    colOas: 'OAS',
    colGis: 'GIS',
    colDraw: 'Drawn from the nest',
    colNonReg: 'of which non-registered',
    colRrsp: 'of which RRSP / RRIF',
    colTfsa: 'of which TFSA',
    colTax: 'Tax',
    colNest: 'Nest at year end',
    colStatus: 'Status',
    status: { covered: 'Covered by income', drawing: 'The nest is being drawn', short: 'Nest empty: shortfall' },
    householdNote: 'Income, spending, tax and the nest are the household’s; the age is the chosen person’s.',
    barsTitle: 'Where the money comes from, year by year',
    barsHint: 'Each bar is a year: work, guaranteed pensions and what the nest has to supply. The dashed line is what has to be covered (spending and tax).',
    barsFigure: (from, to) => `Sources of income year by year, ages ${from} to ${to}`,
    segment: { work: 'Work', db: 'Employer pension', rrq: 'QPP', oas: 'OAS and GIS', nest: 'Drawn from the nest' },
    needLine: 'Spending + tax',
    nestTitle: 'The nest, by way of starting',
    nestHint: (rrq, oas) => `Dashed lines: your chosen QPP start (${rrq}) and OAS start (${oas}). Deferring digs into the nest first, then lets it recover.`,
    nestFigure: (from, to) => `Nest at year end by way of starting the pensions, ages ${from} to ${to}`,
    markerRrq: 'QPP',
    markerOas: 'OAS',
    tooltip: (age, year) => `Age ${age} · ${year}`,
    whyTitle: 'Why?',
    whyCost: (amount) => `The bridge costs ${amount} more of the nest between 60 and 69 than taking the pensions at 65 (today’s dollars).`,
    whyCostNone: 'Between 60 and 69 this plan draws no more from the nest than the standard.',
    whyGis: (gis, recovery) => `Over the whole plan: ${gis} of Guaranteed Income Supplement received and ${recovery} of OAS taken back by the recovery tax.`,
    why: [
      'A deferred pension is larger for life and follows prices: the QPP gains 0.7% a month after 65 (up to 58.8% at 72), the OAS 0.6% a month (up to 36% at 70).',
      'The bridge years are paid by the nest: the bigger it is at the start, the more feasible deferring is. A nest that runs out before 70 cannot carry it.',
      'The Guaranteed Income Supplement falls with income: deferring the OAS also defers the GIS that goes with it. Above a certain income part of the OAS is taken back by the recovery tax.',
      'Drawing on the RRSP/RRIF during the bridge can lower tax later: the withdrawals are taxed at a lower rate than with every pension on top.',
    ],
    caveatTitle: 'What these figures leave out',
    caveats: [
      'A length of life: a break-even is a bet on longevity, not a certainty.',
      'A spouse’s death: the survivor’s pension is not modelled.',
      'Markets that go wrong at the wrong time, and spending that changes with age: the prudent, neutral and bold sets give a range, not a forecast.',
    ],
    matrixTitle: 'Under three sets of assumptions',
    matrixHint: 'Each way of starting, with the prudent, neutral and bold assumptions from the Assumptions page in place of yours.',
    matrixBusy: 'Working out the fifteen scenarios…',
    matrixHolds: 'Holds',
    matrixFails: (age) => `Short at ${age}`,
    presetName: { prudent: 'Prudent', neutral: 'Neutral', bold: 'Bold' },
    strategyCol: 'Way of starting',
  },
}
