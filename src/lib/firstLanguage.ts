import type { Lang } from '../i18n'

// THE LANGUAGE A VISIT OPENS IN. A choice the reader made on this device always wins. With none, the browser's own list of languages decides, in
// ITS order of preference: the first French or English tag found (« fr-CA », « en-US », a bare « en »…). A browser that asks for neither opens in
// French — Horizon is a Québec app, French first.
//
// public/theme-bootstrap.js applies the same rule before the first paint (`<html lang>`), in plain script: it cannot import this file, so
// firstLanguage.test.ts runs the bootstrap against the same cases.

export function firstLanguage(saved: string | null, browser: readonly string[]): Lang {
  if (saved === 'fr' || saved === 'en') return saved
  for (const tag of browser) {
    const base = tag.toLowerCase().split('-')[0]
    if (base === 'fr' || base === 'en') return base
  }
  return 'fr'
}
