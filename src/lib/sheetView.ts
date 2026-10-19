import type { Lang } from '../i18n.ts'
import { PRESET_KEYS } from '../engine/assumptionPresets.ts'
import type { FactKind } from './facts.ts'
import { formatPct, formatYearAge } from './format.ts'
import { FACT_CONCEPT, type ConceptId } from './concepts.ts'
import { GUIDE_COPY } from './guideCopy.ts'
import { formatMoney } from './money.ts'
import { MAX_AGE } from './resultsModel.ts'
import type { SheetWords } from './sheetCopy.ts'
import { SCALE, SLOT_GROUP, type SharpenStatus, type SheetModel, type SlotGroup, type SlotKind, type StatId } from './sheetModel.ts'

// THE SHEET AS TEXT, once. The sheet draws THIS: every figure of it is formatted here, from the model, and the words (lib/sheetCopy.ts) only say what
// the figure is. The drawing has nowhere to format a number of its own (lib/sheetSkins.test.ts).

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

export interface SlotView {
  key: string
  kind: SlotKind
  title: string
  owner: string
  amountText: string | null
  /** « 42 % du total » — null for anything outside the total (a pension, the home) and when the total is nothing. */
  shareText: string | null
  /** A pension's start, said (« Débute à 60 ans »); empty for anything else. */
  extra: string
  note: string
  /** What the link on the card says it does, for assistive technology. */
  editLabel: string
  /** The profile field that changes it. */
  to: string
  confirmed: boolean | null
}

export interface HoldingGroupView {
  id: SlotGroup
  title: string
  /** The total, said — only for the investable group. */
  totalText: string | null
  /** What to know about the group (the home is shown apart from the total). */
  note: string
  items: SlotView[]
}

export interface RoomView {
  key: string
  text: string
  to: string
}

export interface MoverView {
  /** The pip of the kind of figure it is (lib/concepts.ts). */
  concept: ConceptId
  key: string
  name: string
  swingText: string
  to: string
}

export interface SheetView {
  title: string
  empty: string | null
  /** The headline: the earliest age and how sturdy the plan is, with what the whole sheet stands on. */
  verdict: { title: string; stats: StatView[]; accuracy: string; toResults: string }
  groups: { id: 'today' | 'retirement'; title: string; hint: string; stats: StatView[] }[]
  howToRead: string
  holdings: { title: string; empty: string; groups: HoldingGroupView[]; roomTitle: string; rooms: RoomView[]; tags: string[] }
  /** Null while the profile has gaps (the sheet asks to start instead). */
  sharpen: { title: string; intro: string; status: SharpenStatus; note: string; items: MoverView[]; absentTitle: string; absent: string[] } | null
  accuracy: { text: string; confirmed: number; total: number }
  toProfile: string
  toResults: string
}

const profilFact = (id: string): string => `/profil?fact=${encodeURIComponent(id)}`

