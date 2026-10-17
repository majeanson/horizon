import { useState } from 'react'
import { EARLY_DEATH_AGE, START_AGES, type SpouseTiming } from '../../engine/spouseTiming'
import type { Assumptions, Household } from '../../engine/types'
import { useLang } from '../../i18n'
import { formatCompactMoney, formatMoney } from '../../lib/money'
import { SPOUSE_TIMING_COPY } from '../../lib/spouseTimingCopy'
import { useSpouseTiming } from '../../lib/useSpouseTiming'
import { Fold } from '../Fold'
import { HeatGrid, type HeatCellData } from '../HeatGrid'
import { Skeleton } from '../Skeleton'

// « Qui devrait commencer sa rente du RRQ en premier » — a couple's two start ages tried together, three by three, each scored by its worst case (engine/spouseTiming.ts). A fold that
// mounts its grid only when opened: it is nine combinations of three runs each, in a worker, and nobody pays for it who does not ask.

export function SpouseTimingFold(props: { household: Household; assumptions: Assumptions; names: readonly string[] }) {
  const { lang } = useLang()
  const [open, setOpen] = useState(false)
  return (
    <Fold summary={SPOUSE_TIMING_COPY[lang].title} className="spouse-timing" concept="depart" open={open} onToggle={setOpen} mountOnOpen>
      <SpouseTimingPanel {...props} />
    </Fold>
  )
}

function SpouseTimingPanel({ household, assumptions, names }: { household: Household; assumptions: Assumptions; names: readonly string[] }) {
  const { lang } = useLang()
  const c = SPOUSE_TIMING_COPY[lang]
  const { value, busy } = useSpouseTiming(household, assumptions, true)
  const timing: SpouseTiming | null | undefined = value === null ? undefined : value.timing
  if (timing === undefined) return <Skeleton count={4} />
  if (timing === null) return null
  const [first, second] = [names[0] ?? '', names[1] ?? '']
  const same = (s: readonly [number, number], t: readonly [number, number] | null) => t !== null && s[0] === t[0] && s[1] === t[1]
  const working = timing.cells.filter((x) => x.ok)
  const lo = Math.min(...working.map((x) => x.worst))
  const hi = Math.max(...working.map((x) => x.worst))
  const rows: HeatCellData[][] = START_AGES.map((a) =>
    START_AGES.map((b): HeatCellData => {
      const cell = timing.cells.find((x) => x.starts[0] === a && x.starts[1] === b)!
      const isBest = same(cell.starts, timing.best)
      const isCurrent = same(cell.starts, timing.current.starts)
      const mark = isBest && isCurrent ? c.bestIsCurrent : isBest ? c.best : isCurrent ? c.current : undefined
      if (!cell.ok) return { text: c.fails, fail: true, mark, title: formatMoney(cell.worst, lang) }
      return { text: formatCompactMoney(cell.worst, lang), heat: hi > lo ? (cell.worst - lo) / (hi - lo) : 1, mark, title: formatMoney(cell.worst, lang) }
    }),
  )
  const best = timing.best === null ? null : timing.cells.find((x) => same(x.starts, timing.best))!
  const onGrid = timing.cells.some((x) => same(x.starts, timing.current.starts))
  return (
    <div className="spouse-timing__body" aria-busy={busy}>
      <p className="field-row__hint">{c.hint(EARLY_DEATH_AGE)}</p>
      <HeatGrid
        caption={c.caption}
        corner={c.corner}
        rows={START_AGES.map((a) => c.start(first, a))}
        cols={START_AGES.map((b) => c.start(second, b))}
        cells={rows}
      />
      {timing.best === null ? (
        <p className="answer__note">{c.noneLine}</p>
      ) : same(timing.current.starts, timing.best) ? (
        <p className="answer__note">{c.sameLine}</p>
      ) : (
        <p className="answer__note">{c.bestLine(c.start(first, timing.best[0]), c.start(second, timing.best[1]))}</p>
      )}
      {best !== null && timing.current.ok && best.worst > timing.current.worst + 1 && !same(timing.current.starts, timing.best) && (
        <p className="answer__note">{c.gainLine(formatMoney(Math.round(best.worst - timing.current.worst), lang))}</p>
      )}
      {!onGrid && <p className="answer__note">{timing.current.ok ? c.currentLine(formatMoney(Math.round(timing.current.worst), lang)) : c.currentFails}</p>}
      <p className="field-row__hint">{c.only}</p>
    </div>
  )
}
