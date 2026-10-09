import { useState } from 'react'
import { TYPICAL_BY_AGE, TYPICAL_BY_WEALTH, TYPICAL_SPENDING_BY_AGE, TYPICAL_SPENDING_BY_HOUSEHOLD, TYPICAL_SPENDING_BY_INCOME } from '../../engine/params/typical'
import { useLang } from '../../i18n'
import { pageFor } from '../../engine/params/twins'
import { applyLevel, levelFigure, levelOf, LEVELS, LEVEL_KINDS, needsLevel, type Level } from '../../lib/levels'
import { LEVELS_COPY } from '../../lib/levelsCopy'
import { formatMoney } from '../../lib/money'
import type { Profile } from '../../lib/schema'
import { replaceProfile, updateProfile, useProfile } from '../../lib/store'
import { today } from '../../lib/today'
import { Chip } from '../Chip'
import { Cluster } from '../Layout'
import { StatusMessage } from '../StatusMessage'
import { Section } from './shared'

// « Je ne connais pas mes chiffres » — three chips, one per standard of living, that fill EVERY blank figure at once (balances, the home,
// the budget) from what Statistics Canada says households of the same age hold and spend. Everything stays « estimated »; a figure the
// person typed is never replaced; one tap takes it all back; and the arithmetic behind each figure is one expander away, with the
// official tables it stands on. Shown only while there is a figure left for a level to fill.
const SOURCES = [TYPICAL_BY_AGE, TYPICAL_BY_WEALTH, TYPICAL_SPENDING_BY_HOUSEHOLD, TYPICAL_SPENDING_BY_INCOME, TYPICAL_SPENDING_BY_AGE].map((x) => x.source)

export default function LevelPicker() {
  const { lang } = useLang()
  const c = LEVELS_COPY[lang]
  const profile = useProfile()
  const now = today()
  const [done, setDone] = useState<{ note: string; before: Profile | null } | null>(null)
  const [showHow, setShowHow] = useState(false)
  const current = levelOf(profile, now.year)
  if (!needsLevel(profile, now.year) && done === null) return null

  const pick = (level: Level) => {
    const e = applyLevel(profile, level, now)
    if (e.profile === profile) return setDone({ note: c.nothing, before: null })
    updateProfile((p) => applyLevel(p, level, now).profile)
    setDone({ note: c.filled(e.changes.length), before: profile })
  }
  const undo = () => {
    if (done?.before) replaceProfile(done.before)
    setDone(null)
  }
  const money = (n: number | null) => (n === null ? '' : formatMoney(n, lang))
  const rows = LEVEL_KINDS.map((kind) => {
    const owner = kind === 'spendingWorking' || kind === 'spendingRetired' || kind === 'homeValue' ? ('household' as const) : ('self' as const)
    const values = LEVELS.map((l) => levelFigure(profile, kind, owner, l, now.year))
    return { kind, values }
  }).filter((r) => r.values.every((v) => v !== null))

  return (
    <Section id="niveau" title={c.title} subtitle={c.lead} icon="piggy-bank-bold">
      <Cluster role="radiogroup" aria-label={c.pick}>
        {LEVELS.map((l) => (
          <Chip key={l} radio selected={current === l} onClick={() => pick(l)}>
            {c.levels[l].name}
          </Chip>
        ))}
      </Cluster>
      <ul className="levels-says">
        {LEVELS.map((l) => (
          <li key={l} className="field-row__hint">
            <strong>{c.levels[l].name}</strong> — {c.levels[l].says}
          </li>
        ))}
      </ul>
      {current !== null && done === null && <p className="field-row__hint">{c.matches(c.levels[current].name)}</p>}
      {done && (
        <Cluster>
          <StatusMessage tone="info">{done.note}</StatusMessage>
          {done.before !== null && <Chip onClick={undo}>{c.undo}</Chip>}
        </Cluster>
      )}
      <Chip expanded={showHow} onClick={() => setShowHow((v) => !v)}>
        {c.how.open}
      </Chip>
      {showHow && (
        <div className="levels-how">
          <ul>
            {c.how.lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <table className="levels-table">
            <caption>
              {c.how.table} ({c.how.per})
            </caption>
            <thead>
              <tr>
                <th scope="col" />
                {LEVELS.map((l) => (
                  <th key={l} scope="col">
                    {c.levels[l].name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.kind}>
                  <th scope="row">{c.kind[r.kind as keyof typeof c.kind]}</th>
                  {r.values.map((v, i) => (
                    <td key={LEVELS[i]} className="mono">
                      {money(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="field-row__hint">{c.how.sources}</p>
          <ul className="levels-sources">
            {SOURCES.map((s) => {
              const page = pageFor(s, lang)
              return (
                <li key={s.url}>
                  <a className="info-note__link" href={page.url} target="_blank" rel="noopener noreferrer">
                    {page.title}
                  </a>
                  {!page.inReaderLanguage && <span className="field-row__hint"> ({c.how.notOfficial})</span>}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </Section>
  )
}
