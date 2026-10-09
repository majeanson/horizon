import { createHash } from 'node:crypto'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { MIGRATIONS, migrateProfile } from './migrations.ts'
import { SCHEMA_VERSION } from './schema.ts'

// A SAVED PROFILE MUST OUTLIVE THE CODE THAT WROTE IT.
//
// Someone's file from this month has to open next year. So changing the shape in schema.ts is a ceremony,
// and this test is what makes it one: it pins a hash of schema.ts (comments and blank lines ignored). Edit
// the schema and it fails with the three things to do — raise SCHEMA_VERSION, append a migration, keep an
// example file of the OLD shape in src/lib/fixtures/ — and only THEN is the new hash pinned here.

const dir = dirname(fileURLToPath(import.meta.url))

// The pinned hash of schema.ts at SCHEMA_VERSION = 16. Update it in the same commit that raises the version.
const PINNED_SCHEMA_HASH = '37f2430fd8e41616'
const PINNED_FOR_VERSION = 16

function codeOf(file: string): string {
  const src = readFileSync(file, 'utf8')
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/(^|\s)\/\/.*$/, '').trimEnd())
    .filter((line) => line.trim() !== '')
    .join('\n')
}
const hash = (s: string): string => createHash('sha256').update(s).digest('hex').slice(0, 16)

describe('the profile schema is under a ceremony', () => {
  it('schema.ts matches the pinned hash — or the version was raised and the pin moved with it', () => {
    const actual = hash(codeOf(join(dir, 'schema.ts')))
    expect(
      SCHEMA_VERSION === PINNED_FOR_VERSION && actual === PINNED_SCHEMA_HASH,
      [
        'schema.ts changed (hash ' + actual + ', pinned ' + PINNED_SCHEMA_HASH + ' for version ' + PINNED_FOR_VERSION + ').',
        'A saved profile must still open: (1) raise SCHEMA_VERSION, (2) append a step to MIGRATIONS in migrations.ts,',
        '(3) add an example of the OLD shape to src/lib/fixtures/profile.v<old>.json, then pin the new hash and version here.',
      ].join('\n'),
    ).toBe(true)
  })

  it('has exactly one migration per version step', () => {
    expect(MIGRATIONS.length).toBe(SCHEMA_VERSION - 1)
  })

  it('keeps an example file for every version, and every one of them still opens and arrives at the current version', () => {
    const fixtures = readdirSync(join(dir, 'fixtures')).filter((f) => /^profile\.v\d+\.json$/.test(f))
    const versions = fixtures.map((f) => Number(/v(\d+)/.exec(f)![1])).sort((a, b) => a - b)
    expect(versions, 'one fixture per schema version, none missing').toEqual(Array.from({ length: SCHEMA_VERSION }, (_, i) => i + 1))
    for (const f of fixtures) {
      const result = migrateProfile(JSON.parse(readFileSync(join(dir, 'fixtures', f), 'utf8')))
      expect(result.ok, `${f}: ${JSON.stringify(result.ok ? '' : result.problems)}`).toBe(true)
      if (result.ok) expect(result.profile.version, f).toBe(SCHEMA_VERSION)
    }
  })

  it('the example of the CURRENT version is what the golden household would save', () => {
    const current = JSON.parse(readFileSync(join(dir, 'fixtures', `profile.v${SCHEMA_VERSION}.json`), 'utf8'))
    expect(current.version).toBe(SCHEMA_VERSION)
    expect(current.app).toBe('horizon')
    expect(current.household.persons).toHaveLength(2)
  })
})
