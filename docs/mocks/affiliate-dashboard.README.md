# Partner (affiliate) dashboard: mock and handoff notes

`affiliate-dashboard.html` is a static, self-contained mock for the Study referral partners
신세기유학원 (uhak114.com) and HIS 헤럴드교육센터 (hisacademy.co.kr). Open it in a browser. Every number
is generated sample data and the page says so.

**Logos are hot-linked from the partners' own sites** (`uhak114.com/layout/images/common/logo_on.png`,
`hisacademy.co.kr/assets/images/logo01-3.svg`) for the mock only. Before production, get official
logo files and written permission from each partner and host them ourselves; both are dark-text
marks, so the page shows them on a white plate. KO is the default language, with an EN toggle; it
supports light and dark themes and a phone layout.

## What each block needs from the real system

| Block | Source today | Gap to close |
|---|---|---|
| Referral code + link + QR | `study_referral_codes` (one 6-char code per student) | Codes belong to a STUDENT. Partners need an org-owned code (a `study_affiliates` row with `code`, `name`, `commission_rate`, `since`). The code must use the redeem alphabet (`CODE_ALPHABET` in `src/lib/study/referral.ts`: no 0/O/1/I/L), so "HERALD" or "UHAK114" would never redeem. The mock uses `SSGUHK` / `HSEDU7`. |
| Code sign-ups | `study_referral_redemptions` (`code`, `referee_id`, `created_at`) | Join on the affiliate's code instead of `referrer_id`. |
| Paid conversions | `study_referral_redemptions.converted` / `converted_at` | Already recorded (`referral-conversion.ts`); no change. |
| Referred revenue, payouts | `study_payments` (`student_id`, `amount_won`, `paid_at`, `refunded_at`) for referees | Commission is not paid today (`REFERRAL_INVITEE_CREDITS` is the only reward). A rate, a payout ledger and refund clawback rules are a business decision, not a query. |
| Link visits | not tracked | `/invite/[code]` must log a view event; without it, drop the tile and the funnel's first step. |
| "Started a test" | `study_attempts` / sessions for referees | Define "started" (first completed section?) before showing it. |
| Plan mix | `study_subscriptions` current plan for paying referees | Only monthly plans are sold (`non-monthly-plans-not-sold` test). |
| Referred students table | profiles of referees | **Privacy:** show masked names only (김*윤), never email or phone (migration 120 forbids them to user sessions anyway). Confirm with the partner contract which fields a partner may see at all. |

## Access
A partner logs in as a partner user and sees only their own affiliate row. RLS on the new table plus
an API route that aggregates server-side (`dbAdmin`), never raw referee rows to the browser.
