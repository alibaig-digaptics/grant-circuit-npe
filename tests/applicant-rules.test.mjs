import test from 'node:test'
import assert from 'node:assert/strict'

test('milestones: empty rows are dropped and a row without a name is refused', async () => {
  const { sanitizeMilestones } = await import('../lib/milestones.ts')
  assert.deepEqual(sanitizeMilestones(undefined), { milestones: [], error: null })
  assert.deepEqual(sanitizeMilestones([{ name: '', description: '', timing: '' }]).milestones, [])
  assert.deepEqual(sanitizeMilestones([{ name: ' Survey ', description: 'Door to door', timing: 'First 6 months' }]).milestones, [
    { name: 'Survey', description: 'Door to door', timing: 'First 6 months' },
  ])
  assert.match(sanitizeMilestones([{ name: '', description: 'x', timing: '' }]).error, /name/i)
  assert.match(sanitizeMilestones('nope').error, /try again/i)
  assert.match(sanitizeMilestones(Array.from({ length: 31 }, (_, i) => ({ name: 'm' + i }))).error, /at most 30/)
})

test('milestones: long text is capped', async () => {
  const { sanitizeMilestones } = await import('../lib/milestones.ts')
  const out = sanitizeMilestones([{ name: 'n'.repeat(500), description: 'd'.repeat(5000), timing: 't'.repeat(500) }]).milestones[0]
  assert.equal(out.name.length, 200)
  assert.equal(out.description.length, 2000)
  assert.equal(out.timing.length, 120)
})

test('only the primary contact submits directly; anyone approved may save', async () => {
  const { isPrimaryContact, isDirectSubmit } = await import('../lib/applicant-rules.ts')
  const org = { id: 'o', properties: { email: 'Lead@Example.org' } }
  assert.equal(isPrimaryContact(org, 'lead@example.org'), true)
  assert.equal(isPrimaryContact(org, 'junior@example.org'), false)
  assert.equal(isPrimaryContact({ id: 'o', properties: {} }, ''), false)
  assert.equal(isPrimaryContact(null, 'a@b.co'), false)
  assert.equal(isDirectSubmit('Submit Now'), true)
  assert.equal(isDirectSubmit('Save for Later'), false)
  assert.equal(isDirectSubmit('draft'), false)
  assert.equal(isDirectSubmit(''), true)
  assert.equal(isDirectSubmit(undefined), true)
})

test('a draft link only opens for the email and grant it was made for', async () => {
  const { draftLink, draftTokenValid, draftToken } = await import('../lib/draft-link.ts')
  const secret = 'k'.repeat(40)
  const link = new URL(draftLink('https://x.test/', secret, 'Lead@Example.org', 'g1'))
  assert.equal(link.searchParams.get('email'), 'lead@example.org')
  const token = link.searchParams.get('draft')
  assert.equal(draftTokenValid(secret, 'lead@example.org', 'g1', token), true)
  assert.equal(draftTokenValid(secret, 'other@example.org', 'g1', token), false)
  assert.equal(draftTokenValid(secret, 'lead@example.org', 'g2', token), false)
  assert.equal(draftTokenValid('', 'lead@example.org', 'g1', token), false)
  assert.equal(draftTokenValid(secret, 'lead@example.org', 'g1', 'nope'), false)
  assert.notEqual(draftToken(secret, 'a@b.co', 'g1'), draftToken(secret, 'a@b.co', 'g2'))
})
