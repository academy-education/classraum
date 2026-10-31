# Pending lessons: SSAT Upper Level Reading. Authors never read this file.

Brief history: v1 = `SSAT-READING-AGENT-BRIEF.md` (md5 350d3265, drafts 5-18 by agents; drafts 19-22 written
in-session to v1 plus the d19.py header rules). v2 = `briefs/ssat-reading-v2.md`, cut 2026-10-31 (below).

## Folded into v2 (cut 2026-10-31, reason: BLOCKING under BRIEF-VERSIONING.md rule 3)

The verbal key-visible audit (VERBAL-AUDIT-2026-10-31, `scratchpad/verbal-audit/FLAGGED.json`, batch_patterns) read
the v1 cohorts d8, d9, d10, d11 and d14 with two graders each. The same tell was named by BOTH graders in two
consecutive v1 batches, which is the Blocking bar:

1. **Vocabulary-in-context distractors are always unrelated dictionary senses** — d10 a and b (Q06, Q09, Q18, Q19,
   Q25, Q36), d11 a and b as the glossed variant ("as a pharmacist does", "in slang": the unglossed option is the key,
   Q22 held on no_source), d8 b, d9 Q04 held on no_source. v1 rule 5 REQUIRES this shape ("the four distractors are
   OTHER real senses of the word"), so every v1 batch reproduces it by construction. d22 agent-review grader a named
   it again as one_template. v2 R5: each distractor's type (`sense` / `context`) drawn per item, p(context)=0.35; no
   glosses on any option.
2. **Attitude key is the one moderate word** among extreme or off-tone words — d11 a and b, d14 a and b; d8 a and b in
   the topic-default form (Q02 "affectionate" toward a grandmother, Q21 "wary" of an undertow, Q30 "intrigued" by
   lichens: all held on no_source). v1's "five different DIR directions" makes the topic's expected feeling the only
   option of its kind. v2 R4: key intensity and the number of strong distractors drawn per item (strong ~ Bin(5,0.4),
   key strong at n/5); R1: the stem's topic must not decide the feeling.
3. **Main-idea key is the broadest option / the only two-part option** — d10 a and b (two-part), d14 b, d11 a. v2 R3:
   breadth (key-broadest 0.25 / distractor-broader 0.40 / all-level 0.35) and key_form (two-part at n/5, n ~ Bin(5,0.3))
   drawn per item, with the iTEP reading v2 lesson that breadth alone leaves "only whole-passage option" (all-level).
4. **Purpose key is the only abstract option** — d14 a and b on all six purpose items. v2 R6: key_abstract and the
   number of abstract distractors drawn per item.

Folded at the same cut (rule 4: a cut takes every pending lesson):

5. **no_source on science passages** (audit): d10-P06 coral bleaching (4 items), d11-P06 glacial valley, d11-P01
   "control" jar, d14-P06 pillow lava — each a textbook mechanism. v2 §3 science rule and R1.
6. **Stem quotes the deciding phrase** (audit d10 Q20 "not dead", d10 Q32 "things she could no longer hear"). v2 R1.
7. **Garbled explanation** (audit d11 Q02, a quote spliced into a clause) and **rationale misreads a pronoun** (d14
   Q15 "it", d8 Q12 sequence). v2 R2, R11.
8. **Dangling participle in an attitude stem** (audit d9 Q01 "Looking back as an adult, the narrator's attitude").
   v2 R4 + check.mjs DANGLE refusal.
9. **Key uniquely longest** (agent review d21 a 14/36, b 16/36; d22 b 12/36), not confirmed under §3.3 but recurrent.
   v2 R8: key length rank drawn per item (longest 1/5, shortest 1/5, middle 3/5), enforced by check.mjs.
10. **Reused near-synonym attitude families across passages** (d21 c). Kept: one attitude word per draft.

What v2 does NOT change: passages one per genre, per-passage kind mixes (now drawn), the negation and attitude-word
passage rules, verbatim why/why2, the quote and location checks, the d19 passage bar.

## Pending for v3 (append below; do not edit v2)

1. **2026-10-31, v2 drafts 23-28, key-visible audit (both graders on d24 Q27 and d28 Q02; a on d24 Q12): the vocab
   `context` distractor inverted the tell.** v2 R5 defined `context` as a meaning that fits the sentence; authors wrote
   words that are NOT senses of the tested word ("impatient" for "level", "guessed"/"conceded" for "answered",
   "unwritten"/"private" for "firm"), so the key became the only real sense: no_source, 3 of 7 audit holds. The fix
   moved the tell instead of removing it (memory: agent-rewrite-inverts-tell). v3: every option is a real sense or a
   near-synonym of SOME sense of the word; draw instead whether wrong senses come from one area of life or several,
   and whether the key is the most common sense.
2. **Same batch, agent review a+b+c (d25 items 4, 12, 31): main-idea key uniquely longest AND the only two-part
   option.** The d25 plan drew `longest` on 3 of its 4 main-idea items (a legitimate draw that clustered), and two of
   those keys read as two-part though tagged one-part. Draw key length for main idea jointly with key_form, cap any
   one value at 2 of 4 per draft, and re-check the two-part tag mechanically (a comma/and-clause count).
3. **Same batch, agent review a+b (d28 items 17, 19, 29; c and b also on 13, 21, 36): `distractor-broader` built as
   one "everywhere / nearly every" absolute.** The broader-wrong option became a sweeping generalisation a student
   strikes by rule. v3: the wider distractor's wrongness must be content (wrong cause, wrong subject), never an
   absolute quantifier; absolutes balanced across keys per R9 at draft level.
4. **Same batch, stage 1: attitude items were 4 of the 6 item-level drops.** d26-P06 strong key "alarmed" (rival
   objective, a+b+c); d25-P02 moderate "apprehensive" toward a wind the grandmother also welcomes (rival grateful,
   a+b+c); moderate keys losing to a strong rival (d23-P03 and d26-P01 skeptical vs scornful, c). A strong key on a
   measured passage is a second answer, and so is a moderate key next to its strong neighbour. v3: when key_intensity is strong, the passage itself must be written
   to that pitch (author drafts the passage after reading the item plan); skeptical vs scornful never in one set.
5. **Same batch, audit (d26 P04, P05; a and b): internal inconsistency** ("into the middle of the board" vs "under the
   board"; "the only press able to print them" vs "one of his two presses"). Story-logic rule extends to essays and
   history: every repeated location and count must match.
6. **Same batch, audit b (d25 P04 "on the side of anything else"; d28 Q16 spliced quote):** R11 held in most items
   but not all; add a mechanical check for a quote followed directly by a lowercase verbless continuation.
