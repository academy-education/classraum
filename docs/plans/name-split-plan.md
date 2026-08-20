# Splitting `users.name` into 성 (family_name) + 이름 (given_name)

Research-only plan. Measured against the live database on **2026-08-20**.
No schema, code or data was changed to produce it.

The owner's rule, verbatim:

> "in korean it would be the first name being the 2nd and 3rd character and the
> first character would be the last name (following korean name). Then the rest
> of the users, we can ask them to reenter their name if it is not possible."

So: `family_name = left(n,1)`, `given_name = substr(n,2)`, and everything the
rule cannot handle confidently gets re-prompted.

---

## 0. Name reconstruction — the precedence actually used

`public.users` now holds **444** rows (the prior audit said 443; the table grew).
316 of them are privacy-masked by a bulk import. The mask is **first character +
`**`** — a 3-character string, *not* the output of `maskName()` in
`src/lib/study/identity.ts` (that produces `첫**끝`, four chars for a 3-syllable
name). The masks are an import artifact.

Precedence for the "best known real name":

```
resolved = CASE WHEN users.name LIKE '%*%'
                THEN COALESCE(
                       NULLIF(btrim(auth.users.raw_user_meta_data->>'name'),''),
                       NULLIF(btrim(family_members.user_name),''),
                       btrim(users.name))
                ELSE btrim(users.name) END
```

Measured coverage of that precedence:

| | count |
|---|---|
| masked rows | 316 |
| …recovered from `auth.users` metadata | **316 (100%)** |
| …needing the `family_members` fallback | 0 |
| …unrecoverable | 0 |

The `family_members.user_name` leg is therefore **dead weight for this
migration** — keep it in the SQL only as a belt-and-braces clause. Independently:
314 `family_members.user_name` values exist, 301 differ from `users.name`, and
**300 of those 301 are exactly the auth-metadata value**, i.e. the drift is the
masking, not a third opinion.

Same for auth metadata: of 417 rows with both values, **317 differ, 316 of them
purely because `users.name` is masked**. The single non-mask drift is
`Support` vs `Supprt` (a typo in metadata on the super_admin row). There is no
real divergence problem here — there is one masking event.

**Cross-check (whole population, not a sample):** `left(users.name,1) =
left(auth_metadata_name,1)` for **316/316** masked rows. The surname character
already survives in `users.name`. That is a useful independent confirmation of
the auth-metadata recovery — *except* for the 150 relationship-label rows, where
that first character is the **child's** surname, not the account holder's (see §3).

---

## 1. Coverage — every row classified against the rule

444 rows, 100% accounted for.

| Bucket | Count | % | Rule output | Verdict |
|---|---:|---:|---|---|
| **Korean 3-syllable** (성1 + 이름2) | **203** | 45.7% | `김/영희` | **CORRECT — 202.** One WRONG: `다니엘` (Daniel transliterated; a given name with no surname → `다`/`니엘`). |
| **Korean + space — relationship labels** | **150** | 33.8% | `강`/`하준 아버지` | **WRONG — all 150.** Not names at all. See §3. |
| **Latin, two tokens** | **53** | 11.9% | n/a (Korean rule must not fire) | **CORRECT if routed to a space-split**: 51 real (`Hyewon Song`, `Daniel Kim`, `Yungi Baek` …). 2 are relationship labels in English: `DoYeon's Mom`, `Papa Lynch` → **NEEDS-REPROMPT**. |
| **junk / test / placeholder** | **27** | 6.1% | garbage in, garbage out | **NEEDS-REPROMPT** (or exclusion): `Test 1-4`, `Test User` ×2, `Camp E2E *` ×5, `Development User`, `Tour Demo`, `KG INICIS`, `John Doe`, `Support`, `Parent Bob`, `Student John/Sarah`, `Teacher Alice`, `Testparent`, `Test Lee`, `Test (James)`, `Test parent #5`, `Test Student #5`, `Test Student Daniel`, `Test Students #5 (2)`. |
| **Latin, one token** | **5** | 1.1% | no surname available | **NEEDS-REPROMPT**: `Andy` ×2, `Eunice`, `Minho`, `Stellar`. |
| **Latin, three-plus tokens** | **2** | 0.5% | ambiguous boundary | **NEEDS-REPROMPT**: `Sung Eun Kim`, `Hara Yoo T`. |
| **junk — email as name** | **2** | 0.5% | — | **NEEDS-REPROMPT**: `andy@gmail.com`, `andy@test`. |
| **Korean 2-syllable** | **1** | 0.2% | `서`/`율` | **NEEDS-REPROMPT** — see below. |
| **Korean 1-syllable** | **1** | 0.2% | `김`/`` (empty 이름) | **WRONG / NEEDS-REPROMPT**: bare `김`. |
| **Korean 4+ syllable** | **0** | 0.0% | — | *Bucket is empty.* |

