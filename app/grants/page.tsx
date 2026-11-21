import type { Metadata } from 'next'
import Link from 'next/link'
import { FormShell } from '@/components/forms/FormShell'
import { Badge } from '@/components/ui/badge'
import { loadOpenGrants } from '@/lib/grants'

export const metadata: Metadata = { title: 'Open grants' }
export const dynamic = 'force-dynamic'

const awardsText = (value: string) => value === '1' ? '1 award' : value === '2' ? '2 awards' : 'Number of awards to be decided'

export default async function Grants() {
  const grants = await loadOpenGrants().catch(() => [])
  return <main className="min-h-screen">
    <FormShell form={{ title: 'Open grants', subtitle: 'Grants that are open for applications right now' }}>
      {grants.length ? (
        <ul className="flex flex-col gap-4">
          {grants.map(g => (
            <li key={g.id} className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h2 className="text-lg font-semibold tracking-tight">{g.name}</h2>
                <Badge variant="secondary">Up to ${g.amount.toLocaleString('en-US')}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{g.funder} · {awardsText(g.awards)}</p>
              {g.summary ? <p className="mt-3 whitespace-pre-wrap text-sm">{g.summary}</p> : null}
              <Link className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90" href={`/forms/grant-applicant-submit?recordId=${encodeURIComponent(g.id)}`}>Apply</Link>
            </li>
          ))}
        </ul>
      ) : <p className="py-6 text-center text-sm text-muted-foreground">There are no open grants right now. Please check back soon.</p>}
      <p className="mt-6 text-center text-xs text-muted-foreground">Applying is for approved grant seekers. <Link className="underline underline-offset-4" href="/forms/org-registration">Register as a grant seeker</Link> first if you have not yet.</p>
    </FormShell>
  </main>
}
