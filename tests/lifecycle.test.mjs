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
const grant = { grant_name: 'Youth Grant', review_method: 'admin', award_amount: 7500, applicants, number_of_awards: '1' }
const award = (over = {}) => ({ id: 'a1', applicantId: 'c1', email: 'sam@x.org', name: 'Sam Seeker', organization: 'Org A', status: 'active', endDate: '2026-12-31', extensionStatus: '', requestedEnd: '', extensionReason: '', ...over })

test('award links are tied to the award, grant links to the grant', async () => {
  const { lifecycleLinks, lifecycleTokenValid } = await import('../lib/lifecycle-access.ts')
  const secret = 's'.repeat(40)
  const grantOnly = lifecycleLinks('https://x.test', secret, 'g1')
  assert.equal(grantOnly['extension-request'], undefined)
  const withAward = lifecycleLinks('https://x.test', secret, 'g1', 'a1')
  const url = new URL(withAward['extension-review'])
  assert.equal(url.searchParams.get('award'), 'a1')
  const token = url.searchParams.get('access')
  assert.equal(lifecycleTokenValid(secret, 'extension-review', 'a1', token), true)
  assert.equal(lifecycleTokenValid(secret, 'extension-review', 'a2', token), false)
  assert.equal(lifecycleTokenValid(secret, 'extension-review', 'g1', token), false)
  assert.equal(new URL(withAward.allocation).searchParams.get('award'), null)
})

test('award limits: 1 and 2 stop, undetermined does not', async () => {
  const { awardLimit } = await import('../lib/lifecycle-rules.ts')
  assert.equal(awardLimit('1'), 1)
  assert.equal(awardLimit('2'), 2)
  assert.equal(awardLimit('undetermined'), Infinity)
  assert.equal(awardLimit(''), Infinity)
})

test('forward is for admin-reviewed grants, one applicant once, never an awarded one', async () => {
  const { evaluateLifecycleSubmit } = await import('../lib/lifecycle-rules.ts')
  const ok = evaluateLifecycleSubmit('grant-mark-awarded', grant, { applicant: 'c1' }, '2026-11-22')
  assert.equal(ok.error, null)
  assert.equal(ok.extra.applicantEmail, 'sam@x.org')
  assert.match(evaluateLifecycleSubmit('grant-mark-awarded', grant, { applicant: 'nope' }, '2026-11-22').error, /choose an applicant/i)
  assert.match(evaluateLifecycleSubmit('grant-mark-awarded', { ...grant, review_method: 'self' }, { applicant: 'c1' }, '2026-11-22').error, /not reviewed by the admin/i)
  assert.match(evaluateLifecycleSubmit('grant-mark-awarded', { ...grant, vetted_applicants: JSON.stringify([{ id: 'c1', email: 'sam@x.org' }]) }, { applicant: 'c1' }, '2026-11-22').error, /already sent/i)
  assert.match(evaluateLifecycleSubmit('grant-mark-awarded', grant, { applicant: 'c1' }, '2026-11-22', [award()]).error, /already awarded/i)
  assert.match(evaluateLifecycleSubmit('grant-mark-awarded', { ...grant, listing_status: 'cancelled' }, { applicant: 'c1' }, '2026-11-22').error, /cancelled/i)
})

test('the funder selection form is for self and third party grants only', async () => {
  const { evaluateLifecycleSubmit } = await import('../lib/lifecycle-rules.ts')
  assert.equal(evaluateLifecycleSubmit('grant-funder-auto-review', { ...grant, review_method: 'thirdparty' }, { applicant: 'c2' }, '2026-11-22').error, null)
  assert.match(evaluateLifecycleSubmit('grant-funder-auto-review', grant, { applicant: 'c2' }, '2026-11-22').error, /admin team/i)
})

test('allocation needs a vetted applicant, a free award slot, and a valid award', async () => {
  const { evaluateLifecycleSubmit } = await import('../lib/lifecycle-rules.ts')
  const vetted = { ...grant, vetted_applicants: JSON.stringify([{ id: 'c1', name: 'Sam Seeker', email: 'sam@x.org', organization: 'Org A' }, { id: 'c2', name: 'Ivy', email: 'ivy@x.org', organization: '' }]) }
  const form = { applicant: 'c1', awardAmount: 5000, startDate: '2026-12-01', endDate: '2027-12-01', budgetCategories: 'travel', progressReportCadence: 'Every 3 months' }
  const ok = evaluateLifecycleSubmit('grant-management-requirements', vetted, form, '2026-11-22')
  assert.equal(ok.error, null)
  assert.equal(ok.extra.awardStage, 'awarded')
  assert.equal(ok.extra.cadenceMonths, 3)
  assert.equal(ok.extra.limitReached, true)
  assert.equal(evaluateLifecycleSubmit('grant-management-requirements', vetted, { ...form, startDate: '2026-11-22' }, '2026-11-22').extra.awardStage, 'active')
  assert.match(evaluateLifecycleSubmit('grant-management-requirements', vetted, { ...form, applicant: 'c9' }, '2026-11-22').error, /vetted applicants/i)
  assert.match(evaluateLifecycleSubmit('grant-management-requirements', vetted, { ...form, awardAmount: 9000 }, '2026-11-22').error, /cannot be more/i)
  assert.match(evaluateLifecycleSubmit('grant-management-requirements', vetted, form, '2026-11-22', [award({ applicantId: 'c1' })]).error, /already awarded/i)
  assert.match(evaluateLifecycleSubmit('grant-management-requirements', vetted, { ...form, applicant: 'c2' }, '2026-11-22', [award({ applicantId: 'c1' })]).error, /already given/i)
})

