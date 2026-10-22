import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Lang } from '../../i18n'
import { CASH_BUFFER_COPY } from '../../lib/cashBufferCopy'
import { KIDS_COPY } from '../../lib/kidsCopy'
import { RESULTS_COPY } from '../../lib/resultsCopy'
import { SHEET_COPY } from '../../lib/sheetCopy'
import type { SheetModel } from '../../lib/sheetModel'
import { sheetView, type StatView } from '../../lib/sheetView'
import type { ConceptId } from '../../lib/concepts'
import { useParamChoice } from '../../lib/useParamChoice'
import { Accordion, AccordionItem, AccordionMode, type AccordionOpen } from '../Accordion'
import { Chip } from '../Chip'
import { ConceptPip } from '../ConceptPip'
import { EmptyState } from '../EmptyState'
import { Fold } from '../Fold'
import { Cluster } from '../Layout'
import { PinStack } from '../PinStack'
import { SectionHeader, SectionLevel } from '../SectionHeader'
import { SectionNav } from '../SectionNav'
import { SkeletonText } from '../SkeletonShapes'
import { StatBar } from './StatBar'

// The household sheet: a clean page of cards. It draws the SHEET VIEW (lib/sheetView.ts) and nothing else: every figure is already text there, so this file
// formats no number — the guard in lib/sheetSkins.test.ts keeps it that way. The order is the order of the reader's questions: can we stop, and how sure
// is that (the verdict) · when (the plan's line, handed in) · what does life look like today and once retired · what is it standing on · what would
// make it surer. Every card that holds a figure of the profile leads to the field that changes it.

/** One measure: its figure, its bar, one line of what it is read from — and, folded away, what the measure means and what a full bar stands for. */
function StatCard({ s, howToRead }: { s: StatView; howToRead: string }) {
  return (
    <li className={'surface sheet__stat sheet__stat--' + s.id}>
      <div className="sheet__stat-head">
        <p className="sheet__stat-name">{s.name}</p>
        {/* waiting, the figure is a ghost of its likely self; « Calcul en cours… » stays, for assistive technology */}
        {s.status === 'pending' ? (
          <p className="skeleton-as-sheet__stat-value skeleton-as-mono">
            <span className="sr-only">{s.valueText}</span>
            <SkeletonText>{s.ghostValue}</SkeletonText>
          </p>
        ) : (
          <p className="sheet__stat-value mono">{s.valueText}</p>
        )}
      </div>
      <StatBar name={s.name} percent={s.percent} valueText={s.valueText} />
      {/* A measure still being worked out keeps the room of its line (two, as the earliest age's « Vous prévoyez arrêter à… » takes): the cards under it stay put. */}
      {s.status === 'pending' ? (
        <p className="sheet__stat-detail">
          <SkeletonText>{s.ghost}</SkeletonText>
        </p>
      ) : (
        s.detail && <p className="sheet__stat-detail">{s.detail}</p>
      )}
      <Fold summary={howToRead}>
        <p className="field-row__hint">{s.hint}</p>
        <p className="field-row__hint sheet__scale">{s.scaleText}</p>
      </Fold>
    </li>
  )
}

// Every section of the sheet is a card of the accordion (components/Accordion.tsx), in reading order. Which one is open is the address's (`?bloc=`): the FIRST card
// only, on arrival — the rest are closed to their title and one sentence, « Tout ouvrir » gives them all. The plan's line and the two readouts handed in
// (pages/Fiche.tsx) are cards of the same accordion, under the ids listed here. « Précédent / Suivant » are off: the map does that job.
export const SHEET_BLOCKS = ['fiche-situation', 'fiche-ligne', 'fiche-today', 'fiche-retirement', 'fiche-detenu', 'coussin', 'enfants', 'fiche-preciser'] as const

