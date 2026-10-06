// Bilingual copy, FR-CA first. `typeof FR` is the compile-time parity contract: EN must
// have every key FR has, or tsc fails (src/i18n.en.ts). Register is Québécois, not France
// French (courriel, REER, CELI — and « retraite » is the one word nobody argues about).
//
// Amounts are formatted by lib/money.ts / lib/format.ts, never inline: this file holds
// WORDS. A copy function (`(n) => …`) is fine where a plural or a number rides in a sentence.
import { createContext, useContext, useEffect, useState } from 'react'

export type Lang = 'fr' | 'en'

export const FR = {
  appName: 'Horizon',
  tagline: 'Quand pouvez-vous prendre votre retraite ?',

  common: {
    loading: 'Chargement…',
    cancel: 'Annuler',
    save: 'Enregistrer',
    close: 'Fermer',
    delete: 'Supprimer',
    confirmTitle: 'Confirmer',
    clear: 'Effacer le texte',
    whereToFind: 'Où trouver ce chiffre',
    openPage: 'Ouvrir la page officielle',
    projected: 'projeté',
    theme: 'Jour / Nuit',
    lang: 'EN',
  },

  subtabs: {
    prev: 'Défiler vers la gauche',
    next: 'Défiler vers la droite',
  },

  nav: {
    label: 'Navigation principale',
    profile: 'Profil',
    assumptions: 'Hypothèses',
    results: 'Résultats',
    data: 'Données',
  },
}

export const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: 'fr',
  setLang: () => {},
})
export const useLang = () => useContext(LangContext)

// EN cache + a single in-flight promise so N concurrent useT() callers trigger exactly ONE
// dynamic import, not one per mount.
let cachedEN: typeof FR | null = null
let enPromise: Promise<typeof FR> | null = null
function loadEN(): Promise<typeof FR> {
  if (!enPromise) enPromise = import('./i18n.en').then((m) => (cachedEN = m.EN))
  return enPromise
}

export function useT(): typeof FR {
  const { lang } = useLang()
  // FR first (even if the saved lang is 'en' and EN has not resolved yet) — the first frame
  // is never blocked on a network/parse round trip.
  const [dict, setDict] = useState<typeof FR>(() => (lang === 'en' && cachedEN) || FR)
  useEffect(() => {
    if (lang !== 'en') {
      setDict(FR)
      return
    }
    if (cachedEN) {
      setDict(cachedEN)
      return
    }
    let alive = true
    loadEN().then((en) => {
      if (alive) setDict(en)
    })
    return () => {
      alive = false
    }
  }, [lang])
  return dict
}
