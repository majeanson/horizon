import Anthropic from '@anthropic-ai/sdk'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// `node scripts/fuzz/collect.ts <batch id> <out dir>` — fetch the results of an audit batch that run.ts submitted and lost its poller on (a killed process does not cancel a
// batch). It imports no engine and generates nothing: it reads the batch, and if it has ended writes <out dir>/collected.json. Never waits: if the batch is still running it says so.

const here = dirname(fileURLToPath(import.meta.url))
const envFile = join(here, '..', '..', '.env')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}

const [batchId, dir] = process.argv.slice(2)
if (!batchId || !dir) {
  console.error('usage: node scripts/fuzz/collect.ts <batch id> <out dir>')
  process.exit(1)
}

const client = new Anthropic()
const b = await client.messages.batches.retrieve(batchId)
console.log(`batch ${b.processing_status}:`, JSON.stringify(b.request_counts))
if (b.processing_status !== 'ended') process.exit(0)

const PRICE: [number, number] = [4, 20] // claude-opus-5-5 $/MTok in, out; the batch takes half off
let usd = 0
const results: Record<string, unknown> = {}
for await (const entry of await client.messages.batches.results(batchId)) {
  if (entry.result.type !== 'succeeded') {
    results[entry.custom_id] = { error: entry.result.type }
    continue
  }
  const m = entry.result.message
  const u = m.usage
  const input = u.input_tokens + 1.25 * (u.cache_creation_input_tokens ?? 0) + 0.1 * (u.cache_read_input_tokens ?? 0)
  usd += ((input * PRICE[0] + u.output_tokens * PRICE[1]) / 1e6) * 0.5
  const text = m.content.filter((c): c is Anthropic.TextBlock => c.type === 'text').map((c) => c.text).join('')
  try {
    results[entry.custom_id] = JSON.parse(text)
  } catch (err) {
    results[entry.custom_id] = { error: `unparseable: ${(err as Error).message}` }
  }
}
writeFileSync(join(dir, 'collected.json'), JSON.stringify({ batchId, spentUsd: Number(usd.toFixed(3)), results }, null, 2))
console.log(`collected ${Object.keys(results).length} results, about $${usd.toFixed(2)}`)
