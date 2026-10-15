import type { Lang } from '../i18n.ts'

// THE WORDS OF THE PORTFOLIO PREVIEW'S ONE LINE (components/PreviewBanner.tsx). Outside the eager dictionary: only a `?apercu` visit fetches them.

export interface PreviewCopy {
  /** What the visitor is looking at, and that nothing of theirs is involved. */
  line: string
  /** The way to the real app, in the whole window (out of the frame). */
  open: string
}

export const PREVIEW_COPY: Record<Lang, PreviewCopy> = {
  fr: {
    line: 'Aperçu : un ménage inventé. Rien n’est enregistré, et vos propres chiffres ne sont ni lus ni touchés.',
    open: 'Ouvrir Horizon',
  },
  en: {
    line: 'Preview: an invented household. Nothing is saved, and your own figures are neither read nor touched.',
    open: 'Open Horizon',
  },
}
