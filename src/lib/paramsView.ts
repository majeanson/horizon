import { citedLeaves } from '../engine/params/cited.ts'
import { KNOWN } from '../engine/params/index.ts'
import { renderValue } from '../engine/params/sourcesMd.ts'

// « Paramètres utilisés »: the government figures a result stands on, one row per figure, each with the official
// page it was read on and the day it was read — the same objects the engine reads and SOURCES.md prints, so the
// panel on the results page cannot say anything the engine does not use.

export interface ParamRow {
  path: string
  value: string
  title: string
  url: string
  retrieved: string
  /** Why this figure is not confirmed against an openable page, or undefined when it is. */
  verify: string | undefined
}

export function knownYears(): number[] {
  return Object.keys(KNOWN).map(Number).sort((a, b) => a - b)
}

export function paramRows(year: number): ParamRow[] {
  const tree = KNOWN[year]
  if (!tree) return []
  return citedLeaves(tree).map(({ path, cited }) => ({
    path,
    value: renderValue(cited.value),
    title: cited.source.title,
    url: cited.source.url,
    retrieved: cited.source.retrieved,
    verify: cited.source.verify,
  }))
}
