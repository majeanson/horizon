import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { EXAMPLE_IDS } from '../engine/golden/examples.ts'
import { renderExamplesMd } from '../engine/golden/examplesMd.ts'
import { EXAMPLE_COPY } from './exampleCopy.ts'

// EXAMPLES.md IS NEVER HAND-WRITTEN. It prints every example household — what goes in, the calculation of the pensions, the
// year-by-year table, a witness year for a tax calculator — from the engine, so that any change that moves an example's
// answer shows up as a diff in a table a person can read, in the same commit. The fix for a failure here is `npm run examples`.

const committed = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'EXAMPLES.md'), 'utf8')

describe('EXAMPLES.md', () => {
  it('is identical to what `npm run examples` would write', () => {
    expect(committed === renderExamplesMd(), 'EXAMPLES.md is out of date — run `npm run examples` and commit the result').toBe(true)
  }, 60_000)

  it('has a section for every example, under the name the app gives it', () => {
    for (const id of EXAMPLE_IDS) expect(committed).toContain(`## ${id} — ${EXAMPLE_COPY.fr[id].name}`)
  })
})
