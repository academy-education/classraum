-- 124_item_hardening.sql — the co-founder hardening pass.
--
-- NOT APPLIED. Tested in a rolled-back transaction against the live
-- database on 2026-10-07 (database/tests/124_item_hardening.test.sql).
-- Review before running.
--
-- ── What this is for ─────────────────────────────────────────────────
-- Many AI-written items were graded just below "hard" — median medium
-- with one or two hard votes, or a grader note saying so. One human twist
-- (a stem condition, one distractor) can often lift them. The SAT hard
-- route is capped by exactly these domains (form-capacity.mjs: R&W SEC,
-- Math Algebra), so every lifted item is a hard form closer.
--
-- ── The one rule ─────────────────────────────────────────────────────
-- A co-founder edit NEVER goes live directly. Saving creates a NEW bank
-- row (verified=false — the assembler ignores it) linked to the original,
-- and queues it. The original stays live and untouched. Only
-- scripts/study-bank/hardening-gate.ts, after the per-family checks and a
-- three-sample with-source grade have passed AT THE STAGED ROW'S CURRENT
-- content_sha, may call study_item_hardening_swap(), which archives the
-- original and verifies the new row in one transaction.
--
-- Why a new row rather than an in-place edit with a snapshot:
--   * study_item_reviews / study_item_attacks / sweep verdicts are bound to
--     content (076, 077, 102). Editing the live row in place would turn
--     its human evidence stale the moment the co-founder pressed Save —
--     before anyone knew whether the edit was any good. A new row leaves
--     the original's evidence describing the original, which it does.
--   * the swap is reversible: un-archive the original, un-verify the new
--     row. Nothing is overwritten.
--
-- ── Bookkeeping kept intact ──────────────────────────────────────────
--   content_sha / dedup_key  GENERATED (077) — the new row gets its own
--                            from its own content; nothing to maintain.
--   content_hash             frozen and unreliable (077) — the new row
--                            gets NULL, never a backfill.
--   reviews / attacks        stay on the ORIGINAL row id. The new row
--                            starts with none, which is the truth: no one
--                            has measured the edited text.
--   dedup_uniq               (dedup_key) where not archived. Both rows are
--                            unarchived until the swap, so an edit that
--                            changes no option or stem text would collide
--                            with its own original. stage() refuses that
--                            case with a reason instead of a unique
--                            violation: an explanation-only edit cannot
--                            make an item harder.
--
-- No FK to public.users / auth.users on editor_id, deliberately: an FK
-- hanging off users is what broke delete_user_account_cascade before
-- (memory: academy-deletion-blocked-by-assignments). The editor id is a
-- record of who, not a relationship that must survive account deletion.

begin;

-- ── 1. Candidates, as computed by scripts/study-bank/hardening-candidates.ts
create table if not exists public.study_item_hardening_candidates (
  item_id      uuid primary key references public.study_item_bank(id) on delete cascade,
  family       text not null,
  section      text not null,
  domain       text not null,
  subskill     text,
  -- lower = sooner. Derived from how binding the domain is on the hard
  -- route and how many graders already called the item hard.
  priority     integer not null,
  hard_votes   integer not null check (hard_votes >= 0),
  total_votes  integer not null check (total_votes >= 0),
  -- [{ source, grader, difficulty, note }] exactly as recorded in the
  -- grader files, matched to this row by content (prompt + options).
  votes        jsonb not null default '[]'::jsonb,
  signals      text[] not null default '{}',
  -- content_sha of the item WHEN the votes were matched. If the item has
  -- changed since, the votes describe other text and the route hides it.
  item_sha     text not null,
  computed_at  timestamptz not null default now()
);

create index if not exists idx_hardening_candidates_priority
  on public.study_item_hardening_candidates (priority, hard_votes desc);

comment on table public.study_item_hardening_candidates is
  'Items graded just below hard, for the co-founder hardening pass. Written '
  'by scripts/study-bank/hardening-candidates.ts --write. Service-role only.';

