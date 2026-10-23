import type { Lang } from '../i18n'
import type { PersonId } from '../engine/types.ts'
import { fillTokens } from './storyTokens.ts'
import type { YearNote, YearNoteKind } from './yearNotes.ts'

// The words for the years that look different for a reason (lib/yearNotes.ts says which): one sentence each, naming the person it is about. No digit in a template, as everywhere a
// plain-language text lives outside the dictionaries. Register: Québécois.

interface Words {
  /** The disclosure under the table. */
  title: string
  kinds: Record<YearNoteKind, string>
}

export const YEAR_NOTES_COPY: Record<Lang, Words> = {
  fr: {
    title: 'Années particulières',
    kinds: {
      oasPartial: 'La PSV de {who} commence en cours d’année : cette année n’est pas payée en entier.',
      rrqPartial: 'La rente RRQ de {who} commence en cours d’année : cette année n’est pas payée en entier.',
      survivorStarts: 'La rente de conjoint survivant de {who} commence cette année, en janvier après le décès.',
      survivorAge65: 'La rente de survivant de {who} change de règle à soixante-cinq ans, en cours d’année : une partie de l’année est payée au taux d’avant, le reste au taux d’après.',
      deathBenefit: 'La prestation de décès du RRQ est versée à {who} une seule fois : elle fait paraître cette année plus haute que la suivante.',
    },
  },
  en: {
    title: 'Years that stand out',
    kinds: {
      oasPartial: '{who}’s OAS starts part-way through the year: this year is not paid in full.',
      rrqPartial: '{who}’s QPP pension starts part-way through the year: this year is not paid in full.',
      survivorStarts: '{who}’s surviving-spouse pension starts this year, in January after the death.',
      survivorAge65: '{who}’s survivor’s pension changes rule at sixty-five, part-way through the year: part of the year is paid at the rate before, the rest at the rate after.',
      deathBenefit: 'The QPP death benefit is paid to {who} once only: it makes this year look higher than the next.',
    },
  },
}

/** « la première personne » when nobody typed a name. */
const personLabel = (lang: Lang, id: PersonId, name: string): string => name.trim() || (lang === 'fr' ? (id === 'self' ? 'la première personne' : 'la deuxième personne') : id === 'self' ? 'the first person' : 'the second person')

export function yearNoteText(lang: Lang, note: YearNote, names: Readonly<Record<PersonId, string>>): string {
  return fillTokens(YEAR_NOTES_COPY[lang].kinds[note.kind], { who: personLabel(lang, note.who, names[note.who] ?? '') })
}
