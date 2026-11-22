import { funderGhl, funderLocation } from '@/lib/funder-review'
import { awardFromRecord, expenseFromRecord, workFromRecord, type ActiveVendor, type Award, type Expense, type WorkItem } from '@/lib/lifecycle-rules'

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

export async function loadAward(id: string): Promise<Award | null> {
  if (!/^[a-zA-Z0-9]{20,32}$/.test(id)) return null
  const data = await funderGhl(`/objects/custom_objects.awards/records/${id}?locationId=${encodeURIComponent(funderLocation())}`)
  const record = data?.record
  return record?.id === id && record.properties ? awardFromRecord(record) : null
}

export async function loadExpense(id: string): Promise<Expense | null> {
  if (!/^[a-zA-Z0-9]{20,32}$/.test(id)) return null
  const data = await funderGhl(`/objects/custom_objects.expenses/records/${id}?locationId=${encodeURIComponent(funderLocation())}`)
  const record = data?.record
  return record?.id === id && record.properties ? expenseFromRecord(record) : null
}

/** Vendors a seeker may pay: approved and active. */
export async function loadActiveVendors(): Promise<ActiveVendor[]> {
  const data = await funderGhl('/objects/custom_objects.vendors/records/search', {
    method: 'POST',
    body: JSON.stringify({ locationId: funderLocation(), page: 1, pageLimit: 100, filters: [{ field: 'properties.status', operator: 'eq', value: 'active' }] }),
  })
  const rows = data?.records ?? data?.customObjectRecords
  return Array.isArray(rows) ? rows.map((r: { id: string; properties: Record<string, unknown> }) => ({ id: r.id, name: String(r.properties.vendor_name ?? ''), email: String(r.properties.email ?? '').trim().toLowerCase() })).filter(v => v.name) : []
}

export async function loadWork(id: string): Promise<WorkItem | null> {
  if (!/^[a-zA-Z0-9]{20,32}$/.test(id)) return null
  const data = await funderGhl(`/objects/custom_objects.work_orders/records/${id}?locationId=${encodeURIComponent(funderLocation())}`)
  const record = data?.record
  return record?.id === id && record.properties ? workFromRecord(record) : null
}
