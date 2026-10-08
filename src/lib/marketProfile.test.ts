import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { migrateProfile } from './migrations.ts'
import { exampleProfile } from './example.ts'
import { assumptionsOf } from './resultsModel.ts'
import { resizeMarketPath, setAssumptions, setMarketPreset, setMarketYear } from './profileEdit.ts'
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

describe('the market path', () => {
  const path = (p: Profile) => p.assumptions.marketPath
  it('a new profile and every example start « lisse »; a version-11 file opens that way', () => {
    expect(path(golden())).toEqual({ preset: 'smooth', custom: [] })
    const old = JSON.parse(readFileSync(join(dir, 'fixtures', 'profile.v11.json'), 'utf8'))
    const read = migrateProfile(old)
    expect(read.ok && read.profile.assumptions.marketPath).toEqual({ preset: 'smooth', custom: [] })
    for (const id of ['golden', 'average', 'heir'] as const) expect(path(exampleProfile(id)), id).toEqual({ preset: 'smooth', custom: [] })
  })

  it('choosing a ready-made path saves it and reaches the engine; choosing custom opens on the returns it replaces', () => {
    const bad = setMarketPreset(golden(), 'badStart')
    expect(assumptionsOf(bad, TODAY).marketPath?.preset).toBe('badStart')
    const custom = setMarketPreset(bad, 'custom')
    expect(path(custom).custom).toEqual([-0.15, -0.05, 0, 0.04])
    expect(setMarketPreset(golden(), 'custom').assumptions.marketPath.custom.length).toBeGreaterThan(0) // from « lisse »: a starting point, not a blank
    expect(setMarketPreset(bad, 'badStart')).toBe(bad) // same object when nothing changes
  })

  it('custom years: edit one, add one (the average), remove the last — at most ten, at least one', () => {
    let p = setMarketPreset(setMarketPreset(golden(), 'badStart'), 'custom')
    p = setMarketYear(p, 0, -0.3)
    expect(path(p).custom[0]).toBe(-0.3)
    expect(setMarketYear(p, 0, -0.3)).toBe(p)
    expect(setMarketYear(p, 9, 0.1)).toBe(p) // past the end: nothing
    p = resizeMarketPath(p, 1, 0.05)
    expect(path(p).custom).toEqual([-0.3, -0.05, 0, 0.04, 0.05])
    for (let i = 0; i < 12; i++) p = resizeMarketPath(p, 1, 0.05)
    expect(path(p).custom.length).toBe(10)
    for (let i = 0; i < 12; i++) p = resizeMarketPath(p, -1, 0)
    expect(path(p).custom.length).toBe(1)
  })

  it('the file is checked: a bad name, a return past −60 / +60 %, more than ten years', () => {
    const bad = (mp: unknown) => {
      const p = JSON.parse(JSON.stringify(golden()))
      p.assumptions.marketPath = mp
      return validateProfile(p).ok
    }
    expect(bad({ preset: 'custom', custom: [-0.2, null, 0.1] })).toBe(true)
    expect(bad({ preset: 'doom', custom: [] })).toBe(false)
    expect(bad({ preset: 'custom', custom: [-0.9] })).toBe(false)
    expect(bad({ preset: 'custom', custom: Array(11).fill(0.01) })).toBe(false)
  })
})
