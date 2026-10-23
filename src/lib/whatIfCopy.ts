import type { Lang } from '../i18n'
import { formatMoney } from './money.ts'
import type { PlanFacts, RetireeLeverFact, WhatIfFacts } from './planFacts.ts'
import { fillTokens, yearsWord } from './storyTokens.ts'

// « AND IF…? » CARDS: what a household may ask, each answered in plain words from the engine's own figures. Unlike an example's story (exampleStory.ts) these texts are GENERIC: they name no
// one and type no figure, so the same card reads right for any household — an example, or the one on this device — and it is all computed on the device. The variant of each sentence is
// picked from the facts (planFacts.ts), never decided here.
//
// TWO FAMILIES, because the two questions differ. A household still working asks WHEN it can stop: its cards read the answer as an age (a crash moves it, spending less brings it
// forward). A household that has ALREADY stopped has no age left to move; it asks whether the money lasts, until when, how much it can spend, and which change helps — so its cards read the
// plan as it stands (a first short year, what is left, a ceiling on spending) and its levers are the retiree's (engine/retiree.ts).
//
// A card that has nothing true to say is not shown: no death card for one person, none for a lever that changes nothing, none when no age works as things stand.
//
// Register: Québécois. No digit in a template: figures are tokens, and an amount always says its dollars are today's.

export type WhatIfId = 'crash' | 'death' | 'spend10' | 'pensions70' | 'spendMax' | 'spend20' | 'income'

export interface WhatIfCard {
  id: WhatIfId
  title: string
  /** One to three sentences. */
  text: string
}

interface LeverWords {
  title: string
  earlier: string
  same: string
  later: string
  more: string
  less: string
}

interface Words {
  crash: { title: string; later: string; same: string; none: string; holds: string; short: string }
  death: { title: string; holdsMore: string; holdsLess: string; short: string; alreadyShort: string }
  spend10: LeverWords
  pensions70: LeverWords
  /** The retiree's: what a household that has already stopped asks. */
  retired: {
    spendMax: { title: string; none: string; room: string; cut: string }
    crash: { title: string; holds: string; breaks: string; alreadyShort: string }
    levers: { spend10: string; spend20: string; income: string; pensions70: string }
    outcome: { holdsMore: string; holdsLess: string; noChange: string; breaks: string; fixes: string; later: string; sameShort: string; earlier: string }
  }
}

