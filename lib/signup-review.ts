import { createHash, timingSafeEqual } from 'node:crypto'

export type PartyKind = 'seeker' | 'vendor'

type Decision = { value: string; label: string; send: string; result: string; variant?: 'destructive' | 'outline' }

type Party = {
  object: string
  hashField: string
  form: 'org-activate' | 'vendor-review'
  noun: string
  nameField: string
  pending: (p: Record<string, unknown>) => boolean
  decisions: Decision[]
}

export const PARTIES: Record<PartyKind, Party> = {
  seeker: {
    object: 'custom_objects.organizations',
    hashField: 'funder_review_token_hash',
    form: 'org-activate',
    noun: 'grant seeker',
    nameField: 'organization_name',
    pending: p => p.party_role === 'seeker' && p.approval_status === 'pending',
    decisions: [
      { value: 'accept', label: 'Accept', send: 'Approve', result: 'approved' },
      { value: 'changes', label: 'Request changes', send: 'Request Changes', result: 'changes', variant: 'outline' },
      { value: 'reject', label: 'Reject', send: 'Reject', result: 'rejected', variant: 'destructive' },
    ],
  },
  vendor: {
    object: 'custom_objects.vendors',
    hashField: 'review_token_hash',
    form: 'vendor-review',
    noun: 'vendor',
    nameField: 'vendor_name',
    pending: p => p.status === 'under_review' || p.status === 'pending_w9',
    decisions: [
      { value: 'accept', label: 'Accept', send: 'Approve', result: 'approved' },
      { value: 'changes', label: 'Request W-9', send: 'Request W9', result: 'changes', variant: 'outline' },
      { value: 'reject', label: 'Reject', send: 'Reject', result: 'rejected', variant: 'destructive' },
    ],
  },
}

export const partyKind = (value: unknown): PartyKind | null => value === 'seeker' || value === 'vendor' ? value : null

export type PartyRecord = { id: string; locationId?: string; createdAt: string; updatedAt?: string; properties: Record<string, unknown> }

function matchesToken(hash: unknown, token: string) {
  return typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash) && /^[a-f0-9]{64}$/.test(token)
    && timingSafeEqual(Buffer.from(hash, 'hex'), createHash('sha256').update(token).digest())
}

const week = 7 * 24 * 60 * 60 * 1000

export function partyReviewAllowed(kind: PartyKind, record: PartyRecord, token: string, now = Date.now()) {
  const party = PARTIES[kind]
  const age = now - Date.parse(record.updatedAt || record.createdAt)
  return age >= 0 && age < week && party.pending(record.properties) && matchesToken(record.properties[party.hashField], token)
}
