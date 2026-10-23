import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { anchorOf } from './resultsModel'
import { scrollToSection, scrollToSectionWhenThere } from './motion'

// THE ADDRESS OF THE RESULTS PAGE (`?v=&essai=&strat=&bloc=&cartes=…`) and the way around it: which page this hook serves, which what-if / strategy / card is open, and how a link to a section
// opens what holds it and lands on it. One third of what lib/useResultsPage.ts used to hold; it reads no profile and no answer — only whether everybody has already stopped working.

export type View = 'answer' | 'decide' | 'proof'

/** The addresses of the days when the results had four views: each lands on the view that holds its content now. */
const LEGACY_VIEW: Readonly<Record<string, View>> = { adjust: 'decide', strategies: 'decide', future: 'decide', verify: 'proof' }

/** The what-ifs under « Décider » that open one at a time (an accordion, kept in the address): the age to aim at · the saving · the spending · a late-life care. The ranked changes are always on the page. */
export type Essai = 'target' | 'save' | 'spend' | 'care'

/** Which what-if a section id of the page belongs to (the ids stay the page's anchors; a link to one opens it). */
const ESSAI_OF: Readonly<Record<string, Essai>> = { viser: 'target', epargner: 'save', depenser: 'spend', soins: 'care' }

/** The strategies of « Décider », read one at a time (components/Accordion.tsx; the address keeps which, `?strat=`): the pensions · the order · the melting · the balance. */
export const STRATS = ['rentes', 'ordre', 'fonte', 'equilibre'] as const
export type Strat = (typeof STRATS)[number]
/** Réponse's cards (`?cartes=`): the answer itself, the comparison of departure ages and « À faire cette année ». The answer is a card like the others (Marc, 2026-10-20):
 *  « Tout fermer » shuts it to its title and one line of the glance. */
export const ANSWER_BLOCKS = ['verdict', 'comparer', 'annee'] as const
/** The blocks of « Preuve », the same way (`?bloc=`). */
export const PROOF_BLOCKS = ['solidite', 'donnees-calcul', 'tableau', 'precision', 'parametres'] as const

