// The words of « Partager ce scénario », in both languages: the button on the answer, the page a shared link opens, the link-preview
// tags the Worker writes for it and the text drawn on the card image. Pure data and no imports, because the Worker (worker/shareRoutes.ts)
// and the card script (scripts/gen-og.ts) read it too. The English is written again for an English reader, not carried over word by word.
// Every function takes already-checked values (lib/shareLink.ts validates the address), and French punctuation holds its non-breaking spaces
// (lib/frenchSpacing.test.ts); this copy vouvoie, like the rest of the app.

import type { ShareHome } from './shareLink.ts'

export interface ShareCopy {
  /** The chip on the answer card. */
  button: string
  /** The one-line notice after the link is copied, and when the browser refuses. */
  copied: string
  copyFailed: string
  /** The page: its title, the big sentence, who the scenario is for, the framing, what the link holds, the way in. */
  pageTitle: string
  headline: (age: number) => string
  home: Record<ShareHome, string>
  frame: string
  holds: string
  cta: string
  /** A link that carries no readable scenario. */
  brokenTitle: string
  brokenBody: string
  /** The link-preview tags and the card image. */
  ogTitle: (age: number) => string
  ogDescription: (home: ShareHome) => string
  ogAlt: (age: number, home: ShareHome) => string
  ogGenericTitle: string
  ogGenericDescription: string
  /** Drawn on the card, under the headline. */
  cardHome: Record<ShareHome, string>
  /** The headline in two sizes: the lead (« Retraite possible à »), then the age drawn large (« 62 ans »). Together they say what `ogTitle` says. */
  cardLead: string
  cardAge: (age: number) => string
  cardNote: string
  siteName: string
}

export const SHARE_COPY: { fr: ShareCopy; en: ShareCopy } = {
  fr: {
    button: 'Partager ce scénario',
    copied: 'Lien copié. Il ne contient que l’âge et le type de foyer.',
    copyFailed: 'Le lien n’a pas pu être copié depuis cette fenêtre.',
    pageTitle: 'Un scénario partagé',
    headline: (age) => `Retraite possible à ${age} ans`,
    home: { seul: 'Scénario pour une personne seule.', couple: 'Scénario pour un couple, au même âge de départ.' },
    frame: 'Ces chiffres viennent du lien, pas de vos données. Refaites le calcul avec vos vrais montants pour savoir ce qui vaut pour vous.',
    holds: 'Le lien ne contient que l’âge et le type de foyer. Aucun revenu, aucun compte, aucun nom.',
    cta: 'Faire mon calcul',
    brokenTitle: 'Ce lien est incomplet',
    brokenBody: 'Il ne contient pas de scénario lisible. Vous pouvez quand même faire votre propre calcul.',
    ogTitle: (age) => `Retraite possible à ${age} ans`,
    ogDescription: (home) => `${home === 'couple' ? 'Pour un couple' : 'Pour une personne seule'}, selon Horizon. Ces chiffres sont un exemple. Refaites le calcul avec vos montants, ils restent sur votre appareil.`,
    ogAlt: (age, home) => `Retraite possible à ${age} ans, ${home === 'couple' ? 'pour un couple' : 'pour une personne seule'}. Horizon.`,
    ogGenericTitle: 'Horizon',
    ogGenericDescription: 'Quand pouvez-vous prendre votre retraite ? Calculé sur les paramètres officiels du Québec et du Canada, avec des données qui restent sur votre appareil.',
    cardHome: { seul: 'Pour une personne seule', couple: 'Pour un couple' },
    cardLead: 'Retraite possible à',
    cardAge: (age) => `${age} ans`,
    cardNote: 'Estimation. Refaites le calcul avec vos montants.',
    siteName: 'Horizon',
  },
  en: {
    button: 'Share this scenario',
    copied: 'Link copied. It holds only the age and the household type.',
    copyFailed: 'This window would not let the link be copied.',
    pageTitle: 'A shared scenario',
    headline: (age) => `Retirement works at ${age}`,
    home: { seul: 'A scenario for one person.', couple: 'A scenario for a couple, both stopping at the same age.' },
    frame: 'These numbers come from the link, not from your data. Run the calculation with your own amounts to see what holds for you.',
    holds: 'The link holds only the age and the household type. No income, no account, no name.',
    cta: 'Run my own numbers',
    brokenTitle: 'This link is incomplete',
    brokenBody: 'There is no readable scenario in it. You can still run your own numbers.',
    ogTitle: (age) => `Retirement works at ${age}`,
    ogDescription: (home) => `${home === 'couple' ? 'For a couple' : 'For one person'}, according to Horizon. These figures are an example. Run it with your own amounts, which stay on your device.`,
    ogAlt: (age, home) => `Retirement works at ${age}, ${home === 'couple' ? 'for a couple' : 'for one person'}. Horizon.`,
    ogGenericTitle: 'Horizon',
    ogGenericDescription: 'When can you retire? Calculated on the official Québec and Canadian parameters, with data that stays on your device.',
    cardHome: { seul: 'For one person', couple: 'For a couple' },
    cardLead: 'Retirement works at',
    cardAge: (age) => `${age}`,
    cardNote: 'An estimate. Run it with your own amounts.',
    siteName: 'Horizon',
  },
}
