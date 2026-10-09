import { useState } from 'react'
import type { StrategyCard, StrategyKey, BridgeView } from '../../engine/bridge'
import { useLang, useT } from '../../i18n'
import type { BridgeMatrix } from '../../lib/bridge.worker'
import type { BridgeCopy } from '../../lib/bridgeCopy'
import { sturdiest, verdictOf } from '../../lib/bridgeModel'
import { formatMoney } from '../../lib/money'
import { useWide } from '../../lib/useWide'
import { Chip } from '../Chip'

// THE WAYS OF STARTING THE PENSIONS, side by side — one comparison, two ways of showing it, and the reader chooses (`?bt=cards|table`):
//
//   · CARDS — one per way, CLOSED: its name, what it is, one figure (what is left at 95) and three dots for how it holds under the three
//     scenarios; « Détails » opens the rest (the verdict sentence, what was cashed, the lowest nest, what the nest paid, the break-even, each
//     scenario in words). Five open cards were a very long scroll on a phone, and the eye could not hold the five at once.
//   · TABLE — the same numbers where the eye can compare them. From 860 px the ways are the COLUMNS and the figures the rows (the best of
//     each row marked); on a phone they are the ROWS, with the three figures that matter and the dots, so all five fit one screen.
//
// Neither shows less: the table's wide form carries every figure a card does. With no `bt` in the address the screen's width chooses (a
// table from 860 px, cards below it).

export type StrategyLayout = 'cards' | 'table'

const SCENARIOS = ['prudent', 'neutral', 'bold'] as const

interface Props {
  view: BridgeView
  pressed: readonly StrategyKey[]
  copy: BridgeCopy
  onPick: (key: StrategyKey) => void
  horizonAge: number
  /** The person `horizonAge` is counted for, named in a couple; null for a person alone. */
  who: string | null
  /** Each strategy under each scenario; null while the worker is still at it. */
  matrix: BridgeMatrix | null
  layout: StrategyLayout | null
  onLayout: (layout: StrategyLayout | null) => void
}

/** Three dots, one per scenario: filled when the money lasts under it, an empty ring when it does not, a dashed ring while it is being worked out. */
function Dots({ k, matrix, copy }: { k: StrategyKey; matrix: BridgeMatrix | null; copy: BridgeCopy }) {
  const t = useT()
  const words = SCENARIOS.map((p) => {
    const cell = matrix?.[k][p]
    return `${t.assumptions.presets[p]} : ${cell === undefined ? copy.marksPending : cell.ok ? copy.matrixHolds : copy.matrixFails(cell.firstShortfallAge ?? 0)}`
  }).join(' · ')
  return (
    <span className="dots" role="img" aria-label={words} title={words}>
      {SCENARIOS.map((p) => {
        const cell = matrix?.[k][p]
        return <span key={p} className={'dots__dot' + (cell === undefined ? ' is-pending' : cell.ok ? ' is-ok' : ' is-short')} aria-hidden="true" />
      })}
    </span>
  )
}

export function StrategyViews({ view, pressed, copy, onPick, horizonAge, who, matrix, layout, onLayout }: Props) {
  const t = useT()
  const { lang } = useLang()
  const wide = useWide()
  const standard = view.strategies.find((s) => s.key === 'standard')!
  const mine = view.strategies.find((s) => s.key === 'mine')!
  // When the person's own start ages ARE the standard, one column / card says so instead of two identical ones.
  const mineIsStandard = mine.levers.rrqStartAge === standard.levers.rrqStartAge && mine.levers.oasStartAge === standard.levers.oasStartAge
  const shown = view.strategies.filter((s) => !(s.key === 'mine' && mineIsStandard))
  const best = sturdiest(view.strategies, matrix)
  const bestKey = best !== null && best.key === 'mine' && mineIsStandard ? 'standard' : (best?.key ?? null)
  const effective: StrategyLayout = layout ?? (wide ? 'table' : 'cards')
  const money = (n: number | null) => (n === null ? copy.noWorth : formatMoney(n, lang))
  const label = (s: StrategyCard) => (s.key === 'standard' && mineIsStandard ? copy.standardIsMine : s.key === 'mine' ? `${copy.strategyName.mine} (${copy.age(s.levers.retirementAge)})` : copy.strategyName[s.key])
  const sentence = best === null ? null : copy.sturdiest(best.key === 'mine' && mineIsStandard ? copy.strategyName.standard : label(view.strategies.find((c) => c.key === best.key)!), best.holds, best.next)

  return (
    <div className="strategies">
      {sentence !== null && <p className="bridge-sturdiest">{sentence}</p>}
      <div className="strategies__bar">
        <div className="strategies__layout" role="group" aria-label={copy.layoutLabel}>
          <Chip selected={effective === 'cards'} onClick={() => onLayout('cards')}>
            {copy.layoutCards}
          </Chip>
          <Chip selected={effective === 'table'} onClick={() => onLayout('table')}>
            {copy.layoutTable}
          </Chip>
        </div>
        <p className="field-row__hint strategies__legend">{copy.dotsLegend(t.assumptions.presets.prudent, t.assumptions.presets.neutral, t.assumptions.presets.bold)}</p>
      </div>

      {effective === 'cards' ? (
        <Cards {...{ shown, standard, pressed, copy, onPick, horizonAge, who, matrix, bestKey, label, money }} />
      ) : (
        wide ? <WideTable {...{ shown, standard, pressed, copy, onPick, matrix, bestKey, label, money }} /> : <NarrowTable {...{ shown, pressed, copy, onPick, matrix, bestKey, label, money }} />
      )}
    </div>
  )
}

