import { NextResponse } from "next/server"
import { EXPENSE_PURPOSES, WORK_PURPOSES, lifecycleTokenValid, purposeForSlug, scopeFor, subjectParam } from "@/lib/lifecycle-access"
import { loadActiveVendors, loadAward, loadAwards, loadExpense, loadWork } from "@/lib/award-store"
import { loadMilestones } from "@/lib/milestone-store"
import { applicantLabel, parseApplicants, workActionsFor } from "@/lib/lifecycle-rules"
import { loadGrantProps } from "@/lib/grant-record"

/** What a lifecycle form shows: the grant and the applicants it may choose from. Needs the signed link. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get("slug") || ""
  const grantId = url.searchParams.get("recordId") || ""
  const purpose = purposeForSlug(slug)
  if (!purpose || !lifecycleTokenValid(process.env.GF360_GHL_PRIVATE_KEY || "", purpose, scopeFor(purpose, grantId, url.searchParams.get(subjectParam(purpose)) || ""), url.searchParams.get("access") || "")) {
    return NextResponse.json({ error: "This link is not valid. Use the link from your email." }, { status: 403 })
  }
  if (purpose === "submit-expense") {
    const award = await loadAward(url.searchParams.get("award") || "")
    if (!award) return NextResponse.json({ error: "Award not found." }, { status: 404 })
    const [milestones, vendors] = await Promise.all([loadMilestones(award.email, award.grantId).catch(() => []), loadActiveVendors().catch(() => [])])
    return NextResponse.json({
      grantName: "", ceiling: 0, endDate: award.endDate, requestedEnd: "", requestedReason: "", applicantOptions: [],
      remaining: award.remaining,
      milestoneOptions: milestones.map(m => ({ label: m.name, value: m.name })),
      categoryOptions: award.allowedCategories.map(c => ({ label: c.charAt(0).toUpperCase() + c.slice(1), value: c })),
      vendorOptions: [...vendors.map(v => ({ label: v.name, value: v.id })), { label: "Other (type the name below)", value: "other" }],
    })
  }
  if (purpose === "proposal-request" || purpose === "work-order") {
    const award = await loadAward(url.searchParams.get("award") || "")
    if (!award) return NextResponse.json({ error: "Award not found." }, { status: 404 })
    const vendors = await loadActiveVendors().catch(() => [])
    return NextResponse.json({ grantName: "", ceiling: 0, endDate: award.endDate, requestedEnd: "", requestedReason: "", applicantOptions: [], remaining: award.remaining, vendorOptions: vendors.map(v => ({ label: v.name, value: v.id })) })
  }
  if (WORK_PURPOSES.includes(purpose)) {
    const work = await loadWork(url.searchParams.get("work") || "")
    if (!work) return NextResponse.json({ error: "Work not found." }, { status: 404 })
    const actions = workActionsFor(work.stage)
    return NextResponse.json({ grantName: work.title, ceiling: work.amount, ceilingLabel: "Agreed amount", endDate: "", requestedEnd: "", requestedReason: "", applicantOptions: [], actionOptions: actions.map(a => ({ label: a.label, value: a.value })) })
  }
  if (EXPENSE_PURPOSES.includes(purpose)) {
    const expense = await loadExpense(url.searchParams.get("expense") || "")
    if (!expense) return NextResponse.json({ error: "Expense not found." }, { status: 404 })
    return NextResponse.json({ grantName: expense.description, ceiling: expense.amount, ceilingLabel: "Amount", endDate: "", requestedEnd: "", requestedReason: "", applicantOptions: [] })
  }
  const grant = await loadGrantProps(grantId)
  if (!grant) return NextResponse.json({ error: "Grant not found." }, { status: 404 })
  const awards = (await loadAwards(grantId)).filter(item => item.status !== "cancelled")
  const awardedIds = new Set(awards.map(item => item.applicantId))
  const award = awards.find(item => item.id === (url.searchParams.get("award") || ""))
  const pool = purpose === "allocation" ? parseApplicants(grant.vetted_applicants) : parseApplicants(grant.applicants)
  const vettedIds = new Set(parseApplicants(grant.vetted_applicants).map(item => item.id))
  return NextResponse.json({
    grantName: String(grant.grant_name || ""),
    funderName: String(grant.funder_name || ""),
    ceiling: Number(grant.award_amount || 0),
    endDate: award?.endDate || "",
    requestedEnd: award?.requestedEnd || "",
    requestedReason: award?.extensionReason || "",
    applicantOptions: pool
      .filter(item => !awardedIds.has(item.id) && (purpose === "allocation" || !vettedIds.has(item.id)))
      .map(item => ({ label: applicantLabel(item), value: item.id })),
  })
}
