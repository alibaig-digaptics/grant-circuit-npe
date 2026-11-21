import { NextResponse } from "next/server"
import { lifecycleTokenValid, purposeForSlug } from "@/lib/lifecycle-access"
import { applicantLabel, parseApplicants } from "@/lib/lifecycle-rules"
import { loadGrantProps } from "@/lib/grant-record"

/** What a lifecycle form shows: the grant and the applicants it may choose from. Needs the signed link. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const slug = url.searchParams.get("slug") || ""
  const grantId = url.searchParams.get("recordId") || ""
  const purpose = purposeForSlug(slug)
  if (!purpose || !lifecycleTokenValid(process.env.GF360_GHL_PRIVATE_KEY || "", purpose, grantId, url.searchParams.get("access") || "")) {
    return NextResponse.json({ error: "This link is not valid. Use the link from your email." }, { status: 403 })
  }
  const grant = await loadGrantProps(grantId)
  if (!grant) return NextResponse.json({ error: "Grant not found." }, { status: 404 })
  const pool = purpose === "allocation" ? parseApplicants(grant.vetted_applicants) : parseApplicants(grant.applicants)
  const vettedIds = new Set(parseApplicants(grant.vetted_applicants).map(item => item.id))
  return NextResponse.json({
    grantName: String(grant.grant_name || ""),
    funderName: String(grant.funder_name || ""),
    ceiling: Number(grant.award_amount || 0),
    endDate: String(grant.end_date || "").slice(0, 10),
    requestedEnd: String(grant.extension_requested_end_date || "").slice(0, 10),
    requestedReason: String(grant.extension_reason || ""),
    applicantOptions: pool
      .filter(item => purpose === "allocation" || !vettedIds.has(item.id))
      .map(item => ({ label: applicantLabel(item), value: item.id })),
  })
}