test('two awards: the second one reaches the limit, a cancelled award does not count', async () => {
  const { evaluateLifecycleSubmit } = await import('../lib/lifecycle-rules.ts')
  const two = { ...grant, number_of_awards: '2', vetted_applicants: JSON.stringify([{ id: 'c1', name: 'Sam', email: 'sam@x.org', organization: '' }, { id: 'c2', name: 'Ivy', email: 'ivy@x.org', organization: '' }]) }
  const form = { applicant: 'c1', awardAmount: 5000, startDate: '2026-12-01', endDate: '2027-12-01', budgetCategories: 'travel' }
  assert.equal(evaluateLifecycleSubmit('grant-management-requirements', two, form, '2026-11-22').extra.limitReached, false)
  assert.equal(evaluateLifecycleSubmit('grant-management-requirements', two, { ...form, applicant: 'c2' }, '2026-11-22', [award({ applicantId: 'c1' })]).extra.limitReached, true)
  assert.equal(evaluateLifecycleSubmit('grant-management-requirements', two, { ...form, applicant: 'c2' }, '2026-11-22', [award({ applicantId: 'c1', status: 'cancelled' })]).extra.limitReached, false)
})

test('extension: only the awardee asks, once, and a blank approval keeps the asked date', async () => {
  const { evaluateLifecycleSubmit } = await import('../lib/lifecycle-rules.ts')
  const ask = { award: 'a1', email: 'Sam@x.org', requestedEndDate: '2027-03-31' }
  assert.equal(evaluateLifecycleSubmit('apply-extension', grant, ask, '2026-12-01', [award()]).error, null)
  assert.equal(evaluateLifecycleSubmit('apply-extension', grant, { ...ask, email: 'ivy@x.org' }, '2026-12-01', [award()]).status, 403)
  assert.equal(evaluateLifecycleSubmit('apply-extension', grant, { ...ask, award: 'zzz' }, '2026-12-01', [award()]).status, 403)
  assert.match(evaluateLifecycleSubmit('apply-extension', grant, ask, '2026-12-01', [award({ extensionStatus: 'requested' })]).error, /already waiting/i)
  assert.match(evaluateLifecycleSubmit('apply-extension', grant, { ...ask, requestedEndDate: '2026-12-01' }, '2026-12-01', [award()]).error, /after the current end/i)
  assert.match(evaluateLifecycleSubmit('apply-extension', grant, ask, '2026-12-01', [award({ status: 'closed' })]).error, /not open/i)
  const pending = [award({ extensionStatus: 'requested', requestedEnd: '2027-03-31' })]
  const approve = evaluateLifecycleSubmit('extension-review', grant, { award: 'a1', extensionDecision: 'Approve', newEndDate: '' }, '2026-12-05', pending)
  assert.equal(approve.extra.approvedEnd, '2027-03-31')
  assert.equal(evaluateLifecycleSubmit('extension-review', grant, { award: 'a1', extensionDecision: 'Deny' }, '2026-12-05', pending).extra.decision, 'deny')
  assert.match(evaluateLifecycleSubmit('extension-review', grant, { award: 'a1', extensionDecision: 'Approve' }, '2026-12-05', [award()]).error, /no extension request/i)
})

test('a progress report needs an active award and some words', async () => {
  const { evaluateLifecycleSubmit } = await import('../lib/lifecycle-rules.ts')
  assert.equal(evaluateLifecycleSubmit('progress-report', grant, { award: 'a1', reportNarrative: 'Done' }, '2026-12-05', [award()]).error, null)
  assert.match(evaluateLifecycleSubmit('progress-report', grant, { award: 'a1', reportNarrative: ' ' }, '2026-12-05', [award()]).error, /summary/i)
  assert.equal(evaluateLifecycleSubmit('progress-report', grant, { award: 'a1', reportNarrative: 'x' }, '2026-12-05', [award({ status: 'closed' })]).status, 403)
})
