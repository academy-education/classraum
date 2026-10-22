# Camp dashboard: design, UX and usability audit

Date: 2026-10-22. Method: read-only code review of every file in `src/components/ui/camp/`, the `/camp-program` page, `src/lib/camp/*`, `src/app/api/camp/*` (for data states), the student/parent camp surfaces, the marketing page `src/app/camp/page.tsx`, and both locale files. No browser or running app was used, so every finding comes from the code, and anything about how a screen looks is inferred from its classes. Line numbers refer to the working tree on this date.

## Summary

The camp dashboard is carefully built in places. Deletes explain what happens to the quota before you confirm, modals trap focus, PostgREST reads are paged, the sample data on the marketing page is labelled, and all 217 static translation keys exist in both English and Korean. The core teacher question is still hard to answer: "who is behind, and on what?" Nothing on the dashboard knows that a student is overdue. The Students table cannot be sorted or filtered. The only per-student status view is a full roster x assignment matrix hidden behind a "View progress" toggle on each classroom.

Several failures look like success. A failed load shows as "no camp program", "No assignments yet" or a skeleton that never resolves. A camp teacher sees other teachers' classrooms as empty, and the buttons on them return "Forbidden". "Print" prints the whole app. "Generate report" publishes to parents straight away, with a reporting period that can claim the whole camp when only part of it has run.

There is one crash: typing in the session search box of the New Assignment modal takes down the page. There is also a timezone bug. All date windows use the UTC date, so on a camp's first morning in Korea, students and teachers are blocked until 09:00 KST and see a generic or English error.

The student/parent side is in better shape. A parent tapping a camp row still gets an error. Regenerated reports appear to parents as identical cards. The report shows parents raw "n=" counts and percentiles taken from classes of two.

## Top 10 (ranked)

| # | Finding | Severity | Effort |
|---|---|---|---|
| 1 | Typing in the session search box of the New Assignment modal crashes the page: `formatDate` is used before it is declared (`CampPage.tsx:218-226` vs `:392`) | critical | S |
| 2 | Teachers see every classroom in the program, including ones they cannot manage. Those show a false "No assignments yet", and the Reports, Class review and New Assignment actions on them fail with "Forbidden" (`CampPage.tsx:263-273, 897-933, 1163`; `api/camp/assignments/route.ts:96`) | high | M |
| 3 | Load errors show up as empty states: "no camp program", an endless skeleton, "No assignments", "No reports" (`CampPage.tsx:306-308, 319-321, 351, 268, 277`; `CampReportsPanel.tsx:58-61`) | high | S |
| 4 | "Generate report(s)" publishes to parents immediately. There is no confirmation and no draft, each click creates duplicates for every student, the period label can claim the full camp range, and parents see identical cards (`CampStudentDetail.tsx:233`; `CampReportsPanel.tsx:126`; `reports/generate/route.ts:80-83`; `mobile/camp-reports/page.tsx:136-137`) | high | M |
| 5 | "Who is behind" cannot be answered quickly. There is no overdue state anywhere on the staff side, the Students table cannot be sorted or filtered, and the donut counts link to no list of students (`CampStudentsPanel.tsx:43-47, 160-227`; `CampClassroomDashboard.tsx:219-231`) | high | M |
| 6 | Camp date windows use the UTC date. On the first camp morning (before 09:00 KST) students get "Couldn't start" and teachers get an English server error. Trend days are also UTC (`api/study/camp/start/route.ts:82-85`; `api/camp/assignments/route.ts:186-189`; `lib/camp/student.ts:107`; `api/camp/overview/route.ts:116`) | high | S |
| 7 | "Print" calls `window.print()`, but no print stylesheet exists for `.camp-report-print-area`, so it prints the sidebar, the page and the modal (`CampReportsPanel.tsx:191`; `CampStudentDetail.tsx:440`) | high | S |
| 8 | A parent tapping a camp row on Grades starts the session as the parent: they get a 403 and "Couldn't start this assignment" (`CampWorkCard.tsx:136-146`; `api/study/camp/start/route.ts:68-70`) | medium | S |
| 9 | Three different "average score" definitions. Parent-facing percentiles come from classes as small as two. "Strengths" are relative, so a 35% skill can be listed in green (`overview/route.ts:112-114, 179`; `students/route.ts:110`; `lib/camp/reports.ts:252-272`) | medium | M |
| 10 | Accessibility basics: form labels are not tied to their fields, Students rows only work with a mouse, tabs have no ARIA, action icons are `text-gray-300` on 28 px targets, and the charts have no text alternative (`CampPage.tsx:1152-1314, 827-843, 1036-1061`; `CampStudentsPanel.tsx:181-190`) | medium | S |

