// THE FRONT DOOR'S READING CARD (components/ReadingHelp.tsx): offered once, to a first visit, before anything else. Whether it was put away is a
// preference of THIS device, like the theme and the text size it offers — not part of the profile, so it is not in the versioned store.

export const READING_HELP_KEY = 'horizon-reading-help'

/** True once the card was put away on this device. A blocked storage reads as « not yet »: the card shows, and puts itself away for the visit only. */
export function readingHelpDone(): boolean {
  try {
    return localStorage.getItem(READING_HELP_KEY) === 'done'
  } catch {
    return false
  }
}

export function markReadingHelpDone(): void {
  try {
    localStorage.setItem(READING_HELP_KEY, 'done')
  } catch {
    /* storage blocked — the card just comes back next visit */
  }
}
