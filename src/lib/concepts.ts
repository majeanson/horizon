import type { StrategyKey } from '../engine/bridge'
import type { AccountKind } from '../engine/types'
import type { DocId } from './facts'
import type { StarterId } from './plannedExpenses'
import type { IconName } from './pipIcons'
import type { PIP_ICONS_MORE } from './pipIconsMore'

// The concept registry: every idea the app names has ONE glyph and belongs to ONE family, and a family has ONE colour, so
// that similar ideas are recognised at a glance — the same pip in the Glossaire, on the profile, on the results, in a
// chart's legend. Data only: the words stay in the dictionaries (i18n.ts, glossaryCopy.ts), because this file is read by
// components the shell may pull in and the French dictionary is held to a budget (scripts/check-bundle.mjs).
//
// RULES, held by conceptRegistry.test.ts:
//   • no two concepts share a glyph (a glyph that meant two things was the review's « I cannot tell RRQ from my events »);
//   • a family is a hue of the riso palette (core.css), so its contrast was already worked out: the glyph is the `-deep`
//     tier on the `-wash`, the label beside it the `-ink` tier;
//   • colour is never the only cue — the glyph differs and the name is always written beside the pip.
// ONE DELIBERATE EXCEPTION: the three scenarios (Prudent · Neutre · Audacieux) are an ordered scale that must stay tellable apart on
// a slider's track and in a chart's legend, so they keep their own three hues (sky · marigold · sage, `.tone--*` in revamp.css)
// as dots — a family is one hue and cannot do that. The word « scénario » itself is a concept like any other.

export type ConceptGlyph = IconName | keyof typeof PIP_ICONS_MORE

/** The six families, named by what they are to the reader (the Glossaire's legend says it in words). */
export const FAMILIES = ['public', 'accounts', 'household', 'work', 'tax', 'horizon'] as const
export type Family = (typeof FAMILIES)[number]

/** The hue each family wears: the riso ink whose `-deep` / `-wash` / `-ink` tokens the pip reads (`ink` = the neutral). */
export const FAMILY_HUE: Record<Family, 'sage' | 'marigold' | 'sky' | 'berry' | 'terracotta' | 'ink'> = {
  public: 'sage',
  accounts: 'marigold',
  household: 'sky',
  work: 'berry',
  tax: 'terracotta',
  horizon: 'ink',
}

interface Concept {
  glyph: ConceptGlyph
  family: Family
}

const c = (family: Family, glyph: ConceptGlyph): Concept => ({ family, glyph })

export const CONCEPTS = {
  // ── What the State pays — sage ─────────────────────────────────────────────────────────────────────────────────────
  rrq: c('public', 'shield-check-bold'),
  psv: c('public', 'hand-heart-bold'),
  srg: c('public', 'hand-coins-bold'),
  indexation: c('public', 'trend-up-bold'),
  releve: c('public', 'file-text-bold'),
  mga: c('public', 'ruler-bold'),
  residence: c('public', 'globe-hemisphere-west-bold'),
  // ── Registered accounts and shelters — marigold ────────────────────────────────────────────────────────────────────
  reer: c('accounts', 'piggy-bank-bold'),
  celi: c('accounts', 'lock-open-bold'),
  ferr: c('accounts', 'hand-withdraw-bold'),
  verrouille: c('accounts', 'lock-key-bold'),
  rver: c('accounts', 'plant-bold'),
  rpac: c('accounts', 'stack-bold'),
  droits: c('accounts', 'gauge-bold'),
  fonte: c('accounts', 'drop-bold'),
  // ── The household and what it owns outside the accounts — sky ──────────────────────────────────────────────────────
  personne: c('household', 'user-bold'),
  famille: c('household', 'users-three-bold'),
  enfants: c('household', 'baby-bold'),
  maison: c('household', 'house-bold'),
  hypotheque: c('household', 'key-bold'),
  evenements: c('household', 'calendar-blank-bold'),
  nonEnregistre: c('household', 'wallet-bold'),
  pbr: c('household', 'receipt-bold'),
  // The nine planned-expense starters (« Dépenses à prévoir »): events, so the household's hue.
  entretien: c('household', 'wrench-bold'),
  renovation: c('household', 'hammer-bold'),
  vehicule: c('household', 'car-bold'),
  heritage: c('household', 'gift-bold'),
  toit: c('household', 'house-line-bold'),
  loyer: c('household', 'door-bold'),
  soins: c('household', 'first-aid-kit-bold'),
  projet: c('household', 'lightbulb-bold'),
  // ── Work and the employer — berry ──────────────────────────────────────────────────────────────────────────────────
  salaire: c('work', 'briefcase-bold'),
  employeur: c('work', 'bank-bold'),
  rregop: c('work', 'building-apartment-bold'),
  viagere: c('work', 'infinity-bold'),
  tempsPartiel: c('work', 'clock-bold'),
  // ── Money that leaves — terracotta ─────────────────────────────────────────────────────────────────────────────────
  impot: c('tax', 'percent-bold'),
  tranche: c('tax', 'chart-bar-bold'),
  tauxMoyen: c('tax', 'chart-pie-slice-bold'),
  recuperation: c('tax', 'arrow-counter-clockwise-bold'),
  arc: c('tax', 'identification-card-bold'),
  budget: c('tax', 'calculator-bold'),
  depenses: c('tax', 'shopping-cart-bold'),
  // ── Horizon's own words and its assumptions — neutral ink ──────────────────────────────────────────────────────────
  reponse: c('horizon', 'target-bold'),
  nid: c('horizon', 'egg-bold'),
  coussin: c('horizon', 'lifebuoy-bold'),
  scenario: c('horizon', 'git-fork-bold'),
  depart: c('horizon', 'flag-bold'),
  finPlan: c('horizon', 'flag-checkered-bold'),
  dollars: c('horizon', 'currency-dollar-bold'),
  rendement: c('horizon', 'chart-line-up-bold'),
  inflation: c('horizon', 'thermometer-bold'),
  documents: c('horizon', 'files-bold'),
  aide: c('horizon', 'question-bold'),
  stratMine: c('horizon', 'star-bold'),
  stratTot: c('horizon', 'lightning-bold'),
  stratStandard: c('horizon', 'equals-bold'),
  stratMax: c('horizon', 'mountains-bold'),
  stratPont: c('horizon', 'path-bold'),
  stratDeux: c('horizon', 'handshake-bold'),
  // The places of the app itself: the plans kept, the estimates, the views of Résultats and the sections they map.
  plans: c('horizon', 'bookmarks-simple-bold'),
  estimation: c('horizon', 'sparkle-bold'),
  marches: c('horizon', 'pulse-bold'),
  decider: c('horizon', 'signpost-bold'),
  preuve: c('horizon', 'seal-check-bold'),
  annee: c('horizon', 'calendar-check-bold'),
  essayer: c('horizon', 'flask-bold'),
  ordre: c('horizon', 'list-numbers-bold'),
  precision: c('horizon', 'crosshair-bold'),
  hypotheses: c('horizon', 'sliders-horizontal-bold'),
  solidite: c('horizon', 'anchor-bold'),
} as const satisfies Record<string, Concept>

