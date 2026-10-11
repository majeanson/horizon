import { saveAsFile } from './download.ts'
import { exportFileName, exportProfileJson, getProfile, markExported } from './store.ts'

// « Sauvegarder une copie » — the one way a copy of the profile leaves the device: the file is handed to its owner and the backup stamps are cleared (store.ts, markExported).
// The shell's notice, the line on Profil, the settings page and the end of the first visit all do exactly this, so they all call it.
export function saveCopy(): void {
  saveAsFile(exportProfileJson(getProfile()), exportFileName())
  markExported()
}
