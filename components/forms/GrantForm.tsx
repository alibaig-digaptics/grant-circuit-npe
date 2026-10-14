"use client"

import React, { useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Controller, FormProvider, useForm, type Resolver } from "react-hook-form"
import {
  CheckCircle2,
  FileText,
  User,
  Mail,
  Phone,
  DollarSign,
  Calendar,
  Building2,
  Tag,
  Briefcase,
  Layers,
  HelpCircle,
  Clock,
  Landmark,
  FileCheck2,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  Send,
  Sparkles,
} from "lucide-react"
import { FormShell } from "@/components/forms/FormShell"
import { FileDropZone } from "@/components/forms/FileDropZone"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import { Badge } from "@/components/ui/badge"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { PhoneInput } from "@/components/ui/phone-input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import type { FormDef } from "@/lib/forms"
import { isHiddenField, LOOKUP_FIELD_NAMES, stepsFor, type FormField } from "@/lib/form-schema"
import { defaultValuesFor, schemaForStep } from "@/lib/zod-form"
import { cn } from "@/lib/utils"

type FormValues = Record<string, string>

function getFieldIcon(name: string, type: string) {
  const n = name.toLowerCase()
  if (n.includes("first") || n.includes("last") || n.includes("name") || n.includes("attendee") || n.includes("contact")) {
    return <User className="size-3.5 text-primary stroke-[2.2]" />
  }
  if (n.includes("email")) {
    return <Mail className="size-3.5 text-primary stroke-[2.2]" />
  }
  if (n.includes("phone") || n.includes("tel")) {
    return <Phone className="size-3.5 text-primary stroke-[2.2]" />
  }
  if (n.includes("amount") || n.includes("cost") || n.includes("fee") || n.includes("award") || n.includes("budget") || n.includes("rate") || n.includes("price")) {
    return <DollarSign className="size-3.5 text-primary stroke-[2.2]" />
  }
  if (n.includes("date") || n.includes("deadline") || n.includes("cadence") || n.includes("period")) {
    return <Calendar className="size-3.5 text-primary stroke-[2.2]" />
  }
  if (n.includes("org") || n.includes("funder") || n.includes("company") || n.includes("institution")) {
    return <Building2 className="size-3.5 text-primary stroke-[2.2]" />
  }
  if (n.includes("vendor")) {
    return <Briefcase className="size-3.5 text-primary stroke-[2.2]" />
  }
  if (n.includes("project")) {
    return <FolderOpen className="size-3.5 text-primary stroke-[2.2]" />
  }
  if (n.includes("category") || n.includes("status") || n.includes("type") || n.includes("decision") || n.includes("method") || n.includes("mode")) {
    return <Tag className="size-3.5 text-primary stroke-[2.2]" />
  }
  if (type === "file") {
    return <FileCheck2 className="size-3.5 text-primary stroke-[2.2]" />
  }
  if (type === "textarea" || n.includes("note") || n.includes("summary") || n.includes("purpose") || n.includes("proposal") || n.includes("reason") || n.includes("narrative")) {
    return <FileText className="size-3.5 text-primary stroke-[2.2]" />
  }
  return <Sparkles className="size-3.5 text-primary stroke-[2.2]" />
}

