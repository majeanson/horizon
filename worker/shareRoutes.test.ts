import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { FRONT_DOOR_CARD, isShareRoute, shareRoute } from './shareRoutes'

// The card route, against a fake assets binding. (The page route rewrites HTML with Cloudflare's HTMLRewriter, which Node does not have: it is held by
// a check on the running Worker (`wrangler dev`, then `curl` the address), not here.)
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
const assets = (present: string[]) =>
  ({
    fetch: async (req: Request) => {
      const path = new URL(req.url).pathname
      return present.includes(path)
        ? new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } })
        : new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } }) // the SPA fallback
    },
  }) as unknown as Fetcher

const get = (url: string, present: string[]) => shareRoute(new Request(url), { ASSETS: assets(present) })

describe('worker/shareRoutes', () => {
  it('answers only GET and HEAD on its two addresses', () => {
    expect(isShareRoute(new Request('https://x.test/partage'), '/partage')).toBe(true)
    expect(isShareRoute(new Request('https://x.test/og/scenario'), '/og/scenario')).toBe(true)
    expect(isShareRoute(new Request('https://x.test/og/scenario', { method: 'HEAD' }), '/og/scenario')).toBe(true)
    expect(isShareRoute(new Request('https://x.test/og/scenario', { method: 'POST' }), '/og/scenario')).toBe(false)
    expect(isShareRoute(new Request('https://x.test/profil'), '/profil')).toBe(false)
  })

  it('serves the card for the result in the address, as a cacheable cross-origin PNG', async () => {
    const res = await get('https://x.test/og/scenario?age=62&foyer=couple&l=fr', ['/og/scenario-fr-couple-62.png'])
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(res.headers.get('cache-control')).toContain('max-age=')
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG)
  })

  it('falls back to the generic card in the asked language when the address is not a result', async () => {
    const present = ['/og/horizon-fr.png', '/og/horizon-en.png']
    for (const url of ['https://x.test/og/scenario', 'https://x.test/og/scenario?age=999&foyer=seul', 'https://x.test/og/scenario?age=62&foyer=<script>&l=en']) {
      const res = await get(url, present)
      expect(res.status, url).toBe(200)
      expect(res.headers.get('content-type')).toBe('image/png')
    }
  })

  it('is a 404, not the SPA shell served as an image, when no card exists at all', async () => {
    expect((await get('https://x.test/og/scenario?age=62&foyer=seul', [])).status).toBe(404)
  })

  it('never appends a tag the shell already carries — a tag the shell has is rewritten, so a preview never reads two', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    const shell = readFileSync(join(root, 'index.html'), 'utf8')
    const worker = readFileSync(join(root, 'worker/shareRoutes.ts'), 'utf8')
    const inShell = new Set([...shell.matchAll(/<meta (?:property|name)="([^"]+)"/g)].map((m) => m[1]))
    const appended = [...worker.matchAll(/tag\('(?:property|name)', '([^']+)'/g)].map((m) => m[1])
    const rewritten = [...worker.matchAll(/\.on\('meta\[(?:property|name)="([^"]+)"\]'/g)].map((m) => m[1])
    expect(appended.length, 'the reader found no appended tag: the shape changed').toBeGreaterThan(0)
    expect(appended.filter((k) => inShell.has(k))).toEqual([])
    // …and the ones it rewrites are really there to rewrite (a renamed tag in index.html would leave the result's words unsaid)
    expect(rewritten.length).toBeGreaterThan(0)
    expect(rewritten.filter((k) => !inShell.has(k))).toEqual([])
  })

  it('gives the front door its card: `/` alone runs the Worker first (an exact pattern, never « /* »), and the Worker writes the card there', () => {
    const root = join(dirname(fileURLToPath(import.meta.url)), '..')
    const toml = readFileSync(join(root, 'wrangler.toml'), 'utf8')
    const first = JSON.parse(toml.match(/^run_worker_first = (\[.*\])$/m)![1]) as string[]
    expect(first).toContain('/')
    expect(first.filter((p) => p.includes('*')), 'a wildcard would run the Worker before every asset').toEqual([])
    const index = readFileSync(join(root, 'worker/index.ts'), 'utf8')
    expect(index).toMatch(/path === '\/'[^\n]*withFrontDoorCard\(/)
    // the card it points at is a file the build ships, and the shell itself names no image (lib/noNetwork.test.ts: no absolute address in index.html)
    expect(readFileSync(join(root, 'public', FRONT_DOOR_CARD.slice(1))).length).toBeGreaterThan(1000)
    expect(readFileSync(join(root, 'index.html'), 'utf8')).not.toMatch(/og:image/)
  })

  it('answers five parallel requests with distinct results, each with its own card', async () => {
    const ages = [58, 60, 62, 65, 67]
    const present = ages.map((a) => `/og/scenario-fr-seul-${a}.png`)
    const all = await Promise.all(ages.map((a) => get(`https://x.test/og/scenario?age=${a}&foyer=seul&l=fr`, present)))
    expect(all.map((r) => r.status)).toEqual([200, 200, 200, 200, 200])
  })
})
