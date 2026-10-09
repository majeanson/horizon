import { LAST_KNOWN_YEAR } from '../engine/params/index.ts'
import { paramRows } from './paramsView.ts'

/** The tax year the figures stand on and the day the NEWEST of them was read on its official page (ISO), from the same rows « Paramètres utilisés » lists. */
export function paramsVintage(): { year: number; newestRead: string } {
  const rows = paramRows(LAST_KNOWN_YEAR, 'fr', () => '')
  return { year: LAST_KNOWN_YEAR, newestRead: rows.map((r) => r.retrieved).reduce((a, b) => (a > b ? a : b)) }
}
