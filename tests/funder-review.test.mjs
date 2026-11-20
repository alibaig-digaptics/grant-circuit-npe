import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const id = '6b009a151b99ee6387b31f90'
const token = 'a'.repeat(64)
const hash = createHash('sha256').update(token).digest('hex')
const now = Date.parse('2026-11-20T15:00:00Z')

test('staff review requires a matching token on a pending funder and expires after a week', async () => {
  const { reviewAllowed } = await import('../lib/funder-review.ts')
  const record = { id, createdAt: new Date(now).toISOString(), properties: { party_role: 'funder', approval_status: 'pending', funder_review_token_hash: hash } }
  assert.equal(reviewAllowed(record, token, now), true)
  assert.equal(reviewAllowed(record, 'b'.repeat(64), now), false)
  assert.equal(reviewAllowed(record, token, now + 7 * 86400000), false)
  assert.equal(reviewAllowed({...record, properties: {...record.properties, approval_status: 'approved'}}, token, now), false)
})

test('both supported decisions map to explicit CRM state', async () => {
  const { reviewState } = await import('../lib/funder-review.ts')
  assert.deepEqual(reviewState('accept'), { approval_status: 'approved', status: 'active' })
  assert.deepEqual(reviewState('reject'), { approval_status: 'rejected', status: 'inactive' })
  assert.equal(reviewState(''), null)
})

test('the funder signup has real types only and does not ask for an existing organization', () => {
  const forms = JSON.parse(readFileSync(new URL('../lib/generated-fields.json', import.meta.url)))
  const fields = forms['funder-registration'].flatMap(step => step.fields)
  assert.equal(fields.find(field => field.name === 'organizationName').type, 'text')
  const types = fields.find(field => field.name === 'organizationType').options
  assert.ok(types.some(option => option.value === 'community_foundation'))
  assert.ok(!types.some(option => option.value === 'other'))
})

test('personalized links only hydrate editable contact details', async () => {
  const { funderPrefill } = await import('../lib/funder-prefill.ts')
  const input = new URLSearchParams('firstName=Morgan&email=morgan%40example.com&organizationName=Sample&recordId=untrusted&approval_status=approved')
  assert.deepEqual(funderPrefill(input), { firstName: 'Morgan', email: 'morgan@example.com', organizationName: 'Sample' })
  assert.deepEqual(funderPrefill(new URLSearchParams()), {})
})
