import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// THE COVERAGE FLOORS MAY ONLY RISE. They live in vitest.coverage.config.ts; lowering one there must be answered here, in the same commit, by lowering the number below — two edits, in two files, in one diff,
// which is as loud as a ratchet gets without a database. (Raise both together when the engine's coverage rises.)

const MINIMUM = { statements: 98, branches: 93, functions: 99, lines: 99 }
const config = readFileSync('vitest.coverage.config.ts', 'utf8')
const floors = Object.fromEntries(Object.keys(MINIMUM).map((k) => [k, Number(new RegExp(`${k}:\\s*(\\d+(?:\\.\\d+)?)`).exec(config.slice(config.indexOf('thresholds')))?.[1])]))

describe('the coverage floors of the engine', () => {
  it('are set, for all four figures', () => {
    for (const k of Object.keys(MINIMUM)) expect(Number.isFinite(floors[k]), `${k} has no floor in vitest.coverage.config.ts`).toBe(true)
  })

  it('are no lower than the ones this file holds', () => {
    for (const [k, min] of Object.entries(MINIMUM)) expect(floors[k], `${k}: the floor was lowered`).toBeGreaterThanOrEqual(min)
  })

  it('cover the engine and not its tests or its fixtures', () => {
    expect(config).toContain("include: ['src/engine/**/*.ts']")
    expect(config).toContain("'src/engine/**/*.test.ts'")
  })
})
