import test from 'node:test'
import assert from 'node:assert/strict'

test('a lifecycle link only opens its own form for its own grant', async () => {
  const { lifecycleLinks, lifecycleTokenValid, lifecycleToken, purposeForSlug } = await import('../lib/lifecycle-access.ts')
  const secret = 's'.repeat(40)
  const links = lifecycleLinks('https://x.test/', secret, 'g1')
  const url = new URL(links.allocation)
  assert.equal(url.pathname, '/forms/grant-management-requirements')
  const token = url.searchParams.get('access')
  assert.equal(lifecycleTokenValid(secret, 'allocation', 'g1', token), true)
  assert.equal(lifecycleTokenValid(secret, 'forward', 'g1', token), false)
  assert.equal(lifecycleTokenValid(secret, 'allocation', 'g2', token), false)
  assert.equal(lifecycleTokenValid('', 'allocation', 'g1', token), false)
  assert.equal(lifecycleTokenValid(secret, 'allocation', 'g1', 'x'), false)
  assert.notEqual(lifecycleToken(secret, 'review', 'g1'), lifecycleToken(secret, 'forward', 'g1'))
  assert.equal(purposeForSlug('apply-extension'), 'extension-request')
  assert.equal(purposeForSlug('grant-rfp'), null)
})

test('applicants come from the saved list and show name and organization', async () => {
  const { parseApplicants, applicantLabel } = await import('../lib/lifecycle-rules.ts')
  const list = parseApplicants(JSON.stringify([{ id: 'c1', name: 'Sam Seeker', email: 'SAM@x.org', organization: 'Org A' }, { name: 'no id' }]))
  assert.equal(list.length, 1)
  assert.equal(list[0].email, 'sam@x.org')
  assert.equal(applicantLabel(list[0]), 'Sam Seeker (Org A)')
  assert.deepEqual(parseApplicants('not json'), [])
})

test('an allocation is refused over the ceiling, without dates, or with bad categories', async () => {
  const { allocationError } = await import('../lib/lifecycle-rules.ts')
  const ok = { ceiling: 7500, amount: 5000, start: '2026-12-01', end: '2027-12-01', cadence: 'Every 6 months', categories: 'travel,events' }
  assert.equal(allocationError(ok), null)
  assert.match(allocationError({ ...ok, amount: 8000 }), /cannot be more than the grant amount of \$7,500/)
  assert.match(allocationError({ ...ok, amount: 0 }), /award amount/i)
  assert.match(allocationError({ ...ok, start: '' }), /start date/i)
  assert.match(allocationError({ ...ok, end: '' }), /end date/i)
  assert.match(allocationError({ ...ok, end: '2026-12-01' }), /after the start/i)
  assert.match(allocationError({ ...ok, categories: '' }), /at least one/i)
  assert.match(allocationError({ ...ok, categories: 'yacht' }), /from the list/i)
  assert.match(allocationError({ ...ok, cadence: 'Every 12 months' }), /3, 6, or 8/)
  assert.equal(allocationError({ ...ok, cadence: '' }), null)
})

test('the start date decides Awarded or Active', async () => {
  const { awardStage, todayInZone } = await import('../lib/lifecycle-rules.ts')
  assert.equal(awardStage('2026-11-23', '2026-11-22'), 'awarded')
  assert.equal(awardStage('2026-11-22', '2026-11-22'), 'active')
  assert.equal(awardStage('2026-11-01', '2026-11-22'), 'active')
  assert.equal(todayInZone(new Date('2026-11-22T03:30:00Z'), 'America/Chicago'), '2026-11-21')
})

test('extension: the ask must be later than the current end, and a blank approval keeps the asked date', async () => {
  const { extensionRequestError, approvedEndDate, daysBetween } = await import('../lib/lifecycle-rules.ts')
  assert.equal(extensionRequestError({ currentEnd: '2026-12-31', requestedEnd: '2027-03-31' }), null)
  assert.match(extensionRequestError({ currentEnd: '2026-12-31', requestedEnd: '2026-12-01' }), /after the current end/)
  assert.match(extensionRequestError({ currentEnd: '2026-12-31', requestedEnd: '' }), /new end date/i)
  assert.deepEqual(approvedEndDate({ requestedEnd: '2027-03-31', newEnd: '', currentEnd: '2026-12-31' }), { date: '2027-03-31', error: null })
  assert.deepEqual(approvedEndDate({ requestedEnd: '2027-03-31', newEnd: '2027-02-28', currentEnd: '2026-12-31' }), { date: '2027-02-28', error: null })
  assert.match(approvedEndDate({ requestedEnd: '', newEnd: '', currentEnd: '2026-12-31' }).error, /no end date/i)
  assert.match(approvedEndDate({ requestedEnd: '2027-03-31', newEnd: '2026-11-01', currentEnd: '2026-12-31' }).error, /after the current end/)
  assert.equal(daysBetween('2026-11-22', '2026-12-22'), 30)
})

const applicants = JSON.stringify([{ id: 'c1', name: 'Sam Seeker', email: 'sam@x.org', organization: 'Org A' }, { id: 'c2', name: 'Ivy', email: 'ivy@x.org', organization: '' }])
const grant = { grant_name: 'Youth Grant', review_method: 'admin', award_amount: 7500, applicants, status: '', end_date: '2026-12-31' }

