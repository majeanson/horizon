// Runs before React mounts. Picks day/night from the saved choice, else the OS preference,
// and applies the accessibility profile (high contrast, larger text) — all before first
// paint so a reload never flashes the wrong surface. Kept in sync with src/lib/theme.ts
// and src/lib/accessibility.ts (the storage keys below are THEIR constants).
;(function () {
  var root = document.documentElement
  try {
    var saved = localStorage.getItem('horizon-theme')
    var theme =
      saved === 'day' || saved === 'night'
        ? saved
        : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
          ? 'night'
          : 'day'
    root.setAttribute('data-theme', theme)
  } catch (e) {
    root.setAttribute('data-theme', 'day')
  }
  try {
    if (localStorage.getItem('horizon-contrast') === 'high') root.setAttribute('data-contrast', 'high')
    // The display mode (« Sérieux » or « Aventure »): read only by the pages that ask for it (the character sheet). Absence means serious.
    if (localStorage.getItem('horizon-mode') === 'adventure') root.setAttribute('data-mode', 'adventure')
    // Matched against the known set rather than tested for one value: an unrecognised or
    // stale key must fall back to the base size, never paint at a size no CSS rule defines.
    var ts = localStorage.getItem('horizon-text-scale')
    if (ts === 'large' || ts === 'x-large') root.setAttribute('data-text-scale', ts)
    var lang = localStorage.getItem('horizon-lang')
    if (lang === 'en') root.setAttribute('lang', 'en')
  } catch (e) {
    /* no saved profile — the base presentation shows */
  }
})()