Rollup:

- **CORRECT under the rule as written: 253 / 444 (57.0%)** — 202 Korean 3-syllable + 51 Latin two-token routed through a space-split.
- **WRONG (rule fires and produces nonsense): 152 / 444 (34.2%)** — 150 labels + `다니엘` + bare `김`.
- **NEEDS-REPROMPT: 39 / 444 (8.8%)** — junk, one-token, 3-token, emails, `서율`, the 2 English labels.

Trailing whitespace exists on **3** rows (`Eunice `, `Test 3 `, one 3-syllable
row) — trivially handled by `btrim`, but the backfill must do it or the split
silently shifts.

### On the 2-syllable case (e.g. 김구)

The rule gives a 1-character 이름. **That is correct Korean** — 김구, 이이, 강감찬's
counterpart 최치원 aside, 1-character given names are real and the rule handles
them properly. It is not a defect of the rule.

The problem is a different one, and the single row in this bucket demonstrates
it: `서율` is almost certainly a **2-character given name with the surname
missing** (서율 is a common modern 이름), not 서 + 율. The rule cannot tell 김구
(surname + 1-char name) apart from 서율 (no surname + 2-char name), and neither
can a script. **So: apply the rule to 2-syllable names, but flag them for
confirmation** rather than treating them as settled. n = 1 today, so the cost is
nil either way.

### On the 4+ syllable case

**The bucket is empty.** No user has a Korean name of 4 or more syllables
without a space. The compound-surname mis-split the rule is theoretically prone
to (§2) has **no instance in the data at all**, and neither does a 3-character
given name (e.g. 김빛나리).

---

## 2. The compound-surname question, answered with data

Prefix-scan across **every** name column in the database — `users.name`,
`auth.users.raw_user_meta_data->>'name'`, `family_members.user_name`,
`student_reports.report_name`, `families.name`, `level_test_attempts.taker_name`,
`camp_reports.payload->'student'->>'name'`, `account_deletion_log.user_name`:

| 복성 | rows starting with it |
|---|---:|
| 남궁 | **0** |
| 선우 | **0** |
| 황보 | **0** |
| 제갈 | **0** |
| 사공 | **0** |
| 서문 | **0** |
| 독고 | **0** |
| 동방 | **0** |
| 소봉 | **0** |
| 어금 | **0** |
| 망절 | **0** |
| 즙문 | **0** |
| 강전 | **0** |
| *(control)* 김 | **111** |

**Zero.** Not one row in the entire database begins with a Korean compound
surname.

The control row matters — the first version of this query used `LEFT JOIN … 
count(*)`, which counts the null-padded non-match row and returned `1` for
every surname including a deliberately-bogus Japanese `こ`. Re-run as
`count(joined.n)` with a known-answer positive control (김 = 111) it reports the
real number. A detector that cannot reproduce a known count on known data has no
business reporting zeros.

**Finding: the rule is imperfect in theory and exactly correct in practice.**
Do not build compound-surname handling into the backfill. Do handle it in the
*form* (§4), because the next 남궁 to sign up is a real possibility, and a
2-field form lets them type it correctly without any detection logic at all.