export const WHATIF_WORDS: Record<Lang, Words> = {
  fr: {
    crash: {
      title: 'Si les marchés chutent au début de la retraite',
      later: 'L’âge le plus tôt qui fonctionne passe de {base} à {age} ans, soit {yearsWord} de plus.',
      same: 'L’âge le plus tôt qui fonctionne reste {age} ans.',
      none: 'L’âge le plus tôt qui fonctionne est {base} ans aujourd’hui ; après une chute des marchés, aucun âge ne fonctionne plus.',
      holds: 'Avec les âges de retraite prévus, l’argent dure quand même, avec environ {nestEnd} à la fin du plan, en dollars d’aujourd’hui.',
      short: 'Avec les âges de retraite prévus, l’argent manquerait avant la fin du plan.',
    },
    death: {
      title: 'Si {who} meurt plus tôt',
      holdsMore: 'Si {who} meurt à {age} ans, l’argent dure quand même et il reste environ {nestEnd} à la fin, contre {nestEndBase} dans le plan de départ (dollars d’aujourd’hui) : la personne qui reste dépense moins et garde les comptes.',
      holdsLess: 'Si {who} meurt à {age} ans, l’argent dure quand même, avec environ {nestEnd} à la fin, contre {nestEndBase} dans le plan de départ (dollars d’aujourd’hui) : la rente de survivant ne remplace pas tout ce qui s’arrête.',
      short: 'Si {who} meurt à {age} ans, l’argent ne dure plus jusqu’à la fin du plan.',
      alreadyShort: 'Si {who} meurt à {age} ans, le plan manquait déjà d’argent avant la fin, et cela ne change pas.',
    },
    spend10: {
      title: 'Si le ménage dépense dix pour cent de moins',
      earlier: 'L’âge le plus tôt qui fonctionne arrive {yearsWord} plus tôt.',
      same: 'L’âge le plus tôt qui fonctionne ne change pas.',
      later: 'L’âge le plus tôt qui fonctionne arrive {yearsWord} plus tard.',
      more: 'À la fin du plan, il reste {gain} de plus, en dollars d’aujourd’hui.',
      less: 'À la fin du plan, il reste {gain} de moins, en dollars d’aujourd’hui.',
    },
    pensions70: {
      title: 'Si la RRQ et la PSV commencent à soixante-dix ans',
      earlier: 'L’âge le plus tôt qui fonctionne arrive {yearsWord} plus tôt.',
      same: 'L’âge le plus tôt qui fonctionne ne change pas.',
      later: 'L’âge le plus tôt qui fonctionne arrive {yearsWord} plus tard.',
      more: 'À la fin du plan, il reste {gain} de plus, en dollars d’aujourd’hui.',
      less: 'À la fin du plan, il reste {gain} de moins, en dollars d’aujourd’hui.',
    },
    retired: {
      spendMax: {
        title: 'Combien le ménage peut dépenser',
        none: 'Même sans rien dépenser, l’argent ne durerait pas jusqu’à la fin du plan.',
        room: 'Le plan peut financer jusqu’à {maxSpend} par année, en dollars d’aujourd’hui, soit {margin} de plus que les {asked} prévus.',
        cut: 'Pour que l’argent dure jusqu’à la fin, il faudrait dépenser au plus {maxSpend} par année, en dollars d’aujourd’hui, soit {cut} de moins que les {asked} prévus.',
      },
      crash: {
        title: 'Si les marchés chutent maintenant',
        holds: 'Même après une chute des marchés au début de la retraite, l’argent dure jusqu’à la fin du plan, avec environ {nestEnd} à la fin contre {nestEndBase} dans le plan de départ (dollars d’aujourd’hui).',
        breaks: 'Après une chute des marchés au début de la retraite, l’argent manquerait dès {year}.',
        alreadyShort: 'L’argent manquait déjà dès {baseYear} ; après une chute des marchés, il manquerait dès {year}.',
      },
      levers: {
        spend10: 'Si le ménage dépense dix pour cent de moins',
        spend20: 'Si le ménage dépense vingt pour cent de moins',
        income: 'Si un revenu d’appoint de dix mille dollars par année s’ajoute pendant cinq ans',
        pensions70: 'Si la RRQ et la PSV commencent à soixante-dix ans',
      },
      outcome: {
        holdsMore: 'L’argent dure jusqu’à la fin du plan et il reste {gain} de plus, en dollars d’aujourd’hui.',
        holdsLess: 'L’argent dure jusqu’à la fin du plan, mais il reste {gain} de moins, en dollars d’aujourd’hui.',
        noChange: 'Cela ne change rien au plan : l’argent dure jusqu’à la fin.',
        breaks: 'L’argent manquerait dès {year}, alors qu’il dure jusqu’à la fin du plan sans ce changement.',
        fixes: 'L’argent dure alors jusqu’à la fin du plan, avec environ {nestEnd} à la fin, en dollars d’aujourd’hui.',
        later: 'L’argent manque plus tard : dès {year} au lieu de {baseYear}.',
        sameShort: 'L’argent manque quand même dès {year}.',
        earlier: 'L’argent manquerait plus tôt : dès {year} au lieu de {baseYear}, parce que ces rentes arrivent plus tard.',
      },
    },
  },
  en: {
    crash: {
      title: 'If the markets fall early in retirement',
      later: 'The earliest age that works moves from {base} to {age}, which is {yearsWord} later.',
      same: 'The earliest age that works stays at {age}.',
      none: 'The earliest age that works is {base} today; after a market fall, no age works any more.',
      holds: 'At the retirement ages planned, the money still lasts, with about {nestEnd} left at the end of the plan, in today’s dollars.',
      short: 'At the retirement ages planned, the money would run short before the end of the plan.',
    },
    death: {
      title: 'If {who} dies earlier',
      holdsMore: 'If {who} dies at {age}, the money still lasts and about {nestEnd} is left at the end, against {nestEndBase} in the starting plan (today’s dollars): the person who remains spends less and keeps the accounts.',
      holdsLess: 'If {who} dies at {age}, the money still lasts, with about {nestEnd} left at the end, against {nestEndBase} in the starting plan (today’s dollars): the survivor’s pension does not replace everything that stops.',
      short: 'If {who} dies at {age}, the money no longer lasts to the end of the plan.',
      alreadyShort: 'If {who} dies at {age}, the plan was already short of money before the end, and that does not change.',
    },
    spend10: {
      title: 'If the household spends ten percent less',
      earlier: 'The earliest age that works comes {yearsWord} sooner.',
      same: 'The earliest age that works does not change.',
      later: 'The earliest age that works comes {yearsWord} later.',
      more: 'At the end of the plan, {gain} more is left, in today’s dollars.',
      less: 'At the end of the plan, {gain} less is left, in today’s dollars.',
    },
    pensions70: {
      title: 'If the QPP and OAS start at seventy',
      earlier: 'The earliest age that works comes {yearsWord} sooner.',
      same: 'The earliest age that works does not change.',
      later: 'The earliest age that works comes {yearsWord} later.',
      more: 'At the end of the plan, {gain} more is left, in today’s dollars.',
      less: 'At the end of the plan, {gain} less is left, in today’s dollars.',
    },
    retired: {
      spendMax: {
        title: 'How much the household can spend',
        none: 'Even spending nothing, the money would not last to the end of the plan.',
        room: 'The plan can fund up to {maxSpend} a year, in today’s dollars, which is {margin} more than the {asked} planned.',
        cut: 'For the money to last to the end, spending would have to be at most {maxSpend} a year, in today’s dollars, which is {cut} less than the {asked} planned.',
      },
      crash: {
        title: 'If the markets fall now',
        holds: 'Even after a market fall early in retirement, the money lasts to the end of the plan, with about {nestEnd} left against {nestEndBase} in the starting plan (today’s dollars).',
        breaks: 'After a market fall early in retirement, the money would run short from {year}.',
        alreadyShort: 'The money was already running short from {baseYear}; after a market fall, it would run short from {year}.',
      },
      levers: {
        spend10: 'If the household spends ten percent less',
        spend20: 'If the household spends twenty percent less',
        income: 'If a side income of ten thousand dollars a year is added for five years',
        pensions70: 'If the QPP and OAS start at seventy',
      },
      outcome: {
        holdsMore: 'The money lasts to the end of the plan and {gain} more is left, in today’s dollars.',
        holdsLess: 'The money lasts to the end of the plan, but {gain} less is left, in today’s dollars.',
        noChange: 'This changes nothing in the plan: the money lasts to the end.',
        breaks: 'The money would run short from {year}, whereas without this change it lasts to the end of the plan.',
        fixes: 'The money then lasts to the end of the plan, with about {nestEnd} left, in today’s dollars.',
        later: 'The money runs short later: from {year} instead of {baseYear}.',
        sameShort: 'The money still runs short from {year}.',
        earlier: 'The money would run short sooner: from {year} instead of {baseYear}, because these pensions arrive later.',
      },
    },
  },
}

