import { useId, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Trace } from '../engine/trace'
import { useLang } from '../i18n'
import { traceLines } from '../lib/traceView'
import { TRACE_COPY } from '../lib/traceCopy'
import { Icon } from './Icon'

// « D'où vient ce chiffre ? » — a COMPUTED figure that answers for itself, in three layers: the formula with this household's numbers, each choice
// it rests on (a door to the field that sets it), and the official page the rule was read on. FieldInfo (ⓘ) is its mirror: « where to find a number to
// TYPE ». The figure IS the button — a quiet dotted mark and a small « i » say it opens — and the note opens in place, under it: no popover, no
// portal, so it works on a touch screen, prints, and a screen reader finds it right after the figure.
//
// The trace is the engine's (engine/trace.ts); the sentence is written for the reader by lib/traceView.ts. Never autofocus: opening a note moves nothing.
// `after` is the words that finish the line the figure sits in (« par mois, en dollars d'aujourd'hui »); `lineClassName` is that line's own class.
export function Figure({ trace, after, lineClassName }: { trace: Trace; after?: string; lineClassName?: string }) {
  const { lang } = useLang()
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const v = traceLines(trace, lang)
  const c = TRACE_COPY[lang]
  return (
    <div className="figure-block">
      <p className={lineClassName}>
        <button type="button" className={'figure' + (open ? ' is-on' : '')} aria-expanded={open} aria-controls={panelId} aria-label={v.name} onClick={() => setOpen((o) => !o)}>
          {v.shown}
        </button>
        {after !== undefined && <> {after}</>}
      </p>
      <div id={panelId} className="figure-note" role="note" hidden={!open}>
        <p className="figure-note__formula">{v.formula}</p>
        {v.inputs.length > 0 && (
          <>
            <p className="figure-note__title">{c.inputsTitle}</p>
            <ul className="figure-note__inputs">
              {v.inputs.map((i) => (
                <li key={i.label}>
                  {i.to === '' ? (
                    <>{i.label}{i.value !== '' && ` ${i.value}`}</>
                  ) : (
                    <Link className="figure-note__door" to={i.to}>
                      {i.label}
                      {i.value !== '' && ` ${i.value}`}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        {v.source && <p className="figure-note__title">{c.sourceTitle}</p>}
        {v.source && (
          <p className="figure-note__source">
            <a className="info-note__link" href={v.source.url} target="_blank" rel="noopener noreferrer" lang={v.source.pageLang} aria-label={`${v.source.title} — ${c.officialPage}`}>
              {v.source.title}
              <Icon name="arrow-up-right-bold" size={14} />
            </a>
            {!v.source.inReaderLanguage && <span className="figure-note__lang"> ({c.pageIn(v.source.pageLang)})</span>}
          </p>
        )}
      </div>
    </div>
  )
}
