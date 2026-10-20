import { readFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'

// Horizon has no API to stub: a spec « logs in » by putting a profile into localStorage BEFORE first paint, which
// is exactly where the app itself keeps it. The example is the golden couple (src/lib/fixtures/profile.v10.json) —
// the same file the unit tests migrate and the golden snapshots are built from, so what a browser sees here is
// what the engine tests pin. (When the schema moves on, point this at the new fixture: `schemaVersion.test.ts`
// keeps one per version.)

/** CI's two-core runner, on demand: `playwright.slow.config.ts` sets `cpuThrottle` and every seeded page asks Chromium for it. */
export async function slowCpu(page: Page): Promise<void> {
  const rate = (test.info().project.use as { cpuThrottle?: number }).cpuThrottle
  if (!rate || rate <= 1) return
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate })
}

export const PROFILE_KEY = 'horizon-profile'

export type SeedProfile = Record<string, unknown>

export const EXAMPLE: SeedProfile = JSON.parse(readFileSync('src/lib/fixtures/profile.v25.json', 'utf8'))

/** A blank single person with the defaults the app itself would start from. */
export function blankSeed(): SeedProfile {
  const e = structuredClone(EXAMPLE) as { household: { livesAlone: boolean; persons: Record<string, unknown>[]; spending: Record<string, number>; children: number[] } }
  const self = e.household.persons[0]
  Object.assign(self, {
    name: '',
    birth: { year: 1981, month: 1 },
    retirementAge: 65,
    salaryToday: 0,
    earningsHistory: {},
    rrq: { startAge: 65 },
    oas: { startAge: 65, residentSince: 1999 },
    accounts: {
      rrsp: { balance: 0, room: 0, annualContribution: 0, lockedIn: 0, employerContribution: 0 },
      tfsa: { balance: 0, room: 0, annualContribution: 0 },
      nonReg: { balance: 0, acb: 0, annualContribution: 0 },
    },
    pensions: [],
  })
  e.household.persons = [self]
  e.household.livesAlone = true
  e.household.spending = { workingToday: 0, retiredToday: 0 }
  e.household.children = []
  return e as unknown as SeedProfile
}

/** Put a profile in storage before the page's own scripts run — once per tab, so a reload keeps what was typed. */
export async function seedProfile(page: Page, profile: SeedProfile = EXAMPLE): Promise<void> {
  await slowCpu(page)
  await page.addInitScript(
    ([key, value]) => {
      if (sessionStorage.getItem('e2e-seeded')) return
      sessionStorage.setItem('e2e-seeded', '1')
      localStorage.setItem(key, value)
    },
    [PROFILE_KEY, JSON.stringify(profile)],
  )
}

/**
 * « Ma situation » decides which sections of the profile form show. A spec that exercises one of them (the employer plan, years abroad, children,
 * dated events, work kept after retiring) answers « oui » to every question first — the same note to oneself the page keeps on this device.
 */
export async function showAllSections(page: Page): Promise<void> {
  await page.addInitScript(() => {
    if (localStorage.getItem('horizon-situation') === null) localStorage.setItem('horizon-situation', JSON.stringify(['kids', 'events', 'pension:self', 'pension:spouse', 'nonReg:self', 'nonReg:spouse', 'abroad:self', 'abroad:spouse', 'partTime:self', 'partTime:spouse']))
  })
}

/** « Ma situation » is a closed card on Profil (a block of its accordion, and a one-card accordion of its own on « Par document »): open it before touching its
 *  questions (a no-op when it is already open). */
export async function openSituation(page: Page): Promise<void> {
  const toggle = page.locator('#situation .accordion__toggle')
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
}

/**
 * Change the language the way a person does — the row on the settings page (the top bar has no toggle: its room went to the answer) — then come back
 * to where the spec was. The choice is on the device, so the page comes back in the new language.
 */
export async function switchLanguage(page: Page, lang: 'fr' | 'en'): Promise<void> {
  const url = page.url()
  await page.goto('/donnees')
  await page.getByRole('tab', { name: lang === 'en' ? 'English' : 'Français' }).click()
  await expect(page.locator('html')).toHaveAttribute('lang', lang)
  await page.goto(url)
}

/** The profile as the app has saved it right now. */
export async function savedProfile(page: Page): Promise<any> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? 'null'), PROFILE_KEY)
}
