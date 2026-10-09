import { useState } from 'react'
import { useLang } from '../../i18n'
import { LEVELS_COPY } from '../../lib/levelsCopy'
import { current, isOpen, levelFigure, LEVELS, setFigure } from '../../lib/levels'
import type { FactKind, FactOwner } from '../../lib/facts'
import { formatMoney } from '../../lib/money'
import { updateProfile, useProfile } from '../../lib/store'
import { today } from '../../lib/today'
import { Chip } from '../Chip'
import { Cluster } from '../Layout'

// « Je ne sais pas » under ONE figure: three chips with the amount each level says for a household like this one. A tap fills that figure
// only — it stays « estimated », and typing over it is always free. It shows while the figure is blank or still what a level put there,
// and never over a figure the person typed or confirmed. Closed by default, so nobody who knows their figure reads past it.
export default function LevelHelper({ kind, owner }: { kind: FactKind; owner: FactOwner }) {
  const { lang } = useLang()
  const c = LEVELS_COPY[lang]
  const profile = useProfile()
  const now = today()
  const [open, setOpen] = useState(false)
  if (!isOpen(profile, kind, owner, now.year)) return null
  const figures = LEVELS.map((l) => ({ level: l, value: levelFigure(profile, kind, owner, l, now.year) }))
  if (figures.some((f) => f.value === null)) return null
  const picked = figures.find((f) => f.value === current(profile, kind, owner))?.level ?? null
  return (
    <div className="level-helper">
      {picked !== null && !open && <p className="field-row__hint">{c.helper.estimated(c.levels[picked].name)}</p>}
      {!open && (
        <Chip expanded={false} onClick={() => setOpen(true)}>
          {picked === null ? c.helper.ask : c.helper.change}
        </Chip>
      )}
      {open && (
        <Cluster role="group" aria-label={`${c.helper.group} : ${c.kind[kind as keyof typeof c.kind]}`}>
          {figures.map((f) => (
            <Chip key={f.level} radio selected={picked === f.level} onClick={() => updateProfile((p) => setFigure(p, kind, owner, f.level, now))}>
              {c.levels[f.level].name} · {formatMoney(f.value, lang)}
            </Chip>
          ))}
        </Cluster>
      )}
    </div>
  )
}
