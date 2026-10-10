import type { Lang } from '../i18n.ts'
import { PRESET_KEYS } from '../engine/assumptionPresets.ts'
import { formatPct, formatYearAge } from './format.ts'
import { formatMoney } from './money.ts'
import { MAX_AGE } from './resultsModel.ts'
import type { SheetWords } from './sheetCopy.ts'
import { SCALE, type AchievementId, type HeroClass, type SheetModel, type SlotKind, type StatId } from './sheetModel.ts'

// THE SHEET AS TEXT, once. Both skins of the character sheet draw THIS: every figure of the sheet is formatted here, from the model, and the words
// of the skin (lib/sheetCopy.ts, lib/rpgCopy.ts) only say what the figure is. A skin that wanted to print a number another way has nowhere to do it —
// and a test holds the figures of the two skins' views to the same digits.

export interface StatView {
  id: StatId
  name: string
  hint: string
  /** The figure, said: « 56 ans », « 82 % », « 2 sur 3 », or why there is none. */
  valueText: string
  status: 'pending' | 'none' | 'ready'
  /** 0 to 1, or null when nothing is drawn. */
  fill: number | null
  /** The same, in whole percent: what the bar's width and its meter say. */
  percent: number | null
  /** The figure the bar is read as, for assistive technology. */
  valueNow: number | null
  scaleText: string
  detail: string
}

export interface HeroView {
  id: string
  name: string
  className: string
  heroClass: HeroClass
  line: string
}

export interface SlotView {
  key: string
  kind: SlotKind
  title: string
  owner: string
  amountText: string | null
  note: string
  confirmed: boolean | null
}

export interface QuestView {
  key: string
  text: string
  /** Where the quest leads: a route of the app. */
  to: string
}

export interface AchievementView {
  id: AchievementId
  name: string
  hint: string
  earned: boolean
  status: string
}

export interface SheetView {
  title: string
  intro: string
  party: string
  empty: string | null
  level: { label: string; text: string; hint: string; value: number | null }
  heroes: HeroView[]
  stats: StatView[]
  slots: { title: string; empty: string; items: SlotView[] }
  quests: { title: string; intro: string; none: string; items: QuestView[] }
  achievements: { title: string; items: AchievementView[] }
  accuracy: { text: string; confirmed: number; total: number }
  toProfile: string
  toResults: string
}

