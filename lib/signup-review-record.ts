import { funderGhl, funderLocation } from '@/lib/funder-review'
import { PARTIES, type PartyKind, type PartyRecord } from '@/lib/signup-review'

export async function partyRecord(kind: PartyKind, id: string, properties?: Record<string, unknown>): Promise<PartyRecord | null> {
  if (!/^[a-zA-Z0-9]{20,32}$/.test(id)) return null
  const location = funderLocation()
  const result = await funderGhl(`/objects/${PARTIES[kind].object}/records/${id}?locationId=${encodeURIComponent(location)}`, properties ? { method: 'PUT', body: JSON.stringify({ properties }) } : undefined)
  const record: PartyRecord | undefined = result?.record
  return record?.id === id && record.locationId === location ? record : null
}
