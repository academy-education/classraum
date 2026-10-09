# announcement-v6 AUTHOR BRIEF — TOEFL Listening "Listen to an Announcement", 2-question sets

TRIPWIRE: if this file does not say "announcement-v6" and "TOEFL Listening" in its first line, you are reading the wrong brief. Stop and say so.

You write TOEFL iBT (2026 format) Listening announcement sets: one campus
announcement read aloud by ONE speaker, followed by TWO multiple-choice
questions with four options each. Test-takers HEAR the announcement once
(no text on screen) and then answer.

The ONE thing this batch is measured on: **with the transcript hidden, a
clever test-taker reading only the question and its four options must not
be able to pick the key better than chance.** Earlier batches failed because
the key was the "sensible", "typical", "official-channel" or "hedged"
option, or because distractors were wrong in MANNER (rude, absolute, odd)
rather than in CONTENT, or because one question's options gave away the
other's answer. Every rule below exists for one of those failures.

## Your sets

Read `scripts/study-bank/toefl-ann6-work/sets/COMMISSION.json`. Write ONLY
the sets assigned to your author letter (given in your task prompt). For
each set it fixes: the setting, the KIND of each question, the key-length
rank of each question's key, and `gridKey` (used by kind D only; "n/a"
for sets without a D item).

## Output — one file per set, saved as soon as that set is done

`scripts/study-bank/toefl-ann6-work/sets/AN6-XX.json` (XX = the set
number). Save each set the moment it is finished; never compose all sets
and save at the end. Shape:

```json
{
  "meta": {
    "set": "AN6-01",
    "atypical_fact": "what in this announcement differs from the usual institutional default",
    "revised_fact": "the usual arrangement that changes this time, old -> new",
    "q1_kind": "D", "q2_kind": "P",
    "self_check": ["one line per rule you checked, saying HOW the item meets it"]
  },
  "items": [
    {
      "id": "AN6-01-1",
      "type": "multiple_choice",
      "passage": "Transcript: ...",
      "passageGroupId": "AN6-01",
      "prompt": "[Announcement — University library] ...?",
      "choices": ["...", "...", "...", "..."],
      "correct_answer": "<exactly one of the choices, verbatim>",
      "difficulty": "medium",
      "listeningTask": "announcement",
      "explanation": "Quote the transcript; say why each wrong option is wrong. Refer to options by QUOTING them, never as A/B/C/D or first/second (choices are shuffled at insert)."
    },
    { "id": "AN6-01-2", "...": "same passage, byte-identical; same passageGroupId" }
  ]
}
```

## The announcement

- Starts with `Transcript: `. One speaker, plain spoken campus register
  (no headings, bullets, markdown or URLs read aloud). **90-170 words.**
- Encodes at least one ATYPICAL fact (differs from what a student would
  assume by default: the west entrance not the main one, a Thursday
  deadline not Friday, pick-up at the loading dock not the front desk) and
  at least one REVISED fact (the usual arrangement, then what changes this
  time). The default/usual value must appear as a DISTRACTOR in at least
  one question.
- Contains enough distinct, similar-looking details (two times, two rooms,
  two groups of people, two dates) that the wrong options can be built from
  things the speaker actually said, attached to the wrong thing.
- Use ONLY names, rooms, buildings and phone extensions from your own pool
  (below). Each at most once across all your sets.

## The two questions — kinds

- **D (detail, crossed 2x2 grid).** The four options are the four
  combinations of two binary elements (e.g. Tuesday/Thursday x Room 214/
  Room 318). Each element appears in exactly two options. The key is
  determined only by the transcript. `gridKey: "latest"` = the key's
  values are the last-mentioned ones; `gridKey: "earlier"` = the key is a
  value mentioned EARLIER (e.g. the speaker mentions a change that applies
  only to another group, or restores the original after a detour). Do not
  make "the most recently mentioned" a reliable rule.
- **P (purpose of a line).** "Why does the speaker say, '<quoted line>'?"
  The quoted line, read alone without context, must most naturally suggest
  a named DISTRACTOR; at least two options must be readings the line alone
  could support. The key is the function only the surrounding sentences
  reveal.
- **I (inference / next step).** "What can be inferred about X?" or "What
  should <a specific listener> do?" The conclusion a reader would assume
  from the stem alone (the typical, prudent, official-channel thing) must
  be a DISTRACTOR. The key follows only from a specific detail in the
  transcript.
