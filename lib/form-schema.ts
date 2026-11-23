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


const YES_NO = [{ label: "Yes", value: "yes" }, { label: "No", value: "no" }]
const OPTIONS: Record<string, (string | { label: string; value: string })[]> = {
  status501c3: YES_NO,
  costShareRequired: YES_NO,
  carryoverAllowed: YES_NO,
  preawardCosts: YES_NO,
  samRegistered: YES_NO,
  required1099: YES_NO,
  certificationStatus: YES_NO,
  ownershipCertified: [
    { label: "Yes, certified", value: "yes_certified" },
    { label: "No, self-identified only", value: "no_selfidentified_only" },
    { label: "Certification pending", value: "certification_pending" },
    { label: "Not sure", value: "not_sure" },
  ],
  ownershipStatus: [
    { label: "Women-owned business", value: "womenowned_business" },
    { label: "Minority-owned business", value: "minorityowned_business" },
    { label: "Veteran-owned business", value: "veteranowned_business" },
    { label: "Service-disabled veteran-owned business", value: "servicedisabled_veteranowned_business" },
    { label: "Disabled-owned business", value: "disabledowned_business" },
    { label: "LGBTQ-owned business", value: "lgbtqowned_business" },
    { label: "Small business", value: "small_business" },
    { label: "Disadvantaged business enterprise", value: "disadvantaged_business_enterprise" },
    { label: "Economically disadvantaged women-owned business", value: "economically_disadvantaged_womenowned_business" },
    { label: "HUBZone business", value: "hubzone_business" },
    { label: "8(a) certified business", value: "8a_certified_business" },
    { label: "Nonprofit organization", value: "nonprofit_organization" },
    { label: "Faith-based organization", value: "faithbased_organization" },
    { label: "Community-based organization", value: "communitybased_organization" },
    { label: "None of the above", value: "none_of_the_above" },
    { label: "Other", value: "other" },
  ],
  vendorType: [
    { label: "Individual (1099)", value: "individual_1099" },
    { label: "Sole proprietorship", value: "sole_proprietorship" },
    { label: "LLC", value: "llc" },
    { label: "Corporation (C-Corp)", value: "corporation_ccorp" },
    { label: "Corporation (S-Corp)", value: "corporation_scorp" },
    { label: "Partnership", value: "partnership" },
    { label: "Nonprofit", value: "nonprofit" },
    { label: "Government entity", value: "government_entity" },
    { label: "Other", value: "other" },
  ],
  certificationChoice: ["Women-owned (WOB)", "Minority-owned (MBE)", "Veteran-owned", "None"],
  paymentMethods: [{ label: "Check", value: "check" }, { label: "ACH", value: "ach" }, { label: "Wire", value: "wire" }, { label: "Credit card", value: "credit_card" }, { label: "Other", value: "other" }],
  accountType: [{ label: "Checking", value: "checking" }, { label: "Savings", value: "savings" }],
  categories: [
    { label: "Office supplies", value: "Office Supplies" }, { label: "Equipment", value: "Equipment" }, { label: "Professional services", value: "Professional Services" },
    { label: "Catering / food", value: "Catering/Food" }, { label: "Venue / space", value: "Venue/Space" }, { label: "Transportation", value: "Transportation" },
    { label: "Technology", value: "Technology" }, { label: "Marketing / design", value: "Marketing/Design" }, { label: "Insurance", value: "Insurance" },
    { label: "Legal", value: "Legal" }, { label: "Accounting", value: "Accounting" }, { label: "Other", value: "Other" },
  ],
  numberOfAwards: ["Undetermined", "1", "2"],
  reviewProcess: REVIEW_PROCESS_OPTIONS,
  submitMode: ["Save for Later", "Submit Now"],
  paymentKind: ["Reimbursement", "Future Payment"],
  isReimbursement: ["Reimbursement", "Future Payment"],
  paymentMethod: ["Wire", "ACH", "Credit Card", "Check", "Hand Delivery", "Mail", "Other"],
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
