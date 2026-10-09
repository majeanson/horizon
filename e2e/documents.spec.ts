import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { blankSeed, seedProfile } from './seed'

// « Documents à rassembler »: the list a person works through BEFORE typing — ticked on this device, printable, downloadable — and the ways to it.

test('the list names every document, per person where each has their own, and a tick is kept', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/documents')
  await expect(page.getByRole('heading', { name: 'Documents à rassembler', level: 1 })).toBeVisible()
  const items = page.locator('.docs-item')
  await expect(items).toHaveCount(12) // the example is a couple: five documents each + the home and the budget
  await expect(page.getByText('0 sur 12 rassemblés')).toBeVisible()
  const first = items.first()
  await expect(first.getByRole('heading', { name: 'Relevé de participation au RRQ' })).toBeVisible()
  await expect(first).toContainText('Pour Camille')
  await expect(first).toContainText('Vous y lirez')
  await expect(first.getByRole('link', { name: 'Ouvrir la page officielle' })).toHaveAttribute('href', /^https:\/\/www\.retraitequebec\.gouv\.qc\.ca\//)
  await first.getByRole('checkbox').check()
  await expect(page.getByText('1 sur 12 rassemblés')).toBeVisible()
  await page.reload()
  await expect(page.getByText('1 sur 12 rassemblés')).toBeVisible()
  await expect(page.locator('.docs-item').first().getByRole('checkbox')).toBeChecked()
  await page.getByRole('button', { name: 'Tout décocher' }).click()
  await expect(page.getByText('0 sur 12 rassemblés')).toBeVisible()
})

test('the list downloads as a text file that carries the ticks, and prints without its controls', async ({ page }) => {
  await seedProfile(page)
  await page.goto('/documents')
  await page.locator('.docs-item').first().getByRole('checkbox').check()
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Télécharger la liste' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('horizon-documents.txt')
  const text = await readFile((await file.path())!, 'utf8')
  expect(text).toContain('[x] Relevé de participation au RRQ — Camille')
  expect(text).toContain('[ ] Relevé de participation au RRQ — Alex')
  await page.emulateMedia({ media: 'print' })
  await expect(page.getByRole('button', { name: 'Télécharger la liste' })).toBeHidden()
  await expect(page.locator('.docs-item').first()).toBeVisible()
})

test('a first-time user finds it on the first screen, and everyone finds it on Profil and in the glossary', async ({ page }) => {
  await seedProfile(page, blankSeed())
  await page.goto('/')
  await page.getByRole('link', { name: 'Documents à rassembler' }).click()
  await expect(page).toHaveURL(/\/documents$/)
  await expect(page.locator('.docs-item')).toHaveCount(7) // one person alone
  await page.goto('/?form=1')
  await expect(page.getByRole('link', { name: 'Documents à rassembler' })).toBeVisible()
  await page.goto('/glossaire')
  await expect(page.getByRole('link', { name: 'Documents à rassembler' })).toBeVisible()
})

test('English', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('horizon-lang', 'en'))
  await seedProfile(page)
  await page.goto('/documents')
  await expect(page.getByRole('heading', { name: 'Documents to gather', level: 1 })).toBeVisible()
  await expect(page.getByText('0 of 12 gathered')).toBeVisible()
})
