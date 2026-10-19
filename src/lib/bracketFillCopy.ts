// The words of « Jusqu’où fondre le REER ? » (Résultats › Stratégies). Like bridgeCopy.ts, they live outside the eager dictionaries (a bundle-budget reason),
// so bracketFillCopy.test.ts does the parity job for them: every text in both languages, none empty, none left in the other language, and no cited rate or
// threshold typed into a sentence (the figures come from the engine, formatted by the page).

export interface BracketFillEffect {
  /** The tax difference over the whole plan against « no meltdown », formatted; null when it is about the same. */
  tax: string | null
  taxLess: boolean
  /** The largest RRIF minimum, with this way and with none, formatted; null when neither is worth a word (both are about nothing). */
  peak: { now: string; off: string; smaller: boolean } | null
  /** The TFSA difference at the end, formatted, and its direction; null when it is about the same. */
  tfsa: { diff: string; more: boolean } | null
  /** Does it pay (less tax)? null when the difference is too small to say. */
  pays: boolean | null
}

export interface BracketFillCopy {
  title: string
  hint: (age: number) => string
  /** The label of the segmented control. */
  switchLabel: string
  /** Short, to fit a tab. */
  tabs: { none: string; bracket1: string; oas: string }
  /** Whole, for a sentence or a table row. */
  names: { none: string; bracket1: string; oas: string }
  /** What the way does, said once under the switch. */
  line: { none: string; bracket1: string; oas: string }
  current: (name: string) => string
  /** What the way on screen does to the plan, against « no meltdown »: the answer, said first. */
  effect: (e: BracketFillEffect) => string
  keep: string
  better: (name: string, bestAge: number | null, ownAge: number | null, saved: string) => string
  /** The answer's own sentence (« À faire cette année »). */
  nudge: (name: string, bestAge: number | null, ownAge: number | null, saved: string) => string
  /** The comparison table. */
  way: string
  earliest: string
  tax: string
  recovery: string
  peak: string
  rrspLeft: string
  age: (n: number) => string
  use: string
  yours: string
  ahead: string
  updating: string
  incomeTitle: string
  incomeHint: string
  /** Under the income chart: where the income leaves the line, and why. */
  leaves: (year: number, age: number) => string
  staysUnder: string
  /** Years under the line while the GIS is paid, and the year the RRSP runs out: the two reasons income can sit below it. */
  pausedGis: (from: number, to: number) => string
  emptied: (year: number, age: number) => string
  markerForced: string
  balancesTitle: string
  balancesHint: string
  seriesIncome: string
  seriesLine: string
  seriesRrsp: string
  seriesTfsa: string
  tooltip: (age: number, year: number) => string
  incomeFigure: (first: number, last: number) => string
  balancesFigure: (first: number, last: number) => string
  /** Behind a fold: how to read the page. */
  howTitle: string
  how: string
  caveat: string
  /** The map's chip. */
  nav: string
}

