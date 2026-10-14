const GHL = "https://services.leadconnectorhq.com"

type GhlRecord = {
  id?: string
  properties?: Record<string, unknown>
}

async function ghlFetch(path: string, init?: RequestInit) {
  const key = process.env.GF360_GHL_PRIVATE_KEY || ""
  const locationId = process.env.GF360_GHL_LOCATION_ID || "yOqSXTaFVFjQV5f4l5fb"
  if (!key) throw new Error("GF360_GHL_PRIVATE_KEY is missing")
  const res = await fetch(`${GHL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      Version: process.env.GF360_GHL_API_VERSION || "2021-07-28",
      "Location-Id": locationId,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })
  const text = await res.text()
  let data: Record<string, unknown> = {}
  try {
    data = JSON.parse(text) as Record<string, unknown>
  } catch {
    data = {}
  }
  if (!res.ok) throw new Error(`GHL ${res.status}: ${text.slice(0, 200)}`)
  return { data, locationId }
}

function labels(records: GhlRecord[], keys: string[]) {
  const out: string[] = []
  const seen = new Set<string>()
  for (const rec of records) {
    const props = rec.properties || {}
    let name = ""
    for (const key of keys) {
      const val = props[key]
      if (val) {
        name = String(val)
        break
      }
    }
    if (!name) name = String(rec.id || "")
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    out.push(name)
  }
  return out
}

async function searchObject(schemaKey: string) {
  const locationId = process.env.GF360_GHL_LOCATION_ID || "yOqSXTaFVFjQV5f4l5fb"
  const { data } = await ghlFetch(
    `/objects/${schemaKey}/records/search`,
    {
      method: "POST",
      body: JSON.stringify({ locationId, page: 1, pageLimit: 100 }),
    }
  )
  const records = (data.records || data.data || []) as GhlRecord[]
  return Array.isArray(records) ? records : []
}

export async function loadLookups() {
  const [orgs, funding, vendors, projects] = await Promise.all([
    searchObject("custom_objects.organizations").catch(() => []),
    searchObject("custom_objects.funding_source").catch(() => []),
    searchObject("custom_objects.vendors").catch(() => []),
    searchObject("custom_objects.projects").catch(() => []),
  ])
  return {
    organization: labels(orgs, ["organization_name", "name"]),
    fundingSource: labels(funding, ["grant_name", "name"]),
    vendor: labels(vendors, ["vendor_name", "name"]),
    project: labels(projects, ["project_name", "name"]),
  }
}
