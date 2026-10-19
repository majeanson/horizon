import type { Lang } from '../i18n.ts'
import type { TextScale } from './accessibility.ts'

// THE WORDS OF « LIRE PLUS CONFORTABLEMENT ? », the reading part of the front door's one dialog (components/WelcomeDialog.tsx): the language, the size of
// the letters, the contrast. Plain words on purpose — a person who has never changed a setting should know what each button does without a manual.
// Outside the eager dictionaries: only the front door reads them. (The controls' own labels — the language, the theme, the contrast — are the settings
// page's, `data.display`: one set of words for the one component, components/DisplayControls.tsx.)

export interface ReadingHelpCopy {
  title: string
  /** The text sizes in words, where the settings page says them in percent. */
  sizes: Record<TextScale, string>
  /** What else can be done, said once under the buttons. */
  zoomTip: string
}

const FR: ReadingHelpCopy = {
  title: 'Lire plus confortablement ?',
  sizes: { normal: 'Normal', large: 'Grand', 'x-large': 'Très grand' },
  zoomTip: 'Pour agrandir encore, le zoom de votre navigateur fonctionne aussi (Ctrl et +, ou deux doigts qui s’écartent sur un téléphone).',
}

const EN: ReadingHelpCopy = {
  title: 'Easier to read?',
  sizes: { normal: 'Normal', large: 'Large', 'x-large': 'Extra large' },
  zoomTip: 'To go bigger still, your browser’s zoom works too (Ctrl and +, or spread two fingers on a phone).',
}

export const READING_HELP_COPY: Record<Lang, ReadingHelpCopy> = { fr: FR, en: EN }
