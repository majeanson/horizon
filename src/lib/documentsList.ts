import type { PersonId } from '../engine/types.ts'
import { DOC_IDS, docFigures, type DocId, type FactOwner } from './facts.ts'

/** How much a document weighs on the answer: the measure in facts.ts (DOC_IDS). `situational`: only for those who have it, and then a great deal. */
export type DocWeight = 'high' | 'medium' | 'situational'
export const DOC_WEIGHT: Record<DocId, DocWeight> = { budget: 'high', tax: 'high', bank: 'medium', rrq: 'medium', home: 'situational', employer: 'situational', residence: 'situational' }
import type { GuideCopy } from './guideCopy.ts'

// « DOCUMENTS À RASSEMBLER » — everything a full profile is typed from, as a list to gather BEFORE typing: for each document, who it is for, what is read
// off it (the very figures Profil asks for), where it comes from, and the official page when there is one. Built from the same two sources as the
// profile's own guide (the facts and their documents, the guide's wording) so the list can never name a document the profile does not use, nor miss one.

export interface DocItem {
  /** « rrq:self » · « home:household »: what a tick is stored under. */
  id: string
  doc: DocId
  owner: FactOwner
  /** The person's name for a document each person has; null for the household's, and for a person alone. */
  who: string | null
  name: string
  what: string
  how: string
  /** The figures read off it, in the profile's own words. */
  figures: string[]
  /** The official page, or null: the document is the person's own. */
  url: string | null
  weight: DocWeight
}

export function documentItems(persons: readonly { id: PersonId; name: string }[], guide: GuideCopy, urlOf: (doc: DocId) => string | null, keep: (doc: DocId, owner: PersonId | undefined) => boolean = () => true): DocItem[] {
  const out: DocItem[] = []
  const couple = persons.length > 1
  const base = (doc: DocId) => ({ doc, name: guide.docs[doc].name, what: guide.docs[doc].what, how: guide.docs[doc].how, figures: docFigures(doc).kinds.map((k) => guide.kind[k]), url: urlOf(doc), weight: DOC_WEIGHT[doc] })
  // The household's own (the budget, the home), then each person's documents — the way Profil groups its inputs; within a group, most important first.
  for (const doc of DOC_IDS) if (docFigures(doc).owner === 'household' && keep(doc, undefined)) out.push({ ...base(doc), id: `${doc}:household`, owner: 'household', who: null })
  for (const p of persons) for (const doc of DOC_IDS) if (docFigures(doc).owner === 'person' && keep(doc, p.id)) out.push({ ...base(doc), id: `${doc}:${p.id}`, owner: p.id, who: couple ? p.name : null })
  return out
}

/** The list as plain text, for a file to keep beside the documents: a box to tick, the document, what it is for, where it is. */
export function documentsText(items: readonly DocItem[], ticked: ReadonlySet<string>, head: { title: string; intro: string; readOff: string; where: string; official: string; importance: string; weights: Record<DocWeight, string>; household: string; you: string }): string {
  const lines = [head.title, '', head.intro, '']
  let group: string | null = null
  for (const it of items) {
    // a heading each time the document's owner changes: the household's, then each person's
    if (it.owner !== group) {
      group = it.owner
      lines.push(`== ${it.owner === 'household' ? head.household : (it.who ?? head.you)} ==`, '')
    }
    lines.push(`[${ticked.has(it.id) ? 'x' : ' '}] ${it.name}${it.who ? ` — ${it.who}` : ''}`)
    lines.push(`    ${head.importance}: ${head.weights[it.weight]}`)
    lines.push(`    ${it.what}`)
    lines.push(`    ${head.readOff}: ${it.figures.join(', ')}`)
    lines.push(`    ${head.where}: ${it.how}`)
    if (it.url) lines.push(`    ${head.official}: ${it.url}`)
    lines.push('')
  }
  return lines.join('\n')
}
