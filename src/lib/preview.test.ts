import { afterEach, describe, expect, it, vi } from 'vitest'

// THE PORTFOLIO PREVIEW (`?apercu`): an invented household shown from memory — never read from, never written to, this device's storage.
// The flag is read when the modules load, so each case sets the address first and imports the store fresh.

const KEY = 'horizon-profile'

async function freshStore(search: string) {
  window.history.replaceState(null, '', `/resultats${search}`)
  vi.resetModules()
  return { store: await import('./store.ts'), example: await import('./example.ts'), preview: await import('./preview.ts') }
}

afterEach(() => {
  localStorage.clear()
  window.history.replaceState(null, '', '/')
})

describe('the portfolio preview', () => {
  it('shows the invented household, and nothing it shows or that changes in it is written', async () => {
    const { store, example, preview } = await freshStore('?apercu')
    expect(preview.isPreview()).toBe(true)
    store.replaceProfile(example.exampleProfile('golden'))
    expect(store.getProfile().household.persons.length).toBe(2)
    store.updateProfile((p) => ({ ...p, household: { ...p.household, persons: p.household.persons.map((x) => ({ ...x, retirementAge: 58 })) } }))
    store.flushProfile()
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it("never reads the visitor's own profile, and leaves it as it was", async () => {
    localStorage.setItem(KEY, '{"mine":true}')
    const { store } = await freshStore('?apercu')
    expect(store.getStorageIssue()).toBeNull() // not even read, so not found unreadable
    store.updateProfile((p) => ({ ...p, confirmed: [] , plans: [] , customScenario: null, household: { ...p.household, livesAlone: !p.household.livesAlone } }))
    store.flushProfile()
    expect(localStorage.getItem(KEY)).toBe('{"mine":true}')
  })

  it('an ordinary visit is not a preview: its profile is saved as always', async () => {
    const { store, example, preview } = await freshStore('')
    expect(preview.isPreview()).toBe(false)
    store.replaceProfile(example.exampleProfile('golden'))
    expect(localStorage.getItem(KEY)).not.toBeNull()
  })
})

describe('inside a frame', () => {
  afterEach(() => vi.restoreAllMocks())
  it('is told apart from a top-level visit — and a top that cannot even be compared counts as framed', async () => {
    const { preview } = await freshStore('')
    expect(preview.framed()).toBe(false)
    vi.spyOn(window, 'top', 'get').mockReturnValue({} as Window)
    expect(preview.framed()).toBe(true)
    vi.spyOn(window, 'top', 'get').mockImplementation(() => {
      throw new Error('cross-origin')
    })
    expect(preview.framed()).toBe(true)
  })
})
