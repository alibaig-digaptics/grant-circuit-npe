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

export const TEAM_MEMBER_MESSAGE =
  "Only your organization's primary contact can submit an application directly. Choose Save for Later. The primary contact can then review it and submit it."

/** The primary contact is the person whose email the organization registered with. Others on the team may only save for later. */
export function isPrimaryContact(record: OrgRecord | null | undefined, emailInput: string) {
  const registered = String(record?.properties?.email ?? '').trim().toLowerCase()
  return Boolean(registered) && registered === emailInput.trim().toLowerCase()
}

/** Save for Later is open to anyone approved. Submitting is not. n8n treats any mode that is not a save as a submit, so a blank mode counts as one too. */
export function isDirectSubmit(submitMode: unknown) {
  const mode = String(submitMode ?? '').trim().toLowerCase()
  return !/save|later|draft|incomplete/.test(mode)
}
