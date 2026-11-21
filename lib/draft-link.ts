import { createHmac, timingSafeEqual } from 'node:crypto'

/** A draft link proves the person got the saved-draft email. It is tied to one email and one grant. */
export function draftToken(secret: string, email: string, grantId: string) {
  return createHmac('sha256', secret).update(`draft|${email.trim().toLowerCase()}|${grantId}`).digest('hex')
}

export function draftTokenValid(secret: string, email: string, grantId: string, token: string) {
  if (!secret || !/^[a-f0-9]{64}$/.test(token)) return false
  return timingSafeEqual(Buffer.from(draftToken(secret, email, grantId)), Buffer.from(token))
}

export function draftLink(origin: string, secret: string, email: string, grantId: string) {
  const query = new URLSearchParams({ recordId: grantId, email: email.trim().toLowerCase(), draft: draftToken(secret, email, grantId) })
  return `${origin.replace(/\/+$/, '')}/forms/grant-applicant-submit?${query}`
}
