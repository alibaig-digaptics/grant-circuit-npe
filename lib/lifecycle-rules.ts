/** Pure award, extension, and date rules. The grant record reads live in the route. */
export type Applicant = { id: string; name: string; email: string; organization: string }

export const BUDGET_CATEGORIES = ['personnel', 'events', 'supplies', 'travel', 'marketing', 'consulting', 'equipment', 'other']
export const CADENCE_MONTHS = [3, 6, 8]
export const TIME_ZONE = 'America/Chicago'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function parseApplicants(raw: unknown): Applicant[] {
  let list: unknown = raw
  if (typeof raw === 'string') {
    try { list = JSON.parse(raw || '[]') } catch { return [] }
  }
  if (!Array.isArray(list)) return []
  return list
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map(row => ({
      id: String(row.id ?? ''),
      name: String(row.name ?? ''),
      email: String(row.email ?? '').trim().toLowerCase(),
      organization: String(row.organization ?? ''),
    }))
    .filter(row => row.id && row.email)
}

export function applicantLabel(applicant: Applicant) {
  return applicant.organization ? `${applicant.name} (${applicant.organization})` : applicant.name
}

/** Today's date in the account time zone, as YYYY-MM-DD. */
export function todayInZone(now = new Date(), zone = TIME_ZONE) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

export function cadenceMonths(value: unknown): number | null {
  const match = String(value ?? '').match(/\b(3|6|8)\b/)
  return match ? Number(match[1]) : null
}

export function isDate(value: unknown): value is string {
  return typeof value === 'string' && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value))
}

export function parseCategories(value: unknown): string[] {
  const list = Array.isArray(value) ? value : String(value ?? '').split(/[,\n]/)
  return list.map(item => String(item).trim().toLowerCase()).filter(Boolean)
}

export type AllocationInput = {
  ceiling: number
  amount: number
  start: unknown
  end: unknown
  cadence: unknown
  categories: unknown
}

/** The first thing wrong with an allocation, or null when it can go ahead. */
export function allocationError(input: AllocationInput): string | null {
  if (!(input.amount > 0)) return 'Enter the award amount.'
  if (input.ceiling > 0 && input.amount > input.ceiling) return `The award amount cannot be more than the grant amount of $${input.ceiling.toLocaleString('en-US')}.`
  if (!isDate(input.start)) return 'Enter the start date.'
  if (!isDate(input.end)) return 'Enter the end date.'
  if (input.end <= input.start) return 'The end date must be after the start date.'
  const categories = parseCategories(input.categories)
  if (!categories.length) return 'Choose at least one allowed budget category.'
  if (categories.some(category => !BUDGET_CATEGORIES.includes(category))) return 'Choose budget categories from the list.'
  const hasCadence = String(input.cadence ?? '').trim() !== ''
  if (hasCadence && !cadenceMonths(input.cadence)) return 'Progress reports are every 3, 6, or 8 months.'
  return null
}

/** A start date after today is Awarded. Today or earlier is Active now. */
export function awardStage(start: string, today: string) {
  return start > today ? 'awarded' : 'active'
}

export function extensionRequestError(input: { currentEnd: unknown; requestedEnd: unknown }): string | null {
  if (!isDate(input.requestedEnd)) return 'Enter the new end date you are asking for.'
  if (isDate(input.currentEnd) && input.requestedEnd <= input.currentEnd) return 'The new end date must be after the current end date.'
  return null
}

/** Approving with a blank date keeps the date the seeker asked for. */
export function approvedEndDate(input: { requestedEnd: unknown; newEnd: unknown; currentEnd: unknown }): { date: string | null; error: string | null } {
  const chosen = isDate(input.newEnd) ? input.newEnd : isDate(input.requestedEnd) ? input.requestedEnd : null
  if (!chosen) return { date: null, error: 'There is no end date to approve.' }
  if (isDate(input.currentEnd) && chosen <= input.currentEnd) return { date: null, error: 'The new end date must be after the current end date.' }
  return { date: chosen, error: null }
}

