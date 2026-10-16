import { existsSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { applyMutation, checkMutant, verdict } from './mutateCore.mjs'
import { MUTANTS } from './mutants.mjs'

// The mutation runner edits real source files; its core must be right before it is trusted with one. And the list of mutants is itself held: each must land exactly once where it says, name test files
// that exist, and carry a reason — a mutant whose text has drifted would « prove » nothing by failing to land, so it fails here, in the ordinary suite, not only when someone runs `npm run mutate`.

describe('applyMutation', () => {
  it('replaces the one occurrence and nothing else', () => {
    expect(applyMutation('a = b + c', 'b + c', 'b - c')).toBe('a = b - c')
    expect(applyMutation('x\nfoo()\ny', 'foo()', 'bar()')).toBe('x\nbar()\ny')
  })

  it('refuses a mutation that lands nowhere (the code moved: the plant would prove a rule falsely)', () => {
    expect(() => applyMutation('a = b', 'c', 'd')).toThrow(/not in the file/)
  })

  it('refuses one that lands in several places', () => {
    expect(() => applyMutation('x = 1; y = 1', '1', '2')).toThrow(/more than once/)
  })

  it('refuses one that changes nothing', () => {
    expect(() => applyMutation('a', 'a', 'a')).toThrow(/changes nothing/)
  })

  it('treats the text literally: regular-expression characters and replacement patterns are just characters', () => {
    expect(applyMutation('f(a.b) $& x', '(a.b) $&', '(c) $1')).toBe('f(c) $1 x')
  })
})

describe('verdict', () => {
  it('tests that pass on a mutant mean it SURVIVED (the hole); tests that fail mean it was killed', () => {
    expect(verdict(0)).toBe('SURVIVED')
    expect(verdict(1)).toBe('killed')
    expect(verdict(130)).toBe('killed')
  })
})

describe('checkMutant', () => {
  const good = { id: 'x', file: 'a.ts', from: 'a', to: 'b', why: 'because', tests: ['a.test.ts'] }
  it('accepts a whole mutant, .test.ts and .test.tsx alike', () => {
    expect(checkMutant(good)).toEqual([])
    expect(checkMutant({ ...good, tests: ['a.test.tsx'] })).toEqual([])
  })
  it('names what is missing', () => {
    expect(checkMutant({ ...good, why: '' }).join()).toMatch(/why/)
    expect(checkMutant({ ...good, tests: [] }).join()).toMatch(/tests/)
    expect(checkMutant({ ...good, tests: ['a.spec.ts'] }).join()).toMatch(/tests/)
  })
})

describe('the list of mutants', () => {
  it('has a good many (a floor, so an emptied list cannot pass)', () => expect(MUTANTS.length).toBeGreaterThanOrEqual(25))

  it('every id is unique', () => expect(new Set(MUTANTS.map((m) => m.id)).size).toBe(MUTANTS.length))

  it('every mutant is well formed, names files that exist, and lands exactly once where it says', () => {
    const wrong = []
    for (const m of MUTANTS) {
      const problems = checkMutant(m)
      if (problems.length > 0) wrong.push(`${m.id}: ${problems.join(', ')}`)
      if (!existsSync(m.file)) {
        wrong.push(`${m.id}: ${m.file} does not exist`)
        continue
      }
      for (const t of m.tests) if (!existsSync(t)) wrong.push(`${m.id}: test file ${t} does not exist`)
      try {
        applyMutation(readFileSync(m.file, 'utf8'), m.from, m.to)
      } catch (e) {
        wrong.push(`${m.id}: ${e.message}`)
      }
    }
    expect(wrong).toEqual([])
  })
})
