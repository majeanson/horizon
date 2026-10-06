import { useId, useState } from 'react'
import { useT, type InfoId } from '../i18n'
import { Icon } from './Icon'

// « Où trouver ce chiffre » — the ⓘ beside every number the person has to type. It opens, in place, a short
// note: WHERE the figure is (the portal, the document, the section), the document's own WORDING for it (so it
// can be matched by eye against the statement in hand), and a link to the official page.
//
// Inline rather than a popover: it works on a touch screen, it can be read while typing, it prints, and a
// screen reader finds it right after the field. The wording lives in the dictionary (`info.<id>`), and
// fieldInfoCopy.test.ts holds every id to a real entry, and every link to an official host.
//
// Renders a button and its note as siblings (a fragment) so a row can place them in its own grid: the button
// next to the field, the note under both.
export function FieldInfo({ id, label }: { id: InfoId; label?: string }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const entry = t.info[id]
  const name = label ? `${t.common.whereToFind} : ${label}` : t.common.whereToFind
  return (
    <>
      <button
        type="button"
        className={'info-btn' + (open ? ' is-on' : '')}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={name}
        title={t.common.whereToFind}
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name="info-bold" size={18} />
      </button>
      <div id={panelId} className="info-note" role="note" hidden={!open}>
        <p>
          <strong>{t.fields.infoWhere}</strong> {entry.where}
        </p>
        {entry.label && (
          <p>
            <strong>{t.fields.infoLabel}</strong> « {entry.label} »
          </p>
        )}
        {entry.note && <p className="info-note__extra">{entry.note}</p>}
        {entry.url ? (
          <a className="info-note__link" href={entry.url} target="_blank" rel="noopener noreferrer">
            {t.fields.infoOpen}
            <Icon name="arrow-up-right-bold" size={14} />
          </a>
        ) : (
          <p className="info-note__extra">{t.fields.infoNoPage}</p>
        )}
      </div>
    </>
  )
}
