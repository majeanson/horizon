// THE PORTFOLIO PREVIEW. `?apercu` on any address (marcportal.com frames `/resultats?apercu`) opens Horizon on an INVENTED household, held in
// memory only: the store never writes it (lib/store.ts), so a visitor's own profile on this device — if they have one — is neither shown nor
// touched, and closing the tab leaves nothing behind. components/PreviewGate.tsx (one lazy chunk, fetched only by a preview) puts the household in
// the store before the page first renders, and says in one line that it is an example.
//
// Read ONCE, when the app starts: moving between pages inside the preview drops the query string, and the visit must stay a preview.

const detected = (() => {
  try {
    return new URLSearchParams(window.location.search).has('apercu')
  } catch {
    return false
  }
})()

export const isPreview = (): boolean => detected