export function useResultsAddress(retiredNow: boolean) {
  const [params, setParams] = useSearchParams()
  const setParam = useCallback(
    (key: string, value: string | null) =>
      setParams(
        () => {
          // Built from the address bar as it is NOW, not from the render's copy: a second click that lands before the
          // heavy re-render of the first would otherwise start again from the old address and silently undo it.
          const next = new URLSearchParams(window.location.search)
          if (value === null) next.delete(key)
          else next.set(key, value)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  // TWO PAGES, ONE LEVEL EACH (Marc, 2026-10-19: Profil and Hypothèses have no level above their cards, so Résultats has none either): « Résultats » (/resultats)
  // is the answer and, under it, its proof; « Décider » (/decider) is what to try and how to start and draw — a tab of its own. `view` is the page this hook
  // serves: 'answer' on /resultats (whose cards include the proof's), 'decide' on /decider. A link to a section of the OTHER page goes there (`goTo`).
  const { pathname, hash } = useLocation()
  const navigate = useNavigate()
  const view: View = pathname === '/decider' ? 'decide' : 'answer'
  // The days of the three views in one page left `?v=` in bookmarks (and four views before that): on /resultats, a deciding view goes to /decider with the rest of
  // its address, and a proof view stays here and lands on its section — and the ADDRESS follows, as the router's catch-all does for a path.
  const rawView = view === 'answer' ? params.get('v') : null
  const legacyTarget: View | null = rawView === null ? null : rawView === 'decide' || rawView === 'proof' || rawView === 'answer' ? rawView : (LEGACY_VIEW[rawView] ?? 'answer')
  // The what-ifs of « Décider » open one at a time. The address keeps it (`?essai=`; `none` is « all closed »); an address that carries one of their own keys (an old link with `?care=`,
  // `?spend=` or `?age=`) opens the matching one; a household that has stopped working has no spending to try, so it is offered the other two.
  const essaiKeys: Essai[] = retiredNow ? ['save', 'care'] : ['target', 'save', 'spend', 'care']
  const rawEssai = params.get('essai')
  const inferred: Essai | null = params.get('care') !== null ? 'care' : params.get('spend') !== null ? 'spend' : params.get('age') !== null ? 'save' : null
  // `?essai=all`: every what-if open at once (the same « Tout ouvrir » as the other pages); the view keeps which the reader shut since.
  const essaiAll = rawEssai === 'all'
  const essai: Essai | null = rawEssai === 'none' || essaiAll ? null : (essaiKeys.find((k) => k === rawEssai) ?? (inferred !== null && essaiKeys.includes(inferred) ? inferred : null))
  const setEssai = (next: Essai | null) => setParam('essai', next ?? 'none')
  // « Solidité »: the scenarios and a hard market are on the page; the 3 × 3 grids behind them open on request (a household that has stopped working has no age to range over: only the grids, open). The address keeps it (`?solidite=grids`).
  const gridsOpen = retiredNow || params.get('solidite') === 'grids'
  const setGridsOpen = (open: boolean) => setParam('solidite', open ? 'grids' : null)
  // The strategy open on « Décider » (`?strat=`; « none » is all closed; no key — undefined — lets the view open its first one). A link to one opens it (goTo below).
  const rawStrat = params.get('strat')
  const strat: Strat | null | undefined = rawStrat === null ? undefined : rawStrat === 'none' ? null : STRATS.find((k) => k === rawStrat)
  const setStrat = (next: Strat | null) => setParam('strat', next ?? 'none')
  // « Ce qui change le plus », the first card on « Décider »: open unless the address shut it (`?leviers=none`), so « Tout fermer » closes it with the rest (Marc,
  // 2026-10-20: it was a bare surface the switch never reached, and read as « the first one stayed open »). A household that has stopped working has no levers.
  const leversOpen = !retiredNow && params.get('leviers') !== 'none'
  const setLeversOpen = (open: boolean) => setParam('leviers', open ? null : 'none')
  // A what-if that came from one of its own keys is written down at once: when that key goes (« L'ajouter à mes événements » clears `?care=`), the reader stays where they are.
  useEffect(() => {
    if (view === 'decide' && essai !== null && rawEssai !== essai) setParam('essai', essai)
  }, [view, rawEssai, essai, setParam])
  useEffect(() => {
    if (legacyTarget === null) return
    const next = new URLSearchParams(window.location.search)
    next.delete('v')
    if (legacyTarget === 'decide') {
      // « Avenir » (`?v=future`) is gone: its care what-if is a thing to try under « Décider ».
      if (rawView === 'future') next.set('essai', 'care')
      navigate({ pathname: '/decider', search: next.toString() }, { replace: true })
      return
    }
    setParams(next, { replace: true })
    if (legacyTarget === 'proof') land(next.get('bloc') ?? 'solidite')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacyTarget])

  // The landing in progress (a wait for the anchor, then the hold): a new link or leaving the page cancels it, so two landings never fight over the scroll.
  const landing = useRef<() => void>(() => {})
  const land = (id: string) => {
    landing.current()
    landing.current = scrollToSectionWhenThere(id)
  }
  useEffect(() => () => landing.current(), [])
  const scrollTo = (id: string) => scrollToSection(id)
  /** What opening a section takes, written into an address: the block it sits in (accordions mount nothing while closed), and the « D’où vient l’argent »
   *  chart's card, ages view and « Détail » tab. Pure on the address, so a link to the OTHER page carries it there. */
  const opening = (target: View, id: string, next: URLSearchParams): void => {
    // The what-ifs and the 3 × 3 grids are folds that open on request.
    const wanted = target === 'decide' ? ESSAI_OF[id] : undefined
    if (wanted !== undefined && next.get('essai') !== 'all') next.set('essai', wanted)
    if (target === 'decide' && (STRATS as readonly string[]).includes(id)) next.set('strat', id)
    if (target === 'decide' && id === 'ajuster') next.delete('leviers')
    // Réponse opens its first card only (`?cartes=all` opens every one): a link to another opens it, unless they are all open already.
    if (target === 'answer' && (ANSWER_BLOCKS as readonly string[]).includes(id) && next.get('cartes') !== 'all') next.set('cartes', id)
    if (target === 'answer' && id === 'graphique') {
      if (next.get('cartes') !== 'all') next.set('cartes', 'comparer')
      next.delete('cv')
      next.set('metric', 'detail')
    }
    if (target === 'proof') {
      if (id === 'sensibilite') next.set('solidite', 'grids')
      const block = id === 'sensibilite' ? 'solidite' : id
      if ((PROOF_BLOCKS as readonly string[]).includes(block) && next.get('bloc') !== 'tout') next.set('bloc', block)
    }
  }
  const pageOf = (target: View): View => (target === 'decide' ? 'decide' : 'answer')
  // A chip of the section map opens the block it names before the map scrolls to it. The proof's sections share Résultats with the answer's.
  // It lands the section itself (`true` to the map): ONE landing at a time for the page, the map's and a door's alike.
  const openBlock = (id: string): true => {
    const next = new URLSearchParams(window.location.search)
    opening(view === 'decide' ? 'decide' : (PROOF_BLOCKS as readonly string[]).includes(id) ? 'proof' : 'answer', id, next)
    setParams(next, { replace: true })
    // « D’où vient l’argent »: three taps deep is one tap from the map — its bars appear only once the card, the view and the tab are open, and the landing is
    // on the bars' title: the panel's top is three rows of pickers, a phone's whole screen.
    land(id === 'graphique' ? 'graphique-sources' : id)
    return true
  }
  // A link to a section: open what holds it, then land — on this page, or on the other one (the section in the address's # , landed on arrival below).
  const goTo = (target: View, wantedId: string) => {
    const next = new URLSearchParams(window.location.search)
    opening(target, wantedId, next)
    if (pageOf(target) === view) {
      setParams(next, { replace: true })
      return void land(wantedId)
    }
    navigate({ pathname: pageOf(target) === 'decide' ? '/decider' : '/resultats', search: next.toString(), hash: wantedId })
  }
  // Arriving with a section in the # (a link from the other page): land on it once it exists (the views are lazy chunks; ≤ 5 s).
  const [arrivedAt] = useState(() => anchorOf(hash))
  useEffect(() => {
    if (arrivedAt !== null) land(arrivedAt)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrivedAt])

  // Old deep links chose one question (`?q=save|stop`); the answers share the page now, so the link becomes a scroll
  // to its section, and the key is dropped from the address. Read once, at mount: stripping the key must not re-run
  // (and so cancel) the settling scroll below.
  const [legacyQ] = useState(() => params.get('q'))
  useEffect(() => {
    if (legacyQ !== 'save' && legacyQ !== 'stop') return
    setParam('q', null)
    // « Combien épargner ? » is a what-if of Décider (another page now); « Quand arrêter » stays here. The same landing as any link.
    if (legacyQ === 'save') goTo('decide', 'epargner')
    else land('arreter')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legacyQ, setParam])

  return { params, setParams, setParam, view, scrollTo, openBlock, goTo, strat, setStrat, leversOpen, setLeversOpen, essai, essaiAll, essaiKeys, setEssai, gridsOpen, setGridsOpen }
}
