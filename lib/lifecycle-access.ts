import { createHmac, timingSafeEqual } from 'node:crypto'

/** Each lifecycle form has one purpose and opens one funder, staff, or seeker page. */
export const LIFECYCLE_PURPOSES = {
  forward: 'grant-mark-awarded',
  review: 'grant-funder-auto-review',
  allocation: 'grant-management-requirements',
  'extension-request': 'apply-extension',
  'extension-review': 'extension-review',
  'progress-report': 'progress-report',
  'submit-expense': 'submit-expense',
  'expense-review': 'review-expense',
  'expense-pay': 'bookkeeper-pay',
  'expense-confirm': 'confirm-payment',
} as const

export type LifecyclePurpose = keyof typeof LIFECYCLE_PURPOSES

/** These forms belong to one award, so their link is tied to the award, not the grant. */
export const AWARD_PURPOSES: LifecyclePurpose[] = ['extension-request', 'extension-review', 'progress-report', 'submit-expense']

/** These forms belong to one expense. */
export const EXPENSE_PURPOSES: LifecyclePurpose[] = ['expense-review', 'expense-pay', 'expense-confirm']

/** The id a link is tied to: the grant, an award, or an expense. */
export function scopeFor(purpose: LifecyclePurpose, grantId: string, subjectId: string) {
  return AWARD_PURPOSES.includes(purpose) || EXPENSE_PURPOSES.includes(purpose) ? subjectId : grantId
}

/** The query and body parameter that carries the subject id. */
export function subjectParam(purpose: LifecyclePurpose) {
  return EXPENSE_PURPOSES.includes(purpose) ? 'expense' : 'award'
}

export function purposeForSlug(slug: string): LifecyclePurpose | null {
  const found = Object.entries(LIFECYCLE_PURPOSES).find(([, value]) => value === slug)
  return found ? (found[0] as LifecyclePurpose) : null
}

/** A signed link proves the person got the email. It opens one form for one grant, or one award. */
export function lifecycleToken(secret: string, purpose: LifecyclePurpose, scopeId: string) {
  return createHmac('sha256', secret).update(`lifecycle|${purpose}|${scopeId}`).digest('hex')
}

export function lifecycleTokenValid(secret: string, purpose: LifecyclePurpose, scopeId: string, token: string) {
  if (!secret || !scopeId || !/^[a-f0-9]{64}$/.test(token)) return false
  return timingSafeEqual(Buffer.from(lifecycleToken(secret, purpose, scopeId)), Buffer.from(token))
}

export function lifecycleLink(origin: string, secret: string, purpose: LifecyclePurpose, grantId: string, subjectId = '') {
  const query = new URLSearchParams({ recordId: grantId })
  if (AWARD_PURPOSES.includes(purpose) || EXPENSE_PURPOSES.includes(purpose)) query.set(subjectParam(purpose), subjectId)
  query.set('access', lifecycleToken(secret, purpose, scopeFor(purpose, grantId, subjectId)))
  return `${origin.replace(/\/+$/, '')}/forms/${LIFECYCLE_PURPOSES[purpose]}?${query}`
}

/** Grant links always. Award links only with an award id. Expense links only with an expense id. */
export function lifecycleLinks(origin: string, secret: string, grantId: string, awardId = '', expenseId = '') {
  const out: Record<string, string> = {}
  for (const purpose of Object.keys(LIFECYCLE_PURPOSES) as LifecyclePurpose[]) {
    if (AWARD_PURPOSES.includes(purpose) && !awardId) continue
    if (EXPENSE_PURPOSES.includes(purpose) && !expenseId) continue
    out[purpose] = lifecycleLink(origin, secret, purpose, grantId, EXPENSE_PURPOSES.includes(purpose) ? expenseId : awardId)
  }
  return out as Record<LifecyclePurpose, string>
}
