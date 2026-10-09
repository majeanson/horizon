import { EXAMPLES, type ExampleId } from '../engine/golden/examples.ts'
import { SCHEMA_VERSION, type Profile } from './schema.ts'

// « Charger un exemple »: an invented household as a saved profile. The default is the golden couple — the same couple the
// golden snapshots, the e2e seed and the gallery use, so what a first-time visitor sees is what the tests pin; the others
// (an average couple, a modest single, a rich couple, someone behind, a retired couple, a newcomer) are there to look at,
// and to check by hand, a different kind of life (engine/golden/examples.ts says who they are).
export function exampleProfile(id: ExampleId = 'golden'): Profile {
  const e = EXAMPLES[id]
  const { today: _today, ...assumptions } = e.assumptions
  return {
    app: 'horizon',
    version: SCHEMA_VERSION,
    // The locked-in keys are optional in the engine and required in the saved file: write them out so every example saves.
    household: {
      ...structuredClone(e.household),
      persons: structuredClone(e.household.persons).map((p) => ({ ...p, accounts: { ...p.accounts, rrsp: { lockedIn: 0, employerContribution: 0, ...p.accounts.rrsp } } })),
      home: structuredClone(e.household.home ?? null),
      children: [...e.children],
      childSpending: null,
      flows: [],
    },
    assumptions: { surplusToRrsp: false, retiredSpendingDrift: 0, marketPath: { preset: 'smooth', custom: [] }, ...structuredClone(assumptions) },
    customScenario: null,
    confirmed: [],
    plans: [],
  }
}
