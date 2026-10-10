import { bridgeRun, profileLevers } from '../bridge.ts'
import { agesLedger, planGlance, retirementState } from '../ledger.ts'
import { monthsToPayoff, payoffYear } from '../home.ts'
import { project } from '../projection.ts'
import { retireAt } from '../retireAt.ts'
import type { Person } from '../types.ts'
import { EXAMPLE_IDS, EXAMPLES, type ExampleHousehold } from './examples.ts'

// EXAMPLES.md — every example household, printed: what goes in, what comes out, and the figures to hold beside an official
// calculator. Never hand-written: `npm run examples` writes it, and src/lib/examplesMd.test.ts fails when the committed
// file differs, so a change to the engine that moves any example's answer shows up here, in a table a person can read,
// in the same commit. French only (it is read by the household's author, in French); the app's own copy is bilingual.

const $ = (n: number): string => `${Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')} $`
const $c = (n: number): string => `${(Math.round(n * 100) / 100).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d),)/g, ' ')} $`
const pct = (x: number, d = 1): string => `${(x * 100).toFixed(d).replace('.', ',')} %`

const NAMES: Record<string, string> = {
  golden: 'Couple, un en fonction publique',
  average: 'Couple, revenus moyens',
  modest: 'Une personne, petit revenu',
  rich: 'Couple, hauts revenus',
  behind: 'Une personne, en retard',
  retired: 'Couple à la retraite',
  newcomer: 'Arrivée au Canada à 30 ans',
  heir: 'Une personne, grand héritage',
  downsizer: 'Couple, vendre la maison',
  planner: 'Couple, une vie à planifier',
}

function personTable(p: Person): string[] {
  const a = p.accounts
  const pension = p.pensions.map((d) => (d.inPay ? `${d.label} en cours : ${$(d.inPay.annual)} par année` : `${d.label} : ${d.serviceYearsToDate} ans de service, début à ${d.startAge} ans`)).join(' ; ') || 'aucune'
  return [
    `| ${p.name} | né·e en ${p.birth.year}-${String(p.birth.month).padStart(2, '0')} | retraite à ${p.retirementAge} ans | salaire ${$(p.salaryToday)} | RRQ à ${p.rrq.startAge} ans, PSV à ${p.oas.startAge} ans (au Canada depuis ${p.oas.residentSince}) |`,
    `| ↳ comptes | REER ${$(a.rrsp.balance)}${a.rrsp.lockedIn ? ` (dont immobilisé ${$(a.rrsp.lockedIn)})` : ''} (+${$(a.rrsp.annualContribution)}/an${a.rrsp.employerContribution ? `, employeur +${$(a.rrsp.employerContribution)}/an` : ''}) | CELI ${$(a.tfsa.balance)} (+${$(a.tfsa.annualContribution)}/an) | non enregistré ${$(a.nonReg.balance)} (+${$(a.nonReg.annualContribution)}/an) | rente d’employeur : ${pension} |`,
  ]
}

