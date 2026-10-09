import type { PersonId } from '../engine/types.ts'
import { DOC_IDS, docFigures, type DocId, type FactOwner } from './facts.ts'
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
}

export function documentItems(persons: readonly { id: PersonId; name: string }[], guide: GuideCopy, urlOf: (doc: DocId) => string | null): DocItem[] {
  const out: DocItem[] = []
  const couple = persons.length > 1
  for (const doc of DOC_IDS) {
    const { kinds, owner } = docFigures(doc)
    const base = { doc, name: guide.docs[doc].name, what: guide.docs[doc].what, how: guide.docs[doc].how, figures: kinds.map((k) => guide.kind[k]), url: urlOf(doc) }
    if (owner === 'household') out.push({ ...base, id: `${doc}:household`, owner: 'household', who: null })
    else for (const p of persons) out.push({ ...base, id: `${doc}:${p.id}`, owner: p.id, who: couple ? p.name : null })
  }
  return out
}

/** The list as plain text, for a file to keep beside the documents: a box to tick, the document, what it is for, where it is. */
export function documentsText(items: readonly DocItem[], ticked: ReadonlySet<string>, head: { title: string; intro: string; readOff: string; where: string; official: string }): string {
  const lines = [head.title, '', head.intro, '']
  for (const it of items) {
    lines.push(`[${ticked.has(it.id) ? 'x' : ' '}] ${it.name}${it.who ? ` — ${it.who}` : ''}`)
    lines.push(`    ${it.what}`)
    lines.push(`    ${head.readOff}: ${it.figures.join(', ')}`)
    lines.push(`    ${head.where}: ${it.how}`)
    if (it.url) lines.push(`    ${head.official}: ${it.url}`)
    lines.push('')
  }
  return lines.join('\n')
}
