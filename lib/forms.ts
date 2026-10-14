export type FormSlug =
  | "grant-rfp"
  | "grant-applicant-submit"
  | "grant-management-requirements"
  | "grant-funder-auto-review"
  | "grant-mark-awarded"
  | "submit-expense"
  | "review-expense"
  | "bookkeeper-pay"
  | "apply-extension"
  | "extension-review"
  | "progress-report"
  | "vendor-application"
  | "vendor-review"
  | "vendor-w9"
  | "org-registration"
  | "org-activate"
  | "project-registration"
  | "project-status"

export type FormAudience = "funder" | "applicant" | "staff"

export type FormDef = {
  slug: FormSlug
  title: string
  subtitle: string
  audience: FormAudience
  n8nPath: string
  webhookEnv?: string
  steps: { id: number; label: string }[]
}

export const FORMS: FormDef[] = [
  {
    slug: "grant-rfp",
    title: "Grant Application",
    subtitle: "For funding organizations",
    audience: "funder",
    n8nPath: "gc-grant-rfp-npe",
    webhookEnv: "N8N_GRANT_RFP_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Grant details" },
    ],
  },
  {
    slug: "grant-applicant-submit",
    title: "Grant Application",
    subtitle: "For applicants",
    audience: "applicant",
    n8nPath: "gc-grant-applicant-submit-npe",
    webhookEnv: "N8N_GRANT_APPLICANT_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Proposal" },
    ],
  },
  {
    slug: "grant-management-requirements",
    title: "Grant Allocation",
    subtitle: "Award amount and grant period",
    audience: "staff",
    n8nPath: "gc-grant-management-requirements-npe",
    webhookEnv: "N8N_GRANT_ALLOCATION_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Award terms" },
    ],
  },
  {
    slug: "grant-funder-auto-review",
    title: "Funder Auto Review",
    subtitle: "Select applicants for this grant",
    audience: "funder",
    n8nPath: "gc-grant-funder-auto-review-npe",
    webhookEnv: "N8N_GRANT_AUTO_REVIEW_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Selection" },
    ],
  },
  {
    slug: "grant-mark-awarded",
    title: "Forward to Funder Review",
    subtitle: "Send this application for allocation",
    audience: "staff",
    n8nPath: "gc-grant-mark-awarded-npe",
    webhookEnv: "N8N_GRANT_MARK_AWARDED_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Confirm" },
    ],
  },
  {
    slug: "submit-expense",
    title: "Submit Expense",
    subtitle: "Request payment against an awarded grant",
    audience: "applicant",
    n8nPath: "gc-submit-expense-npe",
    webhookEnv: "N8N_EXPENSE_SUBMIT_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Expense" },
    ],
  },
  {
    slug: "review-expense",
    title: "Review Expense",
    subtitle: "Approve, reject, or request changes",
    audience: "staff",
    n8nPath: "gc-review-expense-npe",
    webhookEnv: "N8N_EXPENSE_REVIEW_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Decision" },
    ],
  },
  {
    slug: "bookkeeper-pay",
    title: "Record Payment",
    subtitle: "Record how this expense was paid",
    audience: "staff",
    n8nPath: "gc-bookkeeper-pay-npe",
    webhookEnv: "N8N_BOOKKEEPER_PAY_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Payment" },
    ],
  },
  {
    slug: "apply-extension",
    title: "Apply for Extension",
    subtitle: "Request a longer grant period",
    audience: "applicant",
    n8nPath: "gc-apply-extension-npe",
    webhookEnv: "N8N_EXTENSION_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Request" },
    ],
  },
  {
    slug: "extension-review",
    title: "Review Extension Request",
    subtitle: "Approve or deny a grant period extension",
    audience: "staff",
    n8nPath: "gc-extension-review-npe",
    webhookEnv: "N8N_EXTENSION_REVIEW_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Decision" },
    ],
  },
  {
    slug: "progress-report",
    title: "Progress Report",
    subtitle: "Submit a grant progress report",
    audience: "applicant",
    n8nPath: "gc-progress-report-npe",
    webhookEnv: "N8N_PROGRESS_REPORT_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Report" },
    ],
  },
  {
    slug: "vendor-application",
    title: "Vendor Application",
    subtitle: "Apply to become a vendor",
    audience: "applicant",
    n8nPath: "gc-vendor-application-npe",
    webhookEnv: "N8N_VENDOR_APPLICATION_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Vendor" },
    ],
  },
  {
    slug: "vendor-review",
    title: "Vendor Review",
    subtitle: "Approve, request W9, or close this vendor",
    audience: "staff",
    n8nPath: "gc-vendor-review-npe",
    webhookEnv: "N8N_VENDOR_REVIEW_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Decision" },
    ],
  },
  {
    slug: "vendor-w9",
    title: "Vendor W9",
    subtitle: "Upload the requested W9",
    audience: "applicant",
    n8nPath: "gc-vendor-w9-npe",
    webhookEnv: "N8N_VENDOR_W9_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Upload" },
    ],
  },
  {
    slug: "org-registration",
    title: "Organization Registration",
    subtitle: "Register an organization",
    audience: "applicant",
    n8nPath: "gc-org-registration-npe",
    webhookEnv: "N8N_ORG_REGISTRATION_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Organization" },
    ],
  },
  {
    slug: "org-activate",
    title: "Activate Organization",
    subtitle: "Activate a registered organization",
    audience: "staff",
    n8nPath: "gc-org-activate-npe",
    webhookEnv: "N8N_ORG_ACTIVATE_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Activate" },
    ],
  },
  {
    slug: "project-registration",
    title: "Project Registration",
    subtitle: "Register a project",
    audience: "applicant",
    n8nPath: "gc-project-registration-npe",
    webhookEnv: "N8N_PROJECT_REGISTRATION_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Project" },
    ],
  },
  {
    slug: "project-status",
    title: "Project Status",
    subtitle: "Update project status",
    audience: "staff",
    n8nPath: "gc-project-status-npe",
    webhookEnv: "N8N_PROJECT_STATUS_WEBHOOK_URL",
    steps: [
      { id: 1, label: "Your info" },
      { id: 2, label: "Status" },
    ],
  },
]

export function getForm(slug: string): FormDef | undefined {
  return FORMS.find((f) => f.slug === slug)
}

export function webhookUrl(form: FormDef): string {
  const override = form.webhookEnv ? process.env[form.webhookEnv] : ""
  // ponytail: never POST leftover /form/gf360-* or /webhook/gf360-* paths
  if (override && !/gf360-/.test(override)) return override
  const base = (process.env.N8N_BASE_URL || "https://360growth.io").replace(
    /\/+$/,
    ""
  )
  return `${base}/webhook/${form.n8nPath}`
}