export function SheetSerious({ model, lang, births, names, timeline, cards, shown }: { model: SheetModel; lang: Lang; births: readonly number[]; names: readonly string[]; timeline?: ReactNode; cards?: ReactNode; shown?: { timeline: boolean; cash: boolean; kids: boolean } }) {
  const v = sheetView(model, lang, SHEET_COPY[lang], births, names)
  const sentences = SHEET_COPY[lang].sentences
  const groupConcept = (id: string): ConceptId => (id === 'today' ? 'budget' : 'depart')
  const [bloc, setBloc] = useParamChoice<string>('bloc', [...SHEET_BLOCKS, 'tout', 'none'], SHEET_BLOCKS[0])
  const open: AccordionOpen = bloc === 'tout' ? 'all' : bloc === 'none' ? null : bloc
  const setOpen = (next: AccordionOpen) => setBloc(next === 'all' ? 'tout' : (next ?? 'none'))
  // The map of the sheet, the same chips as every long page (Résultats, the glossary): each section by its own title and pip.
  const links = [
    { id: 'fiche-situation', label: v.verdict.title, concept: 'reponse' as const },
    ...(shown?.timeline ? [{ id: 'fiche-ligne', label: RESULTS_COPY[lang].timeline.title, concept: 'annee' as const }] : []),
    ...v.groups.map((g) => ({ id: `fiche-${g.id}`, label: g.title, concept: groupConcept(g.id) })),
    { id: 'fiche-detenu', label: v.holdings.title, concept: 'nid' as const },
    ...(shown?.cash ? [{ id: 'coussin', label: CASH_BUFFER_COPY[lang].title, concept: 'coussin' as const }] : []),
    ...(shown?.kids ? [{ id: 'enfants', label: KIDS_COPY[lang].cost.title, concept: 'enfants' as const }] : []),
    ...(v.sharpen !== null ? [{ id: 'fiche-preciser', label: v.sharpen.title, concept: 'precision' as const }] : []),
  ]
  return (
    <div className="sheet sheet--serious">
      <PinStack>
        <SectionNav ariaLabel={SHEET_COPY[lang].nav} links={links} onPick={(id) => open !== 'all' && setBloc(id)} end={<AccordionMode open={open} onOpen={setOpen} />} />
      </PinStack>
      <Accordion ids={SHEET_BLOCKS} open={open} onOpen={(id) => setBloc(id ?? 'none')}>
      {/* Not enough figures for an answer: the same empty state as the results page, and the one way on. */}
      {v.empty !== null && (
        <div className="surface sheet__empty">
          <EmptyState tone="calm" icon="identification-card-bold">
            {v.empty}
          </EmptyState>
          <Link className="btn btn--primary btn--sm" to="/profil">
            {v.toProfile}
          </Link>
        </div>
      )}

      <AccordionItem id="fiche-situation" className="sheet__section" title={v.verdict.title} subtitle={sentences.situation} concept="reponse" nav={false}>
        <ul className="sheet__stats">
          {v.verdict.stats.map((s) => (
            <StatCard key={s.id} s={s} howToRead={v.howToRead} />
          ))}
        </ul>
        <p className="field-row__hint">{v.verdict.accuracy}</p>
        <Link className="btn btn--ghost btn--sm" to="/resultats">
          {v.verdict.toResults}
        </Link>
      </AccordionItem>

      {timeline}

      {v.groups.map((g) => (
        <AccordionItem key={g.id} id={`fiche-${g.id}`} className="sheet__section" title={g.title} subtitle={g.hint} concept={groupConcept(g.id)} nav={false}>
          <ul className="sheet__stats">
            {g.stats.map((s) => (
              <StatCard key={s.id} s={s} howToRead={v.howToRead} />
            ))}
          </ul>
        </AccordionItem>
      ))}

      <AccordionItem id="fiche-detenu" className="sheet__section" title={v.holdings.title} subtitle={sentences.holdings} concept="nid" nav={false}>
        {/* Nothing entered yet: say so, and lead to where the accounts are typed — an open card must never be a bare title. */}
        {v.holdings.groups.length === 0 && (
          <>
            <p className="field-row__hint">{v.holdings.empty}</p>
            <Link className="btn btn--ghost btn--sm" to="/profil">
              {v.toProfile}
            </Link>
          </>
        )}
        <SectionLevel.Provider value={3}>
          {v.holdings.groups.map((g) => (
            <div key={g.id} className="sheet__group">
              <SectionHeader title={g.title} subtitle={g.totalText ?? undefined} concept={g.id === 'investable' ? 'nid' : g.id === 'pension' ? 'employeur' : 'maison'} />
              {g.note && <p className="field-row__hint">{g.note}</p>}
              <ul className="sheet__slots">
                {g.items.map((s) => (
                  <li key={s.key} className="surface sheet__slot">
                    <Link className="sheet__slot-title" to={s.to} aria-label={s.editLabel}>
                      {s.title}
                    </Link>
                    <p className="field-row__hint">{s.owner}</p>
                    {s.amountText !== null && <p className="sheet__slot-amount mono">{s.amountText}</p>}
                    {s.shareText !== null && <p className="field-row__hint">{s.shareText}</p>}
                    {s.extra && <p className="field-row__hint">{s.extra}</p>}
                    {s.note && <p className="field-row__hint">{s.note}</p>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {v.holdings.rooms.length > 0 && (
            <div className="sheet__group">
              <SectionHeader title={v.holdings.roomTitle} concept="droits" />
              <ul className="sheet__rooms">
                {v.holdings.rooms.map((r) => (
                  <li key={r.key}>
                    <Link to={r.to} className="info-note__link">
                      {r.text}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionLevel.Provider>
        {v.holdings.tags.length > 0 && (
          <Cluster>
            {v.holdings.tags.map((t) => (
              <Chip key={t}>{t}</Chip>
            ))}
          </Cluster>
        )}
      </AccordionItem>

      {/* What the profile says about the household, read here and not among the fields: the cash buffer, what the children cost (pages/Fiche.tsx hands them in). */}
      {cards}

      {v.sharpen !== null && (
        <AccordionItem id="fiche-preciser" className="sheet__section" title={v.sharpen.title} subtitle={sentences.sharpen} details={v.sharpen.intro} concept="precision" nav={false}>
          <p className="field-row__hint">{v.sharpen.note}</p>
          {v.sharpen.items.length > 0 && (
            <ul className="sheet__movers">
              {v.sharpen.items.map((m) => (
                <li key={m.key} className="surface sheet__mover">
                  <ConceptPip id={m.concept} size="sm" />
                  <Link className="sheet__mover-name info-note__link" to={m.to}>
                    {m.name}
                  </Link>
                  <span className="mono">{m.swingText}</span>
                </li>
              ))}
            </ul>
          )}
          {v.sharpen.absent.length > 0 && (
            <>
              <p className="verdict__range-title">{v.sharpen.absentTitle}</p>
              <ul className="sheet__absent">
                {v.sharpen.absent.map((text) => (
                  <li key={text}>{text}</li>
                ))}
              </ul>
            </>
          )}
        </AccordionItem>
      )}
      </Accordion>
    </div>
  )
}
