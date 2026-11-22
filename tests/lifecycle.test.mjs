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

const eaward = award({ allowedCategories: ['travel', 'events'], remaining: 1000, grantId: 'g1' })
const ctx = { award: eaward, milestones: ['Launch'], vendors: [{ id: 'v1', name: 'Print Shop' }] }
const good = { email: 'sam@x.org', milestone: 'Launch', budgetCategory: 'travel', amount: 200, description: 'Flyers', paymentKind: 'Reimbursement', expenseDate: '2026-11-20', receipt: ['u'], vendor: 'v1' }

test('an expense needs the awardee, an active award, a milestone, an allowed category, and room in the budget', async () => {
  const { expenseSubmitError } = await import('../lib/lifecycle-rules.ts')
  const ok = expenseSubmitError(ctx, good, '2026-11-22')
  assert.equal(ok.error, null)
  assert.equal(ok.extra.payeeName, 'Print Shop')
  assert.equal(expenseSubmitError(ctx, { ...good, email: 'ivy@x.org' }, '2026-11-22').status, 403)
  assert.equal(expenseSubmitError({ ...ctx, award: null }, good, '2026-11-22').status, 403)
  assert.match(expenseSubmitError({ ...ctx, award: award({ ...eaward, status: 'awarded' }) }, good, '2026-11-22').error, /active/i)
  assert.match(expenseSubmitError(ctx, { ...good, milestone: 'Nope' }, '2026-11-22').error, /milestone/i)
  assert.match(expenseSubmitError(ctx, { ...good, budgetCategory: 'marketing' }, '2026-11-22').error, /categor/i)
  assert.match(expenseSubmitError(ctx, { ...good, amount: 5000 }, '2026-11-22').error, /left on the grant/i)
})

test('reimbursement needs a past date and a receipt, future payment needs a quote, an outside vendor can be typed', async () => {
  const { expenseSubmitError } = await import('../lib/lifecycle-rules.ts')
  assert.match(expenseSubmitError(ctx, { ...good, receipt: [] }, '2026-11-22').error, /receipt/i)
  assert.match(expenseSubmitError(ctx, { ...good, expenseDate: '2026-12-01' }, '2026-11-22').error, /future/i)
  const future = { ...good, paymentKind: 'Future Payment', expenseDate: '', receipt: [] }
  assert.match(expenseSubmitError(ctx, future, '2026-11-22').error, /quote/i)
  assert.equal(expenseSubmitError(ctx, { ...future, quoteProposal: ['q'] }, '2026-11-22').error, null)
  assert.match(expenseSubmitError(ctx, { ...good, vendor: 'other', outsideVendorName: '' }, '2026-11-22').error, /vendor/i)
  const outside = expenseSubmitError(ctx, { ...good, vendor: 'other', outsideVendorName: 'Joe Plumbing' }, '2026-11-22')
  assert.equal(outside.extra.payeeName, 'Joe Plumbing')
  assert.equal(outside.extra.vendorId, '')
})

const exp = (over = {}) => ({ id: 'e1', status: 'under_review', awardId: 'a1', applicantId: 'c1', applicantEmail: 'sam@x.org', applicantName: 'Sam', amount: 200, description: 'x', paymentKind: 'reimbursement', ...over })

test('review: approve needs no note, changes and reject do', async () => {
  const { expenseReviewError } = await import('../lib/lifecycle-rules.ts')
  assert.equal(expenseReviewError(exp(), { decision: 'Approve' }).extra.decision, 'approve')
  assert.match(expenseReviewError(exp(), { decision: 'Request Changes' }).error, /note/i)
  assert.equal(expenseReviewError(exp(), { decision: 'Reject', notes: 'no' }).extra.decision, 'reject')
  assert.match(expenseReviewError(exp({ status: 'approved' }), { decision: 'Approve' }).error, /not waiting/i)
  assert.equal(expenseReviewError(null, { decision: 'Approve' }).status, 403)
})

test('payment: wire, ACH, and card are instant, check, hand delivery, and mail are not', async () => {
  const { expensePayError, isInstantMethod } = await import('../lib/lifecycle-rules.ts')
  for (const m of ['Wire', 'ACH', 'Credit Card']) assert.equal(isInstantMethod(m), true)
  for (const m of ['Check', 'Hand Delivery', 'Mail', 'Other']) assert.equal(isInstantMethod(m), false)
  const sent = exp({ status: 'sent_to_bookkeeper' })
  const body = { paymentMethod: 'Check', paymentDate: '2026-11-20', paymentRef: '1042' }
  assert.equal(expensePayError(sent, body, '2026-11-22').extra.instant, false)
  assert.equal(expensePayError(sent, { ...body, paymentMethod: 'Wire' }, '2026-11-22').extra.instant, true)
  assert.match(expensePayError(sent, { ...body, paymentMethod: 'Bitcoin' }, '2026-11-22').error, /how it was paid/i)
  assert.match(expensePayError(sent, { ...body, paymentRef: '' }, '2026-11-22').error, /reference/i)
  assert.match(expensePayError(exp(), body, '2026-11-22').error, /not waiting/i)
})

