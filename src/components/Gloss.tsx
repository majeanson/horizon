import { Fragment, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { useLang, useT } from '../i18n'
import { GLOSS_SIGLES, glossaryAnchor } from '../lib/glossIndex'

// A sigle in running text, made tappable: « RRQ » becomes a link to its entry in the glossary. Only the FIRST time a sigle
// appears in a given text — a hint that says « RRQ » three times is not three links — and only a sigle the glossary
// explains (lib/glossIndex.ts). Text with none comes back untouched, so wrapping a hint is free.
//
// Use it on running text a person reads (a hint, a note, a subtitle), never inside a button, a label or a link: a link inside
// another control is two controls in one.
export function Gloss({ children }: { children: string }) {
  const { lang } = useLang()
  const t = useT()
  const sigles = GLOSS_SIGLES[lang]
  const found = new Set<string>()
  // Capital letters bounded by anything that is not a letter: « REER », « (RRQ) », « du RRQ », but not « RRQs » or « ERREUR ».
  const parts = children.split(/(?<![\p{L}\d])([A-Z]{3,6})(?![\p{L}\d])/u)
  return (
    <>
      {parts.map((part, i) => {
        // The odd entries are the captures.
        if (i % 2 === 0 || !(part in sigles) || found.has(part)) return <Fragment key={i}>{part}</Fragment>
        found.add(part)
        return (
          <Link key={i} className="gloss" to={{ pathname: '/glossaire', hash: glossaryAnchor(sigles[part]) }} title={t.common.inGlossary}>
            {part}
          </Link>
        )
      })}
    </>
  )
}

/** A ReactNode that is plain text goes through Gloss; anything else (already-composed markup) is left as the caller made it. */
export function glossed<T>(node: T): T | ReactElement {
  return typeof node === 'string' ? <Gloss>{node}</Gloss> : node
}
