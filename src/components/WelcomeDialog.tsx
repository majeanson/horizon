import { Link } from 'react-router-dom'
import { useLang } from '../i18n'
import { READING_HELP_COPY } from '../lib/readingHelpCopy'
import { TIME_BUDGETS, TIME_BUDGET_PATH, type TimeBudget } from '../lib/timeBudget'
import { TIME_BUDGET_COPY } from '../lib/timeBudgetCopy'
import { WELCOME_COPY } from '../lib/welcomeCopy'
import { BrandMark } from './BrandMark'
import { DisplayControls } from './DisplayControls'
import { Modal } from './Modal'

// The front door's ONE dialog, opened by its « Commencer » — never by itself: a first visit reads what Horizon is before anything covers it.
// Full screen. First « Combien de temps avez-vous ? »: three doors, each a LINK to its own path (lib/timeBudget.ts) that also keeps the choice, so a
// tap both answers and goes in, and the answer already given is marked. Then how to read the page (the language, the size of the letters, the
// contrast, day / night) — the same controls as the settings page. The ✕ and Escape close it, choosing nothing.
// CONTROLLED: the page owns when it opens and what a choice does (the kit's specimen keeps it in its own state, never on the device).
export function WelcomeDialog({ open, value, onChoose, onClose }: { open: boolean; value: TimeBudget | null; onChoose: (b: TimeBudget) => void; onClose: () => void }) {
  const { lang } = useLang()
  const c = WELCOME_COPY[lang].dialog
  const tc = TIME_BUDGET_COPY[lang]
  const rc = READING_HELP_COPY[lang]
  return (
    <Modal open={open} onClose={onClose} title={c.title} className="kit-modal--full welcome-dialog">
      <p className="welcome-dialog__lead">
        <BrandMark size={28} />
        <span>{c.lead}</span>
      </p>
      <section className="welcome-dialog__part" aria-labelledby="welcome-dialog-time">
        <h4 id="welcome-dialog-time" className="welcome__title">
          {tc.title}
        </h4>
        <p className="field-row__hint">{tc.text}</p>
        <ul className="welcome__doors">
          {TIME_BUDGETS.map((b) => (
            <li key={b}>
              <Link className={'welcome__door surface' + (value === b ? ' is-on' : '')} aria-current={value === b || undefined} to={TIME_BUDGET_PATH[b]} onClick={() => onChoose(b)}>
                <span className="welcome__door-label">{tc.options[b].label}</span>
                <span className="welcome__door-hint">{tc.options[b].hint}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="welcome-dialog__part" aria-labelledby="welcome-dialog-reading">
        <h4 id="welcome-dialog-reading" className="welcome__title">
          {rc.title}
        </h4>
        <DisplayControls sizeLabels={rc.sizes} />
        <p className="field-row__hint">{rc.zoomTip}</p>
      </section>
    </Modal>
  )
}
