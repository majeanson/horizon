import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { execFileSync } from 'node:child_process'
import { headersFileSource } from './worker/securityHeaders.ts'

/**
 * The commit this bundle was built from, short form. CI sets GITHUB_SHA; locally we ask git;
 * anything else answers 'dev'.
 *
 * FAILS SOFT, ALWAYS. A build from an exported tarball has no .git, and git may not be on
 * PATH at all. A missing build stamp is a small loss — a build that refuses to run because it
 * could not find one is a large one, so every failure lands on 'dev'.
 */
function buildSha(): string {
  const fromCi = process.env.GITHUB_SHA
  if (fromCi && /^[0-9a-f]{7,64}$/i.test(fromCi)) return fromCi.slice(0, 12)
  try {
    return execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || 'dev'
  } catch {
    return 'dev'
  }
}

// Files Vite copies from public/ (not part of the bundle object) that the app shell needs
// offline — keep in sync with public/.
const PUBLIC_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/theme-bootstrap.js',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon.png',
]

// Chunks deliberately EXCLUDED from the precache because their feature is ONLINE-ONLY /
// never a household surface. /dev/kit is a component gallery: an offline reload never needs
// it, and precaching it taxes every install. Every OTHER lazy chunk MUST stay precached —
// the app opens every route offline, which is the product's promise — and
// scripts/check-bundle.mjs enforces BOTH sides in CI. Keep this list in sync with
// ONLINE_ONLY in that script.
const ONLINE_ONLY_CHUNKS = [/^assets\/DevKit-/]

// Caching-policy version, folded into the cache name (see serviceWorker()). Bump on ANY
// change to swSource's caching rules so the new SW evicts caches written under the old
// rules — the asset-list hash alone cannot, since a policy-only fix leaves the asset list
// (and therefore the cache name) identical.
//   v1 — the shell + this build's hashed bundles are precached all-or-nothing; navigations
//        are network-first on a 4 s leash and re-cache the shell they fetched; a subresource
//        that comes back as HTML is a gone build, never cached.
const SW_POLICY = 'v1-shell-refresh-and-offline-page'

// The security headers for the responses the WORKER NEVER SEES. Cloudflare's assets router
// answers a request matching a real file straight from the edge, without invoking the Worker
// — so the front door would ship without a single security header while every other route
// had all of them. A `_headers` file in the assets directory covers them. Generated, never
// hand-written: the source is the same ENFORCED list the Worker's wrapper uses.
function securityHeadersFile(): Plugin {
  return {
    name: 'horizon-headers',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_headers', source: headersFileSource() })
    },
  }
}

// Build-time service worker: emit /sw.js with the REAL hashed asset list baked in, so a
// freshly-installed app precaches the whole shell and reopens offline. Hand-rolled and
// dependency-free on purpose — the caching policy is a dozen lines (see swSource) and the
// asset list is the only thing a build truly knows better than runtime.
function serviceWorker(): Plugin {
  return {
    name: 'horizon-sw',
    apply: 'build',
    // `order: 'post'` so this reads the bundle AFTER Vite's own generateBundle hooks —
    // vite:css-post above all. A module whose only job is `import './x.css'` leaves a JS
    // chunk that css-post extracts the CSS out of and then DELETES from the bundle; reading
    // the bundle before that shows phantom names that never become files, and they would go
    // into the precache, where the SPA fallback answers them with 200 text/html.
    generateBundle: {
      order: 'post',
      handler(_opts, bundle) {
        const assets = Object.keys(bundle)
          .filter((f) => !f.endsWith('.map') && f !== 'index.html')
          // BUILD METADATA, not app assets. `_headers` is CONSUMED by Cloudflare and never
          // served, so install() would 404 on a CRITICAL entry and the app could not boot
          // offline; `.vite/manifest.json` is the door-closure check's input, read at build
          // time from disk and never by the app.
          .filter((f) => f !== '_headers' && !f.startsWith('.vite/'))
          .filter((f) => !ONLINE_ONLY_CHUNKS.some((re) => re.test(f)))
          .map((f) => '/' + f)
        // Two tiers, decided HERE because only the build knows which is which.
        // CRITICAL: the shell entry plus this build's own hashed bundles — miss any one and the
        // app cannot boot offline, so install() must not settle for a partial set.
        // OPTIONAL: the public/ files (manifest, icons, the theme bootstrap) — nice offline,
        // never load-bearing, and a renamed one must not take the shell down with it.
        const critical = ['/', ...assets]
        const optional = PUBLIC_SHELL.filter((u) => u !== '/')
        const precache = [...PUBLIC_SHELL, ...assets]
        // djb2 over the precache list AND the caching-policy version → a stable per-build
        // cache version, so a redeploy installs fresh and activate() drops the old cache.
        let h = 5381
        for (const c of [SW_POLICY, ...precache].join('|')) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0
        this.emitFile({ type: 'asset', fileName: 'sw.js', source: swSource(h.toString(36), critical, optional) })
      },
    },
  }
}

