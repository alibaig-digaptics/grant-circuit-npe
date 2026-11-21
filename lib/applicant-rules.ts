/** Pure rules for who may apply. The network lookups live in applicant-access.ts. */
export type OrgRecord = { id: string; properties: Record<string, unknown> }

export const NOT_REGISTERED_MESSAGE =
  'We could not find an approved grant seeker registration for this email. Register as a grant seeker first, or wait for approval, then apply again.'

export function isApprovedSeeker(record: OrgRecord | null | undefined) {
  const p = record?.properties
  return Boolean(p && p.party_role === 'seeker' && p.approval_status === 'approved' && p.status === 'active')
}

/** Picks the approved seeker for an applicant from the records tied to their email or contact. */
export function pickApprovedSeeker(records: (OrgRecord | null | undefined)[]) {
  return records.find(isApprovedSeeker) ?? null
}
