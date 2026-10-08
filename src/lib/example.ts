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
    household: { ...structuredClone(e.household), home: structuredClone(e.household.home ?? null) },
    children: [...e.children],
    assumptions: structuredClone(assumptions),
    customScenario: null,
    confirmed: [],
  }
}
