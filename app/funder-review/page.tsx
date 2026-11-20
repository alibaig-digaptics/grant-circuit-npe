import type { Metadata } from 'next'
import { CheckCircle2, MessageSquare } from 'lucide-react'
import { FormShell } from '@/components/forms/FormShell'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
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
  const decision = q.result === 'approved' || q.result === 'rejected' ? q.result : null
  const notificationFailed = q.result === 'approved-notify-failed' || q.result === 'rejected-notify-failed'
  const subtitle = canReview && !decision && !notificationFailed
    ? `Review the application for ${String(record.properties.organization_name || 'this organization')}.`
    : 'Funder application decision'

  return <main className="min-h-screen">
    <FormShell form={{ title: 'Review funder application', subtitle }}>
      {notificationFailed ? (
        <Alert variant="destructive">
          <AlertTitle>Notification not queued</AlertTitle>
          <AlertDescription>The decision was saved, but the notification could not be queued. Contact your administrator.</AlertDescription>
        </Alert>
      ) : decision ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5"><CheckCircle2 aria-hidden="true" className="size-8" /></span>
          <Badge>Decision recorded</Badge>
          <h2 className="text-xl font-bold tracking-tight">Application {decision}</h2>
        </div>
      ) : canReview ? (
        <form method="post" action="/funder-review/decision" className="flex flex-col gap-5">
          <input type="hidden" name="recordId" value={id} />
          <input type="hidden" name="token" value={token} />
          <Field>
            <FieldLabel htmlFor="review-message" className="flex items-center gap-1.5 text-xs font-semibold sm:text-sm">
              <MessageSquare aria-hidden="true" className="size-3.5 text-primary" />
              Message to the funder <span aria-hidden="true" className="font-bold text-primary">*</span>
            </FieldLabel>
            <Textarea id="review-message" name="message" rows={5} required maxLength={REVIEW_MESSAGE_LIMIT} aria-describedby="review-message-help" placeholder="Write the message you want the funder to receive." />
            <FieldDescription id="review-message-help">Required. This message is included in the decision email. Maximum {REVIEW_MESSAGE_LIMIT.toLocaleString('en-US')} characters.</FieldDescription>
            {q.error === 'message' ? <p role="alert" className="text-sm text-destructive">Enter a message within the character limit and try again.</p> : null}
          </Field>
          <div className="flex gap-3 pt-3">
            <Button type="submit" name="decision" value="accept" size="lg" className="h-11 flex-1 rounded-xl font-semibold shadow-md">Accept</Button>
            <Button type="submit" name="decision" value="reject" size="lg" variant="destructive" className="h-11 flex-1 rounded-xl font-semibold">Reject</Button>
          </div>
        </form>
      ) : (
        <Alert>
          <AlertTitle>{q.result === 'failed' ? 'Decision not saved' : 'Review link unavailable'}</AlertTitle>
          <AlertDescription>{q.result === 'failed' ? 'The decision could not be saved. Open the link from your email to try again.' : 'This review link is invalid, expired, or already used.'}</AlertDescription>
        </Alert>
      )}
    </FormShell>
  </main>
}
