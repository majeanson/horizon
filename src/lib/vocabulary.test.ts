import { readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { sourceFiles } from './buildGuardScan'

// THE WORDS WE DO NOT USE. A word the owner has ruled out is held out by a test, not by memory.
//   « pécule » → « nid » (the household's savings and accounts, in French).
//   One name per place and per figure (2026-10-19, « it should read in a uniform manner »): the page the gear opens is « Sauvegarde et réglages », never
//   « page Données » (its route kept the old word); the third view of Résultats is « Preuve », never « Vérifier »; the button to the results says
//   « Voir ma réponse », never « Voir mon résultat »; the profile's age is « Âge de retraite visé » wherever it is restated, never « Âge de la retraite ».
// Every spelling, any case, anywhere under src/ — copy, comments, gallery specimens.

const srcDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const FORBIDDEN: { pattern: RegExp; use: string }[] = [
  { pattern: /p[ée]cule/i, use: 'nid' },
  { pattern: /page\s+Données/i, use: 'Sauvegarde et réglages' },
  { pattern: /Vérifier\s+›/, use: 'Preuve ›' },
  { pattern: /Voir mon résultat/i, use: 'Voir ma réponse' },
  { pattern: /Âge de la retraite/i, use: 'Âge de retraite visé' },
]

describe('vocabulary', () => {
  it('the detector catches every spelling and not its look-alikes (canary)', () => {
    const cases: [number, string[], string[]][] = [
      [0, ['pécule', 'Pécule', 'PÉCULE', 'pecule', 'du pécule', 'pécules'], ['nid', 'nest', 'cumul', 'spécial']],
      [1, ['page Données', 'page Données', 'la Page données'], ['Mes données', 'données de la page', 'Sauvegarde et réglages']],
      [2, ['Vérifier › Paramètres', 'Vérifier › x'], ['Vérifier avec mes relevés', 'Preuve › Paramètres']],
      [3, ['Voir mon résultat', 'voir mon résultat'], ['Voir ma réponse', 'Voir mes résultats']],
      [4, ['Âge de la retraite', 'âge de la retraite'], ['Âge de retraite visé', 'à l’âge de la rente']],
    ]
    for (const [i, bad, fine] of cases) {
      for (const s of bad) expect(FORBIDDEN[i].pattern.test(s), s).toBe(true)
      for (const s of fine) expect(FORBIDDEN[i].pattern.test(s), s).toBe(false)
    }
  })
  it('walks a real tree', () => {
    expect(sourceFiles(srcDir).length).toBeGreaterThan(50)
  })
  it('no forbidden word appears in src/', () => {
    const hits: string[] = []
    for (const file of sourceFiles(srcDir)) {
      const lines = readFileSync(file, 'utf8').split('\n')
      lines.forEach((line, i) => {
        for (const { pattern, use } of FORBIDDEN) if (pattern.test(line)) hits.push(`${relative(srcDir, file)}:${i + 1} uses a word we do not use (say « ${use} »)`)
      })
    }
    expect(hits).toEqual([])
  })
})