/** Whole days from one date to another, both as YYYY-MM-DD. */
export function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000)
}

export type GrantProps = Record<string, unknown>
export type Award = {
  id: string
  applicantId: string
  email: string
  name: string
  organization: string
  status: string
  endDate: string
  extensionStatus: string
  requestedEnd: string
  extensionReason: string
  allowedCategories: string[]
  remaining: number
  grantId: string
}
export type SubmitResult = { error: string; status: number } | { error: null; extra: Record<string, unknown> }

const refuse = (error: string, status = 400): SubmitResult => ({ error, status })
const text = (value: unknown) => String(value ?? '').trim()
const number = (value: unknown) => Number(value ?? 0) || 0

/** An award record as the rules need it. */
export function awardFromRecord(record: { id: string; properties: Record<string, unknown> }): Award {
  const p = record.properties
  return {
    id: record.id,
    applicantId: text(p.applicant_id),
    email: text(p.applicant_email).toLowerCase(),
    name: text(p.applicant_name),
    organization: text(p.applicant_organization),
    status: text(p.status),
    endDate: text(p.end_date).slice(0, 10),
    extensionStatus: text(p.extension_status),
    requestedEnd: text(p.extension_requested_end_date).slice(0, 10),
    extensionReason: text(p.extension_reason),
    allowedCategories: parseCategories(p.allowed_budget_categories),
    remaining: number(p.remaining_balance),
    grantId: text(p.grant_id),
  }
}

/** How many awards a grant may make. Undetermined has no limit. */
export function awardLimit(numberOfAwards: unknown) {
  const n = Number(text(numberOfAwards))
  return Number.isInteger(n) && n > 0 ? n : Infinity
}

const liveAwards = (awards: Award[]) => awards.filter(item => item.status !== 'cancelled')

function pickApplicant(list: Applicant[], chosen: unknown) {
  return list.find(item => item.id === text(chosen)) ?? null
}

function applicantFields(a: { id?: string; applicantId?: string; name: string; email: string; organization: string }) {
  return { applicantId: a.applicantId ?? a.id ?? '', applicantEmail: a.email, applicantName: a.name, applicantOrganization: a.organization }
}

/**
 * Checks a lifecycle form against the grant and its awards before anything is sent to n8n,
 * and returns the trusted values n8n should use instead of what the form typed.
 */
