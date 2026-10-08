import type { Cited } from './cited.ts'

// The TFSA's annual dollar limit, year by year since the account began. A person's TFSA room is what the limits since they were
// first eligible (18 and resident, from 2009) add up to, less what they have put in: to ESTIMATE it without the CRA account in hand
// the app needs every year's limit, not just this year's. These are observations (what the limit WAS), so they are never projected.
//
// The page's history table reads: 2009–2012 $5,000 · 2013–2014 $5,500 · 2015 $10,000 · 2016–2018 $5,500 · 2019–2022 $6,000 ·
// 2023 $6,500 · 2024–2025 $7,000 · 2026 $7,000. An independent check of the transcription, beyond the literal test: the nineteen
// years add up to the 109 000 $ the cumulative figure (`accounts.tfsaCumulativeSince2009`) already cites.

export const TFSA_LIMIT_HISTORY: Cited<Record<number, number>> = {
  value: {
    2009: 5_000,
    2010: 5_000,
    2011: 5_000,
    2012: 5_000,
    2013: 5_500,
    2014: 5_500,
    2015: 10_000,
    2016: 5_500,
    2017: 5_500,
    2018: 5_500,
    2019: 6_000,
    2020: 6_000,
    2021: 6_000,
    2022: 6_000,
    2023: 6_500,
    2024: 7_000,
    2025: 7_000,
    2026: 7_000,
  },
  source: {
    url: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/tax-free-savings-account/contributing/before.html',
    title: 'Before you contribute to a TFSA',
    retrieved: '2026-10-06',
    note: 'The annual TFSA dollar limit by year, 2009–2026 (the page’s history table; 2010–2026 also re-derived on 2026-10-06 from a real CRA account’s room history).',
  },
  index: 'none',
}
