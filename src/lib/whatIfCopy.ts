import type { Lang } from '../i18n'
import { formatMoney } from './money.ts'
import type { PlanFacts, WhatIfFacts } from './planFacts.ts'
import { fillTokens, yearsWord } from './storyTokens.ts'

// « AND IF…? » CARDS: four things a household may ask, each answered in plain words from the engine's own figures. Unlike an example's story (exampleStory.ts) these texts are
// GENERIC: they name no one and type no figure, so the same card reads right for any household — an example now, the one on this device later — and it is all computed on the device.
// The variant of each sentence is picked from the facts (planFacts.ts): the crash by whether the answer moved, the death by whether the money lasts and whether more or less is left,
// each lever by the years it moves the answer and by what it adds at the end.
//
// A card that has nothing true to say is not shown: no death card for one person, none for a lever that changes nothing for this household, none when no age works as things stand.
//
// Register: Québécois. No digit in a template: figures are tokens.

export type WhatIfId = 'crash' | 'death' | 'spend10' | 'pensions70'

export interface WhatIfCard {
  id: WhatIfId
  title: string
  /** One to three sentences. */
  text: string
}

interface Words {
  crash: { title: string; later: string; same: string; none: string; holds: string; short: string }
  death: { title: string; holdsMore: string; holdsLess: string; short: string; alreadyShort: string }
  spend10: { title: string; earlier: string; same: string; later: string; more: string; less: string }
  pensions70: { title: string; earlier: string; same: string; later: string; more: string; less: string }
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
  },
}

/** The cards that have something true to say about this household, in a fixed order. `who` is the name of the person the death card is about (the first of a couple). */
export function whatIfCards(lang: Lang, facts: PlanFacts, wi: WhatIfFacts, who: string): WhatIfCard[] {
  const w = WHATIF_WORDS[lang]
  const money = (x: number) => formatMoney(x, lang)
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

  // a death: a couple only
  const d = wi.death
  if (d) {
    const values = { who, age: String(d.age), nestEnd: money(d.nestEnd), nestEndBase: money(d.nestEndBase) }
    const template = !facts.ownPlanHolds ? w.death.alreadyShort : !d.ownPlanHolds ? w.death.short : d.nestEnd >= d.nestEndBase ? w.death.holdsMore : w.death.holdsLess
    cards.push({ id: 'death', title: fillTokens(w.death.title, { who }), text: fillTokens(template, values) })
  }

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