Corollary: the whole `Korean 4+ syllable` risk class collapses to "the form must
allow a 2-character 성", which it does by construction.

---

## 3. The relationship-label problem — 150 rows, and they are worse than they look

All 150 are exactly `<child name> 아버지` (82) or `<child name> 어머니` (68). No
other relation words appear. Measured properties, all at 150/150:

- `users.role = 'parent'` — **150/150**
- a `family_members` row exists — **150/150**
- the `<child name>` prefix resolves to an actual **student** in the same family
  — **150/150**
- `users.name` is masked — **150/150**

The last one is the sting. The masked value is `강**` — first character of the
*label*, which is the **child's** surname. Combined with the auth metadata
holding the label rather than a name, **the real name of these 150 parents does
not exist anywhere in the database.** There is nothing to back-fill from, and
the child's surname is not a safe inference (a Korean mother keeps her own 성,
so ~half of the 68 어머니 rows would be given the wrong surname by that guess).

Under the owner's rule these become `family_name = 강`, `given_name = 하준 아버지`,
which then renders as "하준 아버지님" in the greeting and sorts under 강 — a
plausible-looking, entirely wrong record. This is the single largest WRONG
bucket and it is 34% of the table.

### Recommendation

**Do not migrate these 150 rows. Treat them as a data-model bug, not a parsing
problem, and fix them with a relation field.**

1. **Add `family_members.relation`** (`text NULL`, CHECK in
   `('father','mother','guardian','grandparent','other')`). The table already
   carries `role` — but `role` is only `'parent' | 'student'`, so 아버지 vs 어머니
   has nowhere to live and that is *why* it ended up welded into the name.
   Confirmed: `family_members` columns are
   `user_id, family_id, role, created_at, user_name, phone, email, id`.
2. **Backfill `relation` from the label** — this part *is* mechanical and safe:
   `아버지 → 'father'`, `어머니 → 'mother'`, 150/150 parse. Do it in the same
   migration, reading the label out of `auth.users` metadata (the unmasked copy).
3. **Leave `users.family_name` / `given_name` NULL** on all 150 and put them in
   the re-prompt cohort with a *label-aware* variant of the form (§4): pre-fill
   the relation dropdown from step 2 and show the child's name as read-only
   context ("**강하준** 학생의 보호자"), then ask only for 성 and 이름. That turns a
   cold "please re-enter your name" into a one-line confirmation.
4. **Display contract until they answer**: render
   `{child_name} 학생 {relation_label}` from *structured* fields (§4 fallback),
   not from the frozen string. Nothing regresses visually, and the sort key
   becomes the child's surname deliberately rather than accidentally.

Also fold in the 2 English labels (`DoYeon's Mom`, `Papa Lynch`) — same
treatment, `relation = 'mother'` / `'father'`, name unknown.

---

## 4. The re-prompt design

### Who gets prompted

Anything where `users.family_name IS NULL` after the backfill: **191 rows**
(150 labels + 39 needs-reprompt + `다니엘` + bare `김`), i.e. 43% of accounts.
Note that ~27 of those are test/E2E accounts that will never log in, so the real
human cohort is roughly **164**.

### Trigger — next login, not first write

Fire on the **first authenticated page load after the deploy**, in
`AuthWrapper` (`src/components/ui/auth-wrapper.tsx`), as a **blocking modal on
`/settings` and a dismissible banner everywhere else**. Reasons:

- "first write" is wrong: most of these users (parents) may go weeks without a
  write, and the *reads* are what look broken in the meantime.
- a hard block on every surface would wall 43% of accounts out of the app on
  deploy day. Not acceptable.
- the modal on `/settings` is where a name change already belongs, so the
  form has a natural permanent home whether or not the prompt fires.

Add `users.name_confirmed_at timestamptz NULL`. The prompt fires while
`family_name IS NULL AND name_confirmed_at IS NULL`. It does **not** re-fire
after a dismissal within the same session, and backs off to once per 7 days
after 3 dismissals (`user_preferences` counter, or a `name_prompt_snoozed_until`
column — prefer the latter, it is one value and cannot drift).

