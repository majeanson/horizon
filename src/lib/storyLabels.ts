import type { Lang } from '../i18n'

// The few words around a plain-language text (the disclosure's summary, the heading of the « and if…? » cards). Their own small module, outside the eager dictionaries
// like the other copy that only some pages read, and apart from exampleStory.ts and whatIfCopy.ts so that the disclosure's closed state loads none of them.

export interface StoryLabels {
  /** The disclosure's summary line on an EXAMPLE household. */
  fold: string
  /** …on the household's own plan, while it is still working. */
  foldOwn: string
  /** …on the plan of a household that has already stopped working: what it asks is how to make the money last, so that is what the summary says. */
  foldRetired: string
  /** The heading above the « and if…? » cards. */
  whatIf: string
}

export const STORY_LABELS: Record<Lang, StoryLabels> = {
  fr: { fold: 'Ce que fait ce plan, en mots', foldOwn: 'Votre plan en mots, et si… ?', foldRetired: 'Comment faire durer l’argent plus longtemps', whatIf: 'Et si… ?' },
  en: { fold: 'What this plan does, in words', foldOwn: 'Your plan in words, and what if…?', foldRetired: 'How to make the money last longer', whatIf: 'What if…?' },
}