/** The cards that have something true to say about this household, in a fixed order. `who` is the name of the person the death card is about (the first of a couple). */
export function whatIfCards(lang: Lang, facts: PlanFacts, wi: WhatIfFacts, who: string): WhatIfCard[] {
  return facts.retiree ? retiredCards(lang, facts, facts.retiree, wi, who) : workingCards(lang, facts, wi, who)
}

const dollars = (lang: Lang) => (x: number) => formatMoney(x, lang)

/** The death card, the same for both families: it reads the plan as entered, and says so when that plan already ran short. */
function deathCard(lang: Lang, facts: PlanFacts, wi: WhatIfFacts, who: string): WhatIfCard | null {
  const d = wi.death
  if (!d) return null
  const w = WHATIF_WORDS[lang].death
  const money = dollars(lang)
  const values = { who, age: String(d.age), nestEnd: money(d.nestEnd), nestEndBase: money(d.nestEndBase) }
  const template = !facts.ownPlanHolds ? w.alreadyShort : !d.ownPlanHolds ? w.short : d.nestEnd >= d.nestEndBase ? w.holdsMore : w.holdsLess
  return { id: 'death', title: fillTokens(w.title, { who }), text: fillTokens(template, values) }
}

/** A household still working: an answer that is an age. */
function workingCards(lang: Lang, facts: PlanFacts, wi: WhatIfFacts, who: string): WhatIfCard[] {
  const w = WHATIF_WORDS[lang]
  const money = dollars(lang)
  const cards: WhatIfCard[] = []

  // a crash: compared with the answer as it stands, so nothing to say when no age works as it stands
  const c = wi.crash
  if (c.base !== null) {
    const answer =
      c.earliest === null
        ? fillTokens(w.crash.none, { base: String(c.base) })
        : c.earliest > c.base
          ? fillTokens(w.crash.later, { base: String(c.base), age: String(c.earliest), yearsWord: yearsWord(c.earliest - c.base, lang) })
          : fillTokens(w.crash.same, { age: String(c.earliest) })
    const plan = c.ownPlanHolds ? fillTokens(w.crash.holds, { nestEnd: money(c.nestEnd) }) : w.crash.short
    cards.push({ id: 'crash', title: w.crash.title, text: `${answer} ${plan}` })
  }

  const death = deathCard(lang, facts, wi, who)
  if (death) cards.push(death)

  // the levers: only those that apply, and only when there is an answer to compare with
  for (const id of ['spend10', 'pensions70'] as const) {
    const l = facts.levers.find((x) => x.id === id)
    if (!l || l.yearsGained === null || l.endGain === null) continue
    const words = w[id]
    const years = l.yearsGained > 0 ? fillTokens(words.earlier, { yearsWord: yearsWord(l.yearsGained, lang) }) : l.yearsGained < 0 ? fillTokens(words.later, { yearsWord: yearsWord(-l.yearsGained, lang) }) : words.same
    const money2 = l.endGain === 0 ? '' : fillTokens(l.endGain > 0 ? words.more : words.less, { gain: money(Math.abs(l.endGain)) })
    cards.push({ id, title: words.title, text: money2 ? `${years} ${money2}` : years })
  }
  return cards
}

