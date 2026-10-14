# Event tags (no brand prefix)

GHL Contact Workflows should trigger on **these tags**, not `GF360_Notification_Type` and not `GF360-Notify-Expense-Update`.

GHL lowercases tags. For a repeat event, remove the tag then add it again.

| Event | Tag |
| --- | --- |
| New organization signup | `new-organization-signup` |
| Organization activated | `organization-activated` |
| Grant posted | `grant-application-created` |
| Applicant saved draft | `grant-application-incomplete` |
| Applicant submitted | `grant-application-submitted` |
| Ready for auto review | `grant-ready-for-auto-review` |
| Under review | `grant-under-review` |
| Awarded | `grant-awarded` |
| Active | `grant-active` |
| Reporting due | `grant-reporting-due` |
| Progress report submitted | `grant-progress-submitted` |
| Prep for closing | `grant-prep-for-closing` |
| Extension requested | `extension-request-received` |
| Extension awarded | `extension-awarded` |
| Grant closed | `grant-closed` |
| Vendor applied | `vendor-application-received` |
| Expense submitted | `expense-submitted` |
| Expense needs revision | `expense-needs-revision` |
| Expense approved | `expense-approved` |
| Sent to bookkeeper | `expense-sent-to-bookkeeper` |
| Expense paid | `expense-paid` |

## Contact fields (simple keys)

Use these — not `gf360_*`:

- `last_action` — deep link / status line
- `pending_action` — next step
- `org_name`
- `expense_id`
- `expense_amount`

Old `GF360_*` field **labels** are marked legacy/unused. Do not build new GHL branches on `Notification Type (unused)`.

## Next.js webhook intakes

All live in n8n project **NPE-Non Profits Elevate** (`eNaNUhYFo3d2eEOK`). Every path ends in `-npe`.
`POST https://360growth.io/webhook/{n8nPath}` (or via Grant Circuit `POST /api/forms/{slug}`).

| Slug | n8n path | n8n workflow ID |
| --- | --- | --- |
| `grant-rfp` | `gc-grant-rfp-npe` | `9WEMrW8Lj87OYyR3` |
| `grant-applicant-submit` | `gc-grant-applicant-submit-npe` | `W3bGDM1kSA0BkoP2` |
| `grant-management-requirements` | `gc-grant-management-requirements-npe` | `zJHBRN4SzeRm24pD` |
| `grant-funder-auto-review` | `gc-grant-funder-auto-review-npe` | `9ybCALaJwDDbFXUQ` |
| `grant-mark-awarded` | `gc-grant-mark-awarded-npe` | `LU0Xghc1rYhc3sVG` |
| `submit-expense` | `gc-submit-expense-npe` | `VzotZ2CACu7FQwNT` |
| `review-expense` | `gc-review-expense-npe` | `4EREjimKg0YCMZ4D` |
| `bookkeeper-pay` | `gc-bookkeeper-pay-npe` | `zlKhYzJFh82t7FOn` |
| `apply-extension` | `gc-apply-extension-npe` | `cWXDkg6Amh16jow7` |
| `extension-review` | `gc-extension-review-npe` | `lS4XtAobrCPnHp7f` |
| `progress-report` | `gc-progress-report-npe` | `9pXnhhFMAquLD4NE` |
| `vendor-application` | `gc-vendor-application-npe` | `jaEM2Go0y7n5Z3SU` |
| `vendor-review` | `gc-vendor-review-npe` | `oPHhCMZQa16fRaMK` |
| `vendor-w9` | `gc-vendor-w9-npe` | `YBcTnBgM3S9EwVzX` |
| `org-registration` | `gc-org-registration-npe` | `3pnm5LahmBu2I0NQ` |
| `org-activate` | `gc-org-activate-npe` | `jyUoFNp0m1Fdytf5` |
| `project-registration` | `gc-project-registration-npe` | `1K19F8MJ3dTZoYD4` |
| `project-status` | `gc-project-status-npe` | `J6TIwC21r3tP8kEM` |
