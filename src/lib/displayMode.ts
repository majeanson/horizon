import { useSyncExternalStore } from 'react'

// THE DISPLAY MODE — « Sérieux » or « Aventure »: the same data, drawn another way. One of the device's display settings, stored and applied exactly like
// the theme and the contrast (a data attribute on <html>, a key in localStorage, public/theme-bootstrap.js applying it before first paint), and ORTHOGONAL
// to them: it only changes how a page that asks for it is drawn. Today the character sheet (/fiche) is the only page that does; the others ignore it. Absence
// of the attribute means « serious ».
export type DisplayMode = 'serious' | 'adventure'
export const DISPLAY_MODES: readonly DisplayMode[] = ['serious', 'adventure']

export const MODE_KEY = 'horizon-mode'
const EVENT = 'horizon-mode-change'

export function getMode(): DisplayMode {
  return document.documentElement.getAttribute('data-mode') === 'adventure' ? 'adventure' : 'serious'
}

export function setMode(mode: DisplayMode): void {
  if (mode === 'adventure') document.documentElement.setAttribute('data-mode', 'adventure')
  else document.documentElement.removeAttribute('data-mode')
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    /* storage blocked — the choice just does not persist */
  }
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange)
  return () => window.removeEventListener(EVENT, onChange)
}

/** The mode in force, re-read whenever any control changes it (the sheet's own switch and the one on the settings page agree). */
export function useMode(): DisplayMode {
  return useSyncExternalStore(subscribe, getMode, () => 'serious')
}