export function evaluateLifecycleSubmit(slug: string, grant: GrantProps, body: Record<string, unknown>, today: string, awards: Award[] = []): SubmitResult {
  const method = text(grant.review_method) || 'admin'
  const base = { grantName: text(grant.grant_name), reviewMethod: method, today }
  if (['cancelled'].includes(text(grant.listing_status))) return refuse('This grant was cancelled.')

  if (slug === 'grant-mark-awarded' || slug === 'grant-funder-auto-review') {
    const adminReview = slug === 'grant-mark-awarded'
    if (adminReview && method !== 'admin') return refuse('This grant is not reviewed by the admin team.')
    if (!adminReview && method === 'admin') return refuse('This grant is reviewed by the admin team, who forward applicants to the funder.')
    const applicant = pickApplicant(parseApplicants(grant.applicants), body.applicant)
    if (!applicant) return refuse('Choose an applicant.')
    if (liveAwards(awards).some(item => item.applicantId === applicant.id)) return refuse('This applicant was already awarded.')
    if (parseApplicants(grant.vetted_applicants).some(item => item.id === applicant.id)) return refuse('This applicant was already sent to the funder.')
    return { error: null, extra: { ...base, ...applicantFields(applicant) } }
  }

  if (slug === 'grant-management-requirements') {
    const applicant = pickApplicant(parseApplicants(grant.vetted_applicants), body.applicant)
    if (!applicant) return refuse('Choose one of the vetted applicants.')
    if (liveAwards(awards).some(item => item.applicantId === applicant.id)) return refuse('This applicant was already awarded.')
    const limit = awardLimit(grant.number_of_awards)
    if (liveAwards(awards).length >= limit) return refuse('All of the awards for this grant were already given.')
    const problem = allocationError({
      ceiling: number(grant.award_amount),
      amount: number(body.awardAmount),
      start: body.startDate,
      end: body.endDate,
      cadence: body.progressReportCadence,
      categories: body.budgetCategories,
    })
    if (problem) return refuse(problem)
    return {
      error: null,
      extra: {
        ...base,
        ...applicantFields(applicant),
        awardAmount: number(body.awardAmount),
        awardStage: awardStage(text(body.startDate), today),
        cadenceMonths: cadenceMonths(body.progressReportCadence),
        categories: parseCategories(body.budgetCategories),
        limitReached: liveAwards(awards).length + 1 >= limit,
      },
    }
  }

  const award = awards.find(item => item.id === text(body.award)) ?? null

  if (slug === 'apply-extension') {
    if (!award || award.status === 'cancelled') return refuse('We could not find your award for this grant.', 403)
    if (text(body.email).toLowerCase() !== award.email) return refuse('Only the seeker who was awarded this grant can ask for an extension.', 403)
    if (award.status !== 'active' && award.status !== 'awarded') return refuse('This award is not open for an extension request.')
    if (award.extensionStatus === 'requested') return refuse('An extension request is already waiting for the funder.')
    const problem = extensionRequestError({ currentEnd: award.endDate, requestedEnd: body.requestedEndDate })
    if (problem) return refuse(problem)
    return { error: null, extra: { ...base, ...applicantFields(award), awardId: award.id, currentEnd: award.endDate } }
  }

  if (slug === 'extension-review') {
    if (!award) return refuse('We could not find this award.', 403)
    if (award.extensionStatus !== 'requested') return refuse('There is no extension request waiting for a decision.')
    const decision = /deny|reject/i.test(text(body.extensionDecision)) ? 'deny' : /approve/i.test(text(body.extensionDecision)) ? 'approve' : ''
    if (!decision) return refuse('Choose approve or deny.')
    let approved: string | null = null
    if (decision === 'approve') {
      const result = approvedEndDate({ requestedEnd: award.requestedEnd, newEnd: body.newEndDate, currentEnd: award.endDate })
      if (result.error) return refuse(result.error)
      approved = result.date
    }
    return { error: null, extra: { ...base, ...applicantFields(award), awardId: award.id, currentEnd: award.endDate, decision, requestedEnd: award.requestedEnd, approvedEnd: approved } }
  }

  if (slug === 'progress-report') {
    if (!award || award.status !== 'active') return refuse('This award is not open for a progress report.', 403)
    if (!text(body.reportNarrative)) return refuse('Write a short summary of your progress.')
    return { error: null, extra: { ...base, ...applicantFields(award), awardId: award.id } }
  }

  return { error: null, extra: {} }
}


// ---------- Expenses ----------
export const INSTANT_METHODS = ['wire', 'ach', 'credit card']
export const PAYMENT_METHODS = ['Wire', 'ACH', 'Credit Card', 'Check', 'Hand Delivery', 'Mail', 'Other']

export type Expense = {
  id: string
  status: string
  awardId: string
  applicantId: string
  applicantEmail: string
  applicantName: string
  amount: number
  description: string
  paymentKind: string
}

export function expenseFromRecord(record: { id: string; properties: Record<string, unknown> }): Expense {
  const p = record.properties
  return {
    id: record.id,
    status: text(p.status),
    awardId: text(p.award_id),
    applicantId: text(p.applicant_id),
    applicantEmail: text(p.applicant_email).toLowerCase(),
    applicantName: text(p.applicant_name),
    amount: number(p.amount),
    description: text(p.descriptions),
    paymentKind: text(p.payment_kind),
  }
}

