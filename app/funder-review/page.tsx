import type { Metadata } from 'next'
import { funderRecordRequest, reviewAllowed, reviewState } from '@/lib/funder-review'

export const metadata: Metadata = { title: 'Review funder application', robots: { index: false, follow: false }, referrer: 'no-referrer' }

export default async function FunderReview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams
  const field = (key: string) => typeof q[key] === 'string' ? q[key] as string : ''
  const id = field('recordId')
  const token = field('token')
  const decision = field('decision')
  const state = reviewState(decision)
  const record = state && /^[a-f0-9]{64}$/.test(token) ? await funderRecordRequest(id) : null
  const canReview = record && reviewAllowed(record, token)
  const verb = decision === 'accept' ? 'Accept' : 'Reject'
  return <main className="mx-auto max-w-xl px-6 py-16">
    <section className="rounded-xl border bg-card p-7 shadow-sm">
      <h1 className="mb-4 text-2xl font-semibold">{canReview ? `${verb} funder application` : 'Review funder application'}</h1>
      {q.result === 'approved' || q.result === 'rejected' ? <p>Decision recorded: {q.result}.</p> : canReview ? <>
        <p className="mb-5">Confirm your decision for <strong>{String(record.properties.organization_name || 'this organization')}</strong>.</p>
        <form method="post" action="/funder-review/decision">
          <input type="hidden" name="recordId" value={id} />
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="decision" value={decision} />
          <button className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground" type="submit">Confirm {verb.toLowerCase()}</button>
        </form>
      </> : <p>{q.result === 'failed' ? 'The decision could not be saved. Open the link from your email to try again.' : 'This review link is invalid, expired, or already used.'}</p>}
    </section>
  </main>
}
