import { NextResponse } from "next/server"

const GHL = "https://services.leadconnectorhq.com"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const recordId = searchParams.get("recordId") || ""
  if (!recordId) {
    return NextResponse.json({ error: "recordId is required" }, { status: 400 })
  }

  const key = process.env.GF360_GHL_PRIVATE_KEY || ""
  const locationId = process.env.GF360_GHL_LOCATION_ID || "fwAgT5nunV4RIrV84OEh"
  if (!key) {
    return NextResponse.json({ error: "GF360_GHL_PRIVATE_KEY is missing" }, { status: 500 })
  }

  try {
    const res = await fetch(
      `${GHL}/objects/custom_objects.funding_source/records/${recordId}?locationId=${locationId}`,
      {
        headers: {
          Authorization: `Bearer ${key}`,
          Version: process.env.GF360_GHL_API_VERSION || "2021-07-28",
          "Location-Id": locationId,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    )
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch record" }, { status: res.status })
    }
    const rec = data.record || data || {}
    const props = rec.properties || {}

    // Parse notes parts written by Form A / Form B / n8n
    const notesStr = String(props.notes || "")
    const parts = notesStr.split(" | ")
    let summary = parts[0] || ""
    const reqDocs: string[] = []
    const closingDocs: string[] = []
    let proposalSummary = ""
    let applicantOrg = ""
    const proposalFiles: string[] = []

    for (const p of parts) {
      if (p.startsWith("Requirements:")) {
        const raw = p.replace(/^Requirements:\s*/, "")
        raw.split(/\s*,\s*/).filter(Boolean).forEach((x) => reqDocs.push(x))
      } else if (p.startsWith("Closing checklist:")) {
        const raw = p.replace(/^Closing checklist:\s*/, "")
        raw.split(/\s*,\s*/).filter(Boolean).forEach((x) => closingDocs.push(x))
      } else if (/^Proposal:\s*/i.test(p)) {
        proposalSummary = p.replace(/^Proposal:\s*/i, "").trim()
      } else if (/^Proposal Files:\s*/i.test(p)) {
        const raw = p.replace(/^Proposal Files:\s*/i, "")
        raw.split(/\s*,\s*/).filter(Boolean).forEach((x) => proposalFiles.push(x.trim()))
      } else {
        const orgMatch = p.match(/\[applicant_org:([^\]]+)\]/i)
        if (orgMatch) applicantOrg = orgMatch[1].trim()
        const filesTag = p.match(/\[gf360_proposal_files:([^\]]+)\]/i)
        if (filesTag) {
          filesTag[1].split("||").map((s) => s.trim()).filter(Boolean).forEach((x) => {
            if (!proposalFiles.includes(x)) proposalFiles.push(x)
          })
        }
        const linksTag = p.match(/\[gf360_proposal_links:([^\]]+)\]/i)
        if (linksTag) {
          linksTag[1].split("||").map((s) => s.trim()).filter(Boolean).forEach((x) => {
            const url = x.includes("::") ? x.split("::").slice(1).join("::") : x
            if (url && !proposalFiles.includes(url)) proposalFiles.push(url)
          })
        }
      }
    }

    // Optional: merge contact media_file_links when contactId is on the deep link
    const contactId = searchParams.get("contactId") || ""
    if (contactId) {
      try {
        const cRes = await fetch(`${GHL}/contacts/${contactId}`, {
          headers: {
            Authorization: `Bearer ${key}`,
            Version: process.env.GF360_GHL_API_VERSION || "2021-07-28",
            "Location-Id": locationId,
            Accept: "application/json",
          },
        })
        const cData = (await cRes.json().catch(() => ({}))) as {
          contact?: { customFields?: { id?: string; key?: string; value?: unknown }[]; companyName?: string }
        }
        const cfs = cData.contact?.customFields || []
        // Resolve media_file_links by listing location fields once if needed
        const defsRes = await fetch(
          `${GHL}/locations/${locationId}/customFields?model=contact`,
          {
            headers: {
              Authorization: `Bearer ${key}`,
              Version: process.env.GF360_GHL_API_VERSION || "2021-07-28",
              "Location-Id": locationId,
              Accept: "application/json",
            },
          }
        )
        const defs = ((await defsRes.json().catch(() => ({}))) as {
          customFields?: { id?: string; fieldKey?: string; key?: string }[]
        }).customFields || []
        const mediaId = defs.find((f) => {
          const k = String(f.fieldKey || f.key || "").toLowerCase()
          return k === "contact.media_file_links" || k === "media_file_links"
        })?.id
        const orgNameId = defs.find((f) => {
          const k = String(f.fieldKey || f.key || "").toLowerCase()
          return k === "contact.org_name" || k === "org_name" || k === "contact.gf360_org_name"
        })?.id
        for (const cf of cfs) {
          if (mediaId && cf.id === mediaId) {
            const raw = String(cf.value || "")
            raw.split(/\n+/).map((s) => s.trim()).filter(Boolean).forEach((x) => {
              if (!proposalFiles.includes(x)) proposalFiles.push(x)
            })
          }
          if (!applicantOrg && orgNameId && cf.id === orgNameId) {
            applicantOrg = String(cf.value || "").trim()
          }
        }
        if (!applicantOrg && cData.contact?.companyName) {
          applicantOrg = String(cData.contact.companyName).trim()
        }
      } catch {
        /* contact enrich is best-effort */
      }
    }

    const extMatch = /\[gf360_extension_pending:1\]/i.test(notesStr) && notesStr.match(/\[gf360_extension_request:([^|\]]*)\|?([^\]]*)\]/i)

    return NextResponse.json({
      id: rec.id || recordId,
      endDate: String(props.end_date || "").slice(0, 10),
      extensionRequestedEndDate: extMatch ? extMatch[1].trim() : "",
      extensionReason: extMatch ? extMatch[2].trim() : "",
      grantName: props.grant_name || "",
      funderName: props.funder_name || "",
      awardAmount: props.award_amount || 0,
      reviewProcess: props.review_process || "",
      summary: summary,
      requirementDocs: reqDocs,
      closingDocs: closingDocs,
      proposalSummary,
      applicantOrg,
      proposalFiles,
      notes: notesStr,
    })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Fetch error" },
      { status: 500 }
    )
  }
}