export function sheetView(model: SheetModel, lang: Lang, words: SheetWords, births: readonly number[], names: readonly string[]): SheetView {
  const pct = (fraction: number): string => formatPct(fraction, lang, 0)
  const years = (n: number): string => words.value.years(String(n))
  const money = (n: number): string => formatMoney(n, lang)
  const nameOf = (id: string): string => {
    const i = model.heroes.findIndex((h) => h.id === id)
    return (i >= 0 ? names[i] : '') || ''
  }

  const stats: StatView[] = model.stats.map((s) => {
    const w = words.stats[s.id]
    let valueText: string
    if (s.status === 'pending') valueText = words.value.pending
    else if (s.status === 'none') valueText = s.id === 'runway' && s.fill === 0 ? words.value.noAge(MAX_AGE) : words.value.none
    else if (s.unit === 'age') valueText = words.value.age(String(s.value))
    else if (s.unit === 'share') valueText = words.value.share(pct(s.value as number))
    else valueText = words.value.count(s.value as number, SCALE.resilience)

    const scaleText =
      s.id === 'runway' ? words.scale.runway(years(SCALE.runway)) : s.id === 'cover' ? words.scale.cover : s.id === 'saving' ? words.scale.saving(pct(SCALE.saving)) : s.id === 'keep' ? words.scale.keep : words.scale.resilience(SCALE.resilience)

    let detail = ''
    if (s.id === 'runway') {
      if (model.heroes.every((x) => x.heroClass === 'retired')) detail = words.detail.retired
      else if (s.status === 'none' && s.fill === 0) detail = words.detail.runwayNone
      else if (s.status === 'ready' && s.detail.margin !== null && s.detail.margin !== undefined) {
        detail = s.detail.margin >= 0 ? words.detail.runway(words.value.age(String(s.detail.planned)), years(s.detail.margin)) : words.detail.runwayLate(words.value.age(String(s.detail.planned)), words.value.age(String(s.value)))
      }
    } else if (s.id === 'cover') detail = s.detail.year === undefined ? '' : words.detail.cover(formatYearAge(s.detail.year, births, lang))
    else if (s.id === 'saving') detail = s.status === 'none' ? words.detail.noEarner : words.detail.saving
    else if (s.id === 'keep') detail = s.detail.year === undefined ? '' : words.detail.keep(formatYearAge(s.detail.year, births, lang))
    else if (s.status === 'ready') {
      const held = PRESET_KEYS.filter((k) => model.scenarios[k]).map((k) => words.scenarioNames[k])
      detail = held.length === 0 ? words.detail.resilienceNone : words.detail.resilience(held.join(', '))
    }
    return { id: s.id, name: w.name, hint: w.hint, valueText, status: s.status, fill: s.fill, percent: s.fill === null ? null : Math.round(Math.max(0, Math.min(1, s.fill)) * 100), valueNow: s.value, scaleText, detail }
  })

  const heroes: HeroView[] = model.heroes.map((x) => ({
    id: x.id,
    name: x.name.trim() || '',
    className: words.heroClass[x.heroClass],
    heroClass: x.heroClass,
    line: words.heroLine(words.value.age(String(x.age)), words.value.age(String(x.retirementAge))),
  }))

  const slotItems: SlotView[] = model.slots.map((s, i) => ({
    key: `${s.owner}-${s.kind}-${i}`,
    kind: s.kind,
    title: words.slots.kind[s.kind],
    owner: s.owner === 'household' ? words.slots.household : nameOf(s.owner),
    amountText: s.amount === null ? null : money(s.amount),
    note: s.label !== null ? s.label : s.confirmed === null ? '' : s.confirmed ? words.slots.confirmed : words.slots.estimated,
    confirmed: s.confirmed,
  }))

  const questItems: QuestView[] = model.quests.map((q, i) => {
    let text = ''
    let to = '/profil'
    if (q.id === 'complete') text = words.quests.complete
    else if (q.id === 'confirm') text = words.quests.confirm(q.remaining ?? 0)
    else if (q.id === 'room') {
      const who = model.couple ? ` (${nameOf(q.room!.owner)})` : ''
      text = words.quests.room(words.quests.account[q.room!.kind], money(q.room!.amount)) + who
    } else {
      text = words.quests.plan
      to = '/resultats?v=future'
    }
    return { key: `${q.id}-${i}`, text, to }
  })

  return {
    title: words.title,
    intro: words.intro,
    party: model.couple ? words.couple : words.solo,
    empty: model.gaps.length > 0 ? words.empty : null,
    level: { label: words.level.label, text: model.level === null ? words.level.none : words.level.value(String(model.level)), hint: words.level.hint, value: model.level },
    heroes,
    stats,
    slots: { title: words.slots.title, empty: words.slots.empty, items: slotItems },
    quests: { title: words.quests.title, intro: words.quests.intro, none: words.quests.none, items: questItems },
    achievements: {
      title: words.achievements.title,
      items: model.achievements.map((a) => ({ id: a.id, name: words.achievements.names[a.id], hint: words.achievements.hints[a.id], earned: a.earned, status: a.earned ? words.achievements.earned : words.achievements.locked })),
    },
    accuracy: { text: words.accuracy(model.accuracy.confirmed, model.accuracy.total), confirmed: model.accuracy.confirmed, total: model.accuracy.total },
    toProfile: words.toProfile,
    toResults: words.toResults,
  }
}
