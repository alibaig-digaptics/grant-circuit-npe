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

All live. `POST https://360growth.io/webhook/gc-{slug}` (or via Grant Circuit `POST /api/forms/{slug}`).

| Slug | n8n workflow |
| --- | --- |
| `grant-rfp` | `9WEMrW8Lj87OYyR3` |
| `grant-applicant-submit` | `Gx2VBLd2BxxYdEVw` |
| `grant-management-requirements` | `vUaZhBe4zJBEzDeh` |
| `submit-expense` | `Hec6BmL7DGJBAFBL` |
| `review-expense` | `5MEAz4NFb4TvI7Fr` |
| `bookkeeper-pay` | `GiIDYzTohJAGBXhs` |
| `apply-extension` | `az7zrq2ONfWwnSQt` |
| `grant-progress-report` | `NPTTLmsODsYaOU2X` |
| `grant-funder-auto-review` | `hRRpt8HOdd4clrD4` |
| `grant-mark-awarded` | `h60rZ2n8Zv43D1CN` |
| `vendor-application` | `8eIwWbSg9mnRYcHu` |
| `org-registration` | `1NLAgVVRrslyZ3VM` |
| `org-activate` | `HpfPuazTY4kLn9zD` |
| `project-status` | `4HJwIw8BTxbdI1fo` |
| `vendor-review` | `9Lw5lo6001u21Ip7` |
| `vendor-w9` | `dIjLw64zw8niIbDa` |
| `project-registration` | `MZm543MsH18KUOIA` |