---

## 1. Information architecture and navigation

**1.1 Answering "who is behind" takes 3-4 steps and a visual scan.** Here are the routes today:
- Overview: the donut gives counts only (`CampPage.tsx:1661-1724`). Clicking it does nothing, and it names nobody.
- Students tab: one row per student, with one chip per row (`CampStudentsPanel.tsx:43-47`). There is no sort, no filter and no overdue state. A student who missed three deadlines and one who simply has not opened today's set both read "Not started".
- Classrooms tab, then "View progress" on each classroom (`CampPage.tsx:934-950`), then scan an N x M matrix of pills (`CampClassroomDashboard.tsx:204-234`). With 5 classrooms that is 5 toggles.

Why it matters: this is the main job of a camp dashboard, and the marketing page promises it ("Track completed, late, and missing work", `en.json landing.camp.dash.tiles[1]`). Fix: add an "Needs attention" list to Overview: students with missing or late work, sorted by count, each row opening `CampStudentDetail`. Add sort (completion, average, last active) and a status filter (Overdue / In progress / Not started / Done) to the Students table. Make each donut segment a link to the Students tab with that filter applied.

**1.2 Assignments live only under Classrooms, but the "New assignment" button sits in the page header on every tab** (`CampPage.tsx:783-790`). A teacher who creates a set from Overview stays on Overview, gets a toast and never sees the new row. The page then reloads into a full skeleton (`CampPage.tsx:630` -> `fetchAll` -> `:302`, `:639`). Fix: after a successful create, switch to the Classrooms tab, scroll to the classroom and highlight the row. Skip the full-page `setLoading(true)` on refetch (see 4.6).

**1.3 Assignment rows look clickable but do nothing.** `hover:shadow-md` on a card (`CampPage.tsx:985`) suggests a drill-down, but the only actions are a pencil and a bin. A teacher expects the click to show who has finished this set. Fix: make the row open a per-assignment panel showing completion by student, with Remind and Extend actions later. Until then, drop the hover lift.

**1.4 Tab and program selection are not in the URL.** `activeTab` and `activeProgramId` are local state (`CampPage.tsx:153, 159`). A refresh, the back button or a shared link always lands on Overview of the default program. Fix: `?program=…&tab=students` via `useSearchParams`.

**1.5 The default program is the oldest, not the current one.** The program API orders by `created_at` ascending (`api/camp/program/route.ts:64`) and the page picks `groups[0]` (`CampPage.tsx:313-315`). Once an academy runs a second camp, everyone lands on last season's. The selector does not mark a finished camp either (`CampPage.tsx:1726-1763`). Fix: default to the program whose window contains today, else the most recent. Add an "Ended" badge when `ends_on` is in the past.

**1.6 Review decks are hard to reach and cannot be presented again.** The deck list (`CampPage.tsx:1076-1117`) offers only Delete, although its own comment says it exists so a teacher can "present it again" (`:1076-1078`). Escape closes the presenter immediately (`CampReviewPresenter.tsx:58`). An accidental Escape loses a deck whose quota is already spent, and the next try costs more quota. Fix: add a Present button per deck (the GET `?id=` path already returns its items), and ask for confirmation before Escape closes the presenter.

**1.7 No route from an empty camp to setting it up.** "No classrooms are attached to this camp program yet." (`CampPage.tsx:888-894`) has no action button. Classrooms and rosters are managed on the Classrooms page through the camp toggle (`useCampPrograms.ts`). Fix: give the `EmptyState` an `action` that links to the Classrooms page with the create modal open and the camp preselected.

**1.8 Reports are split across two places with different powers.** The classroom Reports modal (`CampReportsPanel.tsx`) can generate and preview but cannot withdraw. The student modal's Reports tab (`CampStudentDetail.tsx:349-403`) can withdraw. Neither shows whether a parent opened a report. Fix: one reports list per classroom, grouped by generation batch, with Withdraw and a "viewed" indicator.

## 2. Visual design and visibility

