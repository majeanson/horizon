import type { ExampleId } from '../engine/golden/examples.ts'
import type { Household } from '../engine/types.ts'
import type { Lang } from '../i18n'
import { formatMoney } from './money.ts'
import type { PlanFacts } from './planFacts.ts'
import { fillTokens } from './storyTokens.ts'

// WHAT EACH EXAMPLE HOUSEHOLD'S PLAN DOES, IN PLAIN WORDS, in both languages — outside the eager dictionaries, like exampleCopy.ts (only the pages that show an example read it).
//
// NO FIGURE IS TYPED HERE. A story is a few templates with tokens ({age}, {nestEnd}, {year}…); the figures come from the engine (planFacts.ts) when the text is shown, in one money basis
// (today's dollars), and WHICH sentence is shown is picked from the facts too: the answer sentence by the headline's kind (`now` or `at`), the plan sentence by whether the money lasts
// at the retirement ages the household entered. So a story cannot disagree with the page, and cannot go stale in a number. What is typed is what the example IS (its people, its
// pensions, its house): `features` says so, and exampleStory.test.ts holds it to the household's data.
//
// Register: Québécois (nid, REER, CELI, rente, RRQ, PSV, SRG).

export type StoryFeature = 'couple' | 'single' | 'db' | 'dbInPay' | 'home' | 'homeSale' | 'children' | 'childToCome' | 'flows' | 'partTime' | 'lateResidence'

export interface StoryText {
  /** The answer, by the headline's kind. A kind the household can never have may be left out; the test says which are needed. */
  answer: { now?: string; at?: string }
  /** The plan as the household entered it: the money lasts ({nestEnd}) or runs short ({year}). */
  plan: { holds?: string; short?: string }
  /** What makes the household its own: its people, pensions, house — facts of the example, no figures. */
  distinct: string
}

export interface ExampleStory {
  features: StoryFeature[]
  fr: StoryText
  en: StoryText
}

