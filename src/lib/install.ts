import { useSyncExternalStore } from 'react'
import { isStandalone } from './standalone.ts'

// INSTALLING THE APP — the one quiet offer. A browser tells a page it could be installed with `beforeinstallprompt`, once, and may do it before the app has
// started: public/theme-bootstrap.js catches the event the moment the document begins and parks it on `window.horizonInstall`, so this module only reads it.
// Nothing here talks to a network, and nothing is asked twice: « Plus tard » is remembered on this device, the card never comes back, and the settings page
// keeps a permanent line for whoever changes their mind. iOS has no prompt to fire: it gets the words (Share ▸ Add to Home Screen), which is all there is.

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
declare global {
  interface Window {
    horizonInstall?: InstallPromptEvent
  }
}

/** `native`: the browser holds a prompt we can fire · `ios`: Safari, add it by hand · `manual`: no prompt (say where the browser keeps it) · `installed`: already an app. */
export type InstallKind = 'native' | 'ios' | 'manual' | 'installed'

export const INSTALL_KEY = 'horizon-install'
const CHANGE = 'horizon-install-change'

/** An iPhone, an iPod, an iPad — iPadOS announces itself as a Mac with a touch screen. */
export function uaIsIos(ua: string, touchPoints: number): boolean {
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && touchPoints > 1)
}

export function installKind(): InstallKind {
  if (isStandalone()) return 'installed'
  if (window.horizonInstall) return 'native'
  return uaIsIos(navigator.userAgent, navigator.maxTouchPoints ?? 0) ? 'ios' : 'manual'
}

/** What this device decided: « later » (do not offer the card again) or « done » (installed). Null: nothing yet. */
export function installMemory(): 'later' | 'done' | null {
  try {
    const v = localStorage.getItem(INSTALL_KEY)
    return v === 'later' || v === 'done' ? v : null
  } catch {
    return null
  }
}

function remember(v: 'later' | 'done'): void {
  try {
    localStorage.setItem(INSTALL_KEY, v)
  } catch {
    /* storage blocked: the card may come back, never worse */
  }
  window.dispatchEvent(new Event(CHANGE))
}

/** « Plus tard »: the card is gone for good on this device; the settings page still has the line. */
export function dismissInstall(): void {
  remember('later')
}

/** Fire the browser's own install dialog, once. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = window.horizonInstall
  if (!event) return 'unavailable'
  window.horizonInstall = undefined // a prompt can be used once
  window.dispatchEvent(new Event(CHANGE))
  try {
    await event.prompt()
    const { outcome } = await event.userChoice
    if (outcome === 'accepted') remember('done')
    return outcome
  } catch {
    return 'unavailable'
  }
}

function subscribe(onChange: () => void): () => void {
  const onInstalled = () => remember('done')
  for (const name of ['horizon:install-ready', CHANGE]) window.addEventListener(name, onChange)
  window.addEventListener('appinstalled', onInstalled)
  return () => {
    for (const name of ['horizon:install-ready', CHANGE]) window.removeEventListener(name, onChange)
    window.removeEventListener('appinstalled', onInstalled)
  }
}

/** How the app can be installed here, re-read when a prompt arrives or the install happens. */
export function useInstallKind(): InstallKind {
  return useSyncExternalStore(subscribe, installKind, () => 'manual')
}

/** Is the one-time card due? Only where there is something to do (a prompt to fire, or iOS words to read), never once dismissed or installed. */
export function useInstallCard(): InstallKind | null {
  const kind = useInstallKind()
  useSyncExternalStore(subscribe, installMemory, () => null)
  return (kind === 'native' || kind === 'ios') && installMemory() === null ? kind : null
}
