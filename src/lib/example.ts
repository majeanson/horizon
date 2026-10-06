import { GOLDEN_ASSUMPTIONS, GOLDEN_HOUSEHOLD } from '../engine/golden/household.fixture.ts'
import { SCHEMA_VERSION, type Profile } from './schema.ts'

// « Charger l'exemple »: the golden household — an invented couple, every number round — as a saved profile.
// It is the same couple the golden snapshots, the e2e seed and the gallery use, so what a first-time visitor
// sees is what the tests pin.
export function exampleProfile(): Profile {
  const { today: _today, ...assumptions } = GOLDEN_ASSUMPTIONS
  return {
    app: 'horizon',
    version: SCHEMA_VERSION,
    household: structuredClone(GOLDEN_HOUSEHOLD),
    children: [2012, 2015],
    assumptions: structuredClone(assumptions),
  }
}
