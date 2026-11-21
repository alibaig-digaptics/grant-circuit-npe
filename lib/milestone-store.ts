import { funderGhl, funderLocation } from '@/lib/funder-review'
import type { Milestone } from '@/lib/milestones'

type Row = { id: string; properties: Record<string, unknown> }

async function searchByApplicant(email: string): Promise<Row[]> {
  const data = await funderGhl('/objects/custom_objects.milestones/records/search', {
    method: 'POST',
    body: JSON.stringify({
      locationId: funderLocation(),
      page: 1,
      pageLimit: 100,
      filters: [{ field: 'properties.applicant_email', operator: 'eq', value: email }],
    }),
  })
  if (!data) throw new Error('Could not read saved milestones.')
  const rows = data.customObjectRecords ?? data.records
  return Array.isArray(rows) ? rows : []
}

/**
 * Saves the seeker's milestones for one grant. Whatever they saved before for this grant is replaced,
 * so saving a draft and later submitting never leaves two lists.
 */
export async function replaceMilestones(input: { email: string; grantId: string; organizationId: string; milestones: Milestone[] }) {
  const email = input.email.trim().toLowerCase()
  const old = (await searchByApplicant(email)).filter(row => String(row.properties.funding_source_id ?? '') === input.grantId)
  for (const row of old) {
    const gone = await funderGhl(`/objects/custom_objects.milestones/records/${encodeURIComponent(row.id)}`, { method: 'DELETE' })
    if (!gone) throw new Error('Could not replace the saved milestones.')
  }
  for (const item of input.milestones) {
    const made = await funderGhl('/objects/custom_objects.milestones/records', {
      method: 'POST',
      body: JSON.stringify({
        locationId: funderLocation(),
        properties: {
          milestone_name: item.name,
          milestone_description: item.description,
          relative_timing: item.timing,
          funding_source_id: input.grantId,
          organization_id: input.organizationId,
          applicant_email: email,
        },
      }),
    })
    if (!made) throw new Error('Could not save a milestone.')
  }
}

/** The milestones this person saved for this grant, in the order they were saved. */
export async function loadMilestones(emailInput: string, grantId: string): Promise<Milestone[]> {
  const rows = (await searchByApplicant(emailInput.trim().toLowerCase())).filter(row => String(row.properties.funding_source_id ?? '') === grantId)
  return rows.map(row => ({
    name: String(row.properties.milestone_name ?? ''),
    description: String(row.properties.milestone_description ?? ''),
    timing: String(row.properties.relative_timing ?? ''),
  }))
}