/** Wire, ACH, and card are instant. Check, hand delivery, mail, and anything else are in transit. */
export function isInstantMethod(method: unknown) {
  return INSTANT_METHODS.includes(text(method).toLowerCase())
}

export type ExpenseSubmitContext = { award: Award | null; milestones: string[]; vendors: { id: string; name: string }[] }

export function expenseSubmitError(ctx: ExpenseSubmitContext, body: Record<string, unknown>, today: string): { error: string; status: number } | { error: null; extra: Record<string, unknown> } {
  const bad = (error: string, status = 400) => ({ error, status })
  const award = ctx.award
  if (!award || award.status === 'cancelled') return bad('We could not find your award for this grant.', 403)
  if (text(body.email).toLowerCase() !== award.email) return bad('Only the seeker who was awarded this grant can file expenses.', 403)
  if (award.status !== 'active') return bad('Expenses can be filed once the grant is active.')
  const milestone = text(body.milestone)
  if (!ctx.milestones.includes(milestone)) return bad('Choose one of the milestones from your application.')
  const category = text(body.budgetCategory).toLowerCase()
  if (!award.allowedCategories.includes(category)) return bad('Choose one of the budget categories this grant allows.')
  const amount = number(body.amount)
  if (!(amount > 0)) return bad('Enter the amount.')
  if (amount > award.remaining) return bad(`This is more than the $${award.remaining.toLocaleString('en-US')} left on the grant.`)
  if (!text(body.description)) return bad('Describe the expense.')
  const kind = /future/i.test(text(body.paymentKind)) ? 'future_payment' : /reimb/i.test(text(body.paymentKind)) ? 'reimbursement' : ''
  if (!kind) return bad('Choose reimbursement or future payment.')
  const receipts = Array.isArray(body.receipt) ? body.receipt.map(text).filter(Boolean) : []
  const quotes = Array.isArray(body.quoteProposal) ? body.quoteProposal.map(text).filter(Boolean) : []
  if (kind === 'reimbursement') {
    if (!isDate(body.expenseDate) || body.expenseDate > today) return bad('Enter the date you paid. It cannot be in the future.')
    if (!receipts.length) return bad('Attach the receipt.')
  } else if (!quotes.length) return bad('Attach the vendor quote.')
  const vendorChoice = text(body.vendor)
  const vendor = ctx.vendors.find(v => v.id === vendorChoice) ?? null
  const outside = text(body.outsideVendorName)
  if (!vendor && !outside) return bad('Choose a vendor, or type the name of an outside vendor.')
  return {
    error: null,
    extra: {
      awardId: award.id, applicantId: award.applicantId, applicantEmail: award.email, applicantName: award.name, applicantOrganization: award.organization,
      grantId: award.grantId, milestoneName: milestone, budgetCategory: category, amountNumber: amount, paymentKindKey: kind,
      vendorId: vendor?.id ?? '', payeeName: vendor?.name ?? outside, receiptUrls: receipts, quoteUrls: quotes, today,
    },
  }
}

export function expenseReviewError(expense: Expense | null, body: Record<string, unknown>) {
  const bad = (error: string, status = 400) => ({ error, status })
  if (!expense) return bad('We could not find this expense.', 403)
  if (expense.status !== 'under_review') return bad('This expense is not waiting for a review.')
  const d = text(body.decision)
  const decision = /reject|deny/i.test(d) ? 'reject' : /change|revis/i.test(d) ? 'changes' : /approve/i.test(d) ? 'approve' : ''
  if (!decision) return bad('Choose approve, request changes, or reject.')
  if (decision !== 'approve' && !text(body.notes)) return bad('Write a note for the seeker.')
  return { error: null as null, extra: { expenseId: expense.id, decision, applicantId: expense.applicantId, applicantEmail: expense.applicantEmail, applicantName: expense.applicantName, amountNumber: expense.amount, awardId: expense.awardId } }
}

