import generated from "@/lib/generated-fields.json"

export const LOOKUP_FIELD_NAMES = ["organization", "fundingSource", "vendor", "project"] as const

export type FieldType =
  | "text"
  | "email"
  | "tel"
  | "number"
  | "textarea"
  | "dropdown"
  | "file"
  | "date"
  | "checkbox"
  | "multicheck"

export type FormFieldOption = string | { label: string; value: string }

export type FormField = {
  name: string
  label: string
  type: FieldType
  required: boolean
  options: FormFieldOption[]
  multiple: boolean
}

export type FormStep = {
  title: string
  fields: FormField[]
}

export const FORM_STEPS = generated as Record<string, FormStep[]>

export const REVIEW_PROCESS_OPTIONS = [
  // Client-facing labels. A client may rename them. The stored keys stay admin, thirdparty, self.
  { label: "By Grant Circuit Team", value: "admin" },
  { label: "By a Third Party", value: "thirdparty" },
  { label: "By the Funder's Own Team", value: "self" },
]

export function formatReviewProcess(val?: string): string {
  const normalized = String(val || "").trim().toLowerCase().replace(/[^a-z]/g, "")
  if (!normalized) return ""
  if (normalized === "thirdparty" || normalized.includes("third")) return REVIEW_PROCESS_OPTIONS[1].label
  if (normalized === "self" || normalized === "internal") return REVIEW_PROCESS_OPTIONS[2].label
  return REVIEW_PROCESS_OPTIONS[0].label
}

const BUDGET_CATEGORY_OPTIONS = ["personnel", "events", "supplies", "travel", "marketing", "consulting", "equipment", "other"].map((value) => ({ label: value[0].toUpperCase() + value.slice(1), value }))

const OPTIONS: Record<string, (string | { label: string; value: string })[]> = {
  numberOfAwards: ["Undetermined", "1", "2"],
  reviewProcess: REVIEW_PROCESS_OPTIONS,
  submitMode: ["Save for Later", "Submit Now"],
  paymentKind: ["Reimbursement", "Future Payment"],
  isReimbursement: ["Reimbursement", "Future Payment"],
  paymentMethod: ["Check", "ACH", "Wire", "Credit Card", "Other"],
  decision: ["Approve", "Request Changes", "Reject"],
  reviewDecision: ["Approve", "Request Changes", "Reject"],
  extensionDecision: ["Approve", "Deny"],
  organizationType: [
    "501(c)(3) Nonprofit",
    "Faith-Based Organization",
    "Community Foundation",
    "University/Research Institution",
    "Government Agency",
    "Other",
  ],
  status: ["Planning", "Active", "On Hold", "Completed", "Cancelled"],
  progressReportCadence: ["Every 3 months", "Every 6 months", "Every 8 months"],
  budgetCategories: BUDGET_CATEGORY_OPTIONS,
}

export function isHiddenField(field: FormField): boolean {
  return field.label === "(hidden)" || /^(contactId|recordId|opportunityId)$/.test(field.name)
}

export function stepsFor(slug: string): FormStep[] {
  const raw = FORM_STEPS[slug] || [
    {
      title: "Your info",
      fields: [
        { name: "firstName", label: "First Name", type: "text", required: true, options: [], multiple: false },
        { name: "lastName", label: "Last Name", type: "text", required: true, options: [], multiple: false },
        { name: "email", label: "Email", type: "email", required: true, options: [], multiple: false },
        { name: "phone", label: "Phone", type: "tel", required: false, options: [], multiple: false },
      ],
    },
  ]
  return raw
    .map((step) => ({
      ...step,
      fields: step.fields.map((field) => ({
        ...field,
        options: field.name === "reviewProcess"
          ? REVIEW_PROCESS_OPTIONS
          : (field.options.length ? field.options : OPTIONS[field.name] || []),
      })),
    }))
    .filter((step) => step.fields.some((field) => !isHiddenField(field)))
}

const INDIVIDUAL_HIDDEN_FIELDS = new Set([
  "organizationName",
  "organizationType",
  "ein",
  "orgEmail",
  "orgPhone",
  "status501c3",
  "dateEstablished",
  "annualBudget",
  "fiscalYearEnd",
  "duns",
  "uei",
  "samRegistered",
  "ownershipStatus",
  "ownershipOther",
  "ownershipCertified",
  "ownershipCertAgency",
  "ownershipCertUrl",
  "ownershipCertFile",
])

/** An individual grant seeker has no organization details to give. */
export function hiddenForValues(slug: string, fieldName: string, values: Record<string, unknown>): boolean {
  return slug === "org-registration" && values.isIndividual === "yes" && INDIVIDUAL_HIDDEN_FIELDS.has(fieldName)
}
