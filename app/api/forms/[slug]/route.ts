import { NextResponse } from "next/server"
import { getForm, webhookUrl } from "@/lib/forms"
import { uploadGhlMedia } from "@/lib/ghl-media"
import { SIMPLE_FIELDS, tagForForm } from "@/lib/notify-tags"

async function readBody(request: Request): Promise<Record<string, unknown>> {
  const ct = request.headers.get("content-type") || ""
  if (!ct.includes("multipart/form-data")) {
    return ((await request.json().catch(() => ({}))) || {}) as Record<string, unknown>
  }
  const fd = await request.formData()
  const raw = String(fd.get("payload") || "{}")
  const body = JSON.parse(raw) as Record<string, unknown>
  const filesByField = new Map<string, File[]>()
  for (const [key, value] of fd.entries()) {
    if (key === "payload" || typeof value === "string") continue
    const list = filesByField.get(key) || []
    list.push(value)
    filesByField.set(key, list)
  }
  for (const [key, list] of filesByField) {
    const urls: string[] = []
    for (const file of list) urls.push(await uploadGhlMedia(file))
    body[key] = urls
  }
  return body
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const form = getForm(slug)
  if (!form) {
    return NextResponse.json({ error: "Unknown form" }, { status: 404 })
  }

  const body = await readBody(request)
  const url = webhookUrl(form)

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "Mozilla/5.0 (compatible; GrantCircuit/1.0)",
    },
    body: JSON.stringify({
      source: "grant-circuit",
      form: form.slug,
      n8nPath: form.n8nPath,
      locationId: (body.locationId as string) || process.env.GF360_GHL_LOCATION_ID || "fwAgT5nunV4RIrV84OEh",
      submittedAt: new Date().toISOString(),
      notifyTag: tagForForm(form.slug, body as Record<string, unknown>),
      fieldKeys: SIMPLE_FIELDS,
      ...body,
    }),
  })

  const text = await res.text()
  let payload: unknown = text
  try {
    payload = JSON.parse(text)
  } catch {
    /* n8n may return plain text */
  }

  if (!res.ok) {
    const obj = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {}
    const nested = obj.message || obj.error || (obj.data as Record<string, unknown> | undefined)?.message
    const msg =
      typeof nested === "string"
        ? nested
        : typeof payload === "string" && payload.trim()
          ? payload.slice(0, 280)
          : `n8n ${res.status}`
    return NextResponse.json({ error: msg, detail: payload }, { status: 502 })
  }

  return NextResponse.json({ ok: true, n8n: payload })
}
