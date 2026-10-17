import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLang, useT } from '../i18n'
import { ACCORDION_COPY } from '../lib/accordionCopy'
import { FAMILY_HUE, type ConceptId, type Family } from '../lib/concepts'
import { scrollToSection } from '../lib/motion'
import { Chip } from './Chip'
import { ConceptPip } from './ConceptPip'
import { Fold } from './Fold'
import { glossed } from './Gloss'
import { Icon, type IconName } from './Icon'
import { Cluster } from './Layout'
import { SectionLevel } from './SectionHeader'

// ACCORDION — a long page read ONE BLOCK AT A TIME: every block keeps its place, its title and its pip; the open one shows its fields and, at its foot,
// « Précédent » / « Suivant » to the neighbouring block. Which block is open is the PAGE's state (kept in the address, so a link and the back button mean
// something); the accordion only draws it. Two shapes, chosen by `open`:
//   · an id (or null): one block open at a time — the phone's Profil, Hypothèses, Preuve, Décider's strategies;
//   · 'all': every block open — the wide screen's Profil — except the blocks in `done` (every figure confirmed), which close to their title and one line
//     (« 9 chiffres confirmés ») until tapped: what is left to do stands out, what is finished gets out of the way, nothing is removed.
// A block is a card with the house anatomy (components/profile/shared.tsx `Section` delegates here): title · one sentence · « En savoir plus » · the fields.
// Its heading holds a real button (`aria-expanded`), so the keyboard and a screen reader get a disclosure, not a div. A closed block's body is NOT mounted:
// a what-if or a worker's table costs nothing until asked for, and a field unmounted on close has already written its figure (the store is the truth).
//
// Opening a block also lands on it (lib/motion.ts scrollToSection): the tap was on its title, which may sit anywhere on the screen; the body appears
// under it, and a block that opened under the fold would read as a tap that did nothing.

export type AccordionOpen = string | null | 'all'

interface Ctx {
  ids: readonly string[]
  open: AccordionOpen
  setOpen: (id: string | null) => void
  done: ReadonlySet<string>
  /** In the « all » shape: the blocks the reader toggled against their default (a done block reopened, an open one closed). */
  flipped: ReadonlySet<string>
  flip: (id: string) => void
  doneCount: ReadonlyMap<string, number>
  /** Make a block open, whatever the shape (a map chip, a deep link): the page then scrolls to it itself. */
  reveal: (id: string) => void
}

const AccordionContext = createContext<Ctx | null>(null)

/**
 * The provider: `ids` in reading order (prev / next follow it), `open` the page's state, `onOpen` how the page changes it (an id, or null for all closed).
 * `done` names the blocks whose figures are all confirmed, `doneCount` how many each holds (the closed line says it).
 */
