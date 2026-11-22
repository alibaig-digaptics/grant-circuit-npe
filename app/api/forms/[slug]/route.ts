import { NextResponse } from "next/server"
import { approvedSeekerForEmail } from "@/lib/applicant-access"
import { NOT_REGISTERED_MESSAGE, TEAM_MEMBER_MESSAGE, isDirectSubmit, isPrimaryContact } from "@/lib/applicant-rules"
import { EXPENSE_PURPOSES, WORK_PURPOSES, lifecycleTokenValid, purposeForSlug, scopeFor, subjectParam } from "@/lib/lifecycle-access"
import { loadActiveVendors, loadAward, loadAwards, loadExpense, loadWork } from "@/lib/award-store"
import { loadMilestones } from "@/lib/milestone-store"
import { expenseConfirmError, expensePayError, expenseReviewError, expenseSubmitError, workRequestError, workUpdateError } from "@/lib/lifecycle-rules"
import { evaluateLifecycleSubmit, todayInZone } from "@/lib/lifecycle-rules"
import { loadGrantProps } from "@/lib/grant-record"
import { draftLink } from "@/lib/draft-link"
import { sanitizeMilestones } from "@/lib/milestones"
import { replaceMilestones } from "@/lib/milestone-store"
import { authorizedGrantDetails, funderLocation } from "@/lib/funder-review"
import { getForm, webhookUrl } from "@/lib/forms"
import { uploadGhlMedia } from "@/lib/ghl-media"
import { SIMPLE_FIELDS, tagForForm } from "@/lib/notify-tags"