/** A household that has already stopped: the plan as it stands, not an age. */
function retiredCards(lang: Lang, facts: PlanFacts, r: NonNullable<PlanFacts['retiree']>, wi: WhatIfFacts, who: string): WhatIfCard[] {
  const w = WHATIF_WORDS[lang].retired
  const money = dollars(lang)
  const cards: WhatIfCard[] = []

  // how much can be spent and still last: the retiree's first question
  const s = w.spendMax
  if (r.maxSpend === null) cards.push({ id: 'spendMax', title: s.title, text: s.none })
  else {
    const diff = r.maxSpend - r.asked
    const values = { maxSpend: money(r.maxSpend), asked: money(r.asked), margin: money(Math.abs(diff)), cut: money(Math.abs(diff)) }
    cards.push({ id: 'spendMax', title: s.title, text: fillTokens(diff >= 0 ? s.room : s.cut, values) })
  }

  // a crash, read on the plan itself
  const c = wi.crash
  const cw = w.crash
  const crashText = facts.ownPlanHolds
    ? c.ownPlanHolds
      ? fillTokens(cw.holds, { nestEnd: money(c.nestEnd), nestEndBase: money(facts.nestEnd) })
      : fillTokens(cw.breaks, { year: String(c.firstShortfallYear) })
    : fillTokens(cw.alreadyShort, { baseYear: String(facts.firstShortfallYear), year: String(c.firstShortfallYear ?? facts.firstShortfallYear) })
  cards.push({ id: 'crash', title: cw.title, text: crashText })

  const death = deathCard(lang, facts, wi, who)
  if (death) cards.push(death)

  // the changes, best first as the engine ranked them
  for (const l of r.levers) cards.push({ id: l.id, title: w.levers[l.id], text: leverText(lang, facts, l) })
  return cards
}

function leverText(lang: Lang, facts: PlanFacts, l: RetireeLeverFact): string {
  const o = WHATIF_WORDS[lang].retired.outcome
  const money = dollars(lang)
  const gain = money(Math.abs(l.endGain))
  const baseYear = facts.firstShortfallYear
  if (facts.ownPlanHolds) {
    if (!l.lasts) return fillTokens(o.breaks, { year: String(l.firstShortfallYear) })
    if (l.endGain > 0) return fillTokens(o.holdsMore, { gain })
    if (l.endGain < 0) return fillTokens(o.holdsLess, { gain })
    return o.noChange
  }
  if (l.lasts) return fillTokens(o.fixes, { nestEnd: money(l.nestEnd) })
  const year = l.firstShortfallYear ?? baseYear ?? 0
  const base = baseYear ?? year
  if (year > base) return fillTokens(o.later, { year: String(year), baseYear: String(base) })
  if (year < base) return fillTokens(o.earlier, { year: String(year), baseYear: String(base) })
  return fillTokens(o.sameShort, { year: String(year) })
}