test('forward is for admin-reviewed grants, one applicant once', async () => {
  const { evaluateLifecycleSubmit } = await import('../lib/lifecycle-rules.ts')
  const ok = evaluateLifecycleSubmit('grant-mark-awarded', grant, { applicant: 'c1' }, '2026-11-22')
  assert.equal(ok.error, null)
  assert.equal(ok.extra.applicantEmail, 'sam@x.org')
  assert.match(evaluateLifecycleSubmit('grant-mark-awarded', grant, { applicant: 'nope' }, '2026-11-22').error, /choose an applicant/i)
  assert.match(evaluateLifecycleSubmit('grant-mark-awarded', { ...grant, review_method: 'self' }, { applicant: 'c1' }, '2026-11-22').error, /not reviewed by the admin/i)
  assert.match(evaluateLifecycleSubmit('grant-mark-awarded', { ...grant, vetted_applicants: JSON.stringify([{ id: 'c1', email: 'sam@x.org' }]) }, { applicant: 'c1' }, '2026-11-22').error, /already sent/i)
  assert.match(evaluateLifecycleSubmit('grant-mark-awarded', { ...grant, status: 'active' }, { applicant: 'c1' }, '2026-11-22').error, /already been awarded/i)
})

test('the funder selection form is for self and third party grants only', async () => {
  const { evaluateLifecycleSubmit } = await import('../lib/lifecycle-rules.ts')
  assert.equal(evaluateLifecycleSubmit('grant-funder-auto-review', { ...grant, review_method: 'thirdparty' }, { applicant: 'c2' }, '2026-11-22').error, null)
  assert.match(evaluateLifecycleSubmit('grant-funder-auto-review', grant, { applicant: 'c2' }, '2026-11-22').error, /admin team/i)
})

test('allocation needs a vetted applicant and a valid award', async () => {
  const { evaluateLifecycleSubmit } = await import('../lib/lifecycle-rules.ts')
  const vetted = { ...grant, vetted_applicants: JSON.stringify([{ id: 'c1', name: 'Sam Seeker', email: 'sam@x.org', organization: 'Org A' }]) }
  const form = { applicant: 'c1', awardAmount: 5000, startDate: '2026-12-01', endDate: '2027-12-01', budgetCategories: 'travel', progressReportCadence: 'Every 3 months' }
  const ok = evaluateLifecycleSubmit('grant-management-requirements', vetted, form, '2026-11-22')
  assert.equal(ok.error, null)
  assert.equal(ok.extra.awardStage, 'awarded')
  assert.equal(ok.extra.cadenceMonths, 3)
  assert.equal(evaluateLifecycleSubmit('grant-management-requirements', vetted, { ...form, startDate: '2026-11-22' }, '2026-11-22').extra.awardStage, 'active')
  assert.match(evaluateLifecycleSubmit('grant-management-requirements', vetted, { ...form, applicant: 'c2' }, '2026-11-22').error, /vetted applicants/i)
  assert.match(evaluateLifecycleSubmit('grant-management-requirements', vetted, { ...form, awardAmount: 9000 }, '2026-11-22').error, /cannot be more/i)
  assert.match(evaluateLifecycleSubmit('grant-management-requirements', { ...vetted, awarded_applicant: '{"id":"c1"}' }, form, '2026-11-22').error, /already been awarded/i)
})

test('extension: only the awardee asks, only once, and the funder decision keeps the asked date when blank', async () => {
  const { evaluateLifecycleSubmit } = await import('../lib/lifecycle-rules.ts')
  const awarded = { ...grant, status: 'active', awarded_applicant: JSON.stringify({ id: 'c1', name: 'Sam Seeker', email: 'sam@x.org', organization: 'Org A' }) }
  const ask = { email: 'Sam@x.org', requestedEndDate: '2027-03-31' }
  assert.equal(evaluateLifecycleSubmit('apply-extension', awarded, ask, '2026-12-01').error, null)
  assert.equal(evaluateLifecycleSubmit('apply-extension', awarded, { ...ask, email: 'ivy@x.org' }, '2026-12-01').status, 403)
  assert.match(evaluateLifecycleSubmit('apply-extension', { ...awarded, extension_status: 'requested' }, ask, '2026-12-01').error, /already waiting/i)
  assert.match(evaluateLifecycleSubmit('apply-extension', awarded, { ...ask, requestedEndDate: '2026-12-01' }, '2026-12-01').error, /after the current end/i)
  const pending = { ...awarded, extension_status: 'requested', extension_requested_end_date: '2027-03-31' }
  const approve = evaluateLifecycleSubmit('extension-review', pending, { extensionDecision: 'Approve', newEndDate: '' }, '2026-12-05')
  assert.equal(approve.extra.approvedEnd, '2027-03-31')
  assert.equal(evaluateLifecycleSubmit('extension-review', pending, { extensionDecision: 'Deny' }, '2026-12-05').extra.decision, 'deny')
  assert.match(evaluateLifecycleSubmit('extension-review', awarded, { extensionDecision: 'Approve' }, '2026-12-05').error, /no extension request/i)
})