export function Accordion({ ids, open, onOpen, done, doneCount, children }: { ids: readonly string[]; open: AccordionOpen; onOpen: (id: string | null) => void; done?: ReadonlySet<string>; doneCount?: ReadonlyMap<string, number>; children: ReactNode }) {
  const [flipped, setFlipped] = useState<ReadonlySet<string>>(() => new Set())
  const doneSet = done ?? new Set<string>()
  /** Set (not toggle) whether a block is against its default: a deep link or the guide may ask twice for the same block (React's dev double-effect does), and the second ask must leave it open. */
  const setFlippedTo = (id: string, on: boolean) =>
    setFlipped((prev) => {
      if (prev.has(id) === on) return prev
      const next = new Set(prev)
      if (on) next.add(id)
      else next.delete(id)
      return next
    })
  const flip = (id: string) =>
    setFlipped((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  const reveal = (id: string) => {
    if (!ids.includes(id)) return
    if (open === 'all') {
      // open in this shape = (done) equals (flipped): ask for exactly that
      setFlippedTo(id, doneSet.has(id))
    } else onOpen(id)
  }
  return <AccordionContext.Provider value={{ ids, open, setOpen: onOpen, done: doneSet, flipped, flip, doneCount: doneCount ?? new Map(), reveal }}>{children}</AccordionContext.Provider>
}

/**
 * The switch between the two states, ONE small icon button for every page that has it (Hypothèses, Preuve, Profil on a phone): « Tout ouvrir » while the blocks are read one at a time, « Tout fermer » while they are all open. It sits at the end of the page's map row (`SectionNav` `end`), so it is reachable while the page scrolls and costs the page no row of its own.
 */
export function AccordionMode({ open, onOpen }: { open: AccordionOpen; onOpen: (next: AccordionOpen) => void }) {
  const c = ACCORDION_COPY[useLang().lang]
  const all = open === 'all'
  const label = all ? c.closeAll : c.openAll
  const caret: IconName = all ? 'caret-up-bold' : 'caret-down-bold'
  return (
    <button type="button" className="btn btn--icon btn--ghost accordion__all" aria-label={label} title={label} onClick={() => onOpen(all ? null : 'all')}>
      {/* two stacked carets: « all of them open » / « shut but one » — no new glyph in the eager icon set */}
      <span className="accordion__all-glyph" aria-hidden="true">
        <Icon name={caret} size={12} />
        <Icon name={caret} size={12} />
      </span>
    </button>
  )
}

/** The accordion a block sits in, if any — for a page part that must open a block before scrolling to it (a map chip, a deep link). */
export function useAccordion(): Pick<Ctx, 'open' | 'reveal' | 'ids'> | null {
  return useContext(AccordionContext)
}

export interface AccordionItemProps {
  id: string
  title: string
  subtitle?: ReactNode
  details?: ReactNode
  icon?: IconName
  concept?: ConceptId
  family?: Family
  /** One line shown while the block is closed (a verdict: « pour vous, l'ordre change peu »); a done block says its count by itself. */
  summary?: ReactNode
  /** Not a card: the block is a bare region (a person's column on Profil, whose cards are inside it) with its own title style. */
  plain?: boolean
  /** « Précédent » / « Suivant » at the foot of the open block (default). Off for a set of cards that are not a walk (Réponse's, the what-ifs), where the map and « Tout ouvrir » already do the job. */
  nav?: boolean
  className?: string
  children: ReactNode
}

/** One block. Outside an accordion (or with an id the accordion does not list) it is the plain card every section of the app sits in. */
export function AccordionItem({ id, title, subtitle, details, icon, concept, family, summary, plain, nav: withNav = true, className, children }: AccordionItemProps) {
  const t = useT()
  const { lang } = useLang()
  const acc = useContext(AccordionContext)
  // A block whose figures have JUST all been confirmed celebrates once (its pip and ✓ pop, styles/motion.css): seen as a false → true change, never on arrival.
  const doneNow = acc?.done.has(id) ?? false
  const wasDone = useRef(doneNow)
  const [justDone, setJustDone] = useState(false)
  useEffect(() => {
    const became = doneNow && !wasDone.current
    wasDone.current = doneNow
    if (!became) return setJustDone(false)
    setJustDone(true)
    const timer = setTimeout(() => setJustDone(false), 1400)
    return () => clearTimeout(timer)
  }, [doneNow])
  const Heading = useContext(SectionLevel) === 3 ? 'h3' : 'h2'
  const classes = (plain ? '' : 'profile-section surface') + (family ? ` fam-rule fam--${FAMILY_HUE[family]}` : '') + (className ? ` ${className}` : '')
  const pip = concept ? <ConceptPip id={concept} /> : icon && <Icon name={icon} size={18} />
  const detailsFold = details != null && (
    <Fold className="profile-section__details" summary={t.common.moreDetails}>
      {details}
    </Fold>
  )

  if (acc === null || !acc.ids.includes(id)) {
    if (plain) {
      return (
        <section id={id} className={classes} aria-label={title}>
          <Heading className="person__title">{title}</Heading>
          {children}
        </section>
      )
    }
    return (
      <section id={id} className={classes} aria-label={title}>
        <div className="section-header">
          <div className="section-header__main">
            {pip}
            <div className="section-header__text">
              <Heading className="section-header__title">{title}</Heading>
              {subtitle != null && <span className="section-header__sub">{glossed(subtitle)}</span>}
            </div>
          </div>
        </div>
        {detailsFold}
        <div className="profile-section__body">{children}</div>
      </section>
    )
  }

  const c = ACCORDION_COPY[lang]
  const isDone = acc.done.has(id)
  const all = acc.open === 'all'
  const isOpen = all ? isDone === acc.flipped.has(id) : acc.open === id
  const at = acc.ids.indexOf(id)
  const prev = at > 0 ? acc.ids[at - 1] : null
  const next = at < acc.ids.length - 1 ? acc.ids[at + 1] : null
  /** Open a block (this one or a neighbour) and land on it. */
  const show = (target: string) => {
    acc.reveal(target)
    scrollToSection(target)
  }
  const toggle = () => {
    if (!isOpen) return show(id)
    if (all) acc.flip(id)
    else acc.setOpen(null)
  }
  const count = acc.doneCount.get(id)
  const closedLine = isDone && count !== undefined ? c.done(count) : summary
  // A bare block (a person's column) has no body wrapper: its cards are its direct children, which the two-column layout of Profil relies on.
  const body = plain ? children : (
    <div id={`${id}-body`} className="profile-section__body">
      {children}
    </div>
  )
  const nav = withNav && (prev !== null || next !== null) && (
    <Cluster className="accordion__nav">
      {prev !== null && (
        <Chip icon="caret-left-bold" onClick={() => show(prev)}>
          {c.previous}
        </Chip>
      )}
      {next !== null && (
        <Chip icon="caret-right-bold" onClick={() => show(next)}>
          {c.next}
        </Chip>
      )}
    </Cluster>
  )
  return (
    <section id={id} className={classes + ' accordion__item' + (isOpen ? ' is-open' : ' is-closed') + (isDone ? ' is-done' : '') + (justDone ? ' is-just-done' : '')} aria-label={title}>
      <div className={(plain ? '' : 'section-header ') + 'accordion__head'}>
        <Heading className={(plain ? 'person__title' : 'section-header__title') + ' accordion__title'}>
          <button type="button" className="accordion__toggle" aria-expanded={isOpen} aria-controls={plain ? id : `${id}-body`} onClick={toggle}>
            {pip}
            <span className="accordion__name">{title}</span>
            {isDone && <Icon name="check-bold" size={16} />}
            <Icon name={isOpen ? 'caret-up-bold' : 'caret-down-bold'} size={16} />
          </button>
        </Heading>
        {isOpen && subtitle != null && <span className="section-header__sub">{glossed(subtitle)}</span>}
        {!isOpen && closedLine != null && <p className={'accordion__summary' + (isDone ? ' is-done' : '')}>{closedLine}</p>}
      </div>
      {isOpen && detailsFold}
      {isOpen && body}
      {isOpen && nav}
    </section>
  )
}
