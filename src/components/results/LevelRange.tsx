import { useMemo } from 'react'
import { useLang } from '../../i18n'
import { applyLevel, LEVELS, needsLevel } from '../../lib/levels'
import { LEVELS_COPY } from '../../lib/levelsCopy'
import { formatMoney } from '../../lib/money'
import { assumptionsOf } from '../../lib/resultsModel'
import type { Profile } from '../../lib/schema'
import { today } from '../../lib/today'
import { usePlansCompare } from '../../lib/usePlansCompare'
import { Chip } from '../Chip'
import { Skeleton } from '../Skeleton'

// « Selon le niveau de vie » — when some of the figures are blank or only estimated, the answer is a RANGE, and this says so: the same two
// searches the answer runs, once for each level (modest · average · comfortable) with that level standing in for every open figure and
// everything the person entered left exactly as it is. Shown only while a figure is open; the plan on screen is never changed by it.
export function LevelRange({ profile, enabled }: { profile: Profile; enabled: boolean }) {
  const { lang } = useLang()
  const c = LEVELS_COPY[lang]
  const { year, month } = today()
  const open = needsLevel(profile, year)
  const questions = useMemo(
    () =>
      !open
        ? []
        : LEVELS.map((level) => {
            const p = applyLevel(profile, level, { year }).profile
            return { name: c.levels[level].name, household: p.household, assumptions: assumptionsOf(p, { year, month }) }
          }),
    [open, profile, c.levels, year, month],
  )
  const answers = usePlansCompare(questions, enabled && open)
  if (!open) return null
  const said = (a: { earliest: number | null; nowOk: boolean }) => (a.earliest === null ? c.range.none : a.nowOk ? c.range.now : c.range.earliest(a.earliest))
  const first = answers?.[0]?.earliest
  const last = answers?.[answers.length - 1]?.earliest
  return (
    <div className="verdict__range level-range" aria-busy={answers === undefined}>
      <p className="verdict__range-title">{c.range.title}</p>
      <p className="verdict__note">{c.range.lead}</p>
      {answers === undefined ? (
        <Skeleton count={3} className="skeleton--chip-rows" />
      ) : (
        <ul className="levers__list">
          {answers.map((a) => (
            <li key={a.name} className="levers__item">
              <span>
                <strong>{a.name}</strong>
              </span>
              <span className="mono levers__result">
                {said(a)}
                {a.comfort != null && <span className="levers__end">{c.range.monthly(formatMoney(Math.round(a.comfort / 12 / 10) * 10, lang))}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {typeof first === 'number' && typeof last === 'number' && last !== first && <p className="verdict__note">{c.range.yearsOf(Math.min(first, last), Math.max(first, last))}</p>}
      <p className="verdict__note">{c.range.note}</p>
      <Chip to="/documents" icon="identification-card-bold">
        {c.range.fix}
      </Chip>
    </div>
  )
}
