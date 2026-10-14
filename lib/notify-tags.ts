/** Event tags — no brand prefix. GHL lowercases these. */
export const EVENT_TAGS = {
  grantApplicationCreated: "grant-application-created",
  grantApplicationSubmitted: "grant-application-submitted",
  grantApplicationIncomplete: "grant-application-incomplete",
  grantReadyForAutoReview: "grant-ready-for-auto-review",
  grantSelectedApplicants: "grant-selected-applicants",
  grantUnderReview: "grant-under-review",
  grantAwarded: "grant-awarded",
  grantActive: "grant-active",
  grantReportingDue: "grant-reporting-due",
  grantProgressSubmitted: "grant-progress-submitted",
  grantPrepForClosing: "grant-prep-for-closing",
  extensionRequestReceived: "extension-request-received",
  extensionAwarded: "extension-awarded",
  extensionDenied: "extension-denied",
  grantClosed: "grant-closed",
  vendorApplicationReceived: "vendor-application-received",
  vendorW9Requested: "vendor-w9-requested",
  expenseNeedsRevision: "expense-needs-revision",
  expenseApproved: "expense-approved",
  expenseSentToBookkeeper: "expense-sent-to-bookkeeper",
  expensePaid: "expense-paid",
  newOrganizationSignup: "new-organization-signup",
  organizationActivated: "organization-activated",
  projectRegistered: "project-registered",
  projectStatusUpdated: "project-status-updated",
} as const

export const TYPE_TO_TAG: Record<string, string> = {
  "Grant Application Created": EVENT_TAGS.grantApplicationCreated,
  "Grant Application Submitted": EVENT_TAGS.grantApplicationSubmitted,
  "Grant Application Incomplete": EVENT_TAGS.grantApplicationIncomplete,
  "Grant Ready for Auto Review": EVENT_TAGS.grantReadyForAutoReview,
  "Grant Under Review": EVENT_TAGS.grantUnderReview,
  "Grant Awarded": EVENT_TAGS.grantAwarded,
  "Grant Active": EVENT_TAGS.grantActive,
  "Grant Reporting Due": EVENT_TAGS.grantReportingDue,
  "Grant Prep for Closing": EVENT_TAGS.grantPrepForClosing,
  "Extension Request Received": EVENT_TAGS.extensionRequestReceived,
  "Extension Awarded": EVENT_TAGS.extensionAwarded,
  "Grant Closed": EVENT_TAGS.grantClosed,
  "Vendor Application Received": EVENT_TAGS.vendorApplicationReceived,
  "Needs Revision": EVENT_TAGS.expenseNeedsRevision,
  "Approved": EVENT_TAGS.expenseApproved,
  "Sent to Bookkeeper": EVENT_TAGS.expenseSentToBookkeeper,
  "Paid": EVENT_TAGS.expensePaid,
}

export const SIMPLE_FIELDS = {
  lastAction: "last_action",
  pendingAction: "pending_action",
  orgName: "org_name",
  expenseId: "expense_id",
  expenseAmount: "expense_amount",
} as const

export function tagForForm(
  slug: string,
  values: Record<string, unknown>
): string {
  if (slug === "grant-rfp") return EVENT_TAGS.grantApplicationCreated
  if (slug === "grant-applicant-submit") {
    const mode = String(values.submitMode || values.whatDoYouWantToDo || "")
    if (/save|later|incomplete/i.test(mode)) {
      return EVENT_TAGS.grantApplicationIncomplete
    }
    return EVENT_TAGS.grantApplicationSubmitted
  }
  if (slug === "grant-management-requirements") return EVENT_TAGS.grantAwarded
  // After selection — Form B owns grant-ready-for-auto-review
  if (slug === "grant-funder-auto-review") return EVENT_TAGS.grantSelectedApplicants
  if (slug === "grant-mark-awarded") return EVENT_TAGS.grantUnderReview
  if (slug === "submit-expense") return "expense-submitted"
  if (slug === "review-expense") {
    const d = String(values.decision || values.reviewDecision || "")
    if (/reject/i.test(d)) return "expense-rejected"
    if (/revis/i.test(d)) return EVENT_TAGS.expenseNeedsRevision
    return EVENT_TAGS.expenseApproved
  }
  if (slug === "bookkeeper-pay") return EVENT_TAGS.expensePaid
  if (slug === "apply-extension") return EVENT_TAGS.extensionRequestReceived
  if (slug === "extension-review") {
    return /deny/i.test(String(values.extensionDecision || ""))
      ? EVENT_TAGS.extensionDenied
      : EVENT_TAGS.extensionAwarded
  }
  if (slug === "progress-report") return EVENT_TAGS.grantProgressSubmitted
  if (slug === "vendor-application") return EVENT_TAGS.vendorApplicationReceived
  if (slug === "vendor-review") return EVENT_TAGS.vendorW9Requested
  if (slug === "vendor-w9") return "vendor-w9-uploaded"
  if (slug === "org-registration") return EVENT_TAGS.newOrganizationSignup
  if (slug === "org-activate") return EVENT_TAGS.organizationActivated
  if (slug === "project-registration") return EVENT_TAGS.projectRegistered
  if (slug === "project-status") return EVENT_TAGS.projectStatusUpdated
  return "form-submitted"
}