### What the form shows — 성 first, then 이름

The current settings page renders **firstName then lastName**, and
`src/locales/ko.json` maps `settings.account.firstName = "이름"` and
`settings.account.lastName = "성"`. So a Korean user today sees **이름 → 성**,
which is backwards, and `saveUserData()` stores the concatenation in that same
inverted order. Both must be fixed together; fixing only one makes it worse.

Form spec:

- **Two inputs, 성 first, 이름 second**, in that DOM order, in both locales.
  (In English the labels read "Family name" / "Given name" — *not* "Last name" /
  "First name", which invite Western ordering.) Do not reorder by locale: the
  data model is 성/이름, and a single stable field order keeps the read sites
  honest.
- **`성` accepts 1–2 characters** of Hangul (or 1–40 Latin). This is the entire
  compound-surname solution — 남궁 types itself.
- **`이름` accepts 1+ characters.**
- **The existing `validation.nameTooShort` rule ("최소 2자") must be removed from
  the 성 field.** A 1-character 성 is the *normal* case; keeping that rule would
  make every Korean user fail validation.
- **Pre-fill from the rule where it is safe**: 3-syllable rows already split
  (they will not be prompted); 2-syllable rows pre-filled with the split and a
  "확인해 주세요" hint; label rows pre-filled with relation + child context and
  empty name fields; Latin two-token rows pre-filled `given = token[0]`,
  `family = token[1..]` with the same confirm hint.
- **One error key per field.** Today both inputs share `validationErrors.name`,
  so a bad 성 highlights the 이름 box too.

### If the user dismisses

Nothing breaks. `family_name`/`given_name` stay NULL; the account keeps working;
the banner returns per the back-off. No write is blocked, no read fails.

### The fallback contract while first/last are NULL

This is the load-bearing part, because ~191 rows will sit in that state
indefinitely. **Define one function and route every read through it**, replacing
the ~22 inline reimplementations:

```ts
// src/lib/name.ts  (does not exist today — this is the point)
export function displayName(u: {family_name?: string|null,
                                given_name?: string|null,
                                name: string}): string {
  if (u.family_name && u.given_name) return `${u.family_name}${u.given_name}`  // ko
  return u.name                                                                // frozen legacy
}
export function sortKey(u): string            // family_name ?? name
export function initials(u): string           // family_name?.[0] ?? name[0]
export function honorific(u, locale): string  // `${displayName(u)}님` in ko
```

Rules:

- **`users.name` is never dropped and never stops being written.** It is the
  fallback for every NULL row and the compatibility surface for the 8 PortOne
  sites, the notification snapshots, and the ~240 display sites that will not be
  touched in the first deploy.
- **PortOne always gets `users.name`**, never a reconstruction. Both shapes
  (nested `customer.name.full` for server REST × 3, flat `fullName` for the
  browser SDK × 5, plus the `purchase-credits.ts` plumbing) keep passing the
  single string. Do not touch these files in this migration at all — a name
  mismatch against the card issuer fails the charge.
- **`maskName()` in `src/lib/study/identity.ts`** keeps operating on the joined
  string. It already Korean-detects and takes `[0]` — which is the 성 — so it is
  correct by accident today and stays correct. Do not "improve" it to use
  `family_name`; that would change every leaderboard display for users whose
  fields are NULL.

---

## 5. Migration plan

### 5.1 Schema

```
ALTER TABLE public.users
  ADD COLUMN family_name        text NULL,      -- 성
  ADD COLUMN given_name         text NULL,      -- 이름
  ADD COLUMN name_confirmed_at  timestamptz NULL,
  ADD COLUMN name_prompt_snoozed_until timestamptz NULL;

ALTER TABLE public.family_members
  ADD COLUMN relation text NULL
    CHECK (relation IN ('father','mother','guardian','grandparent','other'));
```

Deliberately:

- **Both new name columns NULLABLE, no default.** NULL is the signal "the rule
  could not do this — ask the user". A `''` default would erase that signal, and
  a NOT NULL would force the backfill to invent 191 values.