export function GrantForm({
  form,
  isEmbedded,
}: {
  form: FormDef
  isEmbedded?: boolean
}) {
  const params = useSearchParams()
  const contactId = params.get("contactId") || ""
  const recordId = params.get("recordId") || ""
  const opportunityId = params.get("opportunityId") || ""
  const steps = stepsFor(form.slug)
  const stepLabels = steps.map((s, i) => ({
    id: i + 1,
    label: s.title.replace(/^.* - /, "").replace(/Form - /i, "") || `Step ${i + 1}`,
  }))

  const [step, setStep] = useState(0)
  const [files, setFiles] = useState<Record<string, File[]>>({})
  const lookups = useQuery({
    queryKey: ["gc-lookups"],
    queryFn: async () => {
      const res = await fetch("/api/lookups")
      const data = (await res.json().catch(() => ({}))) as Record<string, string[]>
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Lookups failed")
      return data
    },
  })

  const recordQuery = useQuery({
    queryKey: ["gc-record", recordId, contactId],
    queryFn: async () => {
      if (!recordId) return null
      const qs = new URLSearchParams({ recordId })
      if (contactId) qs.set("contactId", contactId)
      let res = await fetch(`/api/lookups?${qs.toString()}`)
      if (!res.ok) {
        res = await fetch(`/api/lookups/record?${qs.toString()}`)
      }
      const data = (await res.json().catch(() => ({}))) as {
        id: string
        grantName?: string
        funderName?: string
        awardAmount?: number
        reviewProcess?: string
        summary?: string
        requirementDocs?: string[]
        proposalSummary?: string
        applicantOrg?: string
        proposalFiles?: string[]
        notes?: string
        endDate?: string
        extensionRequestedEndDate?: string
        extensionReason?: string
      }
      if (!res.ok) throw new Error("Could not load grant details")
      return data
    },
    enabled: Boolean(recordId),
  })
  const current = steps[step]
    ? {
        ...steps[step],
        fields: steps[step].fields.map((field) => {
          if (!LOOKUP_FIELD_NAMES.includes(field.name as (typeof LOOKUP_FIELD_NAMES)[number])) {
            return field
          }
          const live = lookups.data?.[field.name] || []
          return { ...field, options: live.length ? live : field.options }
        }),
      }
    : steps[step]
  const last = step === steps.length - 1

  const methods = useForm<FormValues>({
    resolver: current
      ? (zodResolver(schemaForStep(current)) as Resolver<FormValues>)
      : undefined,
    defaultValues: defaultValuesFor(steps, { contactId, recordId, opportunityId }),
    mode: "onSubmit",
  })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const body: Record<string, unknown> = {
        slug: form.slug,
        contactId,
        recordId,
        opportunityId,
        ...values,
      }
      const fd = new FormData()
      fd.append("payload", JSON.stringify(body))
      for (const [name, list] of Object.entries(files)) {
        for (const file of list) fd.append(name, file)
      }
      const res = await fetch(`/api/forms/${form.slug}`, { method: "POST", body: fd })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error || "Submit failed")
      return data
    },
  })

  const payKind =
    methods.watch("payKind") ||
    methods.watch("paymentType") ||
    methods.watch("isReimbursement") ||
    ""

  function visible(field: FormField) {
    if (isHiddenField(field)) return false
    if (form.slug === "grant-applicant-submit" && (field.name === "submitMode" || field.name === "whatDoYouWantToDo")) {
      return false
    }
    const n = field.name.toLowerCase()
    const future = /future/i.test(payKind)
    if (future && (n.includes("expensedate") || n === "expense_date" || n === "date")) {
      return false
    }
    return true
  }

  const showApplicantPackage = [
    "grant-mark-awarded",
    "grant-funder-auto-review",
    "grant-management-requirements",
  ].includes(form.slug)

  const contextCard = useMemo(() => {
    if (!recordId) return null
    const rd = recordQuery.data as {
      id?: string
      grantName?: string
      funderName?: string
      awardAmount?: number
      reviewProcess?: string
      summary?: string
      requirementDocs?: string[]
      closingDocs?: string[]
      proposalSummary?: string
      applicantOrg?: string
      proposalFiles?: string[]
      notes?: string
      endDate?: string
      extensionRequestedEndDate?: string
      extensionReason?: string
      expense?: Record<string, unknown>
      vendor?: Record<string, unknown>
      organization?: Record<string, unknown>
      project?: Record<string, unknown>
    } | undefined
    const fileList = rd?.proposalFiles || []
    const isVendorForm = form.slug === "vendor-review" || form.slug === "vendor-w9"
    const isOrgForm = form.slug === "org-activate"
    const isProjectForm = form.slug === "project-status"
    const cardTitle = isVendorForm
      ? (String(rd?.vendor?.vendorName || "") || (recordQuery.isLoading ? "Loading vendor…" : "Vendor Details"))
      : isOrgForm
        ? (String(rd?.organization?.organizationName || "") || (recordQuery.isLoading ? "Loading organization…" : "Organization Details"))
        : isProjectForm
          ? (String(rd?.project?.projectName || "") || (recordQuery.isLoading ? "Loading project…" : "Project Details"))
          : (rd?.grantName || (recordQuery.isLoading ? "Loading grant…" : "Grant Details"))

    return (
      <Card className="mb-6 border-border/80 bg-muted/20 shadow-sm overflow-hidden text-left">
        <CardHeader className="pb-2.5 border-b border-border/40 bg-muted/40 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 className="size-4 text-primary shrink-0" />
              <CardTitle className="text-sm font-bold text-foreground truncate">
                {cardTitle}
              </CardTitle>
            </div>
            {isVendorForm && rd?.vendor?.status ? (
              <Badge variant="secondary" className="font-bold text-xs shrink-0 capitalize">
                {String(rd.vendor.status).replace(/_/g, " ")}
              </Badge>
            ) : isOrgForm && rd?.organization?.status ? (
              <Badge variant="secondary" className="font-bold text-xs shrink-0 capitalize">
                {String(rd.organization.status).replace(/_/g, " ")}
              </Badge>
            ) : isProjectForm && rd?.project?.status ? (
              <Badge variant="secondary" className="font-bold text-xs shrink-0 capitalize">
                {String(rd.project.status).replace(/_/g, " ")}
              </Badge>
            ) : rd?.awardAmount ? (
              <Badge variant="secondary" className="font-bold text-xs shrink-0">
                Up to ${Number(rd.awardAmount).toLocaleString()}
              </Badge>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-3 px-4 pb-3 space-y-2.5 text-xs sm:text-sm">
          {isProjectForm && rd?.project ? (
            <>
              {rd.project.programManager ? (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Program Manager:</span>
                  <span className="font-semibold text-foreground text-right">{String(rd.project.programManager)}</span>
                </div>
              ) : null}
              {rd.project.organizationId ? (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Organization:</span>
                  <span className="font-semibold text-foreground text-right">{String(rd.project.organizationId)}</span>
                </div>
              ) : null}
              {rd.project.fundingSourceId ? (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Funding Grant:</span>
                  <span className="font-semibold text-foreground text-right">{String(rd.project.fundingSourceId)}</span>
                </div>
              ) : null}
              {rd.project.totalBudget ? (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Total Budget:</span>
                  <span className="font-bold text-primary text-right">${Number(rd.project.totalBudget).toLocaleString()}</span>
                </div>
              ) : null}
              {rd.project.targetPopulation ? (
                <div className="pt-0.5 text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground block mb-0.5">Target Population:</span>
                  <span>{String(rd.project.targetPopulation)}</span>
                </div>
              ) : null}
              {rd.project.expectedOutcomes ? (
                <div className="pt-0.5 text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground block mb-0.5">Expected Outcomes:</span>
                  <span>{String(rd.project.expectedOutcomes)}</span>
                </div>
              ) : null}
            </>
          ) : null}
          {isOrgForm && rd?.organization ? (
            <>
              {rd.organization.primaryContact ? (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Primary Contact:</span>
                  <span className="font-semibold text-foreground text-right">{String(rd.organization.primaryContact)}</span>
                </div>
              ) : null}
              {rd.organization.email ? (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Email:</span>
                  <span className="font-semibold text-foreground text-right">{String(rd.organization.email)}</span>
                </div>
              ) : null}
              {rd.organization.phone ? (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Phone:</span>
                  <span className="font-semibold text-foreground text-right">{String(rd.organization.phone)}</span>
                </div>
              ) : null}
              {rd.organization.ein ? (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">EIN:</span>
                  <span className="font-semibold text-foreground text-right font-mono">{String(rd.organization.ein)}</span>
                </div>
              ) : null}
              {rd.organization.annualBudget ? (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Annual Budget:</span>
                  <span className="font-semibold text-foreground text-right">${Number(rd.organization.annualBudget).toLocaleString()}</span>
                </div>
              ) : null}
              {rd.organization.website ? (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Website:</span>
                  <a href={String(rd.organization.website)} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline text-right truncate max-w-[240px]">
                    {String(rd.organization.website)}
                  </a>
                </div>
              ) : null}
              {rd.organization.address ? (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Address:</span>
                  <span className="font-semibold text-foreground text-right truncate max-w-[280px]">{String(rd.organization.address)}</span>
                </div>
              ) : null}
              {rd.organization.missionStatement ? (
                <div className="pt-0.5 text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground block mb-0.5">Mission:</span>
                  <span>{String(rd.organization.missionStatement)}</span>
                </div>
              ) : null}
              {rd.organization.notes ? (
                <div className="pt-0.5 text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground block mb-0.5">Notes:</span>
                  <span>{String(rd.organization.notes)}</span>
                </div>
              ) : null}
            </>
          ) : null}
          {isVendorForm && rd?.vendor ? (
            <>
              {rd.vendor.contactPerson ? (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Contact Person:</span>
                  <span className="font-semibold text-foreground text-right">{String(rd.vendor.contactPerson)}</span>
                </div>
              ) : null}
              {rd.vendor.email ? (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Email:</span>
                  <span className="font-semibold text-foreground text-right">{String(rd.vendor.email)}</span>
                </div>
              ) : null}
              {rd.vendor.phone ? (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Phone:</span>
                  <span className="font-semibold text-foreground text-right">{String(rd.vendor.phone)}</span>
                </div>
              ) : null}
              {rd.vendor.taxId ? (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Tax ID (EIN/SSN):</span>
                  <span className="font-semibold text-foreground text-right font-mono">{String(rd.vendor.taxId)}</span>
                </div>
              ) : null}
              {rd.vendor.address ? (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground font-medium">Address:</span>
                  <span className="font-semibold text-foreground text-right truncate max-w-[280px]">{String(rd.vendor.address)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground font-medium">W-9 On File:</span>
                <span className={`font-bold text-right capitalize ${rd.vendor.w9OnFile === 'yes' ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {String(rd.vendor.w9OnFile || 'no')}
                </span>
              </div>
              {rd.vendor.notes ? (
                <div className="pt-0.5 text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground block mb-0.5">Notes:</span>
                  <span>{String(rd.vendor.notes)}</span>
                </div>
              ) : null}
            </>
          ) : null}
          {!isVendorForm && rd?.funderName ? (
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground font-medium">Funder Organization:</span>
              <span className="font-semibold text-foreground text-right">{rd.funderName}</span>
            </div>
          ) : null}
          {showApplicantPackage && rd?.applicantOrg ? (
            <div className="flex items-center justify-between py-1 border-b border-border/30">
              <span className="text-muted-foreground font-medium">Applicant Org:</span>
              <span className="font-semibold text-foreground text-right">{rd.applicantOrg}</span>
            </div>
          ) : null}
          {form.slug === "extension-review" ? (
            <>
              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground font-medium">Current end date:</span>
                <span className="font-semibold text-foreground text-right">{rd?.endDate || "Not set"}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground font-medium">Requested end date:</span>
                <span className="font-semibold text-foreground text-right">
                  {rd?.extensionRequestedEndDate || "No pending request"}
                </span>
              </div>
              {rd?.extensionReason ? (
                <div className="pt-0.5 text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground block mb-0.5">Reason:</span>
                  <span>{rd.extensionReason}</span>
                </div>
              ) : null}
            </>
          ) : null}
          {(form.slug === "review-expense" || form.slug === "bookkeeper-pay") && rd?.expense ? (
            <>
              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground font-medium">Expense ID:</span>
                <span className="font-semibold text-foreground text-right">{String(rd.expense.expenseId || "")}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground font-medium">Payee / Vendor:</span>
                <span className="font-semibold text-foreground text-right">{String(rd.expense.payee || "")}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground font-medium">Expense Amount:</span>
                <span className="font-bold text-primary text-right">${Number(rd.expense.amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground font-medium">Budget Category:</span>
                <span className="font-semibold text-foreground text-right capitalize">{String(rd.expense.budgetCategory || "General")}</span>
              </div>
              {rd.expense.descriptions ? (
                <div className="pt-0.5 text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground block mb-0.5">Description:</span>
                  <span>{String(rd.expense.descriptions)}</span>
                </div>
              ) : null}
              {rd.expense.businessPurpose ? (
                <div className="pt-0.5 text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground block mb-0.5">Business Purpose:</span>
                  <span>{String(rd.expense.businessPurpose)}</span>
                </div>
              ) : null}
            </>
          ) : null}
          {rd?.summary ? (
            <div className="pt-0.5 text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground block mb-0.5">Grant Summary:</span>
              <span>{rd.summary}</span>
            </div>
          ) : null}
          {showApplicantPackage && rd?.proposalSummary ? (
            <div className="pt-0.5 text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground block mb-0.5">Proposal Summary:</span>
              <span>{rd.proposalSummary}</span>
            </div>
          ) : null}
          {showApplicantPackage ? (
            <div className="pt-1 text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" />
                Proposal Documents:
              </span>
              {fileList.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {fileList.map((doc, idx) => {
                    const isUrl = doc.startsWith("http://") || doc.startsWith("https://")
                    const filename = isUrl
                      ? decodeURIComponent(doc.split("/").pop() || `Document ${idx + 1}`)
                      : doc
                    return (
                      <div
                        key={`${doc}-${idx}`}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border/60 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileCheck2 className="size-4 text-primary shrink-0" />
                          <span className="font-medium text-foreground truncate">{filename}</span>
                        </div>
                        {isUrl ? (
                          <a
                            href={doc}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline font-semibold shrink-0"
                          >
                            View / Download
                            <ArrowRight className="size-3" />
                          </a>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">No proposal documents uploaded.</p>
              )}
            </div>
          ) : null}
          {rd?.requirementDocs && rd.requirementDocs.length > 0 ? (
            <div className="pt-1 text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <FileText className="size-3.5 text-primary" />
                Required Documents & Guidelines (from Funder):
              </span>
              <div className="flex flex-col gap-1.5">
                {rd.requirementDocs.map((doc, idx) => {
                  const isUrl = doc.startsWith("http://") || doc.startsWith("https://")
                  const filename = isUrl ? (doc.split("/").pop() || `Document ${idx + 1}`) : doc
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border/60 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileCheck2 className="size-4 text-primary shrink-0" />
                        <span className="font-medium text-foreground truncate">{filename}</span>
                      </div>
                      {isUrl ? (
                        <a
                          href={doc}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline font-semibold shrink-0"
                        >
                          View / Download
                          <ArrowRight className="size-3" />
                        </a>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    )
  }, [recordId, recordQuery.data, recordQuery.isLoading, showApplicantPackage, form.slug])

  if (mutation.isSuccess) {
    return (
      <FormShell form={form} currentStep={steps.length} stepLabels={stepLabels} isEmbedded={isEmbedded}>
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="inline-flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary ring-8 ring-primary/5">
            <CheckCircle2 className="size-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <Badge variant="default" className="bg-primary text-primary-foreground font-bold px-3 py-1 mb-2 text-xs">
              Submission Received
            </Badge>
            <h3 className="text-xl font-bold tracking-tight text-foreground">
              Thank you for your submission!
            </h3>
            <p className="max-w-md text-xs sm:text-sm text-muted-foreground">
              Your details have been securely recorded. Our team and automated workflows will process your request promptly.
            </p>
          </div>
        </div>
      </FormShell>
    )
  }

  if (!current) {
    return (
      <FormShell form={form} currentStep={1} stepLabels={stepLabels} isEmbedded={isEmbedded}>
        <Empty>
          <EmptyHeader>
            <EmptyTitle>This form has no fields yet.</EmptyTitle>
          </EmptyHeader>
        </Empty>
      </FormShell>
    )
  }

  return (
    <FormShell form={form} currentStep={step + 1} stepLabels={stepLabels} isEmbedded={isEmbedded}>
      {contextCard}
      <FormProvider {...methods}>
        <form
          className="flex flex-col gap-5"
          onSubmit={methods.handleSubmit((values: FormValues) => {
            const parsed = schemaForStep(current).safeParse(values)
            if (!parsed.success) {
              for (const issue of parsed.error.issues) {
                const key = String(issue.path[0] || "")
                if (key) methods.setError(key as never, { message: issue.message })
              }
              return
            }
            for (const field of current.fields.filter(visible)) {
              if (field.type === "file" && field.required && !files[field.name]?.length) {
                methods.setError(field.name as never, { message: `${field.label} is required` })
                return
              }
            }
            if (last) mutation.mutate(methods.getValues())
            else setStep((s) => s + 1)
          })}
        >
          <div className="flex flex-col gap-4">
            {(() => {
              const visibleFields = current.fields.filter(visible)
              const elements: React.ReactNode[] = []

              for (let i = 0; i < visibleFields.length; i++) {
                const f = visibleFields[i]
                const next = visibleFields[i + 1]

                // Group First Name + Last Name side by side
                if (
                  f.name === "firstName" &&
                  next &&
                  next.name === "lastName"
                ) {
                  elements.push(
                    <div key="name-group" className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <FormControl
                        key={f.name}
                        field={f}
                        files={files[f.name] || []}
                        onFiles={(list) => setFiles((prev) => ({ ...prev, [f.name]: list }))}
                      />
                      <FormControl
                        key={next.name}
                        field={next}
                        files={files[next.name] || []}
                        onFiles={(list) => setFiles((prev) => ({ ...prev, [next.name]: list }))}
                      />
                    </div>
                  )
                  i++ // skip next
                  continue
                }

                elements.push(
                  <FormControl
                    key={f.name}
                    field={f}
                    files={files[f.name] || []}
                    onFiles={(list) => setFiles((prev) => ({ ...prev, [f.name]: list }))}
                  />
                )
              }

              return elements
            })()}
          </div>

          {mutation.isError ? (
            <Alert variant="destructive">
              <AlertTitle>Could not send</AlertTitle>
              <AlertDescription>
                {mutation.error instanceof Error ? mutation.error.message : "Submit failed"}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex gap-3 pt-3">
            {step > 0 ? (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 flex-1 font-semibold rounded-xl border-border/80 hover:bg-muted/60"
                onClick={() => setStep((s) => s - 1)}
              >
                <ArrowLeft className="mr-1.5 size-4" />
                Back
              </Button>
            ) : null}

            {last && form.slug === "grant-applicant-submit" ? (
              <div className="flex flex-1 gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-11 flex-1 font-semibold rounded-xl border-primary/40 text-primary hover:bg-primary/10 transition-all duration-150"
                  disabled={mutation.isPending}
                  onClick={async () => {
                    methods.setValue("submitMode", "Save for Later")
                    const valid = await methods.trigger()
                    if (valid) {
                      mutation.mutate({ ...methods.getValues(), submitMode: "Save for Later" })
                    }
                  }}
                >
                  {mutation.isPending && methods.getValues("submitMode") === "Save for Later" ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Clock className="mr-1.5 size-4" />
                  )}
                  Save for Later
                </Button>
                <Button
                  type="button"
                  size="lg"
                  className="h-11 flex-1 font-semibold rounded-xl shadow-md transition-all duration-150 hover:opacity-95"
                  disabled={mutation.isPending}
                  onClick={async () => {
                    methods.setValue("submitMode", "Submit Now")
                    const valid = await methods.trigger()
                    if (valid) {
                      mutation.mutate({ ...methods.getValues(), submitMode: "Submit Now" })
                    }
                  }}
                >
                  {mutation.isPending && methods.getValues("submitMode") !== "Save for Later" ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Send className="mr-1.5 size-4" />
                  )}
                  Submit Application
                </Button>
              </div>
            ) : (
              <Button
                type="submit"
                size="lg"
                className="h-11 flex-1 font-semibold rounded-xl shadow-md transition-all duration-150 hover:opacity-95"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? (
                  <Spinner data-icon="inline-start" />
                ) : last ? (
                  <Send className="mr-1.5 size-4" />
                ) : (
                  <ArrowRight className="mr-1.5 size-4" />
                )}
                {mutation.isPending
                  ? "Submitting…"
                  : last
                    ? buttonLabel(form.slug, methods.getValues())
                    : "Continue"}
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </FormShell>
  )
}

function buttonLabel(slug: string, values: FormValues) {
  const mode = values.submitMode || values.whatDoYouWantToDo || ""
  if (slug === "grant-applicant-submit" && /save|later/i.test(mode)) {
    return "Save for later"
  }
  return "Submit Application"
}

function FormControl({
  field,
  files,
  onFiles,
}: {
  field: FormField
  files: File[]
  onFiles: (files: File[]) => void
}) {
  const icon = getFieldIcon(field.name, field.type)

  if (field.type === "file") {
    return (
      <Field data-invalid={files.length === 0 && field.required || undefined}>
        <FieldLabel className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground">
          {icon}
          <span>{field.label}</span>
          {field.required && <span className="text-primary font-bold">*</span>}
        </FieldLabel>
        <FileDropZone
          files={files}
          multiple={field.multiple}
          invalid={field.required && !files.length}
          onChange={onFiles}
        />
      </Field>
    )
  }

  const FORCE_DROPDOWN_NAMES = [
    "numberOfAwards",
    "reviewProcess",
    "paymentMethod",
    "organizationType",
    "progressReportCadence",
    "status",
  ]
  const isForcedDropdown = FORCE_DROPDOWN_NAMES.includes(field.name)

  return (
    <Controller
      name={field.name}
      render={({ field: rhf, fieldState }) => {
        const bad = Boolean(fieldState.error)
        return (
          <Field data-invalid={bad || undefined}>
            {field.type === "checkbox" ? (
              <FieldSet>
                <Field orientation="horizontal" className="items-start gap-2.5 pt-1">
                  <Checkbox
                    id={field.name}
                    checked={Boolean(rhf.value)}
                    aria-invalid={bad || undefined}
                    className="mt-0.5"
                    onCheckedChange={(checked) =>
                      rhf.onChange(checked ? field.options[0] || "I agree" : "")
                    }
                  />
                  <FieldLabel htmlFor={field.name} className="font-normal text-xs sm:text-sm leading-relaxed cursor-pointer">
                    {field.label}
                    {field.required && <span className="text-primary font-bold ml-1">*</span>}
                  </FieldLabel>
                </Field>
              </FieldSet>
            ) : (
              <>
                <FieldLabel htmlFor={field.name} className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-foreground">
                  {icon}
                  <span>{field.label}</span>
                  {field.required && <span className="text-primary font-bold">*</span>}
                </FieldLabel>
                {field.type === "textarea" ? (
                  <Textarea
                    id={field.name}
                    rows={3}
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    aria-invalid={bad || undefined}
                    {...rhf}
                  />
                ) : field.type === "date" ? (
                  <DatePicker id={field.name} value={rhf.value} onChange={rhf.onChange} />
                ) : field.type === "tel" ? (
                  <PhoneInput
                    id={field.name}
                    value={rhf.value || ""}
                    onChange={rhf.onChange}
                    invalid={bad}
                  />
                ) : field.type === "dropdown" && field.options.length > 0 && !isForcedDropdown && field.options.length <= 4 ? (
                  <ToggleGroup
                    multiple={false}
                    className="flex w-full flex-wrap gap-2 pt-0.5"
                    value={rhf.value ? [rhf.value] : []}
                    onValueChange={(next) => {
                      const picked = Array.isArray(next) ? next[0] : next
                      rhf.onChange(picked || "")
                    }}
                  >
                    {field.options.map((option) => (
                      <ToggleGroupItem
                        key={option}
                        value={option}
                        className={cn(
                          "cursor-pointer rounded-xl border border-border/80 px-3.5 py-2 text-xs sm:text-sm font-medium transition-all",
                          rhf.value === option
                            ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20 font-semibold"
                            : "hover:bg-muted/50 text-foreground"
                        )}
                      >
                        {option}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                ) : field.type === "dropdown" && (field.options.length > 4 || isForcedDropdown) ? (
                  <Select value={rhf.value || null} onValueChange={rhf.onChange}>
                    <SelectTrigger id={field.name} aria-invalid={bad || undefined} className="h-10 rounded-xl">
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-lg border border-border/80">
                      <SelectGroup>
                        {field.options.map((option) => (
                          <SelectItem key={option} value={option} className="rounded-lg text-xs sm:text-sm">
                            {option}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={field.name}
                    type={
                      field.type === "number"
                        ? "number"
                        : field.type === "email"
                          ? "email"
                          : "text"
                    }
                    placeholder={`Enter ${field.label.toLowerCase()}...`}
                    aria-invalid={bad || undefined}
                    {...rhf}
                  />
                )}
              </>
            )}
            {fieldState.error ? (
              <FieldError className="text-[11px] font-medium text-destructive mt-1">
                {fieldState.error.message}
              </FieldError>
            ) : field.type === "dropdown" && !field.options.length ? (
              <FieldDescription className="text-[11px] text-muted-foreground">
                Type the name exactly as it appears in the system records.
              </FieldDescription>
            ) : null}
          </Field>
        )
      }}
    />
  )
}
