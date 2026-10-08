import { createContext, useContext, type ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

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
  action,
}: {
  title: ReactNode
  subtitle?: ReactNode
  icon?: IconName
  action?: ReactNode
}) {
  const Heading = useContext(SectionLevel) === 3 ? 'h3' : 'h2'
  return (
    <div className="section-header">
      <div className="section-header__main">
        {icon && <Icon name={icon} size={18} />}
        <div className="section-header__text">
          <Heading className="section-header__title">{title}</Heading>
          {subtitle != null && <span className="section-header__sub">{subtitle}</span>}
        </div>
      </div>
      {action && <div className="section-header__action">{action}</div>}
    </div>
  )
}
