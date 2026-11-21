import { funderGhl, funderLocation } from '@/lib/funder-review'

/** The grant (funding source) properties, or null when the id is not a grant in this account. */
export async function loadGrantProps(grantId: string): Promise<Record<string, unknown> | null> {
  if (!/^[a-zA-Z0-9]{20,32}$/.test(grantId)) return null
  const data = await funderGhl(`/objects/custom_objects.funding_source/records/${grantId}?locationId=${encodeURIComponent(funderLocation())}`)
  const record = data?.record
  return record?.id === grantId && record.properties ? record.properties : null
}
