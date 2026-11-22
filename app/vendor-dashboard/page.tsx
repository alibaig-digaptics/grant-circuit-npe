import type { Metadata } from 'next'
import { FormShell } from '@/components/forms/FormShell'
import { Badge } from '@/components/ui/badge'
import { loadVendorDashboard } from '@/lib/award-store'
import { lifecycleLink, vendorDashboardValid } from '@/lib/lifecycle-access'
import { workActionsFor } from '@/lib/lifecycle-rules'

export const metadata: Metadata = { title: 'Vendor dashboard' }
export const dynamic = 'force-dynamic'

const STAGES: Record<string, string> = {
  proposal_request: 'Proposal requested', work_order_request: 'Work order received', accepted: 'Accepted', down_payment_requested: 'Down payment requested',
  work_in_progress: 'Work in progress', delivered: 'Delivered', final_payment_requested: 'Final payment requested', final_payment_received: 'Final payment received', closed: 'Closed', declined: 'Declined',
}
const PAYMENT: Record<string, string> = { sent_to_bookkeeper: 'Approved, waiting for payment', payment_in_progress: 'Payment on its way', paid: 'Paid', closed: 'Paid' }
const money = (n: number) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default async function VendorDashboard({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams
  const secret = process.env.GF360_GHL_PRIVATE_KEY || ''
  const vendorId = q.vendor || ''
  const valid = vendorDashboardValid(secret, vendorId, q.access || '')
  const data = valid ? await loadVendorDashboard(vendorId).catch(() => null) : null
  if (!data) {
    return <main className="min-h-screen"><FormShell form={{ title: 'Vendor dashboard', subtitle: 'Your work and payments' }}><p className="py-6 text-center text-sm text-muted-foreground">This page opens only from the link in your email.</p></FormShell></main>
  }
  const origin = process.env.NEXT_PUBLIC_APP_URL || ''
  const open = data.work.filter(w => !['closed', 'declined'].includes(w.stage))
  const done = data.work.filter(w => ['closed', 'declined'].includes(w.stage))
  const payments = data.payments.filter(p => PAYMENT[p.status])
  const card = (w: (typeof data.work)[number]) => {
    const actionable = workActionsFor(w.stage).length > 0 && w.grantId
    const link = actionable ? lifecycleLink(origin, secret, 'work-update', w.grantId, w.id) : ''
    return <li key={w.id} className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight">{w.title}</h2>
        <Badge variant="secondary">{STAGES[w.stage] || w.stage}</Badge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">From {w.from}{w.neededBy ? ` · needed by ${w.neededBy}` : ''}</p>
      <p className="mt-2 text-sm">{[w.amount ? `Amount ${money(w.amount)}` : '', w.down ? `Down payment ${money(w.down)}` : '', w.final ? `Final payment ${money(w.final)}` : ''].filter(Boolean).join(' · ')}</p>
      {link ? <a className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90" href={link}>Update this work</a> : null}
    </li>
  }
  return <main className="min-h-screen">
    <FormShell form={{ title: data.name, subtitle: 'Your work and payments' }}>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Open work</h2>
      {open.length ? <ul className="mb-8 flex flex-col gap-4">{open.map(card)}</ul> : <p className="mb-8 text-sm text-muted-foreground">No open work right now.</p>}
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Payments</h2>
      {payments.length ? <ul className="mb-8 flex flex-col gap-3">{payments.map(p => <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-card p-4 text-sm"><span>{p.description || 'Payment'} · {p.from}</span><span className="font-semibold">{money(p.amount)} · {PAYMENT[p.status]}{p.paidOn ? ` (${p.paidOn})` : ''}</span></li>)}</ul> : <p className="mb-8 text-sm text-muted-foreground">No payments yet.</p>}
      {done.length ? <><h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Finished</h2><ul className="flex flex-col gap-4">{done.map(card)}</ul></> : null}
    </FormShell>
  </main>
}