**2.1 Low-contrast action and meta text.** `text-gray-300` (#d1d5db, about 1.5:1 on white) is used for:
- the edit and delete icons (`CampPage.tsx:1039, 1055, 1104`; `CampStudentDetail.tsx:394`)
- the "n=" counts (`CampOverviewPanel.tsx:250`; `CampClassroomDashboard.tsx:266, 297`)
- the report's generated-at line (`CampReportView.tsx:216`)
- the "—" placeholders

`text-gray-400` (about 2.5:1) carries meaningful secondary numbers such as "/ 60 cap" and "12/40 sessions" (`CampOverviewPanel.tsx:88, 108`) and the count hint (`CampPage.tsx:1308`). The design comment calls the icons "quiet by default", but quiet should mean gray-500, not invisible. Fix: icons at gray-500 rising to gray-700 on hover, numbers at gray-500 or above.

**2.2 Status colours mean different things on each surface.**
- Accuracy bars: green from 70% on the classroom dashboard (`CampClassroomDashboard.tsx:260`), green from 80% with a sky band at 60-79 in the report (`CampReportView.tsx:25-30`), rose below 40 and amber 40-69 in the overview topics (`CampOverviewPanel.tsx:247`).
- "In progress": amber on staff surfaces (`CampStudentsPanel.tsx:49-53`) but blue on student surfaces (`CampAssignmentsShelf.tsx:105`; `CampWorkCard.tsx:165`).
- "Done" is emerald whatever the score (`CampClassroomDashboard.tsx:224-228`), so a 3/20 finish reads green.

Fix: one shared `accuracyTone()` and one `stateTone()` in `src/lib/camp/`, used everywhere. Show done-with-score as a neutral chip with the percentage coloured.

**2.3 The donut presents "missing" as empty.** Missing is `#e5e7eb` (`CampPage.tsx:1675`), the same light gray an empty track uses. The worst outcome is the least visible slice. Fix: give missing a rose tone and late amber; keep gray for "not yet due" if it is ever drawn.

**2.4 Dark mode leaks.** The app remaps the gray ramp globally (`globals.css:187-260`), which covers most camp classes. The hard-coded colours escape it:
- the donut centre label uses `fill-gray-900` (`CampPage.tsx:1703`), which is not remapped, so the completion % is near-black on a dark card
- the missing slice `#e5e7eb` becomes the brightest thing on the card
- the trend tooltip is `backgroundColor: 'white'` with a light border (`CampOverviewPanel.tsx:199-204`)
- the axis ticks use a fixed `#9ca3af`
- the tinted info boxes (`bg-emerald-50 text-emerald-800`, `bg-amber-50`) in the delete dialogs (`CampPage.tsx:1501-1507, 1619-1629`) show as light patches

Fix: use `currentColor` or CSS variables for the SVG and Recharts colours, and add `dark:` variants to the tinted boxes, as `CampReportDelivery.tsx:56` already does.

**2.5 Type scale is very small for a tablet tool.** Card labels and table headers are 10-11 px uppercase with wide tracking (`CampOverviewPanel.tsx:79`; `CampStudentsPanel.tsx:173`; `CampClassroomDashboard.tsx:182`). The answer-review choices are `text-xs` even for reading passages (`CampStudentSessionReview.tsx:274`). Uppercase tracking does nothing for Korean and only shrinks it. Fix: 12 px minimum for labels, `text-sm` for review choices, and no uppercase transform when `language === 'korean'`.

**2.6 The quota meter jumps straight from blue to red at 90%** (`CampPage.tsx:809, 818`), with no warning band and no message at 100%. Fix: amber from 75%. At 0 remaining, say who to contact and disable the create and review buttons with that reason.

## 3. Usability of core tasks

**3.1 Create an assignment: 6-8 inputs, with spending only checked after submit.** The steps are New assignment -> classroom (auto-filled when there is one) -> optional session -> title (required, `CampPage.tsx:1236-1247`) -> section -> domain -> count -> optional due date -> Create.
- `isFormValid` does not compare the count with `quotaRemaining` (`:589-596`), so an over-quota request is rejected only after the round trip.
- The question pool size is unknown until a `not_enough_items` error.
- Count cannot be changed afterwards (`camp.editAssignment.hint`), but the form never shows a summary such as "This uses 20 of 140 remaining questions".
- The title has no default, although section, domain and session date are enough to build one.

Fix: prefill the title (for example "Math · Algebra · Oct 22"), validate count against remaining in the browser, and state the quota cost on the submit button ("Create · uses 20").

**3.2 Teachers cannot prepare work before the camp starts.** The assignments POST rejects anything outside `starts_on..ends_on` (`api/camp/assignments/route.ts:186-189`, the same check in `review-set/route.ts:220-223`). "New assignment" stays enabled and the rejection shows the raw English string "camp program is not active today" (`CampPage.tsx:624`). Teachers plan the first day's sets in the week before. Fix: allow drafting before `starts_on` and gate only the student start. At minimum, disable the button with a localised reason.

**3.3 Report generation has no confirmation, preview, scope or undo** (see 8.4 for the accuracy side). Both "Generate report" (`CampStudentDetail.tsx:233`, the footer primary button of a detail modal) and "Generate reports" (`CampReportsPanel.tsx:126`) insert rows that parents can read at once (`reports/generate/route.ts:86-110`). A teacher who clicks to "see the report" has just sent one home. Repeated clicks create another full set for every student. Fix:
- a confirmation such as "Publish 24 reports to families?", with a period picker (the API already accepts `periodStart`/`periodEnd`)
- label the button "Publish to families", not "Generate"
- add a batch-level Withdraw
- for "show me the report", use the live Overview tab, which already renders the same layout (`CampStudentDetail.tsx:284-286`)

**3.4 Deleting an assignment is well handled.** The sittings check and the refund wording are a model (`CampPage.tsx:424-442, 1612-1631`). One gap: when the check fails, the dialog reads "We couldn't check…" in amber but keeps the destructive button enabled with no extra friction. That is acceptable, so no change needed.

**3.5 The presenter keyboard model collides with buttons.** A global keydown handler takes Space for reveal (`CampReviewPresenter.tsx:57`), so Space on a focused Previous or Next button toggles reveal instead of pressing the button. No initial focus is set, and Tab can leave the overlay because it uses a custom portal rather than `Modal`. The jump-to dots are 10 px (`:162-164`). Fix: ignore Space when `e.target` is a button, set initial focus, and give each dot a 24 px hit area with a smaller visual.

**3.6 A student's detail opens in 2-3 steps.** From the Students tab it is one click on a row, which is good. From Classrooms it is View progress -> click a name. Answer review takes two more clicks (Assignments tab -> row). That is reasonable. The modal-over-modal flow (`CampStudentDetail.tsx:218`) works, but it loses the tab when you return from a session review, because the detail modal unmounts its body and `tab` persists only while it stays mounted. Check this in the browser.

## 4. States

**4.1 Errors look like empty states (high).**
- Program fetch failure or non-200 -> `setProgramGroups([])` (`CampPage.tsx:306-308, 319-321`) -> "Your academy does not have an active camp program" (`:712-731`). A paying school told it has no camp will phone support.
- Overview failure -> `if (!res.ok) return` (`:351`) leaves `overview === null`, so `CampOverviewPanel` shows its skeleton forever (`CampOverviewPanel.tsx:45-69`).
- Assignment and deck fetch failures -> `[id, []]` (`CampPage.tsx:268, 278`) -> "No assignments yet".
- Reports list failure -> `[]` -> "No reports yet" (`CampReportsPanel.tsx:58-61`).
- Session-search options failure -> "No sessions" (`CampPage.tsx:245`).

Fix: keep an `error` state on each fetch and render `ErrorState` with a Retry button. The Students panel already tracks the error (`CampStudentsPanel.tsx:63, 125-127`), but it renders bare red text with no retry; give it one too.

**4.2 "Empty" is often a permissions failure (high).** `/api/camp/program` returns every classroom in the program to any active teacher (`api/camp/program/route.ts:74-80`), while assignment, deck, report and review routes require `canManageClassroom`, meaning the classroom's own teacher or a manager (`lib/camp/api.ts:62-78`). A camp teacher therefore sees colleagues' classrooms:
- "0 assignments" and "No assignments yet" (403 -> `[]`)
- Reports and Class review buttons that fail
- those classrooms in the New Assignment picker (`CampPage.tsx:1163-1165`), where the submit fails with the server's English "Forbidden"

Fix: return a `canManage` flag per classroom. Hide or disable the actions on rooms the teacher cannot manage, or filter those rooms to read-only.

**4.3 Loading.** The skeleton shows an enabled "New assignment" button (`CampPage.tsx:655-658`) that does nothing. Make it disabled. The mobile report detail shows a bare spinner (`mobile/camp-reports/[id]/page.tsx:71-74`) where the list uses a skeleton; use one there too.

**4.4 Empty camp states.**
- No classrooms: no action (1.7).
- Classrooms present but "New assignment" disabled: no tooltip explains why (`CampPage.tsx:785`).
- No students: "No students" (`CampStudentsPanel.tsx:128-134`) with no link to enrol.
- Overview on a brand-new camp: 0 / 0% / — / 0 cards and two empty charts. Showing a "Getting started" checklist (classrooms -> students -> first set) until the first completion would serve better.

**4.5 Large classes (100+ students).**
- Matrix: 100 rows x 30 assignments is 3,000 pills that each say "Not started" or "Done". The student column is not sticky, so names scroll away (`CampClassroomDashboard.tsx:177-238`). Fix: a sticky first column, an icon-only cell (dot plus score) with the label in `title` and `aria-label`, and a "show only incomplete" toggle.
- Students table: no pagination or virtualisation, and the API loops classrooms sequentially, running `loadClassroomCampData` (5+ queries each) one after another (`api/camp/students/route.ts:80-115`; same in `overview/route.ts:97-150`). The panel remounts and refetches on every tab switch (`CampPage.tsx:883-885`). Fix: `Promise.all` over classrooms server-side, cache the Students data in the page as is already done for `overviews`, and paginate after about 200 rows.
- The browser makes 2 requests per classroom (`CampPage.tsx:265-283`), plus one session query capped at 1,000 rows (`:295`). A long camp with many classrooms can pass 1,000 sessions, and lessons beyond the cap would lose their date chip silently. Fix: page the session read or scope it to linked session ids.

**4.6 Every mutation reloads the whole page.** Create, edit, delete and deck delete each call `fetchAll()` (`CampPage.tsx:461, 488, 507, 630`), which sets `loading` (`:302`) and replaces the page with the skeleton. Scroll position, open progress panels (they remount and refetch) and context are lost. Fix: a background refetch that keeps the existing data, or local updates like the one `handleReviewSubmit` already does (`:570-574`).

**4.7 Long names.**
- The Students table cells are `whitespace-nowrap` (`CampStudentsPanel.tsx:191-197`), so a long Korean name plus email widens the table and forces horizontal scroll.
- Matrix headers truncate at 180 px with a `title` (`CampClassroomDashboard.tsx:187`), which is fine on desktop but unreadable on touch.
- Assignment titles truncate on one line on mobile with no way to read the rest (`CampWorkCard.tsx:148`; `CampAssignmentsShelf.tsx:81`).
- The program name in the selector truncates (`CampPage.tsx:1738`), which is fine.

Fix: `line-clamp-2` for titles on mobile, wrapping names in the table, and a `min-w` on the name column.

## 5. Mobile and responsive

**Staff (tablet and phone):**
- The skill rows use a fixed `w-56` label plus `w-24` value (`CampClassroomDashboard.tsx:253, 264`). At 375 px the bar shrinks to almost nothing; at tablet width it is fine. Fix: stack the label above the bar below `sm`.
- The header button drops to `h-8 text-xs` on small screens (`CampPage.tsx:786`), under the 44 px touch guideline the student side follows (`CampWorkCard.tsx:141-145`).
- The classroom header's three outline buttons are `h-8 text-xs` (`CampPage.tsx:916-949`) and wrap under the title. That is acceptable on a tablet but cramped on a phone.
- The modals' two-column grids (`CampPage.tsx:1249, 1294`) stay two columns at 375 px, so selects with long SAT domain names ("Problem-Solving and Data Analysis") truncate. Fix: `grid-cols-1 sm:grid-cols-2`.

**Student/parent (mobile-first):**
- Back buttons are `p-1` around a 20 px icon, about 28 px, with no `aria-label` (`mobile/camp-reports/page.tsx:89-91`; `[id]/page.tsx:63-65`). `router.back()` from a deep link leaves the app.
- Report list items are `Card onClick`, not links (`mobile/camp-reports/page.tsx:115-118`): no keyboard access, no long-press open, no prefetch. The Reports-page entry card does the same (`mobile/reports/page.tsx:467-470`).
- "Retry" in both error states calls `router.refresh()` (`mobile/camp-reports/page.tsx:101`; `[id]/page.tsx:77`). That re-renders server components and does not re-run the client `useEffect` fetch, so Retry does nothing. Fix: a `reload` counter in the effect dependencies.
- The order of camp work differs between the two surfaces. `CampWorkCard` puts outstanding work first (`CampWorkCard.tsx:43-47`), while `CampAssignmentsShelf` lists newest first with finished sets mixed in (`lib/camp/student.ts:54`, rendered unsorted at `CampAssignmentsShelf.tsx:59`). The card's "see all" leads to the shelf (`CampWorkCard.tsx:199`), so the order changes on tap. Neither sorts by due date. Fix: one shared sort (overdue, then due soonest, then in progress, then not started, then done).
- Overdue work looks the same as work due later. The due chip is always amber "Due Oct 3" (`CampAssignmentsShelf.tsx:92-97`; `CampWorkCard.tsx:173-177`). Fix: rose "Overdue · Oct 3" when `dueAt < now`.

## 6. Accessibility

- **Labels are not tied to their fields.** Every `<Label>` in the create, review and edit modals has no `htmlFor`, and the controls have no `id` (`CampPage.tsx:1152, 1175, 1236, 1251, 1271, 1296, 1314, 1370, 1397, 1417, 1441, 1533, 1545, 1568`). Screen readers announce the Radix triggers and inputs without names. Fix: `id`/`htmlFor` pairs, or `aria-labelledby` on `SelectTrigger`. The required `*` needs `aria-required` or the word "required".
- **Students rows only work with a mouse.** `tr onClick` has no `tabIndex`, role or key handler (`CampStudentsPanel.tsx:181-190`). The matrix does it correctly with a `<button>` (`CampClassroomDashboard.tsx:207-217`). Fix: a button or link in the name cell.
- **Tabs carry no ARIA** (`CampPage.tsx:827-843`; `CampStudentDetail.tsx:258-276`): no `role="tablist"`/`tab`/`aria-selected`/`aria-controls`, and no arrow-key movement. Radix Tabs is already a dependency.
- **The charts have no text alternative.** The donut's `aria-label` is just "Completed" (`CampPage.tsx:1686`), with no numbers. The trend line chart has none at all (`CampOverviewPanel.tsx:176-218`). Fix: `aria-label="Completed 82, late 11, missing 7"`, plus a visually hidden table or summary sentence for the trend.
- **Touch targets** are 28 px for edit and delete (`CampPage.tsx:1039, 1055, 1104`), 10 px for presenter dots (`CampReviewPresenter.tsx:162-164`) and about 28 px for mobile back buttons.
- **Status is not colour-only.** Pills carry text labels, which is good. The exceptions are the quota bar's red (the chip text explains it) and the topic-accuracy colour, which repeats the number. Fine.
- **The presenter has no focus management** (3.5). Dialogs built on `ModalShell` do trap and restore focus (`modal.tsx:71-107`). Good.

## 7. Copy and i18n

- **No missing keys.** All 217 static `t('…')` keys used by the camp surfaces exist in both `en.json` and `ko.json`, and so do the dynamic subtrees (`camp.sections`, `camp.tasks`, `camp.tabs`, `camp.dashboard.state`). Interpolation mixes `{x}` and `{{x}}` (for example `camp.deleteAssignment.*` and `camp.studentDetail.reportsList.*`). `LanguageContext.tsx:109-110` handles both, but pick one.
- **SAT domains are never translated.** `domainLabel` returns the raw bank string for SAT (`CampPage.tsx:386-390`; `CampClassroomDashboard.tsx:108-111`; `CampReportView.tsx:44-46`). A Korean parent's report and a Korean teacher's skill bars read "Problem-Solving and Data Analysis" and "Standard English Conventions". TOEFL tasks are translated through `camp.tasks.*`. Fix: add a `camp.satDomains.*` map, keyed by the bank literal.
- **Server English reaches the UI.** Raw `json.error` is shown in toasts and inline errors (`CampPage.tsx:452, 485, 501, 554, 624`; `CampReportsPanel.tsx:80`; `CampStudentDetail.tsx:127, 203`). That is how "Forbidden", "camp program is not active today" and "classroom not found" appear in a Korean UI. The review deck title is built server-side in English: `Class review — 2026-10-22` (`api/camp/review-set/route.ts:180`), and it shows in the deck list and the presenter header. Fix: return a `code` on every error and map it to a translation, as is already done for `quota_exceeded`/`not_enough_items`; send the deck title from the browser, localised.
- **Korean terms are inconsistent.** Classroom is 클래스룸 (5 keys, and the nav), 강의실 (`camp.tabs.classrooms`, `camp.students.classroom`), 반 (12 keys) and 학급 (1). An assignment is 과제 in some places and 세트 in others. "쿼터" and "스킬" are anglicisms; consider "문항 한도" and "영역". Fix: choose 클래스룸 (matching the nav) or 반, and 과제.
- **"Session" means two things.** The lesson pickers use `camp.form.session` (a timetable lesson), while the Completion card counts study "sessions" (`camp.overview.sessionsLabel`, "12/40 sessions"; Korean "세션"). Fix: "12 of 40 sets done" / "40개 중 12개 완료".
- **Jargon in front of parents.** The report shows `n={s.total}`, hard-coded in the component (`CampReportView.tsx:159`), and the staff tables show `camp.dashboard.answersLabel` "n={n}". Fix: "based on 12 answers" / "12문항 기준".
- **"Late" is defined unusually.** The overview route counts "late" as past due, started but not finished (`overview/route.ts:30-31, 135`). Work finished after the deadline counts as "Completed". Teachers read "Late" as "handed in late". Fix: rename the bucket "Started, overdue" / "기한 경과(진행 중)", or count late completions as Late.
- **Internal procurement notes shown to customers.** `CampReportDelivery` shows teachers a disabled checkbox with "What's still needed: a Kakao business channel… approved Alimtalk template… registered sender number" (`CampReportDelivery.tsx:62-73`). That is roadmap material, and it appears in two places (`CampReportsPanel.tsx:177`; `CampStudentDetail.tsx:402`). The English `step3` also embeds Korean. Fix: one line, "Families see reports in the Classraum app. KakaoTalk delivery is coming.", or hide it.
- **Unlabelled dates.** An assignment with no due date shows its creation date with a clock icon and no label (`CampPage.tsx:1020-1022`), so it reads as a deadline. Fix: "Created Oct 3", or "No due date".

## 8. Trust and accuracy

**8.1 Three different "average score" numbers.**
- Overview "Average score" is the mean of per-session percentages, unweighted by question count (`overview/route.ts:112-114, 179`). A 5-question set counts as much as a 40-question one.
- Students "Avg score" is answer-weighted accuracy (`students/route.ts:110`).
- The report's "Overall accuracy" is answer-weighted too (`lib/camp/reports.ts:262-263`).

The two can differ by many points for the same cohort. Fix: one definition (answer-weighted) everywhere, with the label "Accuracy" rather than "score" (the marketing mock uses SAT scaled scores, see 8.6).

**8.2 Small denominators reach parents.**
- Class standing: `percentile` is computed whenever `cohort.n > 1` (`lib/camp/reports.ts:268-272`). With two students with results, a parent reads "Ahead of 0% of classmates" or "100%" (`CampReportView.tsx:89-96`).
- Strengths and weaknesses need 5 answers per domain (`report-types.ts:15`). "Strengths" are simply the top three by accuracy (`reports.ts:253-254`), so a student at 30-35% everywhere gets green "Strengths: … 35%".
- Overview topics also need only 5 answers across the cohort (`overview/route.ts:47`).

Fix: suppress the percentile below about 8 classmates. Require an absolute floor (for example 70% or more) for a strength. Show "n" in plain words.

**8.3 The trend line mostly shows the assignment mix and the UTC calendar.**
- Points are per-day means with no weighting and no count in the tooltip (`overview/route.ts:166-167`; `CampOverviewPanel.tsx:205`). A day with one hard Math set plots like a day with forty easy ones.
- Days are UTC (`overview/route.ts:116`), so work done 00:00-09:00 KST lands on the previous day.

Fix: bucket by KST date, show "n sets" in the tooltip, and size or fade low-n points.

**8.4 Report periods and duplicate reports.**
- When no period is passed, the report period defaults to the program's `starts_on..ends_on` (`reports/generate/route.ts:80-83`; the same default in `api/camp/student/route.ts:77`). A report generated on day 10 of a 30-day camp tells the parent "Aug 1 – Aug 31".
- The parent list keys each card on that period (`mobile/camp-reports/page.tsx:136-137`), so a teacher who generates weekly gives the parent several identical cards with no "latest" or "new" marker.

Fix: default `period.end` to the generation date, show "Generated Oct 22" on parent cards, mark the newest, and collapse superseded ones.

**8.5 Other numbers that can mislead.**
- "Last active" counts only completed sessions (`students/route.ts:94-98`). A student mid-way through a set shows "—". Rename it "Last completed", or include `started_at`.
- Students rows are one per (classroom, student) (`students/route.ts:21-23`), while "Students enrolled" counts distinct students (`overview/route.ts:86, 105, 172`). Row count and stat disagree when a student is in two classrooms. Show the classroom on duplicates (it is a column) and note it in the count.
- The classroom panel's "Skills to review" lists every domain with 5+ answers, ranked by wrong rate (`dashboard/route.ts:278-286`). A domain at 5% wrong appears under that heading, while Overview uses below 70% accuracy (`overview/route.ts:154-156`). Apply the same threshold.
- Editing pre-fills the due date with `a.due_at.slice(0, 10)`, which is the UTC date (`CampPage.tsx:1043`). That is safe for 23:59 KST deadlines (14:59Z the same day). For any `due_at` stored before 09:00 KST, each edit and save shifts the deadline back a day. Format with the local date instead.
- Students lose camp work at `ends_on`. `loadStudentCampAssignments` drops every assignment once `today > ends_on` (`lib/camp/student.ts:110`), so completed results and answer review vanish from the student's app the day after camp. Keep finished work readable, or move it to an archive section.

**8.6 Marketing page vs real dashboard.** The sample is labelled ("Illustrative interface with sample data", `landing.camp.dash.disclaimer`). The visible caption is 12 px `text-gray-400` under the mock (`src/app/camp/page.tsx:371`), and the `dash.mockLabel` key "Illustrative mockup" exists but is never rendered. The gaps a buyer would notice:

| Marketing mock | Real dashboard |
|---|---|
| "Latest average 1,240", an SAT scaled score | Percent correct on practice sets. No scaled or predicted score exists anywhere in camp |
| Status legend as percentages (82% / 11% / 7%) | Raw pair counts, with "Late" meaning started but not finished (see 7) |
| Suggested topics at skill level ("Transitions and sentence structure", "Advanced Math: nonlinear equations") | Domain level only: 4 per SAT section, 8 possible topics in total (`reports.ts:180-186`) |
| "Track completed, late, and missing work" (tiles) | Aggregate counts only; no list of who is late or missing (1.1) |
| "Monitor active students and camp engagement" | "Last active" = last completed set (8.5) |

Fix: either align the mock with what ships (percent accuracy, domain-level topics, counts) or build the missing pieces. The first is a copy change in `en.json`/`ko.json` `landing.camp.dash.*`. Render `mockLabel` on the mock's chrome bar so the caption cannot be cropped out of a screenshot.

---

## Quick wins (under a day)

1. Move `formatDate` above the `filteredSessionOptions` memo, or inline it (`CampPage.tsx:218` / `:392`).
2. Add an `error` state and Retry to the program, overview, assignment, deck and report fetches instead of `[]` (4.1).
3. Fix mobile Retry: replace `router.refresh()` with a refetch counter (`mobile/camp-reports/*`).
4. Add a print stylesheet: `@media print { body * { visibility: hidden } .camp-report-print-area, .camp-report-print-area * { visibility: visible } .camp-report-print-area { position: absolute; inset: 0 } }`.
5. Switch every camp date window and trend bucket to the KST date: one `todayInSeoul()` helper used in `start/route.ts`, `assignments/route.ts`, `review-set/route.ts`, `lib/camp/student.ts` and `overview/route.ts`.
6. Make the `CampWorkCard` and shelf rows non-interactive (or link to the report) when the viewer is a parent, not the student.
7. Add a confirmation step to both "Generate report" buttons. Rename them "Publish to families". Default `period.end` to today.
8. Show a rose "Overdue" chip on student surfaces when `dueAt < now`, and use one shared sort.
9. Tie `id`/`htmlFor` on all modal fields. Turn the Students row into a button. Add Radix Tabs or ARIA roles. Move action icons to gray-500 and 32 px or more.
10. Give the donut a real `aria-label` with numbers, a rose missing slice, and `currentColor` text. Make the trend tooltip dark-aware.
11. Add a translation map for SAT domains. Map server error `code`s to translation keys. Localise the review deck title.
12. Replace "n=" with "based on N answers". Hide percentiles below about 8 classmates.
13. Add a Present button to each review deck, and confirm before Escape closes the presenter.
14. Disable the skeleton's "New assignment" button. Explain why the header button is disabled when there are no classrooms. Add the setup action to the no-classrooms empty state.
15. Default to the program running today and mark ended programs.

## Bigger redesign ideas

- **An Overview built around "needs attention".** Replace the four vanity cards with:
  1. Overdue now (n students, n sets), linking to a filtered Students view
  2. Due in the next 48 h, with completion so far
  3. Weakest domain, with one click to build a review deck for it (the review set route already accepts section and domain)
  4. Quota runway (questions left and days left)

  Keep the trend and donut below.
- **An assignment-centred view.** Each assignment row expands into a strip of student initials (done, in progress, not started, overdue), with "remind" (once delivery exists) and "extend due date" actions. That answers "who hasn't done today's set" in one click, the most common question in a running camp.
- **A Students tab as a real grid.** Sticky name column, sortable columns, status filter chips, per-classroom grouping, about 200 rows a page, and CSV export for the academy's own records.
- **A report publishing workflow.** Draft, review a batch (a sample student shown in full, warnings such as "4 students have fewer than 10 answers"), publish, then track who has viewed it. Use the parent-facing "new report" badge on the mobile Reports entry once a notification channel exists.
- **Permission-aware staff views.** "My classrooms" as the default filter for teachers, with colleagues' rooms read-only or hidden, so no action is ever shown that the server will refuse.
- **One metric module.** Define accuracy, completion, overdue, late and the tone thresholds once in `src/lib/camp/metrics.ts` and use it in the overview, students, dashboard and report routes and in every component. Most of the trust findings above come from each surface re-deriving these on its own.