const swSource = (version: string, critical: string[], optional: string[]) => `// Generated by vite.config.ts (horizon-sw) — do not edit.
// Offline app shell:
//   • precache: the built shell (this build's hashed assets + public files)
//   • navigations: network-first on a short leash, falling back to the cached shell offline
//   • everything else: cache-first, hashed assets being immutable
// There is no /api and no cross-origin request — the profile lives in the browser — so the
// worker has nothing else to decide.
const CACHE = 'horizon-${version}'
// The shell entry + this build's hashed bundles. Miss ONE and the app cannot boot offline, so
// install() insists on the whole set (retrying to get it).
const PRECACHE_CRITICAL = ${JSON.stringify(critical, null, 1)}
// public/ files — nice offline, never load-bearing. Best-effort.
const PRECACHE_OPTIONAL = ${JSON.stringify(optional, null, 1)}

// Fetch one shell entry into the cache, retrying a transient failure.
//
// c.add() does this in one call but can express neither half of what we need: it gives up
// after a single attempt, and it accepts ANY ok response — including the SPA-fallback HTML
// that the fetch handler below already refuses to serve under a subresource URL. Install is
// the one moment we can still decline to WRITE that.
function cacheOne(c, url, tries) {
  return fetch(url)
    .then(function (res) {
      if (!res.ok) throw new Error('precache ' + url + ' -> ' + res.status)
      // '/' IS html; anything else answering as html is a build that has gone.
      var type = res.headers.get('content-type') || ''
      if (url !== '/' && type.indexOf('text/html') !== -1) throw new Error('precache ' + url + ' -> html')
      return c.put(url, res)
    })
    .catch(function (err) {
      if (tries <= 1) throw err
      return new Promise(function (r) { setTimeout(r, 300) }).then(function () { return cacheOne(c, url, tries - 1) })
    })
}

self.addEventListener('install', (e) => {
  // Two tiers, because "tolerate a failure here" is right for exactly one of them.
  // OPTIONAL stays best-effort (allSettled): a renamed icon must never take the shell down.
  // CRITICAL is all-or-nothing: retry, and if an entry still will not land, let install FAIL.
  // That is the safe outcome — the browser retries later, the previous worker and its cache
  // keep serving, and online the app is unaffected. skipWaiting only runs on a whole shell.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) =>
        Promise.all(PRECACHE_CRITICAL.map((u) => cacheOne(c, u, 3)))
          .then(() => Promise.allSettled(PRECACHE_OPTIONAL.map((u) => cacheOne(c, u, 2)))),
      )
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// THE LAST PAGE BEFORE NOTHING. Served only when a navigation has no network AND no cached
// shell to fall back on — the state an installed PWA would otherwise render as a blank
// rectangle. Deliberately one file, no assets: it must work when nothing else does. FR first
// with the English under it, since the worker cannot know the locale the app was set to.
const OFFLINE_HTML = \`<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Horizon</title><style>
:root{color-scheme:light dark}
body{margin:0;min-height:100dvh;display:grid;place-items:center;padding:2rem;
background:#FBF3E4;color:#3c3730;text-align:center;
font:1rem/1.55 system-ui,-apple-system,sans-serif}
main{max-width:22rem}h1{font-size:1.35rem;margin:0 0 .6rem}p{margin:0 0 .8rem}
.en{opacity:.6;font-size:.9rem}
button{margin-top:.6rem;font:inherit;padding:.6rem 1.2rem;border:0;border-radius:999px;
background:#E8A33D;color:#2b2620;cursor:pointer}
@media (prefers-color-scheme:dark){body{background:#1b1712;color:#e8e0d4}
button{background:#E8A33D;color:#2b2620}}
</style></head><body><main>
<h1>Horizon</h1>
<p>Pas de réseau, et Horizon n’est pas encore gardé sur cet appareil.</p>
<p>Rouvrez-le une fois connecté&nbsp;: après ça, il s’ouvre même sans réseau, avec vos données.</p>
<p class="en">No network yet, and this device has not kept a copy. Open it once while connected.</p>
<button onclick="location.reload()">Réessayer</button>
</main></body></html>\`

// A navigation fallback is ALWAYS a Response. \`caches.match\` resolving undefined and being
// handed to respondWith() is a failed navigation, which an installed PWA paints as nothing.
function shellFallback() {
  return caches.match('/', { ignoreVary: true }).then(function (hit) {
    return hit || new Response(OFFLINE_HTML, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
  })
}

// Network-first, but on a leash, and it KEEPS what it gets. The SPA answers every route with
// the same index.html, so any HTML navigation response IS the shell — re-caching it under '/'
// keeps the offline entry fresh after a deploy and heals the one the stale-asset branch deletes.
function navigateWithShell(req) {
  var settled = false
  var live = fetch(req).then(function (res) {
    var type = res.headers.get('content-type') || ''
    if (res.ok && type.indexOf('text/html') !== -1) {
      var copy = res.clone()
      caches.open(CACHE).then(function (c) { return c.put('/', copy) }).catch(function () {})
    }
    settled = true
    return res
  })
  // A wifi that is connected but dead (a captive portal) makes fetch hang rather than fail,
  // and network-first with no deadline would stare at nothing until the OS gave up.
  // Four seconds, then the cache.
  var patience = new Promise(function (resolve) {
    setTimeout(function () { resolve(settled ? live : shellFallback()) }, 4000)
  })
  return Promise.race([live, patience]).catch(function () { return shellFallback() })
}

// EVERY cache lookup below passes { ignoreVary: true }. This SW stores exactly ONE variant per
// URL and never content-negotiates, so a Vary check on a lookup can only ever produce a FALSE
// miss — turning "the entry is right there" into "not found", which offline means a 504.
self.addEventListener('fetch', (e) => {
  const req = e.request
  const url = new URL(req.url)

  if (req.method !== 'GET') return
  // Cross-origin is none of our business (and the CSP forbids it anyway).
  if (url.origin !== location.origin) return

  // App navigations: try the network (fresh HTML after a deploy), fall back to the cached
  // shell so an offline reopen still boots the app.
  if (req.mode === 'navigate') {
    e.respondWith(navigateWithShell(req))
    return
  }

  // Static assets (hashed → immutable): cache-first, populate on miss. A failed fetch falls
  // back to a 504 — never let respondWith reject.
  //
  // THE TRAP: the origin serves the SPA with not_found_handling = "single-page-application",
  // so a request for a hashed asset that no longer exists (a previous build's chunk, asked for
  // by a stale shell) does NOT 404 at the edge — it answers 200 text/html with index.html.
  // res.ok is therefore TRUE, and caching that writes HTML under a .js URL; because this
  // handler is cache-first that entry then wins forever, the entry module parses as HTML,
  // React never mounts, and the app boots to a blank page on every reload. So: a subresource
  // that comes back as HTML means "this build is gone", never "here is your script". Refuse to
  // cache it, fail the request cleanly, and drop the cached shell that pointed at it so the
  // next navigation must hit the network for fresh HTML.
  e.respondWith(
    caches.match(req, { ignoreVary: true }).then((hit) =>
      hit ?? fetch(req).then((res) => {
        const isHtml = (res.headers.get('content-type') || '').includes('text/html')
        if (isHtml) {
          caches.open(CACHE).then((c) => c.delete('/')).catch(() => {})
          return new Response('', { status: 504, statusText: 'Stale asset' })
        }
        if (res.ok) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy))
        }
        return res
      }).catch(() => new Response('', { status: 504 })),
    ),
  )
})
`

