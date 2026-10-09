import type { Lang } from '../i18n.ts'

export const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
export const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** « 2026-10-07 » as a reader of `lang` says it: « 7 octobre 2026 » · « October 7, 2026 ». */
export function longDate(iso: string, lang: Lang): string {
  const [y, m, d] = iso.split('-').map(Number)
  return lang === 'fr' ? `${d === 1 ? '1er' : d} ${MONTHS_FR[m - 1]} ${y}` : `${MONTHS_EN[m - 1]} ${d}, ${y}`
}
