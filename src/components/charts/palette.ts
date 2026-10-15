import type { SeriesColour } from './types'

// The CSS colour of each series token, shared by the line and the bar chart. Always a variable, never a hex literal (night mode must follow).
// A family's hue comes in three tiers so that siblings in ONE chart (the REER, the CELI and the locked-in part; the QPP and the OAS) stay tellable
// apart while still reading as relatives: deep (the `-deep` ink), mid (the base ink) and soft (the deep ink thinned toward the card).
const soft = (hue: string) => `color-mix(in srgb, var(--${hue}-deep) 45%, var(--card))`

export const SERIES_CSS: Record<SeriesColour, string> = {
  accent: 'var(--marigold-deep)',
  sky: 'var(--sky-deep)',
  sage: 'var(--sage-deep)',
  berry: 'var(--berry-deep)',
  ink: 'var(--ink-faint)',
  clay: 'var(--terracotta-deep)',
  sun: 'var(--marigold)',
  coral: 'var(--terracotta)',
  'sky-mid': 'var(--sky)',
  'sage-mid': 'var(--sage)',
  'berry-mid': 'var(--berry)',
  'accent-soft': soft('marigold'),
  'sky-soft': soft('sky'),
  'sage-soft': soft('sage'),
  'berry-soft': soft('berry'),
  'clay-soft': soft('terracotta'),
}
