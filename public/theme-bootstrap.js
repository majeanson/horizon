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
    // Matched against the known set rather than tested for one value: an unrecognised or
    // stale key must fall back to the base size, never paint at a size no CSS rule defines.
    var ts = localStorage.getItem('horizon-text-scale')
    if (ts === 'large' || ts === 'x-large') root.setAttribute('data-text-scale', ts)
  } catch (e) {
    /* no saved profile — the base presentation shows */
  }
  // The language (src/lib/firstLanguage.ts, the same rule — firstLanguage.test.ts runs this script against its cases): the saved choice, else the
  // browser's first French or English tag, else French.
  var saved = null
  try {
    saved = localStorage.getItem('horizon-lang')
  } catch (e) {
    /* storage blocked: the browser decides */
  }
  var lang = saved === 'fr' || saved === 'en' ? saved : null
  var tags = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']
  for (var t = 0; t < tags.length && lang === null; t++) {
    var base = String(tags[t]).toLowerCase().split('-')[0]
    if (base === 'fr' || base === 'en') lang = base
  }
  root.setAttribute('lang', lang || 'fr')
  // Installed (home screen, own window) or in a tab? The same three display modes lib/standalone.ts reads, plus iOS's navigator.standalone: stamped before
  // first paint so styles/phone.css can dress the app without waiting for a script.
  try {
    var installed = navigator.standalone === true
    var modes = ['standalone', 'fullscreen', 'minimal-ui']
    for (var i = 0; i < modes.length && !installed; i++) installed = !!(window.matchMedia && window.matchMedia('(display-mode: ' + modes[i] + ')').matches)
    if (installed) root.setAttribute('data-standalone', '')
  } catch (e) {
    /* no matchMedia: a tab, as far as we can tell */
  }
  // The browser's « you could install me » event fires once, and may fire before the app has started: catch it here and park it where lib/install.ts reads it.
  // preventDefault turns the browser's own mini-infobar off — the app makes one quiet offer of its own (components/install/InstallHint.tsx).
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault()
    window.horizonInstall = e
    window.dispatchEvent(new Event('horizon:install-ready'))
  })
})()
