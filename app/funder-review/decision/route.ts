import { NextResponse } from 'next/server'
import { funderRecordRequest, reviewAllowed, reviewState } from '@/lib/funder-review'

export async function POST(request: Request) {
  const redirect = (result: string) => NextResponse.redirect(new URL(`/funder-review?result=${result}`, request.url), 303)
  if (request.headers.get('origin') !== new URL(request.url).origin) return redirect('invalid')
  const form = await request.formData().catch(() => null)
  const value = (key: string) => String(form?.get(key) || '')
  const id = value('recordId')
  const token = value('token')
  const state = reviewState(value('decision'))
  if (!state || !/^[a-f0-9]{64}$/.test(token)) return redirect('invalid')
  const record = await funderRecordRequest(id)
  if (!record || !reviewAllowed(record, token)) return redirect('invalid')
  const updated = await funderRecordRequest(id, { ...state, funder_review_token_hash: '' })
  return redirect(updated?.properties.approval_status === state.approval_status ? state.approval_status : 'failed')
}
