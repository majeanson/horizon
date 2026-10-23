import { Fragment, useState, type MouseEvent, type ReactElement } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { GLOSS_SIGLES, glossaryAnchor } from '../lib/glossIndex'
import { Modal } from './Modal'

// A sigle in running text, made tappable: « RRQ » is a link to its entry in the glossary — and a plain tap opens that entry's
// plain-language sentence right where the person is reading, in a small dialog, so nobody has to leave the page and find their way
// back. The link stays a real link (a middle click, a ctrl-click, a screen reader's « open link » and a browser without script all
// still go to the glossary); only the plain tap is taken over. The words come from lib/glossaryCopy.ts, fetched on the first tap
// (the shell does not pay for them), and a failed fetch falls back to going to the glossary page.
//
// Only the FIRST time a sigle appears in a given text — a hint that says « RRQ » three times is not three links — and only a sigle
// the glossary explains (lib/glossIndex.ts). Text with none comes back untouched, so wrapping a hint is free.
//
// Use it on running text a person reads (a hint, a note, a subtitle), never inside a button, a label or a link: a link inside
// another control is two controls in one.
export function Gloss({ children }: { children: string }) {
  const { lang } = useLang()
  const t = useT()
  const navigate = useNavigate()
  const sigles = GLOSS_SIGLES[lang]
  const found = new Set<string>()
  const [open, setOpen] = useState<{ id: string; sigle: string; entry: Entry | null } | null>(null)
  // Capital letters bounded by anything that is not a letter: « REER », « (RRQ) », « du RRQ », but not « RRQs » or « ERREUR ».
  const parts = children.split(/(?<![\p{L}\d])([A-Z]{3,6})(?![\p{L}\d])/u)

  const show = (e: MouseEvent<HTMLAnchorElement>, id: string, sigle: string) => {
    // A modified click or a middle button is the browser's: let the link do what a link does.
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    setOpen({ id, sigle, entry: null })
    void import('../lib/glossaryCopy').then(
      ({ GLOSSARY_COPY }) => {
        const entry = findEntry(GLOSSARY_COPY[lang].groups, id)
        if (entry) setOpen((o) => (o && o.id === id ? { ...o, entry } : o))
        else goToEntry(id)
      },
      () => goToEntry(id),
    )
  }
  const goToEntry = (id: string) => {
    setOpen(null)
    navigate({ pathname: '/glossaire', hash: glossaryAnchor(id) })
  }

  return (
    <>
      {parts.map((part, i) => {
        // The odd entries are the captures.
        if (i % 2 === 0 || !(part in sigles) || found.has(part)) return <Fragment key={i}>{part}</Fragment>
        found.add(part)
        const id = sigles[part]
        return (
          <Link
            key={i}
            className="gloss"
            to={{ pathname: '/glossaire', hash: glossaryAnchor(id) }}
            title={t.common.inGlossary}
            aria-haspopup="dialog"
            onClick={(e) => show(e, id, part)}
          >
            {part}
          </Link>
        )
      })}
      <Modal open={open !== null} onClose={() => setOpen(null)} ariaLabel={open ? `${open.sigle}` : undefined} className="gloss-card">
        {open && (
          <div className="gloss-card__body">
            {open.entry ? (
              <>
                <p className="gloss-card__name">
                  <strong>{open.entry.abbr}</strong> — {open.entry.name}
                </p>
                <p className="gloss-card__plain">{open.entry.plain}</p>
              </>
            ) : (
              <p className="gloss-card__plain" aria-live="polite">
                {open.sigle}…
              </p>
            )}
            <p className="gloss-card__more">
              <Link to={{ pathname: '/glossaire', hash: glossaryAnchor(open.id) }} onClick={() => setOpen(null)}>
                {t.common.inGlossary}
              </Link>
            </p>
          </div>
        )}
      </Modal>
    </>
  )
}

interface Entry {
  abbr: string
  name: string
  plain: string
}

function findEntry(groups: readonly { terms: readonly (Entry & { id: string })[] }[], id: string): Entry | null {
  for (const g of groups) for (const term of g.terms) if (term.id === id) return term
  return null
}

/** A ReactNode that is plain text goes through Gloss; anything else (already-composed markup) is left as the caller made it. */
export function glossed<T>(node: T): T | ReactElement {
  return typeof node === 'string' ? <Gloss>{node}</Gloss> : node
}