async function readBody(request: Request, authorize?: (body: Record<string, unknown>) => Promise<Record<string, unknown> | null>): Promise<Record<string, unknown> | null> {
  const ct = request.headers.get("content-type") || ""
  if (!ct.includes("multipart/form-data")) {
    const body = ((await request.json().catch(() => ({}))) || {}) as Record<string, unknown>
    return authorize ? authorize(body) : body
  }
  const fd = await request.formData()
  const raw = String(fd.get("payload") || "{}")
  const parsed = JSON.parse(raw) as Record<string, unknown>
  const filesByField = new Map<string, File[]>()
  for (const [key, value] of fd.entries()) {
    if (key === "payload" || typeof value === "string") continue
    const list = filesByField.get(key) || []
    list.push(value)
    filesByField.set(key, list)
  }
  // Expense proof is checked by the rules, so it has to be uploaded first.
  const early = new Set(["receipt", "quoteProposal", "attachments"])
  const uploaded = new Map<string, string[]>()
  if (authorize) {
    for (const [key, list] of filesByField) {
      if (!early.has(key)) continue
      const urls: string[] = []
      for (const file of list) urls.push(await uploadGhlMedia(file))
      uploaded.set(key, urls)
      parsed[key] = urls
    }
  }
  const body = authorize ? await authorize(parsed) : parsed
  if (!body) return null
  for (const [key, list] of filesByField) {
    if (uploaded.has(key)) continue
    const urls: string[] = []
    for (const file of list) urls.push(await uploadGhlMedia(file))
    if (!authorize || key === "requirementPdf" || key === "closingChecklist") body[key] = urls
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

  if (slug.startsWith("project-")) {
    return NextResponse.json({ error: "Projects are no longer part of this platform. Use milestones on the application." }, { status: 410 })
  }
  if (slug === "org-activate" || slug === "vendor-review") {
    return NextResponse.json({ error: "Use the review link in your staff email." }, { status: 403 })
  }

  const body = await readBody(request, slug === "grant-rfp" ? async (input) => {
    const funder = await authorizedGrantDetails(String(input.organizationId || ""), String(input.grantAccess || "")).catch(() => null)
    return funder ? { ...input, ...funder, locationId: funderLocation() } : null
  } : undefined)
  if (!body) return NextResponse.json({ error: "Use the private Create Grant link from your approval email." }, { status: 403 })
  const purpose = purposeForSlug(slug)
  if (purpose) {
    const grantId = String(body.recordId || "")
    const subject = String(body[subjectParam(purpose)] || "")
    if (!lifecycleTokenValid(process.env.GF360_GHL_PRIVATE_KEY || "", purpose, scopeFor(purpose, grantId, subject), String(body.access || ""))) {
      return NextResponse.json({ error: "This link is not valid. Use the link from your email." }, { status: 403 })
    }
    delete body.access
    if (EXPENSE_PURPOSES.includes(purpose)) {
      const expense = await loadExpense(subject)
      const today = todayInZone()
      const checked = slug === "review-expense" ? expenseReviewError(expense, body)
        : slug === "bookkeeper-pay" ? expensePayError(expense, body, today)
        : expenseConfirmError(expense, body)
      if (!("extra" in checked)) return NextResponse.json({ error: checked.error }, { status: checked.status })
      Object.assign(body, checked.extra)
    } else if (WORK_PURPOSES.includes(purpose)) {
      const checked = workUpdateError(await loadWork(subject), body)
      if (!("extra" in checked)) return NextResponse.json({ error: checked.error }, { status: checked.status })
      Object.assign(body, checked.extra)
    } else if (slug === "proposal-request" || slug === "work-order") {
      const [award, vendors] = await Promise.all([loadAward(subject), loadActiveVendors().catch(() => [])])
      const checked = workRequestError(slug === "work-order" ? "work_order" : "proposal_request", { award, vendors }, body, todayInZone())
      if (!("extra" in checked)) return NextResponse.json({ error: checked.error }, { status: checked.status })
      Object.assign(body, checked.extra)
    } else if (slug === "submit-expense") {
      const award = await loadAward(subject)
      const [milestones, vendors] = await Promise.all([
        award ? loadMilestones(award.email, award.grantId).catch(() => []) : Promise.resolve([]),
        loadActiveVendors().catch(() => []),
      ])
      const checked = expenseSubmitError({ award, milestones: milestones.map(m => m.name), vendors }, body, todayInZone())
      if (!("extra" in checked)) return NextResponse.json({ error: checked.error }, { status: checked.status })
      Object.assign(body, checked.extra)
    } else {
      const grant = await loadGrantProps(grantId)
      if (!grant) return NextResponse.json({ error: "Grant not found." }, { status: 404 })
      const awards = await loadAwards(grantId)
      const checked = evaluateLifecycleSubmit(slug, grant, body, todayInZone(), awards)
      if (!("extra" in checked)) return NextResponse.json({ error: checked.error }, { status: checked.status })
      Object.assign(body, checked.extra)
    }
  }
  if (slug === "grant-applicant-submit") {
    const seeker = await approvedSeekerForEmail(String(body.email || "")).catch(() => null)
    if (!seeker) return NextResponse.json({ error: NOT_REGISTERED_MESSAGE }, { status: 403 })
    // An applicant applies as their own registered organization, never as someone else's.
    body.organization = String(seeker.properties.organization_name || "")
    body.organizationId = seeker.id
    // Team members may save a draft. Only the primary contact submits directly.
    if (isDirectSubmit(body.submitMode) && !isPrimaryContact(seeker, String(body.email || ""))) {
      return NextResponse.json({ error: TEAM_MEMBER_MESSAGE }, { status: 403 })
    }
    const { milestones, error } = sanitizeMilestones(body.milestones)
    if (error) return NextResponse.json({ error }, { status: 400 })
    if (body.milestones !== undefined) try {
      await replaceMilestones({ email: String(body.email || ""), grantId: String(body.recordId || ""), organizationId: seeker.id, milestones })
    } catch {
      return NextResponse.json({ error: "Your milestones could not be saved. Please try again." }, { status: 502 })
    }
    body.milestones = milestones
    body.draftUrl = draftLink(new URL(request.url).origin, process.env.GF360_GHL_PRIVATE_KEY || "", String(body.email || ""), String(body.recordId || ""))
  }
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