export type ConceptId = keyof typeof CONCEPTS

// ── Keyed by the app's own unions, so a new strategy / document / starter does not compile until it has its concept ────────
/** The six ways of starting the pensions (Décider › « Ordre et rentes »). */
export const STRATEGY_CONCEPT: Record<StrategyKey, ConceptId> = { mine: 'stratMine', asap: 'stratTot', standard: 'stratStandard', max: 'stratMax', bridge: 'stratPont', both: 'stratDeux' }
/** The three kinds of account the engine knows (engine/types.ts). */
export const ACCOUNT_CONCEPT: Record<AccountKind, ConceptId> = { rrsp: 'reer', tfsa: 'celi', nonReg: 'nonEnregistre' }
/** The seven documents of the checklist (lib/facts.ts). */
export const DOC_CONCEPT: Record<DocId, ConceptId> = { rrq: 'rrq', tax: 'impot', bank: 'reer', employer: 'employeur', home: 'maison', budget: 'budget', residence: 'residence' }
/** The nine starting points of « Dépenses à prévoir » (lib/plannedExpenses.ts). */
export const STARTER_CONCEPT: Record<StarterId, ConceptId> = { upkeep: 'entretien', renovation: 'renovation', vehicle: 'vehicule', heritage: 'heritage', roof: 'toit', car: 'vehicule', rent: 'loyer', care: 'soins', project: 'projet' }

// ── The Glossaire: which concept each entry wears (keys are the entries' ids, shared by FR and EN) ───────────────────────
/** A group of lib/glossaryCopy.ts is ONE family (glossaryCopy.test / conceptRegistry.test hold it). */
export const GLOSSARY_GROUP_FAMILY: Record<string, Family> = {
  publics: 'public',
  comptes: 'accounts',
  autres: 'household',
  employeur: 'work',
  impots: 'tax',
  horizon: 'horizon',
}
export const GLOSSARY_TERM_CONCEPT: Record<string, ConceptId> = {
  rrq: 'rrq', psv: 'psv', srg: 'srg', indexation: 'indexation', releve: 'releve', mga: 'mga',
  reer: 'reer', celi: 'celi', ferr: 'ferr', droits: 'droits', fonte: 'fonte', rver: 'rver', rpac: 'rpac', cri: 'verrouille', frv: 'verrouille',
  'non-enregistre': 'nonEnregistre', pbr: 'pbr',
  'rente-employeur': 'employeur', 'rente-viagere': 'viagere', rregop: 'rregop',
  tranche: 'tranche', 'taux-moyen': 'tauxMoyen', recuperation: 'recuperation', arc: 'arc',
  reponse: 'reponse', nid: 'nid', coussin: 'coussin', scenario: 'scenario', depart: 'depart', 'fin-plan': 'finPlan',
  'dollars-aujourdhui': 'dollars', rendement: 'rendement', inflation: 'inflation',
}
/** « Où trouver vos documents », in the order of the list: the document's own concept. */
export const GLOSSARY_DOC_CONCEPTS: readonly ConceptId[] = ['releve', 'arc', 'employeur', 'reer', 'verrouille']
export const GLOSSARY_DOCS_CONCEPT: ConceptId = 'documents'
export const GLOSSARY_HELP_CONCEPT: ConceptId = 'aide'

/** The concept whose pip stands for its whole family (the Glossaire's legend and group headers). */
export const FAMILY_FACE: Record<Family, ConceptId> = {
  public: 'rrq',
  accounts: 'reer',
  household: 'famille',
  work: 'salaire',
  tax: 'impot',
  horizon: 'reponse',
}
