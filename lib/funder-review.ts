import { createHash, timingSafeEqual } from 'node:crypto'

export type FunderRecord = {
  id: string
  locationId?: string
  createdAt: string
  properties: Record<string, unknown>
}

const week = 7 * 24 * 60 * 60 * 1000

export function reviewAllowed(record: FunderRecord, token: string, now = Date.now()) {
  const p = record.properties
  const age = now - Date.parse(record.createdAt)
  if (!(age >= 0 && age < week) || p.party_role !== 'funder' || p.approval_status !== 'pending') return false
  const hash = p.funder_review_token_hash
  return typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash) && /^[a-f0-9]{64}$/.test(token)
    && timingSafeEqual(Buffer.from(hash, 'hex'), createHash('sha256').update(token).digest())
}

export function reviewState(decision: string) {
  if (decision === 'accept') return { approval_status: 'approved', status: 'active' }
  if (decision === 'reject') return { approval_status: 'rejected', status: 'inactive' }
  return null
}

export async function funderRecordRequest(id: string, properties?: Record<string, unknown>): Promise<FunderRecord | null> {
  const key = process.env.GF360_GHL_PRIVATE_KEY
  if (!key || !/^[a-zA-Z0-9]{20,32}$/.test(id)) return null
  const location = process.env.GF360_GHL_LOCATION_ID || 'fwAgT5nunV4RIrV84OEh'
  const url = `https://services.leadconnectorhq.com/objects/custom_objects.organizations/records/${id}?locationId=${encodeURIComponent(location)}`
  const res = await fetch(url, { cache: 'no-store', headers: { Authorization: `Bearer ${key}`, Version: process.env.GF360_GHL_API_VERSION || '2021-07-28', 'Content-Type': 'application/json' }, ...(properties && { method: 'PUT', body: JSON.stringify({ properties }) }) })
  if (!res.ok) return null
  const { record } = await res.json() as { record?: FunderRecord }
  return record?.id === id && record.locationId === location ? record : null
}