interface Shared {
  shown: StrategyCard[]
  pressed: readonly StrategyKey[]
  copy: BridgeCopy
  onPick: (key: StrategyKey) => void
  matrix: BridgeMatrix | null
  bestKey: StrategyKey | null
  label: (s: StrategyCard) => string
  money: (n: number | null) => string
}

function Cards({ shown, standard, pressed, copy, onPick, horizonAge, who, matrix, bestKey, label, money }: Shared & { standard: StrategyCard; horizonAge: number; who: string | null }) {
  const t = useT()
  const { lang } = useLang()
  const [open, setOpen] = useState<ReadonlySet<StrategyKey>>(new Set())
  const toggle = (k: StrategyKey) =>
    setOpen((cur) => {
      const next = new Set(cur)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  return (
    <div role="radiogroup" aria-label={copy.strategyTitle}>
      <ul className="bridge-cards">
        {shown.map((s) => {
          const v = verdictOf(s.levers, s.summary, standard.summary, horizonAge)
          const extra = s.extraDrawn6070
          const isOpen = open.has(s.key)
          return (
            <li key={s.key} className={'bridge-card surface' + (pressed.includes(s.key) ? ' bridge-card--on' : '') + (s.summary.ok ? '' : ' bridge-card--short')}>
              {bestKey === s.key && <span className="bridge-card__badge mono">{copy.sturdiestBadge}</span>}
              <Chip radio selected={pressed.includes(s.key)} onClick={() => onPick(s.key)}>
                {label(s)}
              </Chip>
              <p className="bridge-card__line">{copy.strategyLine[s.key]}</p>
              <div className="bridge-card__glance">
                <span>
                  <span className="bridge-card__glance-label">{copy.worth95}</span>
                  <span className="mono">{money(s.summary.netWorth95)}</span>
                </span>
                <Dots k={s.key} matrix={matrix} copy={copy} />
              </div>
              <Chip expanded={isOpen} onClick={() => toggle(s.key)} ariaLabel={`${copy.details} — ${label(s)}`}>
                {copy.details}
              </Chip>
              {isOpen && (
                <>
                  <p className={'bridge-card__verdict' + (s.summary.ok ? '' : ' bridge-card__verdict--short')}>{copy.verdict(v, who)}</p>
                  <dl className="bridge-card__facts">
                    <div>
                      <dt>{copy.lifetime}</dt>
                      <dd className="mono">{formatMoney(s.summary.lifetimeAfterTax, lang)}</dd>
                    </div>
                    <div>
                      <dt>{copy.lowestNestLabel}</dt>
                      <dd className="mono">{s.summary.lowestNest ? `${formatMoney(s.summary.lowestNest.amount, lang)} · ${copy.age(s.summary.lowestNest.age)}` : copy.noWorth}</dd>
                    </div>
                  </dl>
                  <p className="field-row__hint">
                    {s.key === 'standard' ? copy.breakEvenSelf : extra > 50 ? copy.extraDrawn(formatMoney(extra, lang)) : extra < -50 ? copy.lessDrawn(formatMoney(-extra, lang)) : copy.sameDrawn}
                    {s.key !== 'standard' && ' · ' + (s.breakEven === null || s.breakEvenKind === null ? copy.breakEvenNone : s.breakEvenKind === 'later' ? copy.breakEvenLater(s.breakEven) : copy.breakEvenEarlier(s.breakEven))}
                  </p>
                  <p className="bridge-card__marks" aria-label={copy.marksTitle}>
                    {SCENARIOS.map((k) => {
                      const cell = matrix?.[s.key][k]
                      return (
                        <span key={k} className={'bridge-mark' + (cell === undefined ? '' : cell.ok ? ' bridge-mark--ok' : ' bridge-mark--short')}>
                          <span aria-hidden="true">{cell === undefined ? '' : cell.ok ? '✓ ' : '! '}</span>
                          {t.assumptions.presets[k]}
                          {' '}: {cell === undefined ? copy.marksPending : cell.ok ? copy.matrixHolds : copy.matrixFails(cell.firstShortfallAge ?? 0)}
                        </span>
                      )
                    })}
                  </p>
                </>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** The best of a row, the one the eye should land on: the largest of the figures given (ties all marked). */
const bestOf = (values: readonly (number | null)[]): number | null => {
  const nums = values.filter((v): v is number => v !== null)
  return nums.length < 2 ? null : Math.max(...nums)
}

/** From 860 px: the ways of starting are the columns, every figure a row. */
function WideTable({ shown, standard, pressed, copy, onPick, matrix, bestKey, label, money }: Shared & { standard: StrategyCard }) {
  const t = useT()
  const { lang } = useLang()
  const lifetimeBest = bestOf(shown.map((s) => s.summary.lifetimeAfterTax))
  const worthBest = bestOf(shown.map((s) => s.summary.netWorth95))
  const nestBest = bestOf(shown.map((s) => s.summary.lowestNest?.amount ?? null))
  const mark = (is: boolean) => (is ? ' is-best' : '')
  return (
    <div className="table-wrap strategies__table">
      <table>
        <caption className="sr-only">{copy.strategyTitle}</caption>
        <thead>
          <tr>
            <th scope="col">{copy.colStrategy}</th>
            {shown.map((s) => (
              <th key={s.key} scope="col">
                {bestKey === s.key && <span className="bridge-card__badge mono">{copy.sturdiestBadge}</span>}
                <Chip selected={pressed.includes(s.key)} onClick={() => onPick(s.key)}>
                  {label(s)}
                </Chip>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">{copy.rowWhat}</th>
            {shown.map((s) => (
              <td key={s.key}>{copy.strategyLine[s.key]}</td>
            ))}
          </tr>
          {SCENARIOS.map((p, i) => (
            <tr key={p}>
              <th scope="row">{i === 0 ? `${copy.marksTitle} — ${t.assumptions.presets[p]}` : t.assumptions.presets[p]}</th>
              {shown.map((s) => {
                const cell = matrix?.[s.key][p]
                return (
                  <td key={s.key} className={cell === undefined ? '' : cell.ok ? 'is-ok' : 'is-short'}>
                    {cell === undefined ? copy.marksPending : cell.ok ? `✓ ${copy.matrixHolds}` : `! ${copy.matrixFails(cell.firstShortfallAge ?? 0)}`}
                  </td>
                )
              })}
            </tr>
          ))}
          <tr>
            <th scope="row">{copy.worth95}</th>
            {shown.map((s) => (
              <td key={s.key} className={'mono' + mark(worthBest !== null && s.summary.netWorth95 === worthBest)}>
                {money(s.summary.netWorth95)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">{copy.lifetime}</th>
            {shown.map((s) => (
              <td key={s.key} className={'mono' + mark(lifetimeBest !== null && s.summary.lifetimeAfterTax === lifetimeBest)}>
                {formatMoney(s.summary.lifetimeAfterTax, lang)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">{copy.lowestNestLabel}</th>
            {shown.map((s) => (
              <td key={s.key} className={'mono' + mark(nestBest !== null && s.summary.lowestNest?.amount === nestBest)}>
                {s.summary.lowestNest ? `${formatMoney(s.summary.lowestNest.amount, lang)} · ${copy.age(s.summary.lowestNest.age)}` : copy.noWorth}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">{copy.rowExtra}</th>
            {shown.map((s) => (
              <td key={s.key} className="mono">
                {s.key === standard.key ? copy.noWorth : formatMoney(s.extraDrawn6070, lang)}
              </td>
            ))}
          </tr>
          <tr>
            <th scope="row">{copy.rowBreakEven}</th>
            {shown.map((s) => (
              <td key={s.key} className="mono">
                {s.key === 'standard' || s.breakEven === null || s.breakEvenKind === null ? copy.noWorth : s.breakEvenKind === 'later' ? copy.breakEvenLater(s.breakEven) : copy.breakEvenEarlier(s.breakEven)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/** Below 860 px: one row per way, the three things that matter — what is left at 95, the lowest nest, the dots — so all five fit one screen. */
function NarrowTable({ shown, pressed, copy, onPick, matrix, bestKey, label, money }: Shared) {
  const { lang } = useLang()
  const worthBest = bestOf(shown.map((s) => s.summary.netWorth95))
  const nestBest = bestOf(shown.map((s) => s.summary.lowestNest?.amount ?? null))
  return (
    <div className="table-wrap strategies__table strategies__table--narrow">
      <table>
        <caption className="sr-only">{copy.strategyTitle}</caption>
        <thead>
          <tr>
            <th scope="col">{copy.colStrategy}</th>
            <th scope="col">{copy.worth95Short}</th>
            <th scope="col">{copy.lowestNestShort}</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((s) => (
            <tr key={s.key}>
              <th scope="row">
                {bestKey === s.key && <span className="bridge-card__badge mono">{copy.sturdiestBadge}</span>}
                <Chip selected={pressed.includes(s.key)} onClick={() => onPick(s.key)}>
                  {label(s)}
                </Chip>
                <Dots k={s.key} matrix={matrix} copy={copy} />
              </th>
              <td className={'mono' + (worthBest !== null && s.summary.netWorth95 === worthBest ? ' is-best' : '')}>{money(s.summary.netWorth95)}</td>
              <td className={'mono' + (nestBest !== null && s.summary.lowestNest?.amount === nestBest ? ' is-best' : '')}>{s.summary.lowestNest ? formatMoney(s.summary.lowestNest.amount, lang) : copy.noWorth}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