const FR: BracketFillCopy = {
  title: 'Jusqu’où fondre le REER ?',
  hint: (age) =>
    `Votre plan, retraite à ${age} ans, refait en tirant du REER (puis du FERR) plus que l’année ne demande, jusqu’à une ligne de revenu. Le surplus va au CELI, puis au compte non enregistré. Tout est recalculé année par année avec l’impôt, la RRQ, la PSV et le SRG.`,
  switchLabel: 'Façons de fondre le REER',
  tabs: { none: 'Sans fonte', bracket1: '1re tranche', oas: 'Seuil de la PSV' },
  names: { none: 'Sans fonte', bracket1: 'Haut de la 1re tranche', oas: 'Sous la récupération de la PSV' },
  line: {
    none: 'Le REER ne donne que ce que l’année demande, plus le retrait minimum du FERR.',
    bracket1: 'Chaque année où vous ne travaillez plus, on tire du REER jusqu’au haut de la première tranche d’imposition (la plus basse, du fédéral ou du Québec).',
    oas: 'Chaque année où vous ne travaillez plus, on tire du REER jusqu’au seuil à partir duquel la PSV est récupérée : plus haut que la première tranche, mais sans jamais rien rendre.',
  },
  current: (name) => `Votre choix actuel : « ${name} ».`,
  effect: (e) => {
    const parts = [e.tax === null ? 'à peu près le même impôt sur tout le plan' : `${e.tax} d’impôt de ${e.taxLess ? 'moins' : 'plus'} sur tout le plan`]
    if (e.peak) parts.push(`un retrait minimum du FERR ${e.peak.smaller ? 'plus petit' : 'plus gros'} au plus fort (${e.peak.now} par année au lieu de ${e.peak.off})`)
    if (e.tfsa) parts.push(`${e.tfsa.diff} ${e.tfsa.more ? 'de plus' : 'de moins'} dans le CELI à la fin`)
    const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} et ${parts[parts.length - 1]}` : parts[0]
    const verdict = e.pays === null ? '' : e.pays ? ' Pour ce ménage, cela paie.' : ' Pour ce ménage, cela ne paie pas.'
    return `Par rapport à « Sans fonte » : ${list}.${verdict}`
  },
  keep: 'Votre façon actuelle est la meilleure, ou l’écart est trop petit pour valoir un changement.',
  better: (name, bestAge, ownAge, saved) => {
    const years = (n: number) => `${n} ${n > 1 ? 'ans' : 'an'}`
    if (bestAge !== null && (ownAge === null || bestAge < ownAge)) {
      return `« ${name} » permet de prendre sa retraite ${ownAge === null ? `à ${bestAge} ans, alors que votre façon actuelle ne dure à aucun âge` : `${years(ownAge - bestAge)} plus tôt`}.`
    }
    return `« ${name} » coûte environ ${saved} d’impôt de moins sur tout le plan (en dollars d’aujourd’hui).`
  },
  nudge: (name, bestAge, ownAge, saved) => {
    const years = (n: number) => `${n} ${n > 1 ? 'ans' : 'an'}`
    if (bestAge !== null && (ownAge === null || bestAge < ownAge)) {
      return `Fondre le REER (« ${name} ») permet de prendre sa retraite ${ownAge === null ? `à ${bestAge} ans, alors que le plan actuel ne dure à aucun âge` : `${years(ownAge - bestAge)} plus tôt`}.`
    }
    return `Fondre le REER (« ${name} ») coûterait environ ${saved} d’impôt de moins sur tout le plan (en dollars d’aujourd’hui).`
  },
  way: 'Façon de puiser dans le REER',
  earliest: 'Retraite au plus tôt',
  tax: 'Impôt sur tout le plan',
  recovery: 'PSV récupérée',
  peak: 'Plus gros retrait minimum du FERR',
  rrspLeft: 'REER restant à la fin (imposé au décès)',
  age: (n) => `${n} ans`,
  use: 'Choisir cette façon',
  yours: '(votre choix)',
  ahead: '(en tête)',
  updating: 'Mise à jour…',
  incomeTitle: 'Revenu de chaque année, et la ligne à ne pas dépasser',
  incomeHint: 'Le revenu net de la personne dont le revenu est le plus élevé, en dollars d’aujourd’hui.',
  leaves: (year, age) => `Le revenu reste sur la ligne jusqu’en ${year} (${age} ans) ; ensuite, les rentes et le retrait minimum du FERR, qu’on ne choisit pas, le font passer au-dessus.`,
  staysUnder: 'Le revenu ne dépasse pas la ligne de tout le plan.',
  pausedGis: (from, to) => `${from === to ? `En ${from}` : `De ${from} à ${to}`}, le revenu passe sous la ligne : le SRG est versé, et la fonte s’arrête pour ne pas le perdre.`,
  emptied: (year, age) => `Dès ${year} (${age} ans), le REER est vide : il n’y a plus rien à fondre.`,
  markerForced: 'Rentes + minimum du FERR',
  balancesTitle: 'Ce qui reste dans le REER et dans le CELI',
  balancesHint: 'Le REER fond, le CELI grossit : l’argent change de compte, il n’est pas dépensé.',
  seriesIncome: 'Revenu net',
  seriesLine: 'La ligne',
  seriesRrsp: 'REER',
  seriesTfsa: 'CELI',
  tooltip: (age, year) => `${age} ans · ${year}`,
  incomeFigure: (first, last) => `Revenu net de ${first} à ${last} ans, avec la ligne de la façon choisie`,
  balancesFigure: (first, last) => `Solde du REER et du CELI de ${first} à ${last} ans`,
  howTitle: 'Comment lire ce calcul',
  how: 'Fondre le REER, c’est payer de l’impôt un peu plus tôt, à un taux bas, pour que les retraits minimums du FERR soient plus petits plus tard. Le texte sous les onglets dit ce que la façon choisie fait à votre plan, comparée à « Sans fonte » ; le tableau les met côte à côte. Il arrive que la fonte coûte plus d’impôt : le chiffre est là pour le dire.',
  caveat:
    'La fonte déplace l’impôt vers le début du plan : elle ne fait gagner que si le REER est assez gros pour que les retraits minimums du FERR atteignent, plus tard, des tranches plus hautes. Personne n’est « fondu » tant qu’il touche le SRG, ni durant une année de travail. La ligne est un haut de tranche, pas le taux le plus bas possible : le crédit du Québec partagé entre conjoints et les crédits liés à l’âge font bouger le taux réel. Un REER restant est imposé comme un revenu au décès ; un CELI ne l’est pas.',
  nav: 'Fonte du REER',
}

const EN: BracketFillCopy = {
  title: 'How far to melt down the RRSP?',
  hint: (age) =>
    `Your plan (retiring at ${age}), run again drawing more from the RRSP (then the RRIF) than the year asks for, up to a line of income. The surplus goes to the TFSA, then to the non-registered account. Everything is recalculated year by year with tax, the QPP, OAS and GIS.`,
  switchLabel: 'Ways to melt down the RRSP',
  tabs: { none: 'No meltdown', bracket1: '1st bracket', oas: 'OAS line' },
  names: { none: 'No meltdown', bracket1: 'Top of the 1st bracket', oas: 'Below the OAS recovery line' },
  line: {
    none: 'The RRSP gives only what the year asks for, plus the RRIF minimum.',
    bracket1: 'Each year you are no longer working, the RRSP is drawn up to the top of the first tax bracket (the lower of the federal and the Québec one).',
    oas: 'Each year you are no longer working, the RRSP is drawn up to the income at which OAS starts being clawed back: higher than the first bracket, yet nothing is ever repaid.',
  },
  current: (name) => `Your current choice: “${name}”.`,
  effect: (e) => {
    const parts = [e.tax === null ? 'about the same tax over the whole plan' : `${e.tax} ${e.taxLess ? 'less' : 'more'} tax over the whole plan`]
    if (e.peak) parts.push(`a ${e.peak.smaller ? 'smaller' : 'bigger'} largest RRIF minimum (${e.peak.now} a year instead of ${e.peak.off})`)
    if (e.tfsa) parts.push(`${e.tfsa.diff} ${e.tfsa.more ? 'more' : 'less'} in the TFSA at the end`)
    const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]
    const verdict = e.pays === null ? '' : e.pays ? ' For this household, it pays.' : ' For this household, it does not pay.'
    return `Compared with “No meltdown”: ${list}.${verdict}`
  },
  keep: 'Your current way is the best one, or the gap is too small to be worth a change.',
  better: (name, bestAge, ownAge, saved) => {
    const years = (n: number) => `${n} ${n > 1 ? 'years' : 'year'}`
    if (bestAge !== null && (ownAge === null || bestAge < ownAge)) {
      return `“${name}” lets you retire ${ownAge === null ? `at ${bestAge}, where your current way never lasts` : `${years(ownAge - bestAge)} earlier`}.`
    }
    return `“${name}” costs about ${saved} less tax over the whole plan (in today’s dollars).`
  },
  nudge: (name, bestAge, ownAge, saved) => {
    const years = (n: number) => `${n} ${n > 1 ? 'years' : 'year'}`
    if (bestAge !== null && (ownAge === null || bestAge < ownAge)) {
      return `Melting down the RRSP (“${name}”) lets you retire ${ownAge === null ? `at ${bestAge}, where the current plan never lasts` : `${years(ownAge - bestAge)} earlier`}.`
    }
    return `Melting down the RRSP (“${name}”) would cost about ${saved} less tax over the whole plan (in today’s dollars).`
  },
  way: 'Way of drawing the RRSP',
  earliest: 'Earliest retirement',
  tax: 'Tax over the whole plan',
  recovery: 'OAS repaid',
  peak: 'Largest RRIF minimum',
  rrspLeft: 'RRSP left at the end (taxed at death)',
  age: (n) => `${n}`,
  use: 'Choose this way',
  yours: '(your choice)',
  ahead: '(ahead)',
  updating: 'Updating…',
  incomeTitle: 'Each year’s income, and the line not to cross',
  incomeHint: 'The net income of the person with the higher income, in today’s dollars.',
  leaves: (year, age) => `Income stays on the line until ${year} (age ${age}); after that, the pensions and the RRIF minimum, which you do not choose, lift it above.`,
  staysUnder: 'Income never goes above the line for the whole plan.',
  pausedGis: (from, to) => `${from === to ? `In ${from}` : `From ${from} to ${to}`}, income goes below the line: the GIS is paid, and the meltdown stops so as not to lose it.`,
  emptied: (year, age) => `From ${year} (age ${age}), the RRSP is empty: there is nothing left to melt.`,
  markerForced: 'Pensions + RRIF minimum',
  balancesTitle: 'What is left in the RRSP and in the TFSA',
  balancesHint: 'The RRSP shrinks, the TFSA grows: the money changes account, it is not spent.',
  seriesIncome: 'Net income',
  seriesLine: 'The line',
  seriesRrsp: 'RRSP',
  seriesTfsa: 'TFSA',
  tooltip: (age, year) => `Age ${age} · ${year}`,
  incomeFigure: (first, last) => `Net income from age ${first} to ${last}, with the chosen way’s line`,
  balancesFigure: (first, last) => `RRSP and TFSA balances from age ${first} to ${last}`,
  howTitle: 'How to read this calculation',
  how: 'Melting down the RRSP means paying tax a little earlier, at a low rate, so the RRIF minimums are smaller later. The text under the tabs says what the chosen way does to your plan, compared with “No meltdown”; the table sets them side by side. Sometimes the meltdown costs more tax: the figure is there to say so.',
  caveat:
    'The meltdown moves tax to the start of the plan: it only wins when the RRSP is big enough that the RRIF minimums would later reach higher brackets. Nobody is melted down while receiving the GIS, nor in a working year. The line is a bracket top, not the lowest possible rate: Québec’s credit shared between spouses and the age-related credits move the real rate. An RRSP left over is taxed as income at death; a TFSA is not.',
  nav: 'RRSP meltdown',
}

export const BRACKET_FILL_COPY = { fr: FR, en: EN }
