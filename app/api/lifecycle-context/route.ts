import { NextResponse } from "next/server"
import { lifecycleTokenValid, purposeForSlug, scopeFor } from "@/lib/lifecycle-access"
import { loadAwards } from "@/lib/award-store"
import { applicantLabel, parseApplicants } from "@/lib/lifecycle-rules"
import { loadGrantProps } from "@/lib/grant-record"

/** What a lifecycle form shows: the grant and the applicants it may choose from. Needs the signed link. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get("slug") || ""
  const grantId = url.searchParams.get("recordId") || ""
  const purpose = purposeForSlug(slug)
  if (!purpose || !lifecycleTokenValid(process.env.GF360_GHL_PRIVATE_KEY || "", purpose, scopeFor(purpose, grantId, url.searchParams.get("award") || ""), url.searchParams.get("access") || "")) {
    return NextResponse.json({ error: "This link is not valid. Use the link from your email." }, { status: 403 })
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
