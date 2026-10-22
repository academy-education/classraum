# Partner (affiliate) dashboard: mock and handoff notes

**Built in the app's own design language** (v3, 2026-10-22): the same white sidebar and 57px header as
`src/app/(app)/layout.tsx` + `src/components/ui/sidebar.tsx`, the page eyebrow/title from `/dashboard`, the
`StatsCard.tsx` card (icon chip, uppercase label, 4xl figure, trend line, mini chart), and the table card from
`payments-page.tsx`. Tailwind classes are copied from those files, so porting means moving markup into React
components rather than redesigning. The Classraum logo is `public/text_logo.png`, embedded so the file opens
anywhere. The partner switcher in the header is mock-only; a real partner sees only their own row.

`affiliate-dashboard.html` is a static, self-contained mock for the Study referral partners
신세기유학원 (uhak114.com) and HIS 헤럴드교육센터 (hisacademy.co.kr). Open it in a browser. Every number
is generated sample data and the page says so.

**Logos are hot-linked from the partners' own sites** (`uhak114.com/layout/images/common/logo_on.png`,
`hisacademy.co.kr/assets/images/logo01-3.svg`) for the mock only. Before production, get official
logo files and written permission from each partner and host them ourselves; both are dark-text
marks, so the page shows them on a white plate. KO is the default language, with an EN toggle; it
supports light and dark themes and a phone layout.

## Owner decisions (2026-10-22, v4)
- **No self-serve payouts.** Partners cannot request or withdraw money on their own schedule. The mock no longer
  shows a payout balance, payout history, payout day or a payout nav item.
- **No commission anywhere on the partner's screen**: no rate, no estimated commission card, no per-student
  commission column. The fourth stats card is now "first test taken".
- **No student names at all**, not even masked. The referred-students table shows join date, grade, target test,
  plan, status and total paid; the name search and name sort are gone.

## Owner decisions (2026-10-23, v5)
- **Removed:** the contract/tax-invoice menu (계약 · 세금계산서) and the contract-term fact; the marketing kit (홍보 자료)
  menu and its message-template card; the referred-payments card (추천 결제액), the per-student total-paid column and
  the plan prices. With v4's removals (정산, 수수료, student names) the partner sees no money figures at all.
- **What remains:** referral code, link and QR; code sign-ups, first test taken and paid conversions (counts only);
  the monthly trend and funnel; plan mix as counts; a referred-students table with join date, grade, target test,
  plan and status. Navigation: 대시보드, 추천 학생, 설정.

## What each block needs from the real system

| Block | Source today | Gap to close |
|---|---|---|
| Referral code + link + QR | `study_referral_codes` (one 6-char code per student) | Codes belong to a STUDENT. Partners need an org-owned code (a `study_affiliates` row with `code`, `name`, `since`; any commission terms stay internal). The code must use the redeem alphabet (`CODE_ALPHABET` in `src/lib/study/referral.ts`: no 0/O/1/I/L), so "HERALD" or "UHAK114" would never redeem. The mock uses `SSGUHK` / `HSEDU7`. |
| Code sign-ups | `study_referral_redemptions` (`code`, `referee_id`, `created_at`) | Join on the affiliate's code instead of `referrer_id`. |
| Paid conversions | `study_referral_redemptions.converted` / `converted_at` | Already recorded (`referral-conversion.ts`); no change. |
| Paid conversions | `study_referral_redemptions.converted` | Counts only. No payment amounts are shown to partners (owner, 2026-10-23). |
| Link visits | not tracked | `/invite/[code]` must log a view event; without it, drop the tile and the funnel's first step. |
| "Started a test" | `study_attempts` / sessions for referees | Define "started" (first completed section?) before showing it. |
| Plan mix | `study_subscriptions` current plan for paying referees | Only monthly plans are sold (`non-monthly-plans-not-sold` test). |
| Referred students table | profiles of referees | **Privacy:** no names, emails or phones (owner, 2026-10-22; migration 120 forbids contacts to user sessions anyway). Confirm with the partner contract that grade, target test, plan and amount are fields a partner may see. |

## Access
A partner logs in as a partner user and sees only their own affiliate row. RLS on the new table plus
an API route that aggregates server-side (`dbAdmin`), never raw referee rows to the browser.
