import type { Lang } from '../i18n'

// What a static index.html cannot say twice: the page's description, its link-preview text, its locale and its install
// manifest. index.html ships BOTH languages (a FR sentence then an EN one) for the readers that never run a script — a
// link-preview crawler, a search snippet — and this module narrows it to the reader's own language as soon as the app
// knows it, and again when they switch. No fetch: the two manifests are static files precached by the service worker
// (vite.config.ts PUBLIC_SHELL), and swapping `<link rel="manifest">` only changes which of them the browser reads at
// install time.
//
// These strings are not UI copy (nothing renders them), so they live here and not in the dictionaries; `Record<Lang, …>`
// is the parity contract — a language added to `Lang` fails the build until it has its own.

export interface DocumentMeta {
  /** <meta name="description"> and the manifest-less fallback for search snippets. */
  description: string
  /** <meta property="og:description">: the link-preview sentence. */
  ogDescription: string
  /** <meta property="og:locale">. */
  ogLocale: string
  /** The install manifest for this language (public/). */
  manifest: string
}

export const DOCUMENT_META: Record<Lang, DocumentMeta> = {
  fr: {
    description: 'Horizon — à quel âge pouvez-vous prendre votre retraite ? Un planificateur pour le Québec, calculé sur les paramètres officiels, dont les données restent sur votre appareil.',
    ogDescription: 'Quand pouvez-vous prendre votre retraite ? Calculé sur les paramètres officiels du Québec et du Canada ; vos données ne quittent jamais votre appareil.',
    ogLocale: 'fr_CA',
    manifest: '/manifest.webmanifest',
  },
  en: {
    description: 'Horizon — at what age can you retire? A planner for Québec, calculated on the official parameters; your data stays on your device.',
    ogDescription: 'When can you retire? Calculated on the official Québec and Canadian parameters; your data never leaves your device.',
    ogLocale: 'en_CA',
    manifest: '/manifest.en.webmanifest',
  },
}

const setContent = (doc: Document, selector: string, value: string) => {
  const el = doc.head.querySelector<HTMLMetaElement>(selector)
  if (el && el.content !== value) el.content = value
}

/** Make the document say what the reader's language says. Idempotent, and a no-op for a tag that is not there. */
export function applyDocumentLang(lang: Lang, doc: Document = document): void {
  const m = DOCUMENT_META[lang]
  if (doc.documentElement.lang !== lang) doc.documentElement.lang = lang
  setContent(doc, 'meta[name="description"]', m.description)
  setContent(doc, 'meta[property="og:description"]', m.ogDescription)
  setContent(doc, 'meta[property="og:locale"]', m.ogLocale)
  const manifest = doc.head.querySelector<HTMLLinkElement>('link[rel="manifest"]')
  if (manifest && manifest.getAttribute('href') !== m.manifest) manifest.setAttribute('href', m.manifest)
}
