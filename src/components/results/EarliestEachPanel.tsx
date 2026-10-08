import { Chip } from '../Chip'
import { Skeleton } from '../Skeleton'
import type { EarliestEach } from '../../engine/retireAt'
import type { Household } from '../../engine/types'
import { useLang } from '../../i18n'
import { RESULTS_COPY } from '../../lib/resultsCopy'

// « Chacun de son côté »: for a couple, each person's own earliest age with the other held where the profile has them
// (engine/retireAt.ts `earliestEach`). It sits under the verdict, whose answer is « everyone retires at the same age »,
// and says in a line why the two answers are not a plan to combine. Each line can send its pair to the comparison below
// (« Chacun son âge »): the two answers together are not guaranteed to work, and the comparison is where that is checked.

export function EarliestEachPanel({
  household,
  names,
  answer,
  maxAge,
  onCompare,
  compareDisabled,
}: {
  household: Household
  names: readonly string[]
  /** `null` while the worker is still at it. */
  answer: EarliestEach[] | null
  /** The oldest age tried: shown when no age works. */
  maxAge: number
  /** The pair (first person's age, second person's age) to add to the comparison. */
  onCompare: (first: number, second: number) => void
  compareDisabled: boolean
}) {
  const { lang } = useLang()
  const e = RESULTS_COPY[lang].each
  const nameOf = (id: string) => names[household.persons.findIndex((p) => p.id === id)] ?? ''
  return (
    <div className="verdict__each" aria-busy={answer === null}>
      <h2 className="verdict__each-title">{e.title}</h2>
      <p className="verdict__note">{e.hint}</p>
      {answer === null ? (
        <Skeleton count={2} className="skeleton--chip-rows" />
      ) : (
        <ul className="verdict__each-list">
          {answer.map((a) => {
            if (!a.other) return null
            const me = nameOf(a.id)
            const other = nameOf(a.other.id)
            if (a.earliestOk === null) return <li key={a.id}>{e.none(me, maxAge, other, a.other.heldAt)}</li>
            const firstIsMe = household.persons[0].id === a.id
            const pair: [number, number] = firstIsMe ? [a.earliestOk, a.other.heldAt] : [a.other.heldAt, a.earliestOk]
            return (
              <li key={a.id} className={`verdict__each-row who who--${Math.min(household.persons.findIndex((p) => p.id === a.id), 1)}`}>
                <span>{e.line(me, a.earliestOk, other, a.other.heldAt)}</span>{' '}
                <Chip onClick={() => onCompare(pair[0], pair[1])} disabled={compareDisabled} ariaLabel={e.compareLabel(me, a.earliestOk, other, a.other.heldAt)}>
                  {e.compare}
                </Chip>
              </li>
            )
          })}
        </ul>
      )}
      {/* A disabled chip must say WHY: the comparison is full. */}
      {compareDisabled && <p className="verdict__note">{e.compareFull}</p>}
    </div>
  )
}
