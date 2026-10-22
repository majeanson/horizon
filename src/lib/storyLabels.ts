import type { Lang } from '../i18n'

// The few words around a plain-language text (the disclosure's summary, the heading of the « and if…? » cards). Their own small module, outside the eager dictionaries
// like the other copy that only some pages read, and apart from exampleStory.ts and whatIfCopy.ts so that the disclosure's closed state loads none of them.

export interface StoryLabels {
  /** The disclosure's summary line. */
  fold: string
  /** The heading above the « and if…? » cards. */
  whatIf: string
}

export const STORY_LABELS: Record<Lang, StoryLabels> = {
  fr: { fold: 'Ce que fait ce plan, en mots', whatIf: 'Et si… ?' },
  en: { fold: 'What this plan does, in words', whatIf: 'What if…?' },
}
