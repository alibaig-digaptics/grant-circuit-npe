import { createHash, randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createGrantLink, funderContact, funderGhl, funderLocation, funderRecordRequest, reviewAllowed, reviewMessageForEmail, reviewState } from '@/lib/funder-review'

export async function POST(request: Request) {
  const origin = new URL(request.url).origin
  const redirect = (result: string) => NextResponse.redirect(new URL(`/funder-review?result=${result}`, origin), 303)
  if (request.headers.get('origin') !== origin) return redirect('invalid')
  const form = await request.formData().catch(() => null)
  const value = (key: string) => String(form?.get(key) || '')
  const id = value('recordId')
  const token = value('token')
  const state = reviewState(value('decision'))
  if (!state || !/^[a-f0-9]{64}$/.test(token)) return redirect('invalid')
  const record = await funderRecordRequest(id)
  if (!record || !reviewAllowed(record, token)) return redirect('invalid')
  const message = reviewMessageForEmail(form?.get('message'))
  if (message === null) {
    const retry = new URL('/funder-review', origin)
    retry.search = new URLSearchParams({ recordId: id, token, error: 'message' }).toString()
    return NextResponse.redirect(retry, 303)
  }

  const [contact, fields] = await Promise.all([funderContact(record), funderGhl(`/locations/${funderLocation()}/customFields?model=contact`)]).catch(() => [null, null])
  const fieldId = (key: string) => fields?.customFields?.find((f: { fieldKey: string }) => f.fieldKey === key)?.id
  const fieldValues = {
    'contact.funder_notification_type': state.approval_status,
    'contact.funder_decision_message': message,
    'contact.funder_create_grant_url': '',
  }
  if (!contact || Object.keys(fieldValues).some(key => !fieldId(key))) return redirect('failed')
  const access = state.approval_status === 'approved' ? randomBytes(32).toString('hex') : ''
  if (access) fieldValues['contact.funder_create_grant_url'] = createGrantLink(origin, id, access)
  const endpoint = `/contacts/${encodeURIComponent(contact.id)}`
  const tag = { tags: ['funder-decision-recorded'] }

  try {
    // Prepare the contact first, then commit the decision, then enroll the contact for its email.
    const saved = await funderGhl(endpoint, { method: 'PUT', body: JSON.stringify({ customFields: Object.entries(fieldValues).map(([key, fieldValue]) => ({ id: fieldId(key), fieldValue })) }) })
    if (saved?.contact?.id !== contact.id) return redirect('failed')
    if (contact.tags?.includes(tag.tags[0]) && !await funderGhl(endpoint + '/tags', { method: 'DELETE', body: JSON.stringify(tag) })) return redirect('failed')
    const updated = await funderRecordRequest(id, { ...state, funder_review_token_hash: '', create_grant_token_hash: access ? createHash('sha256').update(access).digest('hex') : '' })
    if (updated?.properties.approval_status !== state.approval_status) return redirect('failed')
    try {
      const enrolled = await funderGhl(endpoint + '/tags', { method: 'POST', body: JSON.stringify(tag) })
      if (enrolled?.tags?.includes(tag.tags[0])) return redirect(state.approval_status)
    } catch { /* the decision is already saved; do not claim the email was queued */ }
    return redirect(`${state.approval_status}-notify-failed`)
  } catch { return redirect('failed') }
}