- **No generated column** for `name`. A generated `name` would have to be
  `family_name || given_name`, which is NULL for 43% of rows against a NOT NULL
  column, and it would silently rewrite every Latin name to have no space.
- **`users.name` stays `text NOT NULL` and stays authoritative.** It is not
  derived. See §5.4.
- **No index yet.** There are no name indexes today and exactly one server-side
  order-by-person-name (§6); add `(family_name, given_name)` only if that one
  query shows up in slow logs.

### 5.2 Backfill

Two statements, both restricted to the rule-safe buckets. Run in a transaction,
`SELECT` the affected counts before COMMIT, and check them against the numbers
in §1 — 202 and 51 — before committing. If either count differs, roll back:
something moved in the data since 2026-08-20.

```sql
-- (a) Korean 3-syllable, resolved through auth metadata for the masked rows.
WITH resolved AS (
  SELECT u.id,
         btrim(CASE WHEN u.name LIKE '%*%'
               THEN COALESCE(NULLIF(btrim(au.raw_user_meta_data->>'name'),''),
                             NULLIF(btrim(fm.user_name),''), u.name)
               ELSE u.name END) AS n
  FROM public.users u
  LEFT JOIN auth.users au ON au.id = u.id
  LEFT JOIN LATERAL (SELECT user_name FROM public.family_members
                     WHERE user_id = u.id AND user_name <> '' LIMIT 1) fm ON true
)
UPDATE public.users u
SET family_name = left(r.n,1),
    given_name  = substr(r.n,2),
    name        = r.n            -- also un-masks users.name; see §5.4
FROM resolved r
WHERE r.id = u.id
  AND r.n ~ '^[가-힣]{3}$'
  AND r.n <> '다니엘';           -- transliterated given name, no surname
-- expect 202

-- (b) Latin, exactly two tokens, Western order (given family).
UPDATE public.users
SET given_name  = split_part(btrim(name),' ',1),
    family_name = split_part(btrim(name),' ',2),
    name        = btrim(name)
WHERE btrim(name) ~ '^[A-Za-z''-]+ +[A-Za-z''-]+$'
  AND btrim(name) !~* '(test|demo|e2e|john doe|kg inicis|parent bob|student (john|sarah)|teacher alice)'
  AND btrim(name) NOT IN ('DoYeon''s Mom','Papa Lynch');
-- expect 51

-- (c) relation, from the label (§3). NAME COLUMNS DELIBERATELY LEFT NULL.
UPDATE public.family_members fm
SET relation = CASE WHEN a.n ~ '아버지$' THEN 'father' ELSE 'mother' END
FROM (SELECT u.id, btrim(au.raw_user_meta_data->>'name') n
      FROM public.users u JOIN auth.users au ON au.id = u.id
      WHERE btrim(au.raw_user_meta_data->>'name') ~ '^[가-힣]+ +(아버지|어머니)$') a
WHERE fm.user_id = a.id;
-- expect 150
```

Everything else — the 191 rows — is left NULL on purpose.

