import type { Metadata } from 'next'
import { CheckCircle2, MessageSquare } from 'lucide-react'
import { FormShell } from '@/components/forms/FormShell'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import { REVIEW_MESSAGE_LIMIT } from '@/lib/funder-review'
import { PARTIES, partyKind, partyReviewAllowed } from '@/lib/signup-review'
import { partyRecord } from '@/lib/signup-review-record'

export const metadata: Metadata = { title: 'Review application', robots: { index: false, follow: false }, referrer: 'strict-origin' }

const RESULT_TEXT: Record<string, string> = {
  approved: 'Application approved',
  rejected: 'Application rejected',
  changes: 'Changes requested',
}

export default async function SignupReview({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams
  const field = (key: string) => typeof q[key] === 'string' ? q[key] as string : ''
  const kind = partyKind(field('kind'))
  const id = field('recordId')
  const token = field('token')
  const party = kind ? PARTIES[kind] : null
  const record = kind && /^[a-f0-9]{64}$/.test(token) ? await partyRecord(kind, id) : null
  const canReview = Boolean(kind && party && record && partyReviewAllowed(kind, record, token))
  const result = RESULT_TEXT[field('result')] ? field('result') : ''
  const notifyFailed = field('result').endsWith('-notify-failed')
  const subtitle = canReview && party && record && !result
    ? `Review ${party.noun} ${String(record.properties[party.nameField] || '')}.`
    : 'Application decision'

  return <main className="min-h-screen">
    <FormShell form={{ title: 'Review application', subtitle }}>
      {result ? (
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="inline-flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5"><CheckCircle2 aria-hidden="true" className="size-8" /></span>
          <Badge>Decision recorded</Badge>
          <h2 className="text-xl font-bold tracking-tight">{RESULT_TEXT[result]}</h2>
        </div>
      ) : canReview && party && kind && record ? (
        <form method="post" action="/signup-review/decision" className="flex flex-col gap-5">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="recordId" value={id} />
          <input type="hidden" name="token" value={token} />
          <dl className="grid gap-1 rounded-xl border border-border/60 bg-muted/30 p-4 text-sm">
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Name</dt><dd className="font-semibold">{String(record.properties[party.nameField] || '')}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Email</dt><dd className="font-semibold">{String(record.properties.email || '')}</dd></div>
            {kind === 'seeker' ? <div className="flex justify-between gap-4"><dt className="text-muted-foreground">Registered as</dt><dd className="font-semibold">{record.properties.is_individual === 'yes' ? 'An individual' : 'An organization'}</dd></div> : null}
          </dl>
          <Field>
            <FieldLabel htmlFor="review-message" className="flex items-center gap-1.5 text-xs font-semibold sm:text-sm">
              <MessageSquare aria-hidden="true" className="size-3.5 text-primary" />
              Message to the applicant <span aria-hidden="true" className="font-bold text-primary">*</span>
            </FieldLabel>
            <Textarea id="review-message" name="message" rows={5} required maxLength={REVIEW_MESSAGE_LIMIT} aria-describedby="review-message-help" placeholder="Write the message you want the applicant to receive." />
            <FieldDescription id="review-message-help">Required. This message is included in the decision email. Maximum {REVIEW_MESSAGE_LIMIT.toLocaleString('en-US')} characters.</FieldDescription>
            {q.error === 'message' ? <p role="alert" className="text-sm text-destructive">Enter a message within the character limit and try again.</p> : null}
          </Field>
          <div className="flex flex-wrap gap-3 pt-3">
            {party.decisions.map(d => <Button key={d.value} type="submit" name="decision" value={d.value} size="lg" variant={d.variant} className="h-11 flex-1 rounded-xl font-semibold">{d.label}</Button>)}
          </div>
        </form>
      ) : (
        <Alert variant={notifyFailed ? 'destructive' : 'default'}>
          <AlertTitle>{notifyFailed ? 'Decision not completed' : field('result') === 'failed' ? 'Decision not saved' : 'Review link unavailable'}</AlertTitle>
          <AlertDescription>{notifyFailed || field('result') === 'failed' ? 'The decision could not be completed. Open the link from your email to try again.' : 'This review link is invalid, expired, or already used.'}</AlertDescription>
        </Alert>
      )}
    </FormShell>
  </main>
}