-- ── 2. The edit queue ────────────────────────────────────────────────
create table if not exists public.study_item_hardening_edits (
  id                  uuid primary key default gen_random_uuid(),
  original_id         uuid not null references public.study_item_bank(id),
  staged_id           uuid not null unique references public.study_item_bank(id),
  editor_id           uuid not null,
  -- content_sha of the original when the editor opened it. The swap
  -- refuses if the original has changed since: the edit was made against
  -- text that no longer exists.
  original_sha        text not null,
  original_difficulty text not null check (original_difficulty in ('easy','medium','hard')),
  changed_fields      text[] not null default '{}',
  note                text,
  status              text not null default 'queued'
                        check (status in ('queued','in_gate','passed','failed','swapped','withdrawn','stale')),
  gate_run_id         text,
  -- staged row's content_sha at grade time. The swap refuses if the
  -- staged row has changed since it was graded.
  gate_sha            text,
  gate_result         jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  swapped_at          timestamptz
);

-- One open edit per original. A second save while the first is still
-- queued REPLACES the staged text (stage() below); once it is in the gate
-- it is frozen until it passes, fails or is withdrawn.
create unique index if not exists study_item_hardening_one_open
  on public.study_item_hardening_edits (original_id)
  where status in ('queued','in_gate','passed');

create index if not exists idx_hardening_edits_status
  on public.study_item_hardening_edits (status, created_at);

comment on table public.study_item_hardening_edits is
  'Co-founder hardening edits. Each points at a STAGED bank row (verified=false) '
  'and its live original. Only study_item_hardening_swap() makes one live.';

alter table public.study_item_hardening_candidates enable row level security;
alter table public.study_item_hardening_edits      enable row level security;
-- No policies: service role only, like study_item_bank itself (rows hold keys).

