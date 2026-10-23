import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { Gloss } from '../components/Gloss.tsx'
import { GLOSSARY_COPY } from './glossaryCopy.ts'

// A SIGLE IN RUNNING TEXT OPENS ITS PLAIN SENTENCE WHERE THE PERSON IS READING. A plain tap shows the glossary's own words in a small dialog; the link under
// it stays a real link (modified clicks, assistive technology, no script), and a sigle the glossary does not explain stays text.

afterEach(cleanup)

const view = (text: string) =>
  render(
    <MemoryRouter>
      <p>
        <Gloss>{text}</Gloss>
      </p>
    </MemoryRouter>,
  )

describe('a sigle in a hint', () => {
  it('is a link to its glossary entry, the first time only, and an unknown sigle stays text', () => {
    view('Votre RRQ, puis encore le RRQ, et un ABCD.')
    const links = screen.getAllByRole('link')
    expect(links).toHaveLength(1)
    expect(links[0].getAttribute('href')).toBe('/glossaire#terme-rrq')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('a plain tap opens the glossary’s own sentence, with the way on to the glossary', async () => {
    view('Touchez la PSV.')
    fireEvent.click(screen.getByRole('link', { name: 'PSV' }))
    const dialog = await screen.findByRole('dialog')
    const psv = GLOSSARY_COPY.fr.groups.flatMap((g) => g.terms).find((t) => t.id === 'psv')!
    await waitFor(() => expect(dialog.textContent).toContain(psv.plain))
    expect(dialog.textContent).toContain(psv.name)
    const more = [...dialog.querySelectorAll('a')].find((a) => a.getAttribute('href') === '/glossaire#terme-psv')
    expect(more).toBeTruthy()
  })

  it('a ctrl-click is left to the browser: no dialog', () => {
    view('Touchez la PSV.')
    fireEvent.click(screen.getByRole('link', { name: 'PSV' }), { ctrlKey: true })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('the groceries benefit explains itself in everyday words, and says what it used to be called', async () => {
    view('Le crédit : ACEBE.')
    fireEvent.click(screen.getByRole('link', { name: 'ACEBE' }))
    const dialog = await screen.findByRole('dialog')
    await waitFor(() => expect(dialog.textContent).toMatch(/crédit pour la TPS/))
    expect(dialog.textContent).toMatch(/pas imposable/)
  })
})
