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
export type SubmitResult = { error: string; status: number } | { error: null; extra: Record<string, unknown> }

const refuse = (error: string, status = 400): SubmitResult => ({ error, status })

const text = (value: unknown) => String(value ?? '').trim()
const number = (value: unknown) => Number(value ?? 0) || 0

function pickApplicant(list: Applicant[], chosen: unknown) {
  return list.find(item => item.id === text(chosen)) ?? null
}

function applicantFields(applicant: Applicant) {
  return { applicantId: applicant.id, applicantEmail: applicant.email, applicantName: applicant.name, applicantOrganization: applicant.organization }
}

/**
 * Checks a lifecycle form against the grant record before anything is sent to n8n,
 * and returns the trusted values n8n should use instead of what the form typed.
 */
export function evaluateLifecycleSubmit(slug: string, grant: GrantProps, body: Record<string, unknown>, today: string): SubmitResult {
  const method = text(grant.review_method) || 'admin'
  const status = text(grant.status)
  const base = { grantName: text(grant.grant_name), reviewMethod: method, currentEnd: text(grant.end_date).slice(0, 10), today }

  if (slug === 'grant-mark-awarded' || slug === 'grant-funder-auto-review') {
    const adminReview = slug === 'grant-mark-awarded'
    if (adminReview && method !== 'admin') return refuse('This grant is not reviewed by the admin team.')
    if (!adminReview && method === 'admin') return refuse('This grant is reviewed by the admin team, who forward applicants to the funder.')
    if (['awarded', 'active', 'closed', 'cancelled'].includes(status)) return refuse('This grant has already been awarded or closed.')
    const applicant = pickApplicant(parseApplicants(grant.applicants), body.applicant)
    if (!applicant) return refuse('Choose an applicant.')
    if (parseApplicants(grant.vetted_applicants).some(item => item.id === applicant.id)) return refuse('This applicant was already sent to the funder.')
    return { error: null, extra: { ...base, ...applicantFields(applicant) } }
  }

  if (slug === 'grant-management-requirements') {
    if (['awarded', 'active', 'closed', 'cancelled'].includes(status) || text(grant.awarded_applicant)) return refuse('This grant has already been awarded.')
    const applicant = pickApplicant(parseApplicants(grant.vetted_applicants), body.applicant)
    if (!applicant) return refuse('Choose one of the vetted applicants.')
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
      },
    }
  }

  if (slug === 'apply-extension') {
    const awarded = parseApplicants([safeJson(grant.awarded_applicant)])[0]
    if (!awarded || text(body.email).toLowerCase() !== awarded.email) return refuse('Only the seeker who was awarded this grant can ask for an extension.', 403)
    if (status !== 'active' && status !== 'awarded') return refuse('This grant is not open for an extension request.')
    if (text(grant.extension_status) === 'requested') return refuse('An extension request is already waiting for the funder.')
    const problem = extensionRequestError({ currentEnd: base.currentEnd, requestedEnd: body.requestedEndDate })
    if (problem) return refuse(problem)
    return { error: null, extra: { ...base, ...applicantFields(awarded) } }
  }

  if (slug === 'extension-review') {
    if (text(grant.extension_status) !== 'requested') return refuse('There is no extension request waiting for a decision.')
    const awarded = parseApplicants([safeJson(grant.awarded_applicant)])[0]
    if (!awarded) return refuse('This grant has no awarded applicant.')
    const decision = /deny|reject/i.test(text(body.extensionDecision)) ? 'deny' : /approve/i.test(text(body.extensionDecision)) ? 'approve' : ''
    if (!decision) return refuse('Choose approve or deny.')
    const requestedEnd = text(grant.extension_requested_end_date).slice(0, 10)
    let approved: string | null = null
    if (decision === 'approve') {
      const result = approvedEndDate({ requestedEnd, newEnd: body.newEndDate, currentEnd: base.currentEnd })
      if (result.error) return refuse(result.error)
      approved = result.date
    }
    return { error: null, extra: { ...base, ...applicantFields(awarded), decision, requestedEnd, approvedEnd: approved } }
  }

  return { error: null, extra: {} }
}

function safeJson(value: unknown) {
  if (typeof value !== 'string') return value
  try { return JSON.parse(value || 'null') } catch { return null }
}
