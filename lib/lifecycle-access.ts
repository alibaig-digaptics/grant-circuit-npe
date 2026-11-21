import { createHmac, timingSafeEqual } from 'node:crypto'

/** Each lifecycle form has one purpose and opens one Funder, staff, or seeker page. */
export const LIFECYCLE_PURPOSES = {
  forward: 'grant-mark-awarded',
  review: 'grant-funder-auto-review',
  allocation: 'grant-management-requirements',
  'extension-request': 'apply-extension',
  'extension-review': 'extension-review',
} as const

export type LifecyclePurpose = keyof typeof LIFECYCLE_PURPOSES

export function purposeForSlug(slug: string): LifecyclePurpose | null {
  const found = Object.entries(LIFECYCLE_PURPOSES).find(([, value]) => value === slug)
  return found ? (found[0] as LifecyclePurpose) : null
}

/** A signed link proves the person got the email. It opens one form for one grant. */
export function lifecycleToken(secret: string, purpose: LifecyclePurpose, grantId: string) {
  return createHmac('sha256', secret).update(`lifecycle|${purpose}|${grantId}`).digest('hex')
}

export function lifecycleTokenValid(secret: string, purpose: LifecyclePurpose, grantId: string, token: string) {
  if (!secret || !/^[a-f0-9]{64}$/.test(token)) return false
  return timingSafeEqual(Buffer.from(lifecycleToken(secret, purpose, grantId)), Buffer.from(token))
}

export function lifecycleLink(origin: string, secret: string, purpose: LifecyclePurpose, grantId: string) {
  const query = new URLSearchParams({ recordId: grantId, access: lifecycleToken(secret, purpose, grantId) })
  return `${origin.replace(/\/+$/, '')}/forms/${LIFECYCLE_PURPOSES[purpose]}?${query}`
}

export function lifecycleLinks(origin: string, secret: string, grantId: string) {
  return Object.fromEntries(
    (Object.keys(LIFECYCLE_PURPOSES) as LifecyclePurpose[]).map(purpose => [purpose, lifecycleLink(origin, secret, purpose, grantId)]),
  ) as Record<LifecyclePurpose, string>
}
