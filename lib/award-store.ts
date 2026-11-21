import { funderGhl, funderLocation } from '@/lib/funder-review'
import { awardFromRecord, type Award } from '@/lib/lifecycle-rules'

/** Every award made on a grant. A grant with two awards has two records. */
export async function loadAwards(grantId: string): Promise<Award[]> {
  const data = await funderGhl('/objects/custom_objects.awards/records/search', {
    method: 'POST',
    body: JSON.stringify({
      locationId: funderLocation(),
      page: 1,
      pageLimit: 100,
      filters: [{ field: 'properties.grant_id', operator: 'eq', value: grantId }],
    }),
  })
  const rows = data?.records ?? data?.customObjectRecords
  return Array.isArray(rows) ? rows.map(awardFromRecord) : []
}
