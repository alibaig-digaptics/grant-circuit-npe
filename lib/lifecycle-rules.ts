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
