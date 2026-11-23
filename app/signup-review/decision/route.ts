import { NextResponse } from 'next/server'
import { reviewMessageForEmail } from '@/lib/funder-review'
import { getForm, sendDecisionEmail, webhookUrl } from '@/lib/forms'
import { PARTIES, partyKind, partyReviewAllowed } from '@/lib/signup-review'
import { partyRecord } from '@/lib/signup-review-record'

export async function POST(request: Request) {
  const origin = new URL(request.url).origin
  const redirect = (result: string) => NextResponse.redirect(new URL(`/signup-review?result=${result}`, origin), 303)
  if (request.headers.get('origin') !== origin) return redirect('invalid')
  const form = await request.formData().catch(() => null)
  const value = (key: string) => String(form?.get(key) || '')
  const kind = partyKind(value('kind'))
  const id = value('recordId')
  const token = value('token')
  const party = kind ? PARTIES[kind] : null
  const decision = party?.decisions.find(d => d.value === value('decision'))
  if (!kind || !party || !decision || !/^[a-f0-9]{64}$/.test(token)) return redirect('invalid')
  const record = await partyRecord(kind, id)
  if (!record || !partyReviewAllowed(kind, record, token)) return redirect('invalid')
  const message = reviewMessageForEmail(form?.get('message'))
  if (message === null) {
    const retry = new URL('/signup-review', origin)
    retry.search = new URLSearchParams({ kind, recordId: id, token, error: 'message' }).toString()
    return NextResponse.redirect(retry, 303)
  }
  const target = getForm(party.form)
  if (!target) return redirect('failed')

  try {
    // The token is spent first, so a second click or a replay cannot run the decision twice.
    const spent = await partyRecord(kind, id, { [party.hashField]: '' })
    if (!spent) return redirect('failed')
    const res = await fetch(webhookUrl(target), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        source: 'grant-circuit', form: target.slug, n8nPath: target.n8nPath,
        locationId: process.env.GF360_GHL_LOCATION_ID || 'fwAgT5nunV4RIrV84OEh',
        submittedAt: new Date().toISOString(),
        recordId: id, decision: decision.send, notes: message,
      }),
    })
    if (!res.ok) return redirect(`${decision.result}-notify-failed`)
    const sent = await sendDecisionEmail({ kind, decision: decision.value === 'accept' ? 'approve' : decision.value === 'reject' ? 'reject' : 'changes', email: String(record.properties.email || ''), orgName: String(record.properties[party.nameField] || ''), message }).catch(() => false)
    if (!sent) return redirect(`${decision.result}-notify-failed`)
    return redirect(decision.result)
  } catch { return redirect('failed') }
}
