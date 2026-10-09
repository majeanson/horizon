import type { Household } from '../../engine/types'
import { useLang } from '../../i18n'
import { RESULTS_COPY } from '../../lib/resultsCopy'
import { timelineOf, type MarkKind, type PhaseKind } from '../../lib/timeline'

// « Votre plan en une ligne » — the whole plan at a glance: one thin bar per person from today to the end of the plan, in three stretches
// (working · on the nest · on pensions), with the dates ahead named under it. It says only what the profile states (lib/timeline.ts): no projection
// runs here, so it is instant and can never disagree with the profile. The stretches are told in text too (the bar is a picture, not the only way).
export function TimelineStrip({ household, names, todayYear, horizonAge }: { household: Household; names: readonly string[]; todayYear: number; horizonAge: number }) {
  const { lang } = useLang()
  const c = RESULTS_COPY[lang].timeline
  const people = timelineOf(household, todayYear, horizonAge)
  const markText = (kind: MarkKind, age: number) => (kind === 'retire' ? c.retire(age) : kind === 'rrq' ? c.rrq(age) : c.oas(age))
  return (
    <figure className="timeline surface">
      <figcaption className="timeline__title">{c.title}</figcaption>
      <p className="field-row__hint timeline__hint">{c.hint}</p>
      {people.map((t, i) => {
        const span = t.endAge - t.nowAge
        const name = names[i] ?? ''
        const told = t.phases.map((ph) => c.stretch(c.phases[ph.kind], ph.fromAge, ph.toAge)).join(', ')
        return (
          <div key={t.id} className={'timeline__person' + (people.length > 1 ? ` who who--${Math.min(i, 1)}` : '')}>
            {people.length > 1 && <p className="timeline__name">{name}</p>}
            <div className="timeline__bar" role="img" aria-label={c.aria(name || c.title, told)}>
              {t.phases.map((ph) => (
                <span key={ph.kind + ph.fromAge} className={`timeline__phase timeline__phase--${ph.kind satisfies PhaseKind}`} style={{ flexGrow: (ph.toAge - ph.fromAge) / span }} title={c.stretch(c.phases[ph.kind], ph.fromAge, ph.toAge)}>
                </span>
              ))}
            </div>
            <ul className="timeline__marks">
              <li>{c.now(t.nowAge)}</li>
              {t.marks.map((m) => (
                <li key={m.kind}>{markText(m.kind, m.age)}</li>
              ))}
              <li>{c.end(t.endAge)}</li>
            </ul>
          </div>
        )
      })}
      <ul className="timeline__legend" aria-hidden="true">
        {(['work', 'bridge', 'pensions'] as const)
          .filter((k) => people.some((t) => t.phases.some((ph) => ph.kind === k)))
          .map((k) => (
            <li key={k}>
              <span className={`timeline__swatch timeline__phase--${k}`} /> {c.phases[k]}
            </li>
          ))}
      </ul>
    </figure>
  )
}
