import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { RULES, siblingTest, specsFor } from './specsForCore.mjs'

// THE HELPER THAT SAYS WHAT TO RUN, HELD. It may over-ask; it must never name a test that does not exist (a command that fails for the wrong reason teaches people to stop using it) and never go
// silent on a file it knows nothing about.

describe('the rules name things that exist', () => {
  it('every unit suite and e2e spec a rule names is a real file or directory', () => {
    const missing = RULES.flatMap((r) => [...r.unit, ...r.e2e].filter((p) => !existsSync(p)))
    expect(missing).toEqual([])
  })
})

describe('specsFor', () => {
  const real = () => true

  it('an engine change names the engine suites, the random-household suites and the e2e specs that show a strategy', () => {
    const s = specsFor(['src/engine/projection.ts'], real)
    expect(s.unit).toEqual(expect.arrayContaining(['src/engine', 'src/lib/randomMatrix.test.ts', 'src/engine/projection.test.ts']))
    expect(s.e2e).toEqual(expect.arrayContaining(['e2e/strategies.spec.ts', 'e2e/bracket-fill.spec.ts']))
    expect(s.fallback).toBe(false)
  })

  it('a copy change names the parity and direction guards and the copy and complexity specs', () => {
    const s = specsFor(['src/lib/bridgeCopy.ts'], real)
    expect(s.unit).toEqual(expect.arrayContaining(['src/lib/lazyCopyParity.test.ts', 'src/lib/directionWords.test.ts']))
    expect(s.e2e).toContain('e2e/complexity.spec.ts')
  })

  it('a schema or store change names the profile-safety suites and the backup spec', () => {
    const s = specsFor(['src/lib/migrations.ts'], real)
    expect(s.unit).toEqual(expect.arrayContaining(['src/lib/profileSafety.test.ts', 'src/lib/importFuzz.test.ts']))
    expect(s.e2e).toContain('e2e/backup.spec.ts')
  })

  it('a changed test or spec is itself the thing to run', () => {
    expect(specsFor(['src/lib/foo.test.ts']).unit).toEqual(['src/lib/foo.test.ts'])
    expect(specsFor(['e2e/results.spec.ts']).e2e).toEqual(['e2e/results.spec.ts'])
  })

  it('a file with no rule and no sibling test says « run verify » instead of nothing', () => {
    expect(specsFor(['src/lib/someBrandNewThing.ts'], () => false).fallback).toBe(true)
  })

  it('a file with no rule but a sibling test runs that test and needs no fallback', () => {
    const s = specsFor(['src/lib/someBrandNewThing.ts'], real)
    expect(s.unit).toEqual(['src/lib/someBrandNewThing.test.ts'])
    expect(s.fallback).toBe(false)
  })

  it('documents and assets are held by verify’s own guards and ask for nothing', () => {
    expect(specsFor(['STATE.md', 'SOURCES.md', 'package.json', 'public/og/x.png'])).toEqual({ unit: [], e2e: [], fallback: false })
  })

  it('Windows paths are read the same way', () => {
    expect(specsFor(['src\\engine\\projection.ts'], real).e2e).toContain('e2e/strategies.spec.ts')
  })

  it('nothing is named twice', () => {
    const s = specsFor(['src/engine/projection.ts', 'src/engine/tax.ts', 'src/engine/oas.ts'], real)
    expect(new Set(s.unit).size).toBe(s.unit.length)
    expect(new Set(s.e2e).size).toBe(s.e2e.length)
  })
})

describe('siblingTest', () => {
  it('foo.ts and Foo.tsx have foo.test.ts and Foo.test.ts; a test has none; a script has its .mjs', () => {
    expect(siblingTest('src/lib/foo.ts')).toBe('src/lib/foo.test.ts')
    expect(siblingTest('src/components/Foo.tsx')).toBe('src/components/Foo.test.ts')
    expect(siblingTest('src/lib/foo.test.ts')).toBeNull()
    expect(siblingTest('scripts/mutateCore.mjs')).toBe('scripts/mutateCore.test.mjs')
    expect(siblingTest('README')).toBeNull()
  })
})
