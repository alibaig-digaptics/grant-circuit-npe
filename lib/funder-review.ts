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
  return matchesToken(p.funder_review_token_hash, token)
}

export function matchesToken(hash: unknown, token: string) {
  return typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash) && /^[a-f0-9]{64}$/.test(token)
    && timingSafeEqual(Buffer.from(hash, 'hex'), createHash('sha256').update(token).digest())
}

export function grantAccessAllowed(record: Pick<FunderRecord, 'properties'>, token: string) {
  const p = record.properties
  return p.party_role === 'funder' && p.approval_status === 'approved' && p.status === 'active'
    && matchesToken(p.create_grant_token_hash, token)
}

export function createGrantLink(origin: string, id: string, token: string) {
  const url = new URL('/forms/grant-rfp', origin)
  url.search = new URLSearchParams({ organizationId: id, access: token }).toString()
  return url.toString()
}

export const REVIEW_MESSAGE_LIMIT = 1000

export function reviewMessageForEmail(input: unknown) {
  if (typeof input !== 'string' || input.length > REVIEW_MESSAGE_LIMIT) return null
  const message = input.replace(/\r\n?/g, '\n').trim()
  if (!message) return null
  const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '{': '&#123;', '}': '&#125;' }
  return message.replace(/[&<>{}]/g, char => entities[char])
}

export function reviewState(decision: string) {
  if (decision === 'accept') return { approval_status: 'approved', status: 'active' }
  if (decision === 'reject') return { approval_status: 'rejected', status: 'inactive' }
  return null
}

export const funderLocation = () => process.env.GF360_GHL_LOCATION_ID || 'fwAgT5nunV4RIrV84OEh'

export async function funderGhl(path: string, init?: RequestInit) {
  const key = process.env.GF360_GHL_PRIVATE_KEY
  if (!key) return null
  const res = await fetch('https://services.leadconnectorhq.com' + path, {
    ...init, cache: 'no-store', headers: { Authorization: `Bearer ${key}`, Version: process.env.GF360_GHL_API_VERSION || '2021-07-28', 'Content-Type': 'application/json' },
  })
  return res.ok ? res.json() : null
}

export async function funderRecordRequest(id: string, properties?: Record<string, unknown>): Promise<FunderRecord | null> {
  if (!/^[a-zA-Z0-9]{20,32}$/.test(id)) return null
  const location = funderLocation()
  const result = await funderGhl(`/objects/custom_objects.organizations/records/${id}?locationId=${encodeURIComponent(location)}`, properties ? { method: 'PUT', body: JSON.stringify({ properties }) } : undefined)
  const record: FunderRecord | undefined = result?.record
  return record?.id === id && record.locationId === location ? record : null
}

export async function funderContact(record: FunderRecord) {
  const email = String(record.properties.email || '').trim().toLowerCase()
  if (!email) return null
  const data = await funderGhl('/contacts/search/duplicate?' + new URLSearchParams({ locationId: funderLocation(), email }))
  const contact = data?.contact
  return contact?.id && contact.locationId === funderLocation() && String(contact.email || '').toLowerCase() === email ? contact : null
}

export async function authorizedGrantDetails(id: string, access: string) {
  if (!/^[a-f0-9]{64}$/.test(access)) return null
  const record = await funderRecordRequest(id)
  if (!record || !grantAccessAllowed(record, access)) return null
  const contact = await funderContact(record)
  if (!contact) return null
  const [firstName, ...last] = String(record.properties.primary_contact || '').trim().split(/\s+/)
  return {
    organizationId: record.id, grantAccess: access, contactId: String(contact.id),
    funderOrg: String(record.properties.organization_name || ''),
    firstName: String(contact.firstName || firstName || ''), lastName: String(contact.lastName || last.join(' ')),
    email: String(contact.email), funderEmail: String(contact.email), phone: String(contact.phone || record.properties.phone || ''),
  }
}
