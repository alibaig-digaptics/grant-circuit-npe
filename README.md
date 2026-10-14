# Grant Circuit

Next.js forms for the Grant Circuit grant lifecycle (formerly GrantFlow 360). Copied from the Counsel Circuit lawyers app stack: Next.js 16, Tailwind v4, shadcn/ui, react-hook-form, Zod.

**n8n forms are being replaced here.** Conditional fields live in this app. Submit still posts to n8n webhooks so GoHighLevel contacts, tags, and opportunities stay the same.

Grant Circuit (This platform runs the full grant lifecycle for funding organizations, applicants, and grant admins — from posting an opportunity through application, award, spend, reporting, and close.)

## Run

```bash
cd grant-circuit
cp .env.example .env.local
pnpm install
pnpm dev
```

Open [http://localhost:3010](http://localhost:3010).

## Form URLs

Standalone: `/forms/{slug}`  
Embed (iframe): `/embed/{slug}`  
Prefill: `?contactId=&recordId=`

| Slug | Live n8n webhook path |
| --- | --- |
| `grant-rfp` | `gc-grant-rfp-npe` |
| `grant-applicant-submit` | `gc-grant-applicant-submit-npe` |
| `grant-management-requirements` | `gc-grant-management-requirements-npe` |
| `grant-funder-auto-review` | `gc-grant-funder-auto-review-npe` |
| `grant-mark-awarded` | `gc-grant-mark-awarded-npe` |
| `submit-expense` | `gc-submit-expense-npe` |
| `review-expense` | `gc-review-expense-npe` |
| `bookkeeper-pay` | `gc-bookkeeper-pay-npe` |
| `apply-extension` | `gc-apply-extension-npe` |
| `extension-review` | `gc-extension-review-npe` |
| `progress-report` | `gc-progress-report-npe` |
| `vendor-application` | `gc-vendor-application-npe` |
| `vendor-review` | `gc-vendor-review-npe` |
| `vendor-w9` | `gc-vendor-w9-npe` |
| `org-registration` | `gc-org-registration-npe` |
| `org-activate` | `gc-org-activate-npe` |
| `project-registration` | `gc-project-registration-npe` |
| `project-status` | `gc-project-status-npe` |

`POST /api/forms/{slug}` forwards JSON to `{N8N_BASE_URL}/webhook/{n8nPath}` — the `gc-*-npe` path above (the `Next.js Intake` webhook on the live n8n workflow).

## Status

Scaffold is live: branding, two-step shell, conditions on RFP / applicant / expense. Full field parity with the old n8n forms is the next pass.
