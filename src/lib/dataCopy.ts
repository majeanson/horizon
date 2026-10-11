import type { Lang } from '../i18n.ts'

// THE WORDS OF THE SETTINGS PAGE'S VIEWS. Outside the eager dictionaries on purpose (the first screen never needs them). The page holds two families of things that were each
// several sections: the COPIES of the profile (make one, bring one back, rescue one the device could not read) and the OTHER PLANS to look at (the plans kept under a name,
// the example households). Each family is one section with a switch.

export interface DataCopy {
  copies: { label: string; save: string; restore: string; rescue: string }
  others: { label: string; plans: string; examples: string }
}

export const DATA_COPY: Record<Lang, DataCopy> = {
  fr: {
    copies: { label: 'Les copies de votre profil', save: 'Sauvegarder', restore: 'Restaurer', rescue: 'Copie illisible' },
    others: { label: 'D’autres plans à regarder', plans: 'Mes plans', examples: 'Exemples' },
  },
  en: {
    copies: { label: 'Copies of your profile', save: 'Save', restore: 'Restore', rescue: 'Unreadable copy' },
    others: { label: 'Other plans to look at', plans: 'My plans', examples: 'Examples' },
  },
}
