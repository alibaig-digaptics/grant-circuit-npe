import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { funderRecordRequest, reviewAllowed, REVIEW_MESSAGE_LIMIT } from '@/lib/funder-review'

export const metadata: Metadata = { title: 'Review funder application', robots: { index: false, follow: false }, referrer: 'strict-origin' }

export default async function FunderReview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams
  const field = (key: string) => typeof q[key] === 'string' ? q[key] as string : ''
  const id = field('recordId')
  const token = field('token')
  const record = /^[a-f0-9]{64}$/.test(token) ? await funderRecordRequest(id) : null
  const canReview = record && reviewAllowed(record, token)
  return <main className="mx-auto max-w-xl px-6 py-16">
    <section className="rounded-xl border bg-card p-7 shadow-sm">
      <h1 className="mb-4 text-2xl font-semibold">Review funder application</h1>
      {q.result === 'approved-notify-failed' || q.result === 'rejected-notify-failed' ? <p>The decision was saved, but the notification could not be queued. Contact your administrator.</p> : q.result === 'approved' || q.result === 'rejected' ? <p>Decision recorded: {q.result}.</p> : canReview ? <>
        <p className="mb-5">Review the application for <strong>{String(record.properties.organization_name || 'this organization')}</strong>.</p>
        <form method="post" action="/funder-review/decision" className="flex flex-col gap-5">
          <input type="hidden" name="recordId" value={id} />
          <input type="hidden" name="token" value={token} />
          <Field>
            <FieldLabel htmlFor="review-message">Message to the funder</FieldLabel>
            <Textarea id="review-message" name="message" rows={5} required maxLength={REVIEW_MESSAGE_LIMIT} aria-describedby="review-message-help" placeholder="Write the message you want the funder to receive." />
            <FieldDescription id="review-message-help">Required. This message is included in the decision email. Maximum {REVIEW_MESSAGE_LIMIT.toLocaleString('en-US')} characters.</FieldDescription>
            {q.error === 'message' ? <p role="alert" className="text-sm text-destructive">Enter a message within the character limit and try again.</p> : null}
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button type="submit" name="decision" value="accept">Accept</Button>
            <Button type="submit" name="decision" value="reject" variant="destructive">Reject</Button>
          </div>
        </form>
      </> : <p>{q.result === 'failed' ? 'The decision could not be saved. Open the link from your email to try again.' : 'This review link is invalid, expired, or already used.'}</p>}
    </section>
  </main>
}
