// Day/night toggle. theme-bootstrap.js sets the initial value before React mounts (so a
// reload never flashes the wrong surface); this flips and persists it.
export type Theme = 'day' | 'night'

export const THEME_KEY = 'horizon-theme'

export function getTheme(): Theme {
  return document.documentElement.getAttribute('data-theme') === 'night' ? 'night' : 'day'
}

// The browser's own chrome — the status bar on an installed PWA, the address-bar tint in a
// tab — reads <meta name="theme-color">. The theme is an IN-APP choice, so the manifest's
// static colour cannot follow it: instead the tag follows the PAINTED palette. We read
// `--paper` back off the document after the attribute lands, which keeps tracking any
// future tier without this function knowing about it.
function syncBrowserChrome(): void {
  try {
    const paper = getComputedStyle(document.documentElement).getPropertyValue('--paper').trim()
    if (!paper) return
    let tag = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])')
    if (!tag) {
      tag = document.createElement('meta')
      tag.name = 'theme-color'
      document.head.appendChild(tag)
    }
    tag.content = paper
  } catch {
    /* no document / a browser that does not expose it — purely cosmetic, never throw */
  }
}

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
  syncBrowserChrome()
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* storage blocked — the choice just does not persist */
  }
}

export function toggleTheme(): Theme {
  const next = getTheme() === 'day' ? 'night' : 'day'
  setTheme(next)
  return next
}