test('confirming receipt: only the seeker, only while in progress', async () => {
  const { expenseConfirmError } = await import('../lib/lifecycle-rules.ts')
  const inProgress = exp({ status: 'payment_in_progress' })
  assert.equal(expenseConfirmError(inProgress, { email: 'SAM@x.org', received: 'I agree' }).error, null)
  assert.equal(expenseConfirmError(inProgress, { email: 'ivy@x.org', received: 'I agree' }).status, 403)
  assert.match(expenseConfirmError(inProgress, { email: 'sam@x.org', received: '' }).error, /tick/i)
  assert.match(expenseConfirmError(exp(), { email: 'sam@x.org', received: 'x' }).error, /not waiting/i)
})

test('expense links are tied to the expense', async () => {
  const { lifecycleLinks, lifecycleTokenValid } = await import('../lib/lifecycle-access.ts')
  const links = lifecycleLinks('https://x.test', 's'.repeat(40), 'g1', 'a1', 'e1')
  const url = new URL(links['expense-pay'])
  assert.equal(url.searchParams.get('expense'), 'e1')
  assert.equal(lifecycleTokenValid('s'.repeat(40), 'expense-pay', 'e1', url.searchParams.get('access')), true)
  assert.equal(lifecycleTokenValid('s'.repeat(40), 'expense-pay', 'e2', url.searchParams.get('access')), false)
  assert.equal(new URL(links['submit-expense']).searchParams.get('award'), 'a1')
})

const wardCtx = { award: award({ allowedCategories: ['travel'], remaining: 1000, grantId: 'g1' }), vendors: [{ id: 'v1', name: 'Print Shop', email: 'shop@x.org' }] }
const wbody = { email: 'sam@x.org', vendor: 'v1', title: 'Flyers', description: 'Print 500 flyers', amount: 200 }

test('a work order needs the awardee, an active award, an approved vendor, and an amount within the balance', async () => {
  const { workRequestError } = await import('../lib/lifecycle-rules.ts')
  const ok = workRequestError('work_order', wardCtx, wbody, '2026-11-22')
  assert.equal(ok.error, null)
  assert.equal(ok.extra.vendorEmail, 'shop@x.org')
  assert.equal(workRequestError('work_order', wardCtx, { ...wbody, email: 'ivy@x.org' }, '2026-11-22').status, 403)
  assert.match(workRequestError('work_order', wardCtx, { ...wbody, vendor: 'pending' }, '2026-11-22').error, /approved vendor/i)
  assert.match(workRequestError('work_order', wardCtx, { ...wbody, amount: 0 }, '2026-11-22').error, /amount/i)
  assert.match(workRequestError('work_order', wardCtx, { ...wbody, amount: 5000 }, '2026-11-22').error, /left on the grant/i)
  assert.match(workRequestError('work_order', wardCtx, { ...wbody, neededBy: '2020-01-01' }, '2026-11-22').error, /past/i)
  assert.match(workRequestError('work_order', { ...wardCtx, award: award({ ...wardCtx.award, status: 'awarded' }) }, wbody, '2026-11-22').error, /active/i)
})

test('a proposal request needs no amount', async () => {
  const { workRequestError } = await import('../lib/lifecycle-rules.ts')
  assert.equal(workRequestError('proposal_request', wardCtx, { ...wbody, amount: '' }, '2026-11-22').error, null)
})

test('the vendor can only take steps that fit the stage', async () => {
  const { workUpdateError, workActionsFor } = await import('../lib/lifecycle-rules.ts')
  const work = (over = {}) => ({ id: 'w1', stage: 'work_order_request', kind: 'work_order', vendorId: 'v1', vendorName: 'Print Shop', vendorEmail: 'shop@x.org', vendorContactId: 'c9', awardId: 'a1', grantId: 'g1', applicantId: 'c1', applicantEmail: 'sam@x.org', applicantName: 'Sam', title: 'Flyers', amount: 200, ...over })
  assert.deepEqual(workActionsFor('work_order_request').map(a => a.value), ['accept', 'decline'])
  assert.deepEqual(workActionsFor('accepted').map(a => a.value), ['request_down_payment', 'start_work'])
  assert.equal(workUpdateError(work(), { email: 'shop@x.org', action: 'accept' }).extra.nextStage, 'accepted')
  assert.equal(workUpdateError(work(), { email: 'other@x.org', action: 'accept' }).status, 403)
  assert.match(workUpdateError(work(), { email: 'shop@x.org', action: 'deliver' }).error, /not available/i)
  assert.match(workUpdateError(work({ stage: 'accepted' }), { email: 'shop@x.org', action: 'request_down_payment' }).error, /amount/i)
  assert.equal(workUpdateError(work({ stage: 'accepted' }), { email: 'shop@x.org', action: 'request_down_payment', amount: 50 }).extra.nextStage, 'down_payment_requested')
  assert.equal(workUpdateError(work({ stage: 'down_payment_requested' }), { email: 'shop@x.org', action: 'start_work' }).extra.nextStage, 'work_in_progress')
  assert.match(workUpdateError(work({ stage: 'proposal_request', kind: 'proposal_request' }), { email: 'shop@x.org', action: 'accept' }).error, /proposal/i)
  assert.equal(workUpdateError(work({ stage: 'proposal_request', kind: 'proposal_request' }), { email: 'shop@x.org', action: 'accept', amount: 900 }).error, null)
  assert.equal(workUpdateError(work({ stage: 'final_payment_received' }), { email: 'shop@x.org', action: 'close' }).extra.nextStage, 'closed')
  assert.equal(workUpdateError(null, { action: 'accept' }).status, 403)
})