function section(e: ExampleHousehold): string[] {
  const { household: h, assumptions: a } = e
  const out: string[] = []
  const g = planGlance(h, a)
  const earliest = retireAt(h, a, { stopAtFirstOk: true }).earliestOk
  out.push(`## ${e.id} — ${NAMES[e.id]}`, '')
  out.push('### Ce qui entre', '', '| Personne | Naissance | Retraite | Revenu | Rentes publiques |', '| --- | --- | --- | --- | --- |')
  for (const p of h.persons) out.push(...personTable(p))
  out.push('', `Dépenses : ${$(h.spending.workingToday)} par année en travaillant, ${$(h.spending.retiredToday)} à la retraite (dollars d’aujourd’hui). Inflation ${pct(a.inflation)}, croissance des salaires ${pct(a.wageGrowth)}, rendements REER ${pct(a.returns.rrsp)} · CELI ${pct(a.returns.tfsa)} · non enregistré ${pct(a.returns.nonReg)}, horizon ${a.horizonAge} ans, ordre de retrait ${a.withdrawalOrder.join(' → ')}.`, '')

  if (h.home) {
    const m = h.home.mortgage
    const months = monthsToPayoff(m.balance, m.rate, m.monthlyPayment)
    const payoff = m.balance <= 0 ? 'aucune hypothèque' : months === null ? 'jamais remboursée à ce paiement' : `payée en ${payoffYear(a.today.year, months)}`
    const sale = h.home.sale ? `vendue à ${h.home.sale.age} ans (logement de remplacement : ${$(h.home.sale.replacementCost)})` : 'gardée à vie'
    out.push(`Résidence principale : valeur ${$(h.home.value)}, hypothèque ${$(m.balance)} à ${pct(m.rate)} (${$(m.monthlyPayment)} par mois, ${payoff}), ${sale}. Le paiement s’ajoute aux dépenses tant qu’il dure ; la valeur nette de la maison compte à part des comptes.`, '')
  }

  const life: string[] = []
  const kids = h.kidsEffects
  if (h.childSpending) life.push(`enfants à venir ou à la maison (${(h.children ?? []).join(', ')}) : ${h.childSpending.byAge ? `coût par tranche d’âge ${h.childSpending.byAge.map($).join(' · ')} par année` : `${$(h.childSpending.perChild)} par enfant et par année`} jusqu’à ${h.childSpending.untilAge} ans`)
  if (kids) life.push(`${kids.benefits ? 'allocations pour enfants comptées' : 'allocations non comptées'}${kids.qppExclusion ? ', exclusion des mois avec un enfant de moins de 7 ans dans la moyenne du RRQ' : ''}${kids.leave ? `, congé parental (${kids.leave.birthParentWeeks} + ${kids.leave.otherParentWeeks} semaines partagées)` : ''}`)
  for (const p of h.persons) if (p.partTime) life.push(`${p.name} garde ${pct(p.partTime.share, 0)} de son salaire jusqu’à ${p.partTime.untilAge} ans`)
  for (const f of h.flows ?? []) life.push(`${f.label} : ${f.kind === 'windfall' ? `${$(f.amount)} reçus en ${f.fromYear}` : f.kind === 'expense' ? `${$(f.amount)} par année de ${f.fromYear} à ${f.toYear}` : `${$(f.amount)} par année de ${f.fromYear} à ${f.toYear} (revenu)`}`)
  if (a.retiredSpendingDrift) life.push(`les dépenses à la retraite changent de ${pct(a.retiredSpendingDrift)} par année (en termes réels) à partir de 70 ans`)
  if (life.length > 0) out.push(`Événements de vie : ${life.join(' ; ')}.`, '')

  out.push('### Ce qui sort', '')
  out.push(`- Le plan tel que décrit : ${g.ok ? `tient jusqu’à l’horizon, valeur nette à la fin ${$(g.netWorthEnd)} (dollars d’aujourd’hui)` : `manque d’argent en ${g.firstShortfallYear}`}.`)
  out.push(
    retirementState(h, a).everyoneRetired
      ? '- Tout le monde est déjà à la retraite : la question n’est plus « quand ? » mais « l’argent dure-t-il ? » (la réponse est la ligne du dessus).'
      : `- L’âge le plus tôt où tout le monde peut partir et que l’argent dure : ${earliest === null ? 'aucun, jusqu’à 70 ans' : `${earliest} ans`}.`,
    '',
  )

  out.push('### Le calcul des rentes', '', '| Personne | RRQ | PSV |', '| --- | --- | --- |')
  for (const l of agesLedger(h, a)) {
    const name = h.persons.find((p) => p.id === l.id)!.name
    const q = l.rrq
    const o = l.oas
    out.push(
      `| ${name} | première rente ${String(q.start.month).padStart(2, '0')}/${q.start.year} : (base ${$c(q.base)} + 1ʳᵉ supp. ${$c(q.additionalFirst)} + 2ᵉ supp. ${$c(q.additionalSecond)}) × ajustement ${pct(q.adjustment)} = ${$c(q.monthly)}/mois, soit ${$(q.monthlyToday)} d’aujourd’hui | première pension ${String(o.start.month).padStart(2, '0')}/${o.start.year} : ${$c(o.full)} × résidence ${pct(o.residence, 0)} × report ${pct(o.multiplier - 1)} = ${$c(o.monthly)}/mois, soit ${$(o.monthlyToday)} d’aujourd’hui |`,
    )
  }
  out.push('')

  const levers = profileLevers(h, h.persons[0].id)
  const run = bridgeRun(h, a, levers)
  const first = h.persons[0]
  out.push(`### Année par année — ${first.name} (dollars d’aujourd’hui ; le ménage entier ; un an sur cinq)`, '', '| Âge | Dépenses | Travail | Rente d’employeur | RRQ | PSV | SRG | Tiré du nid | Impôt | Nid en fin d’année | État |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
  const shown = run.rows.filter((r, i) => i === 0 || r.age % 5 === 0)
  for (const r of shown) out.push(`| ${r.age} | ${$(r.spending)} | ${$(r.employment)} | ${$(r.db)} | ${$(r.rrq)} | ${$(r.oas)} | ${$(r.gis)} | ${$(r.drawn)} | ${$(r.tax)} | ${$(r.nest.total)} | ${r.status === 'covered' ? 'couvert' : r.status === 'drawing' ? 'tire du nid' : 'manque'} |`)
  out.push('')

  const rows = project(h, a)
  const witness = rows.find((r) => Object.values(r.persons).every((p) => p!.employment === 0)) ?? rows[0]
  const d = (1 + a.inflation) ** (witness.year - a.today.year)
  out.push(
    `### Année témoin pour un calculateur d’impôt : ${witness.year}, en dollars d’aujourd’hui`,
    '',
    'Montants de l’année divisés par l’inflation : les barèmes sont indexés sur les prix, donc un calculateur 2026 doit donner presque la même chose (à 1 % près, les arrondis des barèmes). Le revenu net compte aussi le fractionnement du revenu de pension et les gains en capital réalisés : ce n’est pas la somme des colonnes.',
    '',
    '| Personne | Âge | Travail | Rente d’employeur | RRQ | PSV | Retraits REER/FERR | Revenu net | Impôt fédéral | Impôt du Québec | Récupération PSV |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  )
  for (const p of h.persons) {
    const y = witness.persons[p.id]!
    out.push(`| ${p.name} | ${y.age} | ${$(y.employment / d)} | ${$(y.db / d)} | ${$(y.rrq / d)} | ${$(y.oas / d)} | ${$((y.rrifMinimum + y.withdrawals.rrsp) / d)} | ${$(y.netIncome / d)} | ${$(y.federalTax / d)} | ${$(y.quebecTax / d)} | ${$(y.oasRecovery / d)} |`)
  }
  out.push('')
  return out
}

/** The whole file. */
export function renderExamplesMd(): string {
  const lines: string[] = [
    '# Les foyers d’exemple, imprimés',
    '',
    '> **Fichier généré** par `npm run examples` — ne pas l’éditer à la main (`src/lib/examplesMd.test.ts` échoue si une ligne diffère).',
    '> Les foyers sont inventés (`src/engine/golden/examples.ts`) ; chaque tableau vient du même moteur que l’application.',
    '',
    '## Comment contre-vérifier',
    '',
    '- **RRQ** : le simulateur de Retraite Québec (« Estimation des prestations ») avec les mêmes revenus de travail ; comparez la rente à 65 ans (en dollars d’aujourd’hui, la rente de la colonne « d’aujourd’hui »). Un écart de quelques pourcents vient du fait que l’application suppose que les salaires futurs croissent plus vite que les prix.',
    '- **PSV / SRG** : l’estimateur des prestations de la Sécurité de la vieillesse (canada.ca). La PSV de base est le montant cité × la part de résidence × le report ; le SRG dépend du revenu net du ménage de l’année témoin.',
    '- **Impôt** : un calculateur d’impôt 2026 (fédéral et Québec) avec les revenus de la ligne « Année témoin » ; l’application ne modélise ni les dons, ni les frais médicaux, ni la contribution santé. **À ce jour, l’impôt n’a été comparé à StudioTax que pour le cas « modeste » (voir STATE.md)**.',
    '- **Année par année** : chaque ligne doit satisfaire dépenses + impôt = travail + rentes + SRG + tiré du nid (+ surplus épargné).',
    '',
  ]
  for (const id of EXAMPLE_IDS) lines.push(...section(EXAMPLES[id]))
  return lines.join('\n') + '\n'
}
