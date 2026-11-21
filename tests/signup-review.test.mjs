import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const token = 'c'.repeat(64)
const hash = createHash('sha256').update(token).digest('hex')
const now = Date.parse('2026-11-21T10:00:00Z')
const fresh = new Date(now - 60000).toISOString()

test('a seeker review link needs the token, a pending seeker, and a fresh record', async () => {
  const { partyReviewAllowed } = await import('../lib/signup-review.ts')
  const record = { id: 'x', createdAt: fresh, properties: { party_role: 'seeker', approval_status: 'pending', funder_review_token_hash: hash } }
  assert.equal(partyReviewAllowed('seeker', record, token, now), true)
  assert.equal(partyReviewAllowed('seeker', record, 'd'.repeat(64), now), false)
  assert.equal(partyReviewAllowed('seeker', { ...record, properties: { ...record.properties, party_role: 'funder' } }, token, now), false)
  assert.equal(partyReviewAllowed('seeker', { ...record, properties: { ...record.properties, approval_status: 'approved' } }, token, now), false)
  assert.equal(partyReviewAllowed('seeker', { ...record, properties: { ...record.properties, funder_review_token_hash: '' } }, token, now), false)
  assert.equal(partyReviewAllowed('seeker', { ...record, createdAt: new Date(now - 8 * 86400000).toISOString() }, token, now), false)
})

test('a vendor review link works while under review or waiting on a W-9, not after a decision', async () => {
  const { partyReviewAllowed } = await import('../lib/signup-review.ts')
  const record = { id: 'v', createdAt: fresh, properties: { status: 'under_review', review_token_hash: hash } }
  assert.equal(partyReviewAllowed('vendor', record, token, now), true)
  assert.equal(partyReviewAllowed('vendor', { ...record, properties: { ...record.properties, status: 'pending_w9' } }, token, now), true)
  assert.equal(partyReviewAllowed('vendor', { ...record, properties: { ...record.properties, status: 'active' } }, token, now), false)
  assert.equal(partyReviewAllowed('vendor', { ...record, updatedAt: new Date(now - 8 * 86400000).toISOString() }, token, now), false)
})

test('each party has accept, changes, and reject decisions that map to what n8n understands', async () => {
  const { PARTIES } = await import('../lib/signup-review.ts')
  for (const kind of ['seeker', 'vendor']) {
    assert.deepEqual(PARTIES[kind].decisions.map(d => d.result), ['approved', 'changes', 'rejected'])
  }
  assert.equal(PARTIES.seeker.decisions[1].send, 'Request Changes')
  assert.equal(PARTIES.vendor.decisions[1].send, 'Request W9')
})

test('no screen names the old organization and the footer points to the new site', () => {
  for (const file of ['../components/common/Header.tsx', '../components/common/Footer.tsx', '../app/globals.css', '../components/forms/GrantForm.tsx']) {
    assert.doesNotMatch(readFileSync(new URL(file, import.meta.url), 'utf8'), /Medicine|medicineandislam|\bIIM\b|Initiative on Islam/i)
  }
  assert.match(readFileSync(new URL('../components/common/Footer.tsx', import.meta.url), 'utf8'), /nonprofitselevate\.org/)
})

test('only an approved, active grant seeker may apply', async () => {
  const { isApprovedSeeker, pickApprovedSeeker } = await import('../lib/applicant-rules.ts')
  const ok = { id: 'a', properties: { party_role: 'seeker', approval_status: 'approved', status: 'active' } }
  assert.equal(isApprovedSeeker(ok), true)
  for (const patch of [{ party_role: 'funder' }, { approval_status: 'pending' }, { approval_status: 'rejected' }, { status: 'onboarding' }]) {
    assert.equal(isApprovedSeeker({ id: 'b', properties: { ...ok.properties, ...patch } }), false)
  }
  assert.equal(isApprovedSeeker(null), false)
  assert.equal(pickApprovedSeeker([{ id: 'c', properties: { party_role: 'seeker', approval_status: 'pending', status: 'onboarding' } }, ok]).id, 'a')
})

test('review labels are client wording over generic stored keys', () => {
  const src = readFileSync(new URL('../lib/form-schema.ts', import.meta.url), 'utf8')
  assert.match(src, /label: "By Grant Circuit Team", value: "admin"/)
  assert.match(src, /value: "thirdparty"/)
  assert.match(src, /value: "self"/)
})
