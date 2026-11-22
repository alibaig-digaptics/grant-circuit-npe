import { NextResponse } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { lifecycleLinks } from "@/lib/lifecycle-access"

/** n8n asks for the signed lifecycle links of a grant. Only a caller holding the account key gets them. */
export async function GET(request: Request) {
  const secret = process.env.GF360_GHL_PRIVATE_KEY || ""
  const given = (request.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")
  const a = Buffer.from(given)
  const b = Buffer.from(secret)
  if (!secret || a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 })
  }
  const grantId = new URL(request.url).searchParams.get("recordId") || ""
  if (!/^[a-zA-Z0-9]{20,32}$/.test(grantId)) return NextResponse.json({ error: "recordId is required." }, { status: 400 })
  const awardId = new URL(request.url).searchParams.get("award") || ""
  if (awardId && !/^[a-zA-Z0-9]{20,32}$/.test(awardId)) return NextResponse.json({ error: "award is not valid." }, { status: 400 })
  const expenseId = new URL(request.url).searchParams.get("expense") || ""
  if (expenseId && !/^[a-zA-Z0-9]{20,32}$/.test(expenseId)) return NextResponse.json({ error: "expense is not valid." }, { status: 400 })
  const workId = new URL(request.url).searchParams.get("work") || ""
  if (workId && !/^[a-zA-Z0-9]{20,32}$/.test(workId)) return NextResponse.json({ error: "work is not valid." }, { status: 400 })
  return NextResponse.json(lifecycleLinks(new URL(request.url).origin, secret, grantId, awardId, expenseId, workId))
}