- **R (revised fact).** Asks which arrangement applies this time (or to a
  named group). Options include the usual/default arrangement and the
  arrangement that applies to some other group; the key is the one the
  transcript assigns to the asked-about case.

## Rules for every question (each one is a failure we already shipped)

1. **Flat prior.** The four options must be a priori equally likely to a
   person who has not heard the announcement: four days, four rooms, four
   time windows, four people, four plausible reasons. Never a behaviour
   whose sensible answer is unique in the real world. Durations and
   amounts all inside the plausible band (no "a month" among "two days").
2. **Form symmetry.** Every option copies the key's specificity, register,
   grammatical shape, hedging and condition-shape. Wrong only on
   CONTENT that the transcript checks. No option rejectable on manner:
   no absolutes ("always/never/only/all"), no rude/flippant/legalese, no
   option vaguer or more cautious than the others.
3. **Key length rank.** COMMISSION.json gives each key a length rank among
   its four options by character count: 1 = shortest, 4 = longest. Hit it,
   and keep all four options within a ratio of 1.4 longest/shortest.
4. **Stems name a referent only** (R2): "When will the third-floor rooms
   reopen?" — never a stem that narrates the event or hints at the answer
   ("after the change was announced", "the exception").
5. **No lexical echo** (R3): the key may not share a content word with its
   stem that no distractor also shares.
6. **No sibling leak.** Neither question's options may state, imply or rule
   out the other question's key. Neither stem may restate the other's
   content. Read the two option sets side by side and check.
7. **Not world knowledge.** No question answerable from general knowledge
   of how universities work. If a student could answer "what should
   students do" by common sense, rewrite it.
8. **One defensible answer** with the transcript, and every distractor
   clearly wrong with the transcript (it is contradicted, or it attaches a
   real detail to the wrong thing).
9. `difficulty`: your honest guess (easy/medium/hard); graders will relabel.

## Your name pool (use only yours)

- Author A: Oriana Feldt, Caspian Mbeki, Yuna Sorensen; Rooms 103, 219, 336, 442; Wrenfield Hall, Ostler Building; ext. 2316, 2328
- Author B: Thaddeus Kowalczyk, Leilani Brightwater, Anouk Ferreira; Rooms 109, 224, 347, 438; Calloway Hall, Dunmore Annex; ext. 2741, 2759
- Author C: Ezra Halvorsen, Nadia Quispe, Bastien Oyelaran; Rooms 115, 238, 359, 446; Kestrel Building, Larchmont Hall; ext. 3052, 3067
- Author D: Wilhelmina Tsao, Rafferty Nwosu, Ilse Marchetti; Rooms 121, 243, 365, 451; Pemberly House, Ashgrove Centre; ext. 3184, 3196
- Author E: Cosima Haddad, Joaquin Lindgren, Tamsin Okafor; Rooms 125, 252, 373, 456; Northcote Hall, Sablewood Pavilion; ext. 9423, 9437

No other person names, room numbers, building names or extensions.

## Do NOT reuse these atypical facts (an earlier batch used them)

Write a different atypical / revised fact; do not build on any of these:
a workshop moved to a room with no computers so practice is deferred;
packages relocated from a lobby desk to study-lounge rooms by floor, or
left with a resident adviser; a student card scanned to limit one vote per
person; graduating seniors collecting transcripts upstairs, or a name
change that starts with a phone call; a class moved to a smaller room that
cannot fit its regulars; a shuttle change starting later than an email
said, or an evening pickup at a stadium lot; a data sheet collected in
advance from a stockroom window; seniors booking résumé reviews by phone
instead of walking in; lead-role auditions split to another day with
material sent by email; pre-ordered books claimed with an order number in
another building; flu-vaccine appointments booked by phone instead of a
portal; travel-signature turnaround lengthened, or a travel briefing moved;
glazed pieces collected at a kiln-room side door; students without boots
watching from a viewing platform, or buses leaving from a loading dock;
returning volunteers retrained because of new equipment.

## Hard rules for you as an agent

- NEVER run pkill, killall, kill, or any process-killing command, for any reason.
- Write only your own `AN6-XX.json` files. Do not read or edit any other
  author's file, any `*.key.json`, or anything outside this folder except
  `COMMISSION.json` and this brief.
- No GPT or other non-Claude model; do not call any external API.
- Save each set as soon as it is done. Before finishing, validate each file
  with `node -e 'JSON.parse(require("fs").readFileSync("<file>"))'`.
