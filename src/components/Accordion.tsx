import { createContext, useContext, useState, type ReactNode } from 'react'
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
import { SubTabs } from './SubTabs'

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
      if (doneSet.has(id) !== flipped.has(id)) flip(id)
    } else onOpen(id)
  }
  return <AccordionContext.Provider value={{ ids, open, setOpen: onOpen, done: doneSet, flipped, flip, doneCount: doneCount ?? new Map(), reveal }}>{children}</AccordionContext.Provider>
}

/** The switch between the two shapes, for a page that offers both: « Un bloc à la fois » · « Tout ouvrir ». `first` is the block that opens when leaving « all ». */
export function AccordionMode({ open, onOpen, first }: { open: AccordionOpen; onOpen: (next: AccordionOpen) => void; first: string }) {
  const c = ACCORDION_COPY[useLang().lang]
  return (
    <SubTabs
      size="mini"
      ariaLabel={c.modeLabel}
      value={open === 'all' ? 'all' : 'one'}
      onSelect={(k: 'one' | 'all') => onOpen(k === 'all' ? 'all' : first)}
      options={[
        { key: 'one', label: c.oneAtATime },
        { key: 'all', label: c.openAll },
      ]}
    />
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
  className?: string
  children: ReactNode
}

/** One block. Outside an accordion (or with an id the accordion does not list) it is the plain card every section of the app sits in. */
export function AccordionItem({ id, title, subtitle, details, icon, concept, family, summary, plain, className, children }: AccordionItemProps) {
  const t = useT()
  const { lang } = useLang()
  const acc = useContext(AccordionContext)
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
  const nav = (prev !== null || next !== null) && (
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
    <section id={id} className={classes + ' accordion__item' + (isOpen ? ' is-open' : ' is-closed') + (isDone ? ' is-done' : '')} aria-label={title}>
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
