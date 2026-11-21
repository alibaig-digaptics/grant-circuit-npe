import { NextResponse } from "next/server"
import { draftTokenValid } from "@/lib/draft-link"
import { funderContact } from "@/lib/funder-review"
import { loadMilestones } from "@/lib/milestone-store"

/** Gives a saved draft back to the person who got the draft email. The signed link is the only way in. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const email = (url.searchParams.get("email") || "").trim().toLowerCase()
  const grantId = url.searchParams.get("recordId") || ""
  const token = url.searchParams.get("draft") || ""
  if (!draftTokenValid(process.env.GF360_GHL_PRIVATE_KEY || "", email, grantId, token)) {
    return NextResponse.json({ error: "This draft link is not valid." }, { status: 403 })
  }
  const [milestones, contact] = await Promise.all([
    loadMilestones(email, grantId).catch(() => []),
    funderContact({ properties: { email } } as never).catch(() => null),
  ])
  return NextResponse.json({
    firstName: String(contact?.firstName || ""),
    lastName: String(contact?.lastName || ""),
    milestones,
  })
}