test('work links are tied to the work', async () => {
  const { lifecycleLinks, lifecycleTokenValid } = await import('../lib/lifecycle-access.ts')
  const links = lifecycleLinks('https://x.test', 's'.repeat(40), 'g1', 'a1', '', 'w1')
  const url = new URL(links['work-update'])
  assert.equal(url.searchParams.get('work'), 'w1')
  assert.equal(lifecycleTokenValid('s'.repeat(40), 'work-update', 'w1', url.searchParams.get('access')), true)
  assert.equal(lifecycleTokenValid('s'.repeat(40), 'work-update', 'w2', url.searchParams.get('access')), false)
  assert.ok(links['work-order'] && links['proposal-request'])
})

test('closeout: only the awardee, once closing prep has started, with documents, and only once', async () => {
  const { closeoutSubmitError, closeoutReviewError, closeoutActionsFor } = await import('../lib/lifecycle-rules.ts')
  const a = award({ status: 'active', closingNotice: '2026-12-01', closeoutStatus: '', grantName: 'G' })
  const body = { email: 'sam@x.org', documents: ['https://x/doc.pdf'] }
  assert.equal(closeoutSubmitError(a, body, '2026-12-02').error, null)
  assert.equal(closeoutSubmitError(a, { ...body, email: 'ivy@x.org' }, '2026-12-02').status, 403)
  assert.match(closeoutSubmitError(a, { ...body, documents: [] }, '2026-12-02').error, /attach/i)
  assert.match(closeoutSubmitError({ ...a, closingNotice: '' }, body, '2026-12-02').error, /one month/i)
  assert.match(closeoutSubmitError({ ...a, closeoutStatus: 'submitted' }, body, '2026-12-02').error, /already/i)
  assert.deepEqual(closeoutActionsFor('submitted').map(x => x.value), ['start_review', 'ask_more'])
  assert.deepEqual(closeoutActionsFor('in_review').map(x => x.value), ['approve_close', 'ask_more'])
  assert.equal(closeoutReviewError({ ...a, closeoutStatus: 'submitted' }, { action: 'start_review' }).extra.actionKey, 'start_review')
  assert.match(closeoutReviewError({ ...a, closeoutStatus: 'submitted' }, { action: 'approve_close' }).error, /not available/i)
  assert.match(closeoutReviewError({ ...a, closeoutStatus: 'submitted' }, { action: 'ask_more' }).error, /missing/i)
})

test('closing applications lists everyone not awarded and needs a tick', async () => {
  const { evaluateLifecycleSubmit } = await import('../lib/lifecycle-rules.ts')
  const grant = { grant_name: 'G', listing_status: 'open', applicants: JSON.stringify([{ id: 'c1', name: 'Sam', email: 's@x.org' }, { id: 'c2', name: 'Ivy', email: 'i@x.org' }]) }
  const awards = [award({ applicantId: 'c1' })]
  const ok = evaluateLifecycleSubmit('close-applications', grant, { confirm: true }, '2026-11-22', awards)
  assert.equal(ok.error, null)
  assert.deepEqual(ok.extra.notSelected.map(a => a.id), ['c2'])
  assert.match(evaluateLifecycleSubmit('close-applications', grant, {}, '2026-11-22', awards).error, /tick/i)
  assert.match(evaluateLifecycleSubmit('close-applications', { ...grant, listing_status: 'closed' }, { confirm: true }, '2026-11-22', awards).error, /already closed/i)
})

test('the vendor dashboard link opens one vendor only', async () => {
  const { vendorDashboardLink, vendorDashboardValid } = await import('../lib/lifecycle-access.ts')
  const url = new URL(vendorDashboardLink('https://x.test', 's'.repeat(40), 'v1'))
  assert.equal(vendorDashboardValid('s'.repeat(40), 'v1', url.searchParams.get('access')), true)
  assert.equal(vendorDashboardValid('s'.repeat(40), 'v2', url.searchParams.get('access')), false)
  assert.equal(vendorDashboardValid('', 'v1', url.searchParams.get('access')), false)
})
