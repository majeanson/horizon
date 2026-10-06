import { useT } from '../i18n'
import { SectionHeader } from '../components/SectionHeader'

// Placeholder landing page for the scaffold (Phase 0). Phase 7 replaces it with the
// profile (« Moi / Conjoint·e »); the shell, the routes and the guards around it are what
// this commit proves.
export function Home() {
  const t = useT()
  return (
    <section className="page-body">
      <SectionHeader title={t.appName} subtitle={t.tagline} />
    </section>
  )
}
