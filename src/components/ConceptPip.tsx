import { CONCEPTS, FAMILY_FACE, FAMILY_HUE, type ConceptId, type Family } from '../lib/concepts'
import { PIP_ICONS } from '../lib/pipIcons'
import { PIP_ICONS_MORE } from '../lib/pipIconsMore'
import { Glyph } from './Icon'

// The pip: a small disc in the colour of the concept's FAMILY, with the concept's own glyph in it. Put it before the name
// of the thing it stands for — in a heading, a chip, a tab, a glossary term, a legend — and similar ideas (REER, CELI, FERR;
// RRQ, PSV, SRG) read as relatives at a glance. The glyph is the `-deep` tier of its hue on the `-wash`, the pairing core.css
// documents as ≥ 3:1 in every theme; the name beside it carries the meaning, so the pip is aria-hidden and never the only cue.
// The registry (lib/concepts.ts) is data; adding a concept is one line there plus, if it needs one, a glyph in pipIconsMore.ts.

const MARKUP: Record<string, string> = { ...PIP_ICONS, ...PIP_ICONS_MORE }

// `hue` is for the ONE place a pip is not its family's colour: a person of a household wears their own (the first marigold, the second sky: `.who--N`), so the
// household's picture reads like its columns. Everywhere else the family decides.
export function ConceptPip({ id, size = 'md', hue }: { id: ConceptId; size?: 'sm' | 'md' | 'lg'; hue?: 'marigold' | 'sky' }) {
  const { glyph, family } = CONCEPTS[id]
  return (
    <span className={`pip pip--${hue ?? FAMILY_HUE[family]} pip--${size}`} aria-hidden="true">
      {/* The glyph fills ~80 % of the disc whatever its size (pips.css scales the svg), so the picture — not the empty wash — is what the eye reads. */}
      <Glyph markup={MARKUP[glyph] ?? ''} size={20} />
    </span>
  )
}

/** The pip of a FAMILY (the Glossaire's legend, a group's header): the pip of the concept that stands for it (FAMILY_FACE). */
export function FamilyPip({ family, size = 'md' }: { family: Family; size?: 'sm' | 'md' | 'lg' }) {
  return <ConceptPip id={FAMILY_FACE[family]} size={size} />
}