-- ── 3. stage(): create or replace the staged version, atomically ─────
create or replace function public.study_item_hardening_stage(
  p_original     uuid,
  p_item         jsonb,
  p_editor       uuid,
  p_expected_sha text,
  p_changed      text[],
  p_note         text
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  o        public.study_item_bank%rowtype;
  v_edit   public.study_item_hardening_edits%rowtype;
  v_staged uuid;
  v_id     uuid;
begin
  select * into o from public.study_item_bank where id = p_original for update;
  if not found then raise exception 'hardening: original % not found', p_original using errcode = 'P0002'; end if;
  if o.archived or not o.verified then
    raise exception 'hardening: original % is not live (verified=%, archived=%)', p_original, o.verified, o.archived
      using errcode = '22023';
  end if;
  if o.content_sha is distinct from p_expected_sha then
    raise exception 'hardening: original % changed since it was opened (stale)', p_original using errcode = '40001';
  end if;
  if public.study_item_dedup_key(p_item) = o.dedup_key then
    raise exception 'hardening: the edit changes no stem, passage or option text' using errcode = '22023';
  end if;
  if coalesce(p_item->>'correct_answer', '') = ''
     or not exists (select 1 from jsonb_array_elements_text(coalesce(p_item->'choices','[]'::jsonb)) c
                    where c = p_item->>'correct_answer') then
    raise exception 'hardening: correct_answer is not one of the choices' using errcode = '22023';
  end if;

  select * into v_edit from public.study_item_hardening_edits
   where original_id = p_original and status in ('queued','in_gate','passed')
   for update;

  if found then
    if v_edit.status <> 'queued' then
      raise exception 'hardening: an edit of % is already in the gate (status %)', p_original, v_edit.status
        using errcode = '55006';
    end if;
    -- Still queued: replace the staged text. No gate has read it yet.
    update public.study_item_bank
       set item = p_item, updated_at = now()
     where id = v_edit.staged_id and verified = false and archived = false;
    if not found then raise exception 'hardening: staged row % is not staged any more', v_edit.staged_id; end if;
    update public.study_item_hardening_edits
       set changed_fields = p_changed, note = p_note, editor_id = p_editor,
           original_sha = o.content_sha, updated_at = now()
     where id = v_edit.id;
    return v_edit.id;
  end if;

  v_id := gen_random_uuid();
  insert into public.study_item_bank
    (family, section, domain, subskill, difficulty, topic_tag, item_type, passage_group_id,
     item, content_hash, word_count, verified, verify_meta, source, cohort, task, archived)
  values
    (o.family, o.section, o.domain, o.subskill, o.difficulty, o.topic_tag, o.item_type, o.passage_group_id,
     p_item, null, o.word_count, false,
     jsonb_build_object('hardening', jsonb_build_object(
       'original_id', o.id, 'edit_id', v_id, 'editor_id', p_editor,
       'original_sha', o.content_sha, 'original_difficulty', o.difficulty,
       'staged_at', now(), 'changed_fields', to_jsonb(p_changed))),
     'hand', o.cohort, o.task, false)
  returning id into v_staged;

  insert into public.study_item_hardening_edits
    (id, original_id, staged_id, editor_id, original_sha, original_difficulty, changed_fields, note)
  values
    (v_id, o.id, v_staged, p_editor, o.content_sha, o.difficulty, p_changed, p_note);

  return v_id;
end;
$$;

-- ── 4. swap(): the only path from staged to live. Idempotent. ────────
create or replace function public.study_item_hardening_swap(p_edit uuid)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  e  public.study_item_hardening_edits%rowtype;
  o  public.study_item_bank%rowtype;
  s  public.study_item_bank%rowtype;
  v_diff text;
begin
  select * into e from public.study_item_hardening_edits where id = p_edit for update;
  if not found then raise exception 'hardening: edit % not found', p_edit using errcode = 'P0002'; end if;
  if e.status = 'swapped' then return 'already_swapped'; end if;
  if e.status <> 'passed' then
    raise exception 'hardening: edit % has status %, only a passed edit can be swapped', p_edit, e.status
      using errcode = '55006';
  end if;

  select * into s from public.study_item_bank where id = e.staged_id for update;
  select * into o from public.study_item_bank where id = e.original_id for update;

  -- The grade must describe the text that is about to go live.
  if e.gate_sha is null or s.content_sha is distinct from e.gate_sha then
    update public.study_item_hardening_edits set status = 'stale', updated_at = now() where id = e.id;
    return 'staged_changed_since_gate';
  end if;
  -- The original must still be the text the edit was made against.
  if o.archived or not o.verified or o.content_sha is distinct from e.original_sha then
    update public.study_item_hardening_edits set status = 'stale', updated_at = now() where id = e.id;
    return 'original_changed';
  end if;

  v_diff := e.gate_result->>'difficulty';
  if v_diff is null or v_diff not in ('easy','medium','hard') then
    raise exception 'hardening: edit % has no graded difficulty in gate_result', p_edit using errcode = '22023';
  end if;

  update public.study_item_bank
     set archived = true,
         updated_at = now(),
         verify_meta = coalesce(verify_meta, '{}'::jsonb) || jsonb_build_object(
           'archived_reason', 'hardened: replaced by ' || s.id::text || ' (edit ' || e.id::text || ')',
           'archived_at', now(),
           'hardened_into', s.id)
   where id = o.id;

  -- Row column is the source of truth for difficulty (REGISTER 2026-10-06);
  -- the jsonb copy is set to match so the two cannot disagree on this row.
  update public.study_item_bank
     set verified = true,
         difficulty = v_diff,
         item = jsonb_set(item, '{difficulty}', to_jsonb(v_diff)),
         updated_at = now(),
         verify_meta = coalesce(verify_meta, '{}'::jsonb) || jsonb_build_object(
           'grader_difficulty', v_diff,
           'method', 'co-founder hardening edit + per-family checks + with-source grade',
           'hardening', coalesce(verify_meta->'hardening', '{}'::jsonb) || jsonb_build_object(
             'swapped_at', now(), 'gate_run_id', e.gate_run_id, 'gate_sha', e.gate_sha))
   where id = s.id;

  update public.study_item_hardening_edits
     set status = 'swapped', swapped_at = now(), updated_at = now()
   where id = e.id;

  return 'swapped';
end;
$$;

revoke all on function public.study_item_hardening_stage(uuid, jsonb, uuid, text, text[], text) from public, anon, authenticated;
revoke all on function public.study_item_hardening_swap(uuid) from public, anon, authenticated;
grant execute on function public.study_item_hardening_stage(uuid, jsonb, uuid, text, text[], text) to service_role;
grant execute on function public.study_item_hardening_swap(uuid) to service_role;

commit;
