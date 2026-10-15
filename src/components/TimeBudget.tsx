import { Modal } from './Modal'
import { useLang } from '../i18n'
import { TIME_BUDGETS, type TimeBudget as Budget } from '../lib/timeBudget'
import { TIME_BUDGET_COPY } from '../lib/timeBudgetCopy'

// TimeBudget — « Combien de temps avez-vous ? », the front door's second full-screen dialog, right after the reading one (lib/timeBudget.ts says what the
// choice does). Three big doors, stacked on a phone and side by side on a wide screen — the same `.welcome__door` card as the front door's doors, as a
// button. A tap chooses AND closes; the ✕, Escape and « Plus tard » close without choosing, and the question does not come back by itself (the front
// door's doors and the settings page remain). CONTROLLED, always: the page owns when it opens (first visit, « Changer »), so the kit can open it on demand.
export function TimeBudget({ open, value, onChoose, onClose }: { open: boolean; value: Budget | null; onChoose: (b: Budget) => void; onClose: () => void }) {
  const c = TIME_BUDGET_COPY[useLang().lang]
  return (
    <Modal open={open} onClose={onClose} title={c.title} className="kit-modal--full time-budget">
      <p className="field-row__hint">{c.text}</p>
      <ul className="welcome__doors">
        {TIME_BUDGETS.map((b) => (
          <li key={b}>
            <button type="button" className={'welcome__door surface' + (value === b ? ' is-on' : '')} aria-current={value === b || undefined} onClick={() => onChoose(b)}>
              <span className="welcome__door-label">{c.options[b].label}</span>
              <span className="welcome__door-hint">{c.options[b].hint}</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="welcome__go">
        <button type="button" className="btn btn--ghost" onClick={onClose}>
          {c.later}
        </button>
      </div>
    </Modal>
  )
}
