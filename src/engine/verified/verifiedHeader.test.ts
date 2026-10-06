import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// A WORKED EXAMPLE IS ONLY WORTH ITS SOURCE.
//
// Every `*.verified.test.ts` quotes a figure from an official page and checks the engine against it. That is what makes the
// engine traceable (ENGINE.md §3) — so each such file must OPEN by saying which page, what the page is called, when it was
// read and how close « equal » is, in a fixed five-line header a reader can check without opening the code:
//
//   // VERIFIED-AGAINST
//   // source:    https://…            ← an official host
//   // title:     the page's own title
//   // retrieved: 2026-10-06
//   // tolerance: what « agrees » means here
//
// ENGINE.md said a guard enforced this for as long as the project has existed; none did. This is it.

const dir = dirname(fileURLToPath(import.meta.url))
// The same hosts `engine/params/cited.test.ts` allows a cited figure to come from.
const OFFICIAL = ['canada.ca', 'gc.ca', 'gouv.qc.ca', 'quebec.ca', 'revenuquebec.ca']

/** What is wrong with a file's opening lines, in words — empty when it is a well-formed header. */
function headerProblems(text: string): string[] {
  const lines = text.split('\n').slice(0, 5)
  const out: string[] = []
  if (lines[0]?.trim() !== '// VERIFIED-AGAINST') out.push('line 1 is not « // VERIFIED-AGAINST »')
  const source = /^\/\/ source:\s+(https:\/\/\S+)\s*$/.exec(lines[1] ?? '')
  if (!source) out.push('line 2 is not « // source: https://… »')
  else {
    const host = new URL(source[1]).hostname
    if (!OFFICIAL.some((h) => host === h || host.endsWith('.' + h))) out.push(`the source host ${host} is not an official one`)
  }
  if (!/^\/\/ title:\s+\S/.test(lines[2] ?? '')) out.push('line 3 is not « // title: … »')
  if (!/^\/\/ retrieved:\s+\d{4}-\d{2}-\d{2}\s*$/.test(lines[3] ?? '')) out.push('line 4 is not « // retrieved: YYYY-MM-DD »')
  if (!/^\/\/ tolerance:\s+\S/.test(lines[4] ?? '')) out.push('line 5 is not « // tolerance: … »')
  return out
}

describe('every worked example opens by naming its source', () => {
  // The canary: the detector pinned against a good header and each way a header goes wrong.
  it('the detector accepts a complete header and names what is missing from an incomplete one', () => {
    const good = [
      '// VERIFIED-AGAINST',
      '// source:    https://www.canada.ca/en/revenue-agency/x.html',
      '// title:     A page',
      '// retrieved: 2026-10-06',
      '// tolerance: exact to the cent',
      'import x',
    ].join('\n')
    expect(headerProblems(good)).toEqual([])
    expect(headerProblems(good.replace('// VERIFIED-AGAINST', '// verified'))).toHaveLength(1)
    expect(headerProblems(good.replace('https://www.canada.ca/en/revenue-agency/x.html', 'https://example.com/x'))).toEqual(['the source host example.com is not an official one'])
    expect(headerProblems(good.replace('https://www.canada.ca/en/revenue-agency/x.html', 'http://www.canada.ca/x'))).toHaveLength(1)
    expect(headerProblems(good.replace('2026-10-06', 'yesterday'))).toHaveLength(1)
    expect(headerProblems(good.replace('// tolerance: exact to the cent', '// tolerance:'))).toHaveLength(1)
    expect(headerProblems(good.replace('// title:     A page\n', ''))).not.toEqual([])
    expect(headerProblems('')).toHaveLength(5)
  })

  const files = readdirSync(dir).filter((f) => /\.verified\.test\.ts$/.test(f))

  it('the scan finds the worked examples (a floor, so an empty folder cannot pass)', () => {
    expect(files.length).toBeGreaterThanOrEqual(6)
  })

  it.each(files)('%s has a complete header from an official source', (file) => {
    expect(headerProblems(readFileSync(join(dir, file), 'utf8')), file).toEqual([])
  })
})
