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

type Row = { id: string; properties: Record<string, unknown> }

async function searchByVendor(object: string, vendorId: string): Promise<Row[]> {
  const data = await funderGhl(`/objects/${object}/records/search`, {
    method: 'POST',
    body: JSON.stringify({ locationId: funderLocation(), page: 1, pageLimit: 100, filters: [{ field: 'properties.vendor_id', operator: 'eq', value: vendorId }] }),
  })
  const rows = data?.records ?? data?.customObjectRecords
  return Array.isArray(rows) ? rows : []
}

/** What a vendor sees: their work and the payments made to them. */
export async function loadVendorDashboard(vendorId: string) {
  const vendor = await funderGhl(`/objects/custom_objects.vendors/records/${vendorId}?locationId=${encodeURIComponent(funderLocation())}`)
  const name = String(vendor?.record?.properties?.vendor_name ?? '')
  if (!name) return null
  const [work, expenses] = await Promise.all([searchByVendor('custom_objects.work_orders', vendorId), searchByVendor('custom_objects.expenses', vendorId)])
  return {
    name,
    work: work.map(r => ({
      id: r.id, title: String(r.properties.work_name ?? ''), kind: String(r.properties.kind ?? ''), stage: String(r.properties.stage ?? ''), grantId: String(r.properties.funding_source_id ?? ''), awardId: String(r.properties.award_id ?? ''),
      from: String(r.properties.applicant_name ?? ''), amount: Number(r.properties.amount ?? 0) || 0, down: Number(r.properties.down_payment_amount ?? 0) || 0, final: Number(r.properties.final_payment_amount ?? 0) || 0,
      neededBy: String(r.properties.needed_by ?? '').slice(0, 10), updated: String(r.properties.updated_on ?? '').slice(0, 10),
    })),
    payments: expenses.map(r => ({
      id: r.id, description: String(r.properties.descriptions ?? ''), from: String(r.properties.applicant_name ?? ''), amount: Number(r.properties.amount ?? 0) || 0,
      status: String(r.properties.status ?? ''), paidOn: String(r.properties.paid_on ?? r.properties.payment_date ?? '').slice(0, 10),
    })),
  }
}
