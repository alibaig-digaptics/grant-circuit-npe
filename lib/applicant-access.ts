import { funderContact, funderGhl, funderLocation, funderRecordRequest } from '@/lib/funder-review'
import { pickApprovedSeeker, type OrgRecord } from '@/lib/applicant-rules'

/** The approved grant seeker registration for this email, or null. Pending, rejected, and funder records never pass. */
export async function approvedSeekerForEmail(emailInput: string): Promise<OrgRecord | null> {
  const email = emailInput.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  const location = funderLocation()
  const candidates: (OrgRecord | null)[] = []

  const byEmail = await funderGhl('/objects/custom_objects.organizations/records/search', {
    method: 'POST',
    body: JSON.stringify({ locationId: location, page: 1, pageLimit: 50, filters: [{ field: 'properties.email', operator: 'eq', value: email }] }),
  })
  const rows = byEmail?.customObjectRecords ?? byEmail?.records
  if (Array.isArray(rows)) candidates.push(...rows)

  // An organization may use a different email than the person. The contact keeps the organization id.
  if (!pickApprovedSeeker(candidates)) {
    const contact = await funderContact({ properties: { email } } as never)
    const defs = await funderGhl(`/locations/${location}/customFields?model=contact`)
    const orgField = defs?.customFields?.find((f: { fieldKey: string }) => f.fieldKey === 'contact.org_id')?.id
    if (contact?.id && orgField) {
      const full = await funderGhl(`/contacts/${encodeURIComponent(contact.id)}`)
      const orgId = full?.contact?.customFields?.find((f: { id: string }) => f.id === orgField)?.value
      if (typeof orgId === 'string' && orgId) candidates.push(await funderRecordRequest(orgId))
    }
  }
  return pickApprovedSeeker(candidates)
}
