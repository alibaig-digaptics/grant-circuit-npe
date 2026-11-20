const contactFields = ['firstName', 'lastName', 'email', 'phone', 'organizationName'] as const

export function funderPrefill(params: Pick<URLSearchParams, 'get'>) {
  return Object.fromEntries(contactFields.flatMap(key => {
    const value = params.get(key)?.trim()
    return value ? [[key, value.slice(0, key === 'email' ? 254 : 160)]] : []
  }))
}

export const funderAutocomplete: Record<string, string> = {
  firstName: 'given-name', lastName: 'family-name', email: 'email', phone: 'tel',
  organizationName: 'organization', website: 'url',
}
