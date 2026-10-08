import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { migrateProfile } from './migrations.ts'
import { exampleProfile } from './example.ts'
import { assumptionsOf } from './resultsModel.ts'
import { setAssumptions } from './profileEdit.ts'
import { SCHEMA_VERSION, validateProfile, type Profile } from './schema.ts'

// THE ASSUMPTIONS THAT SHAPE THE MONEY'S PATH, AS A SAVED PROFILE: where the surplus goes (and, below, the path the markets take).

const dir = dirname(fileURLToPath(import.meta.url))
const golden = (): Profile => JSON.parse(readFileSync(join(dir, 'fixtures', `profile.v${SCHEMA_VERSION}.json`), 'utf8'))
const TODAY = { year: 2026, month: 10 }

describe('the surplus option', () => {
  it('is saved, survives a round trip, and reaches the engine', () => {
    const on = setAssumptions(golden(), { surplusToRrsp: true })
    const read = validateProfile(JSON.parse(JSON.stringify(on)))
    expect(read.ok && read.profile.assumptions.surplusToRrsp).toBe(true)
    expect(assumptionsOf(on, TODAY).surplusToRrsp).toBe(true)
    expect(assumptionsOf(golden(), TODAY).surplusToRrsp).toBe(false)
  })

  it('a file without it is refused (the migration writes it), a non-boolean is refused', () => {
    const p = JSON.parse(JSON.stringify(golden()))
    delete p.assumptions.surplusToRrsp
    const missing = validateProfile(p)
    expect(!missing.ok && missing.problems).toContainEqual({ path: 'assumptions.surplusToRrsp', problem: 'missing' })
    p.assumptions.surplusToRrsp = 'yes'
    expect(validateProfile(p).ok).toBe(false)
  })

  it('a version-10 file opens with it off, whatever else it holds; every example saves with it off', () => {
    const old = JSON.parse(readFileSync(join(dir, 'fixtures', 'profile.v10.json'), 'utf8'))
    const read = migrateProfile(old)
    expect(read.ok && read.profile.assumptions.surplusToRrsp).toBe(false)
    expect(read.ok && read.profile.assumptions.pensionSplitting).toBe(old.assumptions.pensionSplitting)
    for (const id of ['golden', 'average', 'heir'] as const) expect(exampleProfile(id).assumptions.surplusToRrsp, id).toBe(false)
  })
})