export function expensePayError(expense: Expense | null, body: Record<string, unknown>, today: string) {
  const bad = (error: string, status = 400) => ({ error, status })
  if (!expense) return bad('We could not find this expense.', 403)
  if (expense.status !== 'sent_to_bookkeeper') return bad('This expense is not waiting for a payment record.')
  const method = text(body.paymentMethod)
  if (!PAYMENT_METHODS.map(m => m.toLowerCase()).includes(method.toLowerCase())) return bad('Choose how it was paid.')
  if (!isDate(body.paymentDate) || body.paymentDate > today) return bad('Enter the payment date. It cannot be in the future.')
  if (!text(body.paymentRef)) return bad('Enter the payment reference.')
  return { error: null as null, extra: { expenseId: expense.id, instant: isInstantMethod(method), methodKey: method.toLowerCase(), applicantId: expense.applicantId, applicantEmail: expense.applicantEmail, applicantName: expense.applicantName, amountNumber: expense.amount, awardId: expense.awardId } }
}

export function expenseConfirmError(expense: Expense | null, body: Record<string, unknown>) {
  const bad = (error: string, status = 400) => ({ error, status })
  if (!expense) return bad('We could not find this expense.', 403)
  if (text(body.email).toLowerCase() !== expense.applicantEmail) return bad('Only the seeker who filed this expense can confirm it.', 403)
  if (expense.status !== 'payment_in_progress') return bad('This payment is not waiting for your confirmation.')
  if (!text(body.received)) return bad('Tick the box to confirm you received the payment.')
  return { error: null as null, extra: { expenseId: expense.id, applicantId: expense.applicantId, applicantEmail: expense.applicantEmail, applicantName: expense.applicantName, amountNumber: expense.amount, awardId: expense.awardId } }
}


// ---------- Vendor work ----------
export type WorkItem = {
  id: string
  stage: string
  kind: string
  vendorId: string
  vendorName: string
  vendorEmail: string
  vendorContactId: string
  awardId: string
  grantId: string
  applicantId: string
  applicantEmail: string
  applicantName: string
  title: string
  amount: number
}

export function workFromRecord(record: { id: string; properties: Record<string, unknown> }): WorkItem {
  const p = record.properties
  return {
    id: record.id,
    stage: text(p.stage),
    kind: text(p.kind),
    vendorId: text(p.vendor_id),
    vendorName: text(p.vendor_name),
    vendorEmail: text(p.vendor_email).toLowerCase(),
    vendorContactId: text(p.vendor_contact_id),
    awardId: text(p.award_id),
    grantId: text(p.funding_source_id),
    applicantId: text(p.applicant_id),
    applicantEmail: text(p.applicant_email).toLowerCase(),
    applicantName: text(p.applicant_name),
    title: text(p.work_name),
    amount: number(p.amount),
  }
}

export type ActiveVendor = { id: string; name: string; email: string }

/** The steps a vendor may take, in order. Each one names the stages it may start from and the stage it leads to. */
export const WORK_ACTIONS: Record<string, { label: string; from: string[]; to: string; needsAmount?: boolean }> = {
  accept: { label: 'Accept this request', from: ['proposal_request', 'work_order_request'], to: 'accepted' },
  decline: { label: 'Decline this request', from: ['proposal_request', 'work_order_request'], to: 'declined' },
  request_down_payment: { label: 'Request a down payment', from: ['accepted'], to: 'down_payment_requested', needsAmount: true },
  start_work: { label: 'Start the work', from: ['accepted', 'down_payment_requested'], to: 'work_in_progress' },
  deliver: { label: 'Mark the work delivered', from: ['work_in_progress'], to: 'delivered' },
  request_final: { label: 'Request the final payment', from: ['delivered'], to: 'final_payment_requested', needsAmount: true },
  final_received: { label: 'Confirm the final payment arrived', from: ['final_payment_requested'], to: 'final_payment_received' },
  close: { label: 'Close this work', from: ['final_payment_received'], to: 'closed' },
}

