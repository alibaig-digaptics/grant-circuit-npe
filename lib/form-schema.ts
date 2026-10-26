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
  { label: "Reviewed by Grant Circuit Team", value: "Admin" },
  { label: "Reviewed by Internal Team", value: "Internal" },
  { label: "Reviewed by Third Party", value: "Third-Party" },
]

export function formatReviewProcess(val?: string): string {
  if (!val) return ""
  const normalized = val.trim().toLowerCase()
  if (normalized === "admin" || normalized.includes("iim") || normalized.includes("grant circuit")) {
    return "Reviewed by Grant Circuit Team"
  }
  if (normalized === "internal") {
    return "Reviewed by Internal Team"
  }
  if (normalized === "third-party" || normalized === "third_party" || normalized.includes("third")) {
    return "Reviewed by Third Party"
  }
  return val
}

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
  progressReportCadence: ["None", "Every 3 months", "Every 6 months", "Every 8 months"],
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
