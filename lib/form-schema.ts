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

export type FormField = {
  name: string
  label: string
  type: FieldType
  required: boolean
  options: string[]
  multiple: boolean
}

export type FormStep = {
  title: string
  fields: FormField[]
}

export const FORM_STEPS = generated as Record<string, FormStep[]>

const OPTIONS: Record<string, string[]> = {
  numberOfAwards: ["Undetermined", "1", "2"],
  reviewProcess: [
    "Reviewed by Internal Team",
    "Reviewed by Third Party",
    "Reviewed by IIM Team",
  ],
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
        options: field.options.length ? field.options : OPTIONS[field.name] || [],
      })),
    }))
    .filter((step) => step.fields.some((field) => !isHiddenField(field)))
}