export const EXAMPLE_STORY: Record<ExampleId, ExampleStory> = {
  golden: {
    features: ['couple', 'db'],
    fr: {
      answer: { at: 'Camille et Alex peuvent arrêter ensemble dès {age} ans, et l’argent dure jusqu’à la fin du plan.' },
      plan: { holds: 'En partant aux âges qu’ils ont prévus, il leur reste environ {nestEnd} au bout du plan, en dollars d’aujourd’hui.' },
      distinct: 'Camille est dans la fonction publique et touchera une rente RREGOP ; Alex travaille au privé, sans régime d’employeur.',
    },
    en: {
      answer: { at: 'Camille and Alex can stop together from age {age}, and the money lasts to the end of the plan.' },
      plan: { holds: 'Leaving at the ages they planned, about {nestEnd} is left at the end of the plan, in today’s dollars.' },
      distinct: 'Camille works in the public service and will draw an RREGOP pension; Alex works in the private sector, with no employer plan.',
    },
  },
  average: {
    features: ['couple', 'home'],
    fr: {
      answer: { at: 'Marie et Luc peuvent arrêter ensemble dès {age} ans sans que l’argent manque.' },
      plan: { holds: 'En partant aux âges qu’ils ont prévus, il leur reste environ {nestEnd} à la fin du plan, en dollars d’aujourd’hui.' },
      distinct: 'Leur épargne est dans le REER et le CELI, sans régime d’employeur, et ils ont une maison dont l’hypothèque n’est pas encore payée.',
    },
    en: {
      answer: { at: 'Marie and Luc can stop together from age {age} without the money running short.' },
      plan: { holds: 'Leaving at the ages they planned, about {nestEnd} is left at the end of the plan, in today’s dollars.' },
      distinct: 'Their savings are in an RRSP and a TFSA, with no employer plan, and they own a home whose mortgage is not yet paid off.',
    },
  },
  modest: {
    features: ['single'],
    fr: {
      answer: { at: 'Hélène peut arrêter dès {age} ans, et l’argent dure jusqu’à la fin du plan.' },
      plan: { holds: 'En partant à l’âge qu’elle a prévu, il lui reste environ {nestEnd} à la fin, en dollars d’aujourd’hui.' },
      distinct: 'Son revenu est modeste et elle a peu d’économies : les prestations publiques (RRQ, PSV et SRG) portent une bonne partie de son plan.',
    },
    en: {
      answer: { at: 'Hélène can stop from age {age}, and the money lasts to the end of the plan.' },
      plan: { holds: 'Leaving at the age she planned, about {nestEnd} is left at the end, in today’s dollars.' },
      distinct: 'Her income is modest and she has little saved: the public benefits (QPP, OAS and GIS) carry a good part of her plan.',
    },
  },
  rich: {
    features: ['couple'],
    fr: {
      answer: { at: 'Sophie et Marc peuvent arrêter ensemble dès {age} ans, bien avant le début des rentes publiques.' },
      plan: { holds: 'En partant aux âges qu’ils ont prévus, il reste environ {nestEnd} à la fin du plan, en dollars d’aujourd’hui.' },
      distinct: 'Leurs revenus sont élevés et leurs comptes, REER, CELI et non enregistré, sont gros : ce sont les économies qui paient les premières années, pas les rentes.',
    },
    en: {
      answer: { at: 'Sophie and Marc can stop together from age {age}, well before the public pensions begin.' },
      plan: { holds: 'Leaving at the ages they planned, about {nestEnd} is left at the end of the plan, in today’s dollars.' },
      distinct: 'Their incomes are high and their accounts, RRSP, TFSA and non-registered, are large: savings pay for the first years, not the pensions.',
    },
  },
  behind: {
    features: ['single'],
    fr: {
      answer: { at: 'Pour Julien, l’âge le plus tôt où l’argent suffit est {age} ans.' },
      plan: { short: 'En partant à l’âge qu’il a prévu, l’argent manque dès {year}, et il ne reste rien à la fin.' },
      distinct: 'Il a commencé à épargner tard et n’a presque rien de côté.',
    },
    en: {
      answer: { at: 'For Julien, the earliest age at which the money is enough is {age}.' },
      plan: { short: 'Leaving at the age he planned, the money runs short from {year}, and nothing is left at the end.' },
      distinct: 'He started saving late and has almost nothing set aside.',
    },
  },
  retired: {
    features: ['couple', 'dbInPay'],
    fr: {
      answer: { now: 'Gilles et Francine ont déjà arrêté de travailler, et l’argent dure jusqu’à la fin du plan.' },
      plan: { holds: 'Il leur reste environ {nestEnd} à la fin, en dollars d’aujourd’hui.' },
      distinct: 'La rente d’employeur de Gilles est déjà versée, la RRQ et la PSV aussi : ils puisent dans leur nid pour compléter.',
    },
    en: {
      answer: { now: 'Gilles and Francine have already stopped working, and the money lasts to the end of the plan.' },
      plan: { holds: 'About {nestEnd} is left at the end, in today’s dollars.' },
      distinct: 'Gilles’s employer pension is already being paid, and so are the QPP and the OAS: they draw on their nest egg to fill the gap.',
    },
  },
  newcomer: {
    features: ['single', 'lateResidence'],
    fr: {
      answer: { at: 'Amira peut arrêter dès {age} ans, et l’argent dure jusqu’à la fin du plan.' },
      plan: { holds: 'En partant à l’âge qu’elle a prévu, il lui reste environ {nestEnd} à la fin, en dollars d’aujourd’hui.' },
      distinct: 'Arrivée au Canada à l’âge de trente ans, elle touchera une PSV partielle et une rente RRQ bâtie sur un historique qui commence tard.',
    },
    en: {
      answer: { at: 'Amira can stop from age {age}, and the money lasts to the end of the plan.' },
      plan: { holds: 'Leaving at the age she planned, about {nestEnd} is left at the end, in today’s dollars.' },
      distinct: 'She arrived in Canada at thirty, so she will draw a partial OAS and a QPP pension built on a history that starts late.',
    },
  },
  heir: {
    features: ['single'],
    fr: {
      answer: { now: 'Jules pourrait arrêter de travailler dès maintenant, et l’argent durerait jusqu’à la fin du plan.' },
      plan: { holds: 'Il resterait environ {nestEnd} à la fin, en dollars d’aujourd’hui.' },
      distinct: 'Il hérite d’une très grosse somme : le défi n’est pas de l’atteindre, mais de la faire durer des dizaines d’années.',
    },
    en: {
      answer: { now: 'Jules could stop working right now, and the money would last to the end of the plan.' },
      plan: { holds: 'About {nestEnd} would be left at the end, in today’s dollars.' },
      distinct: 'He inherits a very large sum: the challenge is not reaching it, but making it last for decades.',
    },
  },
  downsizer: {
    features: ['couple', 'home', 'homeSale'],
    fr: {
      answer: { at: 'Nadia et Paul peuvent arrêter ensemble dès {age} ans.' },
      plan: { holds: 'En partant aux âges qu’ils ont prévus, il leur reste environ {nestEnd} à la fin du plan, en dollars d’aujourd’hui.' },
      distinct: 'Ils vendent leur grande maison pour une plus petite : l’argent ainsi libéré est ce qui rend ce départ possible.',
    },
    en: {
      answer: { at: 'Nadia and Paul can stop together from age {age}.' },
      plan: { holds: 'Leaving at the ages they planned, about {nestEnd} is left at the end of the plan, in today’s dollars.' },
      distinct: 'They sell their big house for a smaller one: the money that frees up is what makes this early exit possible.',
    },
  },
  planner: {
    features: ['couple', 'home', 'childToCome', 'flows', 'partTime'],
    fr: {
      answer: { at: 'Élise et Thomas peuvent arrêter ensemble dès {age} ans.' },
      plan: { holds: 'En partant aux âges qu’ils ont prévus, il leur reste environ {nestEnd} à la fin du plan, en dollars d’aujourd’hui.' },
      distinct: 'Leur vie n’est pas encore dans le budget : un enfant à venir (coût, allocations et congé parental), du temps partiel pour Élise, un héritage et des soins plus tard. Chacun de ces événements déplace l’âge.',
    },
    en: {
      answer: { at: 'Élise and Thomas can stop together from age {age}.' },
      plan: { holds: 'Leaving at the ages they planned, about {nestEnd} is left at the end of the plan, in today’s dollars.' },
      distinct: 'Their life is not in the budget yet: a child to come (cost, benefits and parental leave), part-time work for Élise, an inheritance and care later on. Each of these events moves the age.',
    },
  },
  family: {
    features: ['couple', 'home', 'children', 'childToCome'],
    fr: {
      answer: { at: 'Olivier et Léa peuvent arrêter ensemble dès {age} ans.' },
      plan: { holds: 'En partant aux âges qu’ils ont prévus, il leur reste environ {nestEnd} à la fin du plan, en dollars d’aujourd’hui.' },
      distinct: 'Une seule grosse paie porte la famille : deux enfants, les allocations, un congé parental et une grosse hypothèque pèsent sur le plan.',
    },
    en: {
      answer: { at: 'Olivier and Léa can stop together from age {age}.' },
      plan: { holds: 'Leaving at the ages they planned, about {nestEnd} is left at the end of the plan, in today’s dollars.' },
      distinct: 'One big income carries the family: two children, the benefits, a parental leave and a big mortgage weigh on the plan.',
    },
  },
  melter: {
    features: ['single'],
    fr: {
      answer: { now: 'Denise peut arrêter de travailler dès maintenant, à {age} ans.' },
      plan: { holds: 'Il lui reste environ {nestEnd} à la fin du plan, en dollars d’aujourd’hui.' },
      distinct: 'Elle a un très gros REER et des dépenses modestes : en tirant du REER chaque année jusqu’en haut de la première tranche d’impôt, elle paie moins d’impôt sur toute la durée du plan.',
    },
    en: {
      answer: { now: 'Denise can stop working right now, at age {age}.' },
      plan: { holds: 'About {nestEnd} is left at the end of the plan, in today’s dollars.' },
      distinct: 'She has a very large RRSP and modest spending: by drawing on the RRSP each year up to the top of the first tax bracket, she pays less tax over the whole plan.',
    },
  },
  couple62: {
    features: ['couple', 'home'],
    fr: {
      answer: { at: 'Dave et Linda ont déjà arrêté de travailler, mais l’argent ne dure pas jusqu’au bout : il aurait fallu continuer jusqu’à {age} ans.' },
      plan: { short: 'En l’état, l’argent manque dès {year}, et il ne reste rien à la fin.' },
      distinct: 'Ils ont une maison payée et leurs économies sont dans le REER et le CELI.',
    },
    en: {
      answer: { at: 'Dave and Linda have already stopped working, but the money does not last to the end: they would have needed to keep working until age {age}.' },
      plan: { short: 'As things stand, the money runs short from {year}, and nothing is left at the end.' },
      distinct: 'They own a home outright and their savings are in an RRSP and a TFSA.',
    },
  },
  early: {
    features: ['couple', 'home'],
    fr: {
      answer: { at: 'Juliette et Mathieu peuvent arrêter ensemble dès {age} ans, très jeunes.' },
      plan: { holds: 'En partant aux âges qu’ils ont prévus, il reste environ {nestEnd} à la fin du plan, en dollars d’aujourd’hui.' },
      distinct: 'Ils gagnent bien leur vie et épargnent près de la moitié de leur revenu net chaque année : c’est l’effort d’épargne, plus que le revenu, qui rend ce départ possible.',
    },
    en: {
      answer: { at: 'Juliette and Mathieu can stop together from age {age}, very young.' },
      plan: { holds: 'Leaving at the ages they planned, about {nestEnd} is left at the end of the plan, in today’s dollars.' },
      distinct: 'They earn well and save close to half of their take-home pay every year: it is the saving effort, more than the income, that makes this early exit possible.',
    },
  },
}