export function sheetView(model: SheetModel, lang: Lang, words: SheetWords, births: readonly number[], names: readonly string[]): SheetView {
  const pct = (fraction: number): string => formatPct(fraction, lang, 0)
  const years = (n: number): string => words.value.years(String(n))
  const money = (n: number): string => formatMoney(n, lang)
  const nameOf = (id: string): string => {
    const i = model.people.findIndex((h) => h.id === id)
    return (i >= 0 ? names[i] : '') || ''
  }

  const statView = (id: StatId): StatView => {
    const s = model.stats.find((x) => x.id === id)!
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
      if (model.people.every((x) => x.retired)) detail = words.detail.retired
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
  }

  const slotItems = model.slots.map((s, i): { group: SlotGroup; view: SlotView } => {
    const title = words.slots.kind[s.kind]
    const owner = s.owner === 'household' ? words.slots.household : nameOf(s.owner)
    return {
      group: SLOT_GROUP[s.kind],
      view: {
        key: `${s.owner}-${s.kind}-${i}`,
        kind: s.kind,
        title,
        owner,
        amountText: s.amount === null ? null : money(s.amount),
        shareText: s.amount === null || SLOT_GROUP[s.kind] !== 'investable' || model.investable <= 0 ? null : words.slots.share(pct(s.amount / model.investable)),
        extra: s.startAge === null ? '' : words.slots.pensionStart(words.value.age(String(s.startAge))),
        note: s.label !== null ? s.label : s.confirmed === null ? '' : s.confirmed ? words.slots.confirmed : words.slots.estimated,
        editLabel: `${title}${owner ? `, ${owner}` : ''} — ${words.slots.edit}`,
        to: s.fact === null ? '/profil' : profilFact(s.fact),
        confirmed: s.confirmed,
      },
    }
  })
  const holdingGroups: HoldingGroupView[] = (['investable', 'pension', 'home'] as const)
    .map((id) => ({
      id,
      title: words.slots.groups[id],
      totalText: id === 'investable' && model.investable > 0 ? words.slots.investableTotal(money(model.investable)) : null,
      note: id === 'home' ? words.slots.homeNote : '',
      items: slotItems.filter((s) => s.group === id).map((s) => s.view),
    }))
    .filter((g) => g.items.length > 0)

  const rooms: RoomView[] = model.rooms.map((r, i) => ({
    key: `${r.owner}-${r.kind}-${i}`,
    text: words.slots.room(words.slots.account[r.kind], money(r.amount)) + (model.couple ? ` (${nameOf(r.owner)})` : ''),
    to: profilFact(`${r.owner}:${r.kind === 'rrsp' ? 'rrspRoom' : 'tfsaRoom'}`),
  }))
  const tags = [...(model.diversified ? [words.slots.tags.diversified] : []), ...(model.mortgageFree ? [words.slots.tags.mortgageFree] : [])]

  const guide = GUIDE_COPY[lang]
  const factName = (owner: string, kind: FactKind): string => `${guide.kind[kind]} — ${owner === 'household' ? guide.guide.householdOwner : guide.guide.owner(nameOf(owner))}`
  const items: MoverView[] = model.sharpen.movers.map((m) => ({ key: m.fact.id, concept: FACT_CONCEPT[m.fact.kind], name: factName(m.fact.owner, m.fact.kind), swingText: words.sharpen.swing(m.years), to: profilFact(m.fact.id) }))
  const remainingText = model.sharpen.remaining > 0 ? words.sharpen.remaining(model.sharpen.remaining) : words.sharpen.allDone
  const sharpenNote =
    model.sharpen.status === 'pending' ? words.sharpen.pending : model.sharpen.status === 'none' ? remainingText : items.length === 0 ? words.sharpen.noMover : remainingText

  const accuracyText = words.accuracy(model.accuracy.confirmed, model.accuracy.total)
  return {
    title: words.title,
    empty: model.gaps.length > 0 ? words.empty : null,
    verdict: { title: words.verdict.title, stats: [statView('runway'), statView('resilience')], accuracy: accuracyText, toResults: words.toResults },
    groups: [
      { id: 'today', title: words.groups.today.title, hint: words.groups.today.hint, stats: [statView('saving')] },
      { id: 'retirement', title: words.groups.retirement.title, hint: words.groups.retirement.hint, stats: [statView('cover'), statView('keep')] },
    ],
    howToRead: words.howToRead,
    holdings: { title: words.slots.title, empty: words.slots.empty, groups: holdingGroups, roomTitle: words.slots.roomTitle, rooms, tags },
    sharpen: model.gaps.length > 0 ? null : { title: words.sharpen.title, intro: words.sharpen.intro, status: model.sharpen.status, note: sharpenNote, items, absentTitle: words.sharpen.absentTitle, absent: model.sharpen.absent.map((k) => words.sharpen.absent[k]) },
    accuracy: { text: accuracyText, confirmed: model.accuracy.confirmed, total: model.accuracy.total },
    toProfile: words.toProfile,
    toResults: words.toResults,
  }
}
