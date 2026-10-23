import type { Lang } from '../i18n'
import { formatMoney } from './money.ts'
import type { PlanFacts } from './planFacts.ts'
import { fillTokens } from './storyTokens.ts'

// THE PLAN OF THE HOUSEHOLD ON THIS DEVICE, IN ONE SENTENCE. An example has a story of its own (exampleStory.ts); the household that typed its numbers gets this generic line, in the second
// person, built the same way: a template with tokens, picked by the facts (has everybody already stopped working? does the money last?), the figures the engine's and in today's dollars. It
// is the sentence the « and if…? » cards (whatIfCopy.ts) hang from. For a household still working the page already states the answer, so this says only what the plan as entered does.

interface OwnWords {
  retired: { holds: string; short: string }
  working: { holds: string; short: string }
}

export const OWN_STORY: Record<Lang, OwnWords> = {
  fr: {
    retired: {
      holds: 'Vous avez déjà arrêté de travailler : l’argent dure jusqu’à la fin du plan, avec environ {nestEnd} à la fin, en dollars d’aujourd’hui.',
      short: 'Vous avez déjà arrêté de travailler, mais l’argent manque dès {year}, et il ne reste rien à la fin.',
    },
    working: {
      holds: 'En partant aux âges que vous avez prévus, l’argent dure jusqu’à la fin du plan, avec environ {nestEnd} à la fin, en dollars d’aujourd’hui.',
      short: 'En partant aux âges que vous avez prévus, l’argent manque dès {year}, et il ne reste rien à la fin.',
    },
  },
  en: {
    retired: {
      holds: 'You have already stopped working: the money lasts to the end of the plan, with about {nestEnd} left at the end, in today’s dollars.',
      short: 'You have already stopped working, but the money runs short from {year}, and nothing is left at the end.',
    },
    working: {
      holds: 'Leaving at the ages you planned, the money lasts to the end of the plan, with about {nestEnd} left at the end, in today’s dollars.',
      short: 'Leaving at the ages you planned, the money runs short from {year}, and nothing is left at the end.',
    },
  },
}

export function renderOwnStory(lang: Lang, facts: PlanFacts): string {
  const w = OWN_STORY[lang][facts.retiree ? 'retired' : 'working']
  return fillTokens(facts.ownPlanHolds ? w.holds : w.short, { nestEnd: formatMoney(facts.nestEnd, lang), year: String(facts.firstShortfallYear ?? '') })
}
