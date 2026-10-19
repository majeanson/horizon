import type { Lang } from '../i18n.ts'

// THE WORDS OF « REPARTIR À NEUF » (pages/Donnees.tsx, lib/freshStart.ts). Outside the eager dictionaries: the settings page is a lazy chunk, and the
// eager French is at its cap. The confirm says WHAT IS LOST and that the saved copy is the only way back (lib/confirm.tsx); the hint says the one thing kept.

export interface FreshStartCopy {
  title: string
  hint: string
  button: string
  confirm: string
  confirmLabel: string
}

export const FRESH_START_COPY: Record<Lang, FreshStartCopy> = {
  fr: {
    title: 'Repartir à neuf',
    hint: 'Tout ce qu’Horizon garde sur cet appareil s’efface — le profil, les hypothèses, les réglages, vos réponses — sauf la langue, et l’accueil revient comme à une première visite.',
    button: 'Repartir à neuf',
    confirm: 'Repartir à neuf ? Le profil, les hypothèses et les réglages de cet appareil seront retirés, et l’accueil reviendra comme à une première visite. Sans copie sauvegardée, rien ne les ramène ensuite.',
    confirmLabel: 'Repartir à neuf',
  },
  en: {
    title: 'Start over',
    hint: 'Everything Horizon keeps on this device goes — the profile, the assumptions, the settings, your answers — except the language, and the home page comes back as on a first visit.',
    button: 'Start over',
    confirm: 'Start over? The profile, the assumptions and this device’s settings will be removed, and the home page will come back as on a first visit. Without a saved copy, nothing brings them back later.',
    confirmLabel: 'Start over',
  },
}
