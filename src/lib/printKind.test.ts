import { describe, expect, it } from 'vitest'
import { printReady, type PrintInputs } from './printKind.ts'

// WHEN A PAGE GOES TO PAPER: once every figure it prints is in — never with « … » where a figure belongs.

const all: PrintInputs = { answerPending: false, runsPending: false, runs: 2, retiredNow: false, range: {}, stress: {} }

describe('printReady', () => {
  it('nothing prints before the answer', () => {
    for (const kind of ['summary', 'calendar', 'years', 'sources'] as const) expect(printReady(kind, { ...all, answerPending: true })).toBe(false)
  })

  it('the plan waits for the scenario range, the market stress and the ages compared — its « Solidité » block and comparison print them', () => {
    expect(printReady('summary', all)).toBe(true)
    expect(printReady('summary', { ...all, range: undefined })).toBe(false)
    expect(printReady('summary', { ...all, stress: undefined })).toBe(false)
    expect(printReady('summary', { ...all, runsPending: true })).toBe(false)
    // a household that has stopped working prints no « Solidité »: nothing to wait for there
    expect(printReady('summary', { ...all, retiredNow: true, range: undefined, stress: undefined })).toBe(true)
  })

  it('the year table waits for the runs; the other pages read the answer alone', () => {
    expect(printReady('years', { ...all, runs: 0 })).toBe(false)
    expect(printReady('years', { ...all, runsPending: true })).toBe(false)
    expect(printReady('calendar', { ...all, range: undefined, stress: undefined, runsPending: true })).toBe(true)
  })
})
