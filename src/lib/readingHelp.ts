import { isPreview } from './preview'

// THE FRONT DOOR'S READING CARD (components/ReadingHelp.tsx): offered once, to a first visit, before anything else. Whether it was put away is a
// preference of THIS device, like the theme and the text size it offers — not part of the profile, so it is not in the versioned store.

export const READING_HELP_KEY = 'horizon-reading-help'

/** True once the card was put away on this device. A blocked storage reads as « not yet »: the card shows, and puts itself away for the visit only.
 *  Also true inside a frame (the portfolio's live preview at marcportal.com, worker/securityHeaders.ts): a full-screen settings dialog is not the
 *  product, and the preview should show the front door — the example answer — as a first visit sees it once the offer is put away. */
export function readingHelpDone(): boolean {
  if (framed() || isPreview()) return true
  try {
    return localStorage.getItem(READING_HELP_KEY) === 'done'
  } catch {
    return false
  }
}

/** Comparing the two windows is allowed across origins; anything that throws is taken as framed. */
function framed(): boolean {
  try {
    return typeof window !== 'undefined' && window.self !== window.top
  } catch {
    return true
  }
}

export function markReadingHelpDone(): void {
  try {
    localStorage.setItem(READING_HELP_KEY, 'done')
  } catch {
    /* storage blocked — the card just comes back next visit */
  }
}
