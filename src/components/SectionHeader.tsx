import { createContext, useContext, type ReactNode } from 'react'
import { glossed } from './Gloss'
import { ConceptPip } from './ConceptPip'
import { Icon, type IconName } from './Icon'
import type { ConceptId } from '../lib/concepts'

// A small section header: an optional icon, a title, an optional subtitle, and an optional
// trailing action. One anatomy for every section of the profile and the results.
// Presentational — pass an already-translated title. The title is a real heading (h2, or h3 inside a
// `SectionLevel` of 3 — a person's block on the profile), so heading navigation and the accessibility
// tree show the page's outline instead of a flat run of regions.
export const SectionLevel = createContext<2 | 3>(2)

export function SectionHeader({
  title,
  subtitle,
  icon,
  concept,
  action,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: IconName
  /** The idea this section is about: its pip (glyph + family colour, lib/concepts.ts) replaces a plain `icon`. */
  concept?: ConceptId
  action?: ReactNode
}) {
  const Heading = useContext(SectionLevel) === 3 ? 'h3' : 'h2'
  return (
    <div className="section-header">
      <div className="section-header__main">
        {concept ? <ConceptPip id={concept} /> : icon && <Icon name={icon} size={18} />}
        <div className="section-header__text">
          <Heading className="section-header__title">{title}</Heading>
          {subtitle != null && <span className="section-header__sub">{glossed(subtitle)}</span>}
        </div>
      </div>
      {action && <div className="section-header__action">{action}</div>}
    </div>
  )
}
