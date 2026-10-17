import type { FanId } from '../engine/fan'

// The words of « Les marchés, année par année » (components/results/MarketFan.tsx): the plan's net worth under five ways the returns could go (engine/fan.ts). Both languages, each written
// for its reader. Money and years arrive formatted. The two market paths keep the names the rest of the app gives them (lib/marketCopy.ts).

interface MarketFanCopy {
  title: string
  hint: string
  /** The dollars the picture is in. */
  today: string
  nominal: string
  /** The name of each line (the two market paths are named by marketCopy; they are repeated here only so a line's label is whole in the table). */
  names: Record<FanId, string>
  /** The household's own market choice, when it is one of the lines. */
  yours: string
  /** The accessible name of the picture, and the table that says the same in text. */
  figure: (first: number, last: number) => string
  table: { line: string; holds: string; trough: string; end: string }
  holds: string
  runsOut: (year: number) => string
  /** The deepest dip below an earlier high: the money at its low and the year, or nothing to say when the plan never falls. */
  trough: (money: string, year: number) => string
  noFall: string
  /** One sentence under the table: what the spread is, in the household's own numbers. */
  spread: (low: string, high: string) => string
  caveat: string
  waiting: string
}

export const MARKET_FAN_COPY: { fr: MarketFanCopy; en: MarketFanCopy } = {
  fr: {
    title: 'Les marchés, année par année',
    hint: 'Votre plan, dessiné cinq fois : avec vos rendements moyens, avec des rendements plus bas ou plus hauts de 1 point chaque année, avec une chute au début de la retraite, avec dix années à plat. Ce sont des illustrations, pas des prévisions : aucune ne porte de probabilité.',
    today: 'En dollars d’aujourd’hui.',
    nominal: 'En dollars de chaque année.',
    names: { average: 'Rendements moyens', lower: 'Rendements 1 point plus bas', higher: 'Rendements 1 point plus haut', badStart: 'Mauvais départ', lostDecade: 'Décennie perdue' },
    yours: 'votre choix actuel',
    figure: (first, last) => `Avoir net de ${first} à ${last}, selon cinq façons dont les marchés pourraient aller. Le tableau dit la même chose en texte.`,
    table: { line: 'Scénario', holds: 'L’argent dure ?', trough: 'Pire creux', end: 'À la fin du plan' },
    holds: 'Oui',
    runsOut: (year) => `Non, il manque dès ${year}`,
    trough: (money, year) => `${money} en ${year}`,
    noFall: 'Aucune baisse',
    spread: (low, high) => `À la fin du plan, l’avoir net va de ${low} à ${high} selon la façon dont les marchés se comportent : c’est l’écart que l’hypothèse moyenne ne montre pas.`,
    caveat: 'Chaque ligne garde votre âge de départ, vos rentes et vos dépenses ; seuls les rendements changent.',
    waiting: 'Les cinq cas se calculent…',
  },
  en: {
    title: 'The markets, year by year',
    hint: 'Your plan, drawn five times: on your average returns, on returns 1 point a year lower or higher, with a fall at the start of retirement, and with ten flat years. These are illustrations, not forecasts: none carries a probability.',
    today: 'In today’s dollars.',
    nominal: 'In each year’s dollars.',
    names: { average: 'Average returns', lower: 'Returns 1 point lower', higher: 'Returns 1 point higher', badStart: 'Bad start', lostDecade: 'Lost decade' },
    yours: 'your current choice',
    figure: (first, last) => `Net worth from ${first} to ${last}, under five ways the markets could go. The table says the same in text.`,
    table: { line: 'Scenario', holds: 'Does the money last?', trough: 'Deepest dip', end: 'At the end of the plan' },
    holds: 'Yes',
    runsOut: (year) => `No, short from ${year}`,
    trough: (money, year) => `${money} in ${year}`,
    noFall: 'No fall',
    spread: (low, high) => `At the end of the plan, net worth runs from ${low} to ${high} depending on how the markets behave: the spread the average assumption does not show.`,
    caveat: 'Every line keeps your retirement age, pensions and spending; only the returns change.',
    waiting: 'Working out the five cases…',
  },
}
