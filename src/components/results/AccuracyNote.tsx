import { useLang } from '../../i18n'
import { NUDGE } from '../../engine/factImpact'
import { ACCURACY_COPY } from '../../lib/accuracyCopy'
import { formatPct } from '../../lib/format'
import { Chip } from '../Chip'
import { Cluster } from '../Layout'

// « À quel point est-ce précis ? » — what the calculation was checked against and what it simplifies, on the « Vérifier » view where a person
// goes to check it. Every line restates a fact the engine's tests and ENGINE.md already hold (lib/accuracyCopy.ts). The lists are always
// shown — nothing to open to discover them — and the figures themselves are one chip away (« Paramètres utilisés », further down).

const REPO = 'https://github.com/majeanson/horizon/blob/main'

export function AccuracyNote({ onSeeFigures }: { onSeeFigures: () => void }) {
  const { lang } = useLang()
  const c = ACCURACY_COPY[lang]
  return (
    <div className="surface accuracy">
      <p className="field-row__hint">{c.intro}</p>
      {/* What the range on the answer means: the nudge size is the engine's own, passed in. */}
      <p className="field-row__hint">{c.range(formatPct(NUDGE, lang, 0))}</p>
      <div className="verdict__range">
        <p className="verdict__range-title">{c.checkedTitle}</p>
        <ul className="note-list">
          {c.checked.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <div className="verdict__range">
        <p className="verdict__range-title">{c.simplifiedTitle}</p>
        <ul className="note-list">
          {c.simplified.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <Cluster>
        <Chip icon="caret-down-bold" onClick={onSeeFigures}>
          {c.seeFigures}
        </Chip>
        <a className="info-note__link" href={`${REPO}/${lang === 'fr' ? 'SOURCES.md' : 'SOURCES.en.md'}`} target="_blank" rel="noopener noreferrer">
          {c.seeSources}
        </a>
        <a className="info-note__link" href={`${REPO}/ENGINE.md`} target="_blank" rel="noopener noreferrer">
          {c.seeEngine}
        </a>
      </Cluster>
    </div>
  )
}
