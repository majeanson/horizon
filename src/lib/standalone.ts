// IS THE APP RUNNING AS AN INSTALLED APP? — opened from the home screen or the desktop, in its own window with no browser bar, instead of in a tab.
// `display-mode` says so in every browser that installs (one query for the three modes that mean « installed »: standalone, fullscreen, minimal-ui);
// iOS Safari also says it through `navigator.standalone`. Asked for the three modes rather than against « browser »: a browser that does not know the
// media feature reads every one of them as false, and a tab is what it is. public/theme-bootstrap.js stamps the same answer on <html data-standalone>
// before first paint, so the CSS that dresses the app (styles/phone.css) never waits for a script and a tab never flashes the installed look.
const INSTALLED = '(display-mode: standalone), (display-mode: fullscreen), (display-mode: minimal-ui)'

export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.(INSTALLED).matches === true || (navigator as Navigator & { standalone?: boolean }).standalone === true
}
