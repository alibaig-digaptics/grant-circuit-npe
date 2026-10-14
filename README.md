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

| Slug | Replaces n8n path |
| --- | --- |
| `grant-rfp` | `gf360-grant-rfp` |
| `grant-applicant-submit` | `gf360-grant-applicant-submit` |
| `grant-management-requirements` | `gf360-grant-management-requirements` |
| `grant-funder-auto-review` | `gf360-grant-funder-auto-review` |
| `grant-mark-awarded` | `gf360-grant-mark-awarded` |
| `submit-expense` | `gf360-submit-expense` |
| `review-expense` | `gf360-review-expense` |
| `bookkeeper-pay` | `gf360-bookkeeper-pay` |
| `apply-extension` | `gf360-apply-extension` |
| `progress-report` | `gf360-grant-progress-report` |
| `vendor-application` | `gf360-vendor-application` |
| `vendor-review` | `gf360-vendor-review` |
| `vendor-w9` | `gf360-vendor-w9` |
| `org-registration` | `gf360-org-registration` |
| `org-activate` | `gf360-org-activate` |
| `project-registration` | `gf360-project-registration` |
| `project-status` | `gf360-project-status` |

`POST /api/forms/{slug}` forwards JSON to `{N8N_BASE_URL}/webhook/gc-{slug}` (Next.js intake on the live n8n workflow).

## Status

Scaffold is live: branding, two-step shell, conditions on RFP / applicant / expense. Full field parity with the old n8n forms is the next pass.