/** What the household IS, read off its data: the test holds each story's declared `features` to this. */
export function deriveFeatures(h: Household, today: { year: number }): StoryFeature[] {
  const out: StoryFeature[] = [h.persons.length === 2 ? 'couple' : 'single']
  if (h.persons.some((p) => p.pensions.some((d) => !d.inPay))) out.push('db')
  if (h.persons.some((p) => p.pensions.some((d) => d.inPay))) out.push('dbInPay')
  if (h.home) out.push('home')
  if (h.home?.sale) out.push('homeSale')
  // children COUNT in the plan only when a cost is stated for them (the golden couple and a few others list children that change nothing)
  if (h.childSpending && (h.children ?? []).some((y) => y <= today.year)) out.push('children')
  if ((h.children ?? []).some((y) => y > today.year)) out.push('childToCome')
  if ((h.flows ?? []).length > 0) out.push('flows')
  if (h.persons.some((p) => p.partTime)) out.push('partTime')
  if (h.persons.some((p) => p.oas.residentSince - (p.birth.year + 18) >= 5)) out.push('lateResidence')
  return out
}

/** The sentences of a household's story, in order: the answer, what the answer's age can fund, the plan as entered, what makes the household its own. */
export function renderStory(id: ExampleId, lang: Lang, facts: PlanFacts): string[] {
  const s = EXAMPLE_STORY[id][lang]
  const money = (x: number) => formatMoney(x, lang)
  const plan = facts.ownPlanHolds ? s.plan.holds : s.plan.short
  if (plan === undefined) throw new Error(`${id} (${lang}): no plan sentence for « ${facts.ownPlanHolds ? 'holds' : 'short'} »`)
  const answer = facts.kind === 'now' ? s.answer.now : facts.kind === 'at' ? s.answer.at : undefined
  if (answer === undefined) throw new Error(`${id} (${lang}): no answer sentence for the headline kind « ${facts.kind} »`)
  const out = [fillTokens(answer, { age: String(facts.earliest ?? '') })]
  if (facts.comfort != null) out.push(fillTokens(COMFORT[lang], { comfort: money(Math.round(facts.comfort / 100) * 100) }))
  out.push(fillTokens(plan, { nestEnd: money(facts.nestEnd), year: String(facts.firstShortfallYear ?? '') }))
  out.push(s.distinct)
  return out
}

/** The sentence every story shares: what the answer's age can fund. */
export const COMFORT: Record<Lang, string> = {
  fr: 'À cet âge, le ménage peut dépenser jusqu’à {comfort} par année à la retraite, en dollars d’aujourd’hui.',
  en: 'At that age, the household can spend up to {comfort} a year in retirement, in today’s dollars.',
}