**Verification that would actually fail** (per the repo's standard): after the
backfill, assert `count(*) WHERE family_name IS NOT NULL AND
family_name || given_name <> name` **= 0**, and assert `count(*) WHERE
family_name IS NULL` **= 191**. Then, separately, spot-revert statement (a) on a
branch DB and confirm the first assertion's *count* drops to 51, not that it
merely stays green.

### 5.3 The trigger

`public.handle_new_user()` is **live in production and absent from
`database/migrations/`** — it exists in the repo only as two comments
(`src/app/auth/page.tsx:553`, `src/app/api/onboarding/[token]/route.ts:198`).
Its full definition has been pulled from the live DB; the relevant part is:

```sql
INSERT INTO public.users (id, email, name, role, phone)
VALUES (NEW.id, NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        user_role, NULLIF(NEW.raw_user_meta_data->>'phone',''));
```

Step 0 of this migration is **committing the current definition verbatim as a
migration file**, before changing anything. Then extend it to read
`raw_user_meta_data->>'family_name'` / `->>'given_name'` when present, falling
back to the existing `name` behaviour, and to leave the new columns NULL when
they are absent — so a signup that predates the new form lands in the
re-prompt cohort rather than getting a guessed split.

Note the trigger swallows all errors (`EXCEPTION WHEN OTHERS … RAISE WARNING`).
A mistake in the extended version will **not** fail the signup; it will silently
produce a user with no name. Test it by asserting the row contents after a
signup, not by checking that signup succeeded.

### 5.4 What happens to each denormalised copy

| Copy | Rows | Decision |
|---|---:|---|
| `public.users.name` | 444 | **Kept, NOT NULL, maintained.** Remains the authoritative single-string form and the universal fallback. Every writer that sets `family_name`/`given_name` must set `name` in the same statement. Not a generated column (43% would be NULL). |
| `auth.users.raw_user_meta_data->>'name'` | 417 | Keep writing (the trigger and Supabase both read it). Add `family_name`/`given_name` alongside on new signups. **Do not backfill it** — it is currently the *only* copy of the 316 unmasked names and the 150 labels; rewriting it destroys the evidence. |
| `family_members.user_name` | 314 | **Deprecate, do not delete.** 301/314 already disagree with `users.name`, 300 of those because they hold the unmasked value. Add `relation`. Point reads at `users` via the existing `user_id` FK; drop the column in a later, separate migration once no read remains. |
| `notifications.title_params` / `message_params` | 3 508 rows carry params | **Frozen snapshots — never touch.** They are the historical record of what the notification said. Rewriting them would change the text of past notifications. |
| `student_reports.report_name` | 86 | Not a person name (report title). Out of scope. |
| `families.name` | 179 | Household label, not a person name. Out of scope. |
| `camp_reports.payload->'student'` | 17 | Frozen report payload. Never touch. New reports pick up the corrected `users.name` automatically. |
| `account_deletion_log.user_name` | 3 | Audit record. Never touch. |
| `level_test_attempts.taker_name` | 6 | Free-typed by the test taker, not a user account. Leave as a single field. |

### 5.5 Deploy order

Each step is independently revertible. Nothing between steps leaves the app broken.

| # | Step | Why here |
|---|---|---|
| **0** | Commit `handle_new_user()` **as it currently exists** as a migration file. No behaviour change. | It is not under version control. Every later step depends on being able to diff it. |
| **1** | `ALTER TABLE` — add the 4 `users` columns + `family_members.relation`. All nullable. | Additive. Zero app impact; PostgREST just starts returning two more nulls. |
| **2** | Ship `src/lib/name.ts` (`displayName`, `sortKey`, `initials`, `honorific`) reading the new columns with the `users.name` fallback. **No call sites converted yet.** | Dead code that compiles. Lets step 3 be reviewed on its own. |
| **3** | Run the backfill (§5.2) in a transaction, verify the three counts (202 / 51 / 150), commit. | After step 1, before any reader depends on the columns. Note (a) also un-masks 166 `users.name` values — this is the step where masked names become readable in the UI, and it should be called out to the owner. |
| **4** | Update `handle_new_user()` to accept the new metadata keys with old-shape fallback. | Must land before the new form, or new signups silently lose the split. |
| **5** | Rewrite the settings form: 성-then-이름 order, two real state fields, per-field validation, write `family_name` + `given_name` + `name` together. Fix the ko.json label/order inversion. Add the same pair to signup and onboarding. | The only way any of the 191 NULL rows ever gets filled. |
| **6** | Ship the re-prompt (AuthWrapper banner + `/settings` modal), gated on `family_name IS NULL AND name_confirmed_at IS NULL`. | After step 5, so the form it opens exists. |
| **7** | Convert the 26 string-surgery sites (§6) to `src/lib/name.ts`. | Behaviour-preserving for every row, since the helpers fall back to `name`. Can be split across several PRs. |
| **8** | *(Later, separate)* Migrate the one server-side sort and the client comparators to `(family_name, given_name)`. | Changes visible roster order — needs its own announcement. See §6. |
| **9** | *(Much later)* Drop `family_members.user_name`. | Only once no read remains. |

**PortOne appears at no step.** All 8 sites keep passing `users.name` unchanged.
That is deliberate — the two shapes must not be unified and a name change on a
billing key breaks the charge.

### 5.6 Rollback

| Step | Rollback |
|---|---|
| 1 | `ALTER TABLE … DROP COLUMN` ×5. Nothing reads them yet. |
| 3 | **The destructive one.** Statement (a) overwrites 166 masked `users.name` values, and the masked originals are not recoverable from anywhere else. **Snapshot `SELECT id, name FROM public.users` into `users_name_backup_20260820` (a real table, not a CSV on someone's laptop) inside the same transaction, before the UPDATE.** Rollback = `UPDATE users u SET name = b.name FROM users_name_backup_20260820 b WHERE b.id=u.id`, then null the two columns. Keep the backup table for one full billing cycle. |
| 4 | `CREATE OR REPLACE FUNCTION` back to the step-0 definition. Single statement, instant. |
| 5–7 | Code-only; git revert. The DB columns can stay populated — nothing reads them if the code is reverted, and re-deploying does not need a re-backfill. |
| 8 | Code-only, but users will have seen a re-ordered roster. Revert restores the old order. |

The whole plan is therefore reversible with **one** table snapshot and **one**
function replacement. Everything else is `git revert`.

---

## 6. Blast radius on code

Priors from the earlier audit vs. what is actually in the tree:

| | prior | measured |
|---|---:|---:|
| write sites (person name) | ~30 | **26** |
| display sites | ~200 | **~240** JSX lines across 89 `.tsx` files |
| …of which do **string surgery** on the name | — | **26** |
| formatting helpers | ~35 | **1 shared** (`maskName`) + **3 local** + ~22 inline copies. **There is no central name helper.** |
| server-side `.order()` on a person name | ~12 | **1** |
| PortOne sites | 3 nested + 5 flat | **confirmed** (+1 plumbing carrier) |

The "~35 helpers" prior is the one that matters and it is wrong in the
*dangerous* direction: there is nothing to change centrally, because nothing is
central. Step 2 of the deploy exists to create the thing the prior assumed
already existed.

### MUST change in the same deploy as the schema

Steps 0–6. Concretely:

| File | Why it cannot wait |
|---|---|
| *(new)* `database/migrations/0NN_handle_new_user_snapshot.sql` | Step 0. Trigger is unversioned. |
| *(new)* `database/migrations/0NN_users_name_split.sql` | Steps 1 + 3. |
| *(new)* `src/lib/name.ts` | Step 2. Every later step imports it. |
| `src/components/ui/settings-page.tsx` (~880–1000, and `saveUserData` at 524–551) | The split is fake here today (`split(' ')[0]` re-joined on each keystroke) and the field order is inverted for Korean. If the schema lands and this does not, the form writes a space-joined string into a world that now has 성/이름 columns. |
| `src/locales/ko.json` + `src/locales/en.json` | `settings.account.firstName = "이름"` / `lastName = "성"` must become 성/이름 in render order; `validation.nameTooShort` (min 2) must stop applying to 성. Also the duplicate parallel `settings.firstName`/`lastName` set. |
| `src/app/auth/page.tsx` (signUp :491/:496; users inserts :559, :569/:573, :848; family_members :635/:721/:786) | Primary signup path; must write the new metadata keys the updated trigger reads. |
| `src/app/api/onboarding/[token]/route.ts` (:165/:169 createUser, :208 upsert) | Second account-creating path; has its own retry-around-the-trigger logic that will misbehave if the trigger changes underneath it. |
| `src/app/onboarding/[token]/page.tsx` (:81–82, :166–167, :243, :324) | Carries its **own hardcoded en/ko dictionary** outside `src/locales/` — `fullName: '이름'`. Fixing only `ko.json` leaves this screen inverted. |
| `src/components/ui/auth-wrapper.tsx` | Step 6, the re-prompt trigger. |
| `src/app/api/academy/join/route.ts` (:107, :118) | Copies `users.name` into `family_members.user_name`; must also copy `relation` or the 150-row fix decays on the next join. |

### CAN follow in later PRs

- The **26 string-surgery sites** — every avatar-initial and `split(' ')[0]`
  call. They keep working via the `users.name` fallback. Highest-value first:
  `src/app/mobile/study/StudyHero.tsx:86` and `src/app/mobile/start/page.tsx:29`,
  which do `userName.split(' ')[0]` and then append `님` — for a Korean name
  that returns the *entire* name, so `강하준님` is right today by accident and
  `하준 아버지님` is wrong today for the 150.
- The remaining ~215 plain display sites.
- `src/hooks/useStudentActions.ts:43/:93`, `src/stores/useUserStore.ts:168/:174`,
  `src/components/admin/settings/SettingsDashboard.tsx:109` — secondary write
  paths; safe as long as they keep writing `name`.
- `src/components/ui/families/FamilyImportModal.tsx:204` + `src/lib/csv-parser.ts:267`
  — CSV import. Should eventually accept two columns; until then it writes a
  single string and the row joins the re-prompt cohort.
- All 8 PortOne sites: **no change, ever, in this migration.**

### Sorting — the one visible behaviour change

There is **exactly one** server-side sort on a person name:
`src/hooks/payments/usePaymentData.ts:121` — `.order('users.name')` on the
`students → users!inner(name)` embed. Everything else that looked like a
name-sort in the prior audit orders `classrooms.name`, `subjects.name`,
`assignment_categories.name`, `academy_name` or `name_en`. There are **zero**
`ORDER BY name` statements in `database/migrations/*.sql`.

Client-side there are **8 explicit `localeCompare` sorts** on a person name
(`assignments-page.tsx:905`, `sessions-page.tsx:5076`,
`attendance-page.tsx:1197`, `classrooms-page.tsx:1776`,
`api/study/friends/route.ts:80`, `api/study/friends/leaderboard/route.ts:63`,
`api/camp/dashboard/route.ts:140`, `api/camp/students/route.ts:117`) plus **9
generic comparators** that receive a name field through a `sortField` variable
(`reports-page.tsx:2435`, `payments-page.tsx:1988`/`:2040`,
`assignments-page.tsx:1173`, `announcements-page.tsx:693`,
`payments/modals/TemplatePaymentsModal.tsx:337`, `admin/useTableSort.ts:68`,
`hooks/useAdvancedSearch.ts:330`/`:341`).

**What actually changes when sorting moves to `(family_name, given_name)`:**

- **For Korean names, nothing.** `김영희` sorts identically whether you compare
  the whole string or `(김, 영희)` — the string *is* 성 followed by 이름. All 203
  Korean rows keep their exact current position. This is the happy accident that
  makes step 8 cheap.
- **For the 51 Latin two-token names, the order inverts.** They are stored
  Western-order (`Hyewon Song`), so today they sort by *given* name — `Alex Lee`
  before `Andy Lee` before `Ayoung Won`. Sorting by `family_name` reorders them
  to `Austin, Baek, Byun, Choi, Kim…`. That is a real, visible change to every
  roster containing a Latin-named user, and it is the *correct* change, but it
  will be noticed.
- **For the 191 NULL rows, `sortKey` falls back to `name`**, so mixed lists
  interleave a family-name key with a full-string key. For the 150 labels the
  key is the child's surname, which is the least-bad option and arguably what a
  teacher wants anyway.
- **Collation:** Postgres orders Hangul before/after Latin depending on the
  database collation, and `localeCompare` in the browser does not necessarily
  agree with it. Today that inconsistency is already present in the one
  server-side sort vs. the 8 client ones. **Do not fix collation and the name
  split in the same PR** — if the roster order changes, you want to know which
  of the two did it.

Recommendation: ship step 8 alone, behind a flag if the payments roster is
sensitive, and announce it. Do not bundle it with steps 1–7.
