import type { Lang } from '../i18n.ts'
import type { TextScale } from './accessibility.ts'

// THE WORDS OF THE FRONT DOOR'S READING CARD, offered before anything else: the language, the size of the letters, the contrast. Plain words on purpose — a person
// who has never changed a setting should know what each button does without a manual. Outside the eager dictionaries: only Accueil reads them.

export interface ReadingHelpCopy {
  title: string
  language: string
  languages: { fr: string; en: string }
  /** The text sizes in words, where the settings page says them in percent. */
  sizes: Record<TextScale, string>
  /** What else can be done, said once under the buttons. */
  zoomTip: string
  done: string
}

const FR: ReadingHelpCopy = {
  title: 'Lire plus confortablement ?',
  language: 'Langue',
  languages: { fr: 'Français', en: 'English' },
  sizes: { normal: 'Normal', large: 'Grand', 'x-large': 'Très grand' },
  zoomTip: 'Pour agrandir encore, le zoom de votre navigateur fonctionne aussi (Ctrl et +, ou deux doigts qui s’écartent sur un téléphone).',
  done: 'C’est bien comme ça',
}

const EN: ReadingHelpCopy = {
  title: 'Easier to read?',
  language: 'Language',
  languages: { fr: 'Français', en: 'English' },
  sizes: { normal: 'Normal', large: 'Large', 'x-large': 'Extra large' },
  zoomTip: 'To go bigger still, your browser’s zoom works too (Ctrl and +, or spread two fingers on a phone).',
  done: 'This is fine',
}

export const READING_HELP_COPY: Record<Lang, ReadingHelpCopy> = { fr: FR, en: EN }