export function workActionsFor(stage: string) {
  return Object.entries(WORK_ACTIONS).filter(([, a]) => a.from.includes(stage)).map(([value, a]) => ({ value, label: a.label }))
}

export type WorkRequestContext = { award: Award | null; vendors: ActiveVendor[] }

export function workRequestError(kind: 'proposal_request' | 'work_order', ctx: WorkRequestContext, body: Record<string, unknown>, today: string): { error: string; status: number } | { error: null; extra: Record<string, unknown> } {
  const bad = (error: string, status = 400) => ({ error, status })
  const award = ctx.award
  if (!award || award.status === 'cancelled') return bad('We could not find your award for this grant.', 403)
  if (text(body.email).toLowerCase() !== award.email) return bad('Only the seeker who was awarded this grant can send work to a vendor.', 403)
  if (award.status !== 'active') return bad('You can send work once the grant is active.')
  const vendor = ctx.vendors.find(v => v.id === text(body.vendor))
  if (!vendor) return bad('Choose an approved vendor.')
  if (!text(body.title)) return bad('Give the work a short title.')
  if (!text(body.description)) return bad(kind === 'work_order' ? 'Describe the work.' : 'Describe what you need a proposal for.')
  const needed = text(body.neededBy).slice(0, 10)
  if (needed && (!isDate(needed) || needed < today)) return bad('Enter a date that is not in the past.')
  const amount = number(body.amount)
  if (kind === 'work_order') {
    if (!(amount > 0)) return bad('Enter the amount you agreed.')
    if (amount > award.remaining) return bad(`This is more than the $${award.remaining.toLocaleString('en-US')} left on the grant.`)
  } else if (body.amount !== undefined && text(body.amount) !== '' && !(amount >= 0)) return bad('Enter a valid budget.')
  const files = Array.isArray(body.attachments) ? body.attachments.map(text).filter(Boolean) : []
  return {
    error: null,
    extra: {
      kind, awardId: award.id, grantId: award.grantId, applicantId: award.applicantId, applicantEmail: award.email, applicantName: award.name, applicantOrganization: award.organization,
      vendorId: vendor.id, vendorName: vendor.name, vendorEmail: vendor.email, title: text(body.title), amountNumber: amount, neededByDate: needed, attachmentUrls: files, today,
    },
  }
}

export function workUpdateError(work: WorkItem | null, body: Record<string, unknown>): { error: string; status: number } | { error: null; extra: Record<string, unknown> } {
  const bad = (error: string, status = 400) => ({ error, status })
  if (!work) return bad('We could not find this work.', 403)
  if (text(body.email).toLowerCase() !== work.vendorEmail) return bad('Only the vendor this work was sent to can update it.', 403)
  const key = text(body.action)
  const action = WORK_ACTIONS[key]
  if (!action || !action.from.includes(work.stage)) return bad('That step is not available right now.')
  const amount = number(body.amount)
  if (action.needsAmount && !(amount > 0)) return bad('Enter the amount.')
  const files = Array.isArray(body.attachments) ? body.attachments.map(text).filter(Boolean) : []
  if (key === 'accept' && work.kind === 'proposal_request' && !(amount > 0) && !files.length) return bad('Add your proposal: an amount, a file, or both.')
  return {
    error: null,
    extra: {
      workId: work.id, actionKey: key, nextStage: action.to, previousStage: work.stage, amountNumber: amount, attachmentUrls: files,
      vendorId: work.vendorId, vendorName: work.vendorName, vendorEmail: work.vendorEmail, vendorContactId: work.vendorContactId,
      applicantId: work.applicantId, applicantEmail: work.applicantEmail, applicantName: work.applicantName, awardId: work.awardId, grantId: work.grantId, title: work.title, kind: work.kind,
    },
  }
}
