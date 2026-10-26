import { NextResponse } from "next/server"
import { loadLookups } from "@/lib/ghl-lookups"

const GHL = "https://services.leadconnectorhq.com"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const recordId = searchParams.get("recordId")

  // If recordId is provided on /api/lookups?recordId=..., handle record lookup directly here!
  if (recordId) {
    const key = process.env.GF360_GHL_PRIVATE_KEY || ""
    const locationId = process.env.GF360_GHL_LOCATION_ID || "fwAgT5nunV4RIrV84OEh"
    if (!key) {
      return NextResponse.json({ error: "GF360_GHL_PRIVATE_KEY is missing" }, { status: 500 })
    }

    try {
      // First attempt: try funding_source record
      let res = await fetch(
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

      let expenseDetails: Record<string, unknown> | null = null;
      let vendorDetails: Record<string, unknown> | null = null;
      let orgDetails: Record<string, unknown> | null = null;
      let projectDetails: Record<string, unknown> | null = null;

      // If not a funding source, check if recordId is an expense, vendor, org, or project record!
      if (!res.ok) {
        const expRes = await fetch(
          `${GHL}/objects/custom_objects.expenses/records/${recordId}?locationId=${locationId}`,
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
        if (expRes.ok) {
          const expData = await expRes.json().catch(() => ({}))
          const expRec = expData.record || expData || {}
          const expProps = expRec.properties || {}
          expenseDetails = {
            id: expRec.id || recordId,
            expenseId: expProps.expense_id || "",
            amount: expProps.amount || 0,
            descriptions: expProps.descriptions || expProps.description || "",
            payee: expProps.payee || "",
            budgetCategory: expProps.budget_category || "",
            status: expProps.status || "",
            submittedDate: expProps.submitted_date || "",
            businessPurpose: expProps.business_purpose || "",
            receiptUrl: expProps.receipt_url || "",
            fundingSourceId: expProps.funding_source_id || "",
            submittedBy: expProps.submitted_by || "",
          }

          const linkedFundingId = expProps.funding_source_id
          if (linkedFundingId) {
            res = await fetch(
              `${GHL}/objects/custom_objects.funding_source/records/${linkedFundingId}?locationId=${locationId}`,
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
          }
        } else {
          // Check if recordId is a vendor record!
          const vRes = await fetch(
            `${GHL}/objects/custom_objects.vendors/records/${recordId}?locationId=${locationId}`,
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
          if (vRes.ok) {
            const vData = await vRes.json().catch(() => ({}))
            const vRec = vData.record || vData || {}
            const vProps = vRec.properties || {}
            vendorDetails = {
              id: vRec.id || recordId,
              vendorName: vProps.vendor_name || "",
              contactPerson: vProps.contact_person || "",
              email: vProps.email || "",
              phone: vProps.phone || "",
              address: vProps.address || "",
              taxId: vProps.tax_id_einssn || "",
              vendorType: vProps.vendor_type || "",
              categories: vProps.categories || "",
              paymentMethod: vProps.payment_method || "",
              w9OnFile: vProps.w9_on_file || "no",
              w9Url: vProps.w9_url || "",
              status: vProps.status || "",
              notes: vProps.notes || "",
            }
          } else {
            // Check if recordId is an organization record!
            const oRes = await fetch(
              `${GHL}/objects/custom_objects.organizations/records/${recordId}?locationId=${locationId}`,
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
            if (oRes.ok) {
              const oData = await oRes.json().catch(() => ({}))
              const oRec = oData.record || oData || {}
              const oProps = oRec.properties || {}
              orgDetails = {
                id: oRec.id || recordId,
                organizationName: oProps.organization_name || "",
                ein: oProps.ein || "",
                email: oProps.email || "",
                phone: oProps.phone || "",
                address: oProps.address || "",
                website: oProps.website || "",
                missionStatement: oProps.mission_statement || "",
                annualBudget: oProps.annual_budget || 0,
                status: oProps.status || "",
                primaryContact: oProps.primary_contact || "",
                notes: oProps.notes || "",
              }
            } else {
              // Check if recordId is a project record!
              const pRes = await fetch(
                `${GHL}/objects/custom_objects.projects/records/${recordId}?locationId=${locationId}`,
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
              if (pRes.ok) {
                const pData = await pRes.json().catch(() => ({}))
                const pRec = pData.record || pData || {}
                const pProps = pRec.properties || {}
                projectDetails = {
                  id: pRec.id || recordId,
                  projectName: pProps.project_name || "",
                  totalBudget: pProps.total_budget || 0,
                  budgetRemaining: pProps.budget_remaining || 0,
                  budgetSpent: pProps.budget_spent || 0,
                  percentSpent: pProps.percent_spent || 0,
                  description: pProps.project_description || "",
                  startDate: pProps.project_start_date || "",
                  endDate: pProps.project_end_date || "",
                  status: pProps.status || "",
                  programManager: pProps.program_manager || "",
                  targetPopulation: pProps.target_population || "",
                  geographicArea: pProps.geographic_area || "",
                  expectedOutcomes: pProps.expected_outcomes || "",
                  organizationId: pProps.organization_id || "",
                  fundingSourceId: pProps.funding_source_id || "",
                }
              }
            }
          }
        }
      }

      const data = await res.json().catch(() => ({}))
      const rec = data.record || data || {}
      const props = rec.properties || {}

      // Parse notes parts written by Form A / Form B / n8n
      const notesStr = String(props.notes || "")
      const parts = notesStr.split(" | ")
      let summary = parts[0] || ""
      // Clean any leftover raw brackets from summary
      if (summary.startsWith("[")) {
        const cleanedSummary = parts.find((p) => !p.trim().startsWith("[") && !p.startsWith("Requirements:") && !p.startsWith("Closing checklist:"));
        summary = cleanedSummary || "";
      }

      const reqDocs: string[] = []
      const closingDocs: string[] = []
      let proposalSummary = ""
      let applicantOrg = ""
      const proposalFiles: string[] = []
      let contactExtensionRequestedEndDate = ""
      let contactExtensionReason = ""
      let contactGrantSummary = ""

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
          const filesTag = p.match(/\[(?:gf360_)?proposal_files:([^\]]+)\]/i)
          if (filesTag) {
            filesTag[1].split("||").map((s) => s.trim()).filter(Boolean).forEach((x) => {
              if (!proposalFiles.includes(x)) proposalFiles.push(x)
            })
          }
          const linksTag = p.match(/\[(?:gf360_)?proposal_links:([^\]]+)\]/i)
          if (linksTag) {
            linksTag[1].split("||").map((s) => s.trim()).filter(Boolean).forEach((x) => {
              const url = x.includes("::") ? x.split("::").slice(1).join("::") : x
              if (url && !proposalFiles.includes(url)) proposalFiles.push(url)
            })
          }
        }
      }

      // Check applicants array on funding_source to discover applicantContactId if not passed in query
      let resolvedContactId = searchParams.get("contactId") || ""
      if (!resolvedContactId && props.applicants) {
        try {
          const apps = typeof props.applicants === "string" ? JSON.parse(props.applicants) : props.applicants
          if (Array.isArray(apps) && apps.length > 0) {
            const primary = apps[apps.length - 1]
            resolvedContactId = primary?.id || primary?.submitterContactId || ""
          }
        } catch {
          /* ignore parse error */
        }
      }

      if (resolvedContactId) {
        try {
          const cRes = await fetch(`${GHL}/contacts/${resolvedContactId}`, {
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

          const byKey = (kName: string) =>
            defs.find((f) => {
              const k = String(f.fieldKey || f.key || "").toLowerCase()
              return k === kName.toLowerCase() || k === `contact.${kName.toLowerCase()}`
            })?.id

          const mediaId = byKey("media_file_links")
          const orgNameId = byKey("org_name")
          const grantSummaryId = byKey("grant_summary")
          const extDateId = byKey("extension_requested_end_date")
          const extReasonId = byKey("extension_reason")

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
            if (grantSummaryId && cf.id === grantSummaryId && cf.value) {
              contactGrantSummary = String(cf.value).trim()
            }
            if (extDateId && cf.id === extDateId && cf.value) {
              contactExtensionRequestedEndDate = String(cf.value).trim().slice(0, 10)
            }
            if (extReasonId && cf.id === extReasonId && cf.value) {
              contactExtensionReason = String(cf.value).trim()
            }
          }
          if (!applicantOrg && cData.contact?.companyName) {
            applicantOrg = String(cData.contact.companyName).trim()
          }
        } catch {
          /* contact enrich is best-effort */
        }
      }

      // Check notes token fallback for extension
      const extMatch = notesStr.match(/\[(?:gf360_)?extension_request:([^|\]]*)\|?([^\]]*)\]/i)

      return NextResponse.json({
        id: rec.id || recordId,
        endDate: String(props.end_date || "").slice(0, 10),
        extensionRequestedEndDate: contactExtensionRequestedEndDate || (extMatch ? extMatch[1].trim() : ""),
        extensionReason: contactExtensionReason || (extMatch ? extMatch[2].trim() : ""),
        grantName: props.grant_name || "",
        funderName: props.funder_name || "",
        awardAmount: props.award_amount || 0,
        reviewProcess: props.review_process || "",
        summary: contactGrantSummary || summary,
        requirementDocs: reqDocs,
        closingDocs: closingDocs,
        proposalSummary,
        applicantOrg,
        proposalFiles,
        notes: notesStr,
        expense: expenseDetails,
        vendor: vendorDetails,
        organization: orgDetails,
        project: projectDetails,
      })
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Fetch error" },
        { status: 500 }
      )
    }
  }

  try {
    return NextResponse.json(await loadLookups())
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lookup failed" },
      { status: 502 }
    )
  }
}

