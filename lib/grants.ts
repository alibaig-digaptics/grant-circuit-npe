import { funderGhl, funderLocation } from '@/lib/funder-review'

export type OpenGrant = {
  id: string
  name: string
  funder: string
  amount: number
  awards: string
  summary: string
}

async function search(object: string, filters: { field: string; operator: string; value: string }[]) {
  const data = await funderGhl(`/objects/${object}/records/search`, {
    method: 'POST',
    body: JSON.stringify({ locationId: funderLocation(), page: 1, pageLimit: 100, filters }),
  })
  const rows = data?.customObjectRecords ?? data?.records
  return Array.isArray(rows) ? rows as { id: string; properties: Record<string, unknown> }[] : []
}

/** Open grants whose funder is an approved funder. Closed, expired, cancelled, and unlinked grants never appear. */
export async function loadOpenGrants(): Promise<OpenGrant[]> {
  const [funders, grants] = await Promise.all([
    search('custom_objects.organizations', [{ field: 'properties.approval_status', operator: 'eq', value: 'approved' }]),
    search('custom_objects.funding_source', [{ field: 'properties.listing_status', operator: 'eq', value: 'open' }]),
  ])
  const approved = new Set(funders.filter(f => f.properties.party_role === 'funder').map(f => f.id))
  return grants
    .filter(g => g.properties.listing_status === 'open' && approved.has(String(g.properties.funder_organization_id || '')))
    .map(g => ({
      id: g.id,
      name: String(g.properties.grant_name || ''),
      funder: String(g.properties.funder_name || ''),
      amount: Number(g.properties.award_amount || 0),
      awards: String(g.properties.number_of_awards || ''),
      summary: String(g.properties.public_summary || ''),
    }))
}
