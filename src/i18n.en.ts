// English copy. Typed `typeof FR`: a key missing here, or of a different shape, is a compile
// error. It imports only the TYPE, so this module carries no runtime dependency on i18n.ts
// and loads lazily (the FR dictionary is the only one in the entry chunk).
import type { FR } from './i18n'

export const EN: typeof FR = {
  appName: 'Horizon',
  tagline: 'When can you retire?',

  common: {
    loading: 'Loading…',
    cancel: 'Cancel',
    save: 'Save',
    close: 'Close',
    delete: 'Delete',
    confirmTitle: 'Confirm',
    clear: 'Clear text',
    whereToFind: 'Where to find this number',
    openPage: 'Open the official page',
    projected: 'projected',
    theme: 'Day / Night',
    lang: 'FR',
  },

  subtabs: {
    prev: 'Scroll left',
    next: 'Scroll right',
  },

  nav: {
    label: 'Main navigation',
    profile: 'Profile',
    assumptions: 'Assumptions',
    results: 'Results',
    data: 'Data',
  },
}