export default defineConfig({
  // Stamp the build moment and the commit into the bundle so « Données » can show which build
  // is running — useful when someone says "it did X yesterday". Evaluated once when the build
  // starts; in dev it is the dev-server start.
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    __BUILD_SHA__: JSON.stringify(buildSha()),
  },
  plugins: [react(), serviceWorker(), securityHeadersFile()],
  build: {
    // The build manifest lets scripts/check-bundle.mjs walk the ENTRY'S STATIC CLOSURE —
    // every chunk the browser fetches before it can run a line of the app — rather than guess
    // at it from chunk names.
    manifest: true,
    rollupOptions: {
      output: {
        // Pull the framework + i18n out of the eager entry into their own named chunks:
        // react/-dom/-router-dom rarely change build to build so they cache across deploys,
        // and the FR dictionary (EN lazy-loads separately, see src/i18n.ts) is cache-worthy on
        // its own. The charting library gets its own chunk too — and it is reachable only from
        // the lazy Résultats route, which check-bundle.mjs asserts.
        //
        // These are `codeSplitting` groups, not `manualChunks`: under Vite 8 (Rolldown)
        // manualChunks is a COMPAT SHIM whose chunk alias Rolldown may fold into a neighbouring
        // group — it did, silently, in the project this one was scaffolded from.
        // `codeSplitting` (the successor of the deprecated `advancedChunks`) is Rolldown's
        // AUTHORITATIVE grouping: a group here is binding, so each chunk is emitted every
        // build. It REPLACES manualChunks wholesale — every group we rely on must be listed
        // here, or it silently collapses back into the entry.
        codeSplitting: {
          groups: [
            { name: 'react-vendor', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom)[\\/]/ },
            { name: 'i18n', test: /[\\/]src[\\/]i18n\.ts$/ },
            { name: 'charts', test: /node_modules[\\/](recharts|d3-[^\\/]+|victory-vendor|internmap|decimal\.js-light|eventemitter3|immer|redux|react-redux|reselect|use-sync-external-store|@reduxjs)[\\/]/ },
          ],
        },
      },
    },
  },
  server: {
    // Pre-transform the lazy route modules at dev-server start. The first hit on each lazy
    // route cold-compiles in Vite, and under the e2e suite's parallel workers that can stall a
    // concurrent navigation → "failed to fetch dynamically imported module" flakes mid-run.
    warmup: {
      clientFiles: ['./src/main.tsx', './src/pages/**/*.tsx'],
    },
  },
})
