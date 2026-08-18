# ATV2 b4 pre-freeze review — atv2-b4-quads.json (verbatim reviewer report, 2026-08-18)

Fresh reviewer, independent of the author. Read in full: ATV2-DESIGN.md,
atv2-prefreeze-review.md (the pilot review — severity calibration and output
format), atv2-b1-prefreeze-review.md and atv2-b2-prefreeze-review.md (tranche-1
rounds, incl. what counted as a REQUIRED rewrite), ATV2-TRANCHE1-RESULT.md, the
target atv2-b4-quads.json (9 lectures × 4 pivots × 4 settings = 144 settings,
count verified), and for pattern comparison only: atv2-quads.json (pilot),
atv2-b1/b2/b3-quads.json (FROZEN — no change proposed to any of them) and
atv2-b5/b6/b7/b8-quads.json (unfrozen siblings).

Severity bar, calibrated to the pilot review and the tranche-1 rounds:

- **REQUIRED** = world-decidable paradigm recognition; a setting that confirms,
  refutes or near-forces a specific setting of a sibling pivot; a setting
  incoherent with an entire sibling slate or producing a non-writable world; one
  thesis stated in two pivots; a recurring SLATE or a near-identical prose family
  at the three-batch / within-batch-saturation level that tranche 1 treated as
  must-fix (b1 §4 item 1, b1 round-2 D1, b3 §4-A); and the five mechanical
  sibling 3-gram hits, which `atv2-checks.mjs` hard-fails post-freeze.
- **ADVISORY** = lone-family options, offset hedges, priors that random keying
  neutralizes, length outliers, transcript-authoring burdens, two-batch family
  recurrence with different prose.

Mechanical pre-check reproduced independently before reading for content: the
orchestrator's five sibling 3-grams are confirmed, and they are the complete
set — a re-implementation of `atv2-checks.mjs`'s STOP list and gram rule over
the option layer returns exactly those five and nothing else. Cross-batch
lexical scan (option-level Jaccard ≥ 0.30, pivot-slate bag Jaccard ≥ 0.14
against all 8 other files) returns **zero** hits: every cross-batch finding
below is semantic, which is the expected shape (CLAUDE.md: the structural
proxies have all been too coarse). Proper-name sweep across all nine files:
b4's 18 invented names collide with nothing in any other batch.

---

## atv2-b4-p1 (Epigraphy, Vaissalu's drawings, Kolgama parsonage)

**REFUTABILITY:** none decisive. Vaissalu, Kolgama and the stone group are
fictional, and — unlike the pilot's p2 — the *paradigm* does not rank the
settings either. q1's four antiquarian failure modes (faithful letterforms with
compressed spacing / plausible letters supplied unmarked / copied from an
earlier antiquarian / accurate texts at the wrong churchyards) are each attested
across the real antiquarian record (Worm, Dugdale and their copyists all did
different ones of these), with no textbook winner for an invented corpus. q3's
four positions on late carving are likewise the live argument-forms of the
discipline. Prior note only, not decidability: q1 s3 (copying the copy, and
inheriting the misreadings) is the antiquarian sin the literature cites most, so
a well-read solver carries a prior toward it — random keying neutralizes that,
per the pilot p1 precedent.

**ASYMMETRY:** q2 s4 — "The professor once catalogued its library, an aside
about how he came to the material in the first place" — is the lone
personal/biographical function in a slate of three evidential ones, and the only
setting under which the parsonage carries no evidential load at all. This is the
pilot p4/q3 s4 and b1-p2/q4 s4 lone-colour class; advisory in isolation, but see
§4-F, where it is one of three such options in b4. q4 s4 ("Ask the national radio
to run an appeal, a method that has turned up carved stones before") is the most
novelistic setting of its slate and the only one carrying a justifying rider —
b1-p1/q4 s4 class, advisory. Lengths are well matched throughout (14–19 words).

**ORTHOGONALITY — one leak:**

- **q2 s1 ↔ q4 s1.** "Its attic held the bundle of paper squeezes, found again
  when the roof was renewed in the 1960s" is the only setting in q2 that
  mentions squeezes; "Publish them from the squeezes, with the drawings printed
  alongside for readers to weigh" is the only setting in q4 that mentions them.
  A solver handed either bets the other well above chance: q4 s1 presupposes
  squeezes of the *unlocated* stones exist and are in hand, and q2 s1 is the
  lecture's only account of where they are. This is the b1-p6 q3/s1 → q4/s1
  shape, which round 1 there treated as REQUIRED. Minimal fix that does not
  weaken either pivot: change **q4 s1** to publish from the drawings alone —
  e.g. "Publish them from Vaissalu's drawings alone, with the readings flagged
  as unverified" — which keeps q4's publish-what-we-have setting, keeps the
  drawings-vs-stones thread that q1 owns, and leaves the squeezes to q2. (Fixing
  the q2 side instead would cost q2 s1 its most concrete artifact.)

Milder, no leak: q1 s2 (letters supplied where the surface flaked) sits under
q3 s2 (the argument from memorial formulas) only if the formulas are read from
the stones rather than from the drawings; writable, transcript must say so.
q1 s4 (three stones placed at the wrong churchyards) *harmonises* with q4 s2/s4
(hunting the unlocated ones) without selecting either — that is helpful
coherence, not entailment.

**MECHANICAL:** sibling 3-gram q1 s4 × q2 s2 — "of the stones". Minimal fix:
q1 s4 "…placed three **stones** at the wrong churchyards" (delete "of the").
Meaning, register and length unchanged; the pivot is untouched.

**Verdict: NEEDS REWRITE — atv2-b4-p1 q4/s1 (squeeze echo with q2/s1) and
q1/s4 (3-gram).**

---

## atv2-b4-p2 (Seismology, the 1907 earthquake, Luhemaa logbook, Kolmsaare fault)

**REFUTABILITY:** none. Luhemaa, Kolmsaare and a 1907 Baltic-coast earthquake
are fictional, and historical-seismogram re-analysis is a real subfield whose
four canonical outcomes are exactly q2's slate — an event resolved into two
ruptures, a magnitude revised down for instrument response, a relocated
offshore source, a damage pattern reassigned to site effects. All four are
things real re-analyses have found; none is the true one for an invented event.
This is the b1-p8/q1 good-quad shape. Two mild discipline priors (historical
magnitudes are usually revised *down*; sources are usually relocated
*offshore*) sit on s2 and s3 and therefore offset each other.

**ASYMMETRY:** q2 s4 is the odd member in kind — s1–s3 redescribe the *event*,
s4 redescribes the *damage*. It answers the stem honestly ("what the re-analysis
changed in the picture"), so it is not the pilot p3/q4 s4 premise-rejecting
meta-option, but it is the lone reframe; advisory. q4 is otherwise the best
verdict quad in the batch — persuaded / prefers a rival structure / doubts any
mapped fault is needed / partitions the sequence — four genuinely different
positions, no lone hedge, no defer.

**ORTHOGONALITY — one leak:**

- **q2 s1 ↔ q4 s4.** "What was catalogued as one shock was two ruptures minutes
  apart" and "He assigns the mainshock to the fault but treats the later shocks
  as sympathetic slip on nearby fractures" are the same *multiple-source*
  thesis at two time scales. Strict entailment does not hold (q4 s4's "later
  shocks" reads as aftershocks over days), but the mutual support is strong and
  one-directional in the way that matters: a solver told q2's truth is "really
  two events" will take q4 s4 as the consonant verdict well above chance, and
  vice versa. Calibration: b1-p6 q2/s4 ↔ q3/s4 was carried as REQUIRED on a
  "close to diagnostic" basis no stronger than this. Minimal fix on the **q4 s4**
  side, which keeps q2's most distinctive setting: replace the sequence
  partition with a fourth verdict that does not multiply sources — e.g. "He
  accepts the link but holds the fault's mapped trace has been drawn far too far
  inland." The slate keeps four distinct verdict families and loses the echo.

Advisory, transcript burden rather than leak:

- q3 s2 ("many were trimmed for framing and lost their margins with the time
  marks") strains q2 s1 and q2 s3, both of which are established from timing.
  Writable — enough sheets keep their marks — but the transcript must do that
  work explicitly wherever those combinations are drawn (pilot p6 treatment).
- q3 s3 ("the record is thin before 1915, since stations reused sheets that
  showed no visible events") coexists neatly with a 1907 re-analysis precisely
  because 1907 *was* a visible event; noted because it looked like a collision
  and is not.
- q1 s2 (a felt account written within the hour, "which no newspaper carried")
  gives mild support to q2 s1's "blended together in contemporary accounts";
  s2's stated payload is uniqueness rather than doubling, so it stays writable
  under all four q2 settings.
- The transcript must place Kolmsaare relative to the coast under every q2 × q4
  combination — q2 s3 puts the source offshore while q4 s2 argues from coastal
  uplift.

**Verdict: NEEDS REWRITE — atv2-b4-p2 q4/s4 (multiple-source thesis shared with
q2/s1).**

---

## atv2-b4-p3 (Dance History, the Ridamets roll)

**REFUTABILITY — severe, pivot-level. This is the pilot-p2 failure mode
reproduced.** q1 asks whether a roll of dance notation carrying a master
choreographer's ensemble numbers is his, or **his rehearsal director's, "who she
argues reshaped and recorded the master's material"** (s2). That is not one of
four equally plausible fictional worlds: it is the single most-cited fact in the
history of dance notation — the canonical case in which a great choreographer's
repertory survives only in notation made by the company's régisseur, who is
universally described as having reshaped what he recorded. Any solver who has
read one book on ballet reconstruction recognises the configuration through the
invented names, exactly as the pilot's Rothamsted/targeted-memory-reactivation
clone was recognised through its invented names, and exactly as b2-p7/q1 was
caught pre-freeze in tranche 1. Once recognised, s2 is the real-world-true
setting and s1 ("she supports the attribution to the master") is the naive one;
s3 and s4 are ranked below both. The pivot is broken regardless of the names,
and — per the pilot's own finding — a rename or a hedging pass will not fix it.

Minimal fix that preserves the pivot: **re-aim q1 off the master-versus-régisseur
axis.** The lecture keeps its attribution question if the disputed thing becomes
which *season's* staging the roll records, or which of the company's two
documented notation practices it uses, or whether the roll records the version
danced at home or the reduced touring version — none of which has a famous
real-world answer. If the axis is kept, s2 must go and be replaced by an
alternative author who is not the rehearsal director.

**ASYMMETRY:** q1 s4 ("She holds the question open, wanting the troupe's
uncatalogued correspondence read before anyone commits") is the lone defer/meta
member of its slate — the pilot's defer family; b4 carries two of these (also
p8 q3 s4), which is under the b3 §4-A saturation bar but is logged in §4-E.
q4 s4 is the length outlier of the batch (22 words against 16–17 in its slate)
and is also one side of the leak below — both reasons to touch it.

**ORTHOGONALITY — one leak:**

- **q2 s4 ↔ q4 s4.** "The sheets carry a watermark tied to a mill that supplied
  theaters in the southern provinces" is the only southern setting in q2;
  "It shows the roll entered the country from the south, against the assumption
  that it came with the company from the west" is the only southern setting in
  q4. Two independent pivots, one geography, one direction. A solver given
  either takes the other above chance, and the transcript that asserts both
  reads as a single argument split across two questions. Minimal fix: drop the
  direction from **q2 s4** ("…tied to a mill that supplied theaters across the
  region"), leaving q4 to own the geography; or change q4 s4's direction, which
  also fixes its length outlier.

Advisory, no leak: q2 s1 (sheets no earlier than the 1840s, so the roll is a
later copy) and q4 s3 (the wrapper postdates the roll by decades) are two
separate "the object is later / the parts are of different dates" stories, and
q2 s2 (two shorter rolls joined) is a third joining story — writable together,
but muddy, and the transcript must keep the three chronologies distinct.
q1 s4's demand that the correspondence be read before anyone commits sits
awkwardly beside a q3 slate none of whose four next steps is reading the
correspondence; writable ("that will take years; meanwhile…"), transcript note.

**MECHANICAL:** sibling 3-gram q1 s2 × q3 s3 — "the roll to". Minimal fix if
q1 s2 survives the re-aim above: "She assigns **it** to his rehearsal director…"
(the stem already names the roll). If q1 is re-aimed per the REFUTABILITY
finding, re-run the check on the replacement slate rather than assuming it is
clear.

**Verdict: NEEDS REWRITE — atv2-b4-p3 q1 (PIVOT-LEVEL, paradigm recognition:
s2 especially), q2/s4 (or q4/s4) for the southern echo, and q1/s2 for the
3-gram.** This is the batch-level blocker; it is the same defect that cost the
pilot a pivot and that tranche 1 screened out of b2.

---

## atv2-b4-p4 (Entomology, the Sarvela collection)

**REFUTABILITY:** none decisive. Sarvela and the coastal meadows are fictional,
and q2's four readings of a claimed local extinction — real disappearance /
artefact of where collectors went / older records misidentified / the species
moved to adjacent drained ground — are the four standard live readings in
historical-records ecology. Prior note, pilot p4 class: s2 is the discipline's
canonical corrective for museum-based extinction claims and is the answer a
well-read ecologist reaches for first, but s3 is an equally fashionable
methodological debunk, so the two offset and the pivot is not rankable to
certainty. Advisory.

**ASYMMETRY:** q3 s2 ("The prices it records show how little value insect
material had then, which explains the careless storage") is the lone
atmospheric/explanatory function, and q3 s4 carries an evaluative rider ("what
the professor calls the collection's real loss") that its siblings lack — 2
evidential / 2 coloured, offset, advisory. q1 and q4 are well-matched slates.

**ORTHOGONALITY:** all six pairs checked; nothing at REQUIRED severity.
Advisories:

- **q3 s4 ↔ q1 s4.** "It lists a cabinet that has not been seen since" and
  "Trace the duplicates that were traded to other museums and reunite the data"
  are both recover-the-dispersed-material moves, and if q3 s4 is the truth the
  reader's eye goes to q1 s4 as the answering step. It stops short of the b1-p6
  bar because the objects genuinely differ (an unlocated cabinet versus known,
  locatable exchange duplicates) and because tracing duplicates is a routine
  curatorial task that stands on its own under every q3 setting. Advisory — but
  if edits are cheap, giving q3 s4 a non-loss function removes the reader's
  bridge entirely.
- **q4 s2 ↔ q2.** "Two assistants wrote most of the labels, and their
  abbreviations for the coastal sites differ" makes the coastal locality data
  ambiguous, which tilts q2 toward the record-is-the-problem readings (s2, s3)
  and away from s1. It is a soft two-against-two tilt, not a single-setting
  force, but the coastal sites are the specific link and the transcript should
  not let the two arguments lean on each other.
- q3 s3 ("A pencil note in one copy…") and q4 s1 ("inked over earlier pencil")
  share a motif but no entailment and no 3-gram (verified).
- q4 s3 (the oldest hand pushes the collection's start a generation earlier)
  moves the chronology under which q2's "early in the twentieth century" claim
  is read; writable under all four q2 settings, transcript note.

**Verdict: CLEAN** (advisories: q3/s4 ↔ q1/s4 recovery bridge; q4/s2 tilt on
q2; q2/s2 prior). Note that p4 q4 is one of the three codicological-chronology
slates that §4-B requires thinning at batch level.

---

## atv2-b4-p5 (Historical Demography, the Turvaste registers, Maldvere)

**REFUTABILITY:** none. The parish and pastor are fictional and q1's four crisis
patterns — loss mainly to out-migration, mortality concentrated among recent
arrivals, two waves a year apart, the outlying hamlets hit hardest — are all
documented outcomes in real crisis demography, with no textbook winner. q4's
four consequences of an 1880s rebinding are all real archival phenomena.

**ASYMMETRY:** q2 s3 ("Reconstituting a sample of households in full, a slower
method **she has argued** the material can support") is the only setting
carrying a self-referential rider; mild, advisory. q3 s3 is the length outlier
of its slate (21 words against 17–19); inside the band, advisory.

**ORTHOGONALITY:** all six pairs checked. No leak at REQUIRED severity —
this is the cleanest lecture in the batch on orthogonality. Advisories and
transcript burdens:

- q3 s2 ("The surviving book is a fair copy made a decade on, from a draft
  register now lost") strains every fine-grained q1 claim, all of which need the
  original's detail — two waves a year apart, hamlet-level distribution, and the
  arrivals-versus-settled split each require dating and identification that a
  later fair copy makes arguable. Writable (a faithful copy), but this is the
  heaviest transcript burden in b4 and the author must discharge it explicitly.
- q3 s2, q4 s1 (margins trimmed, annotations luckily transcribed) and q4 s2
  (the bill shows one volume since gone missing) are three separate
  loss-and-recovery stories; family echo within one lecture, writable, muddy.
- q4 s4 ("A few leaves from a neighboring parish were bound in by mistake")
  gives mild support to q2 s2 ("Extending the same reading to the neighboring
  parishes"). No entailment. Flagging additionally as a **mechanical near-miss**:
  the two phrases are one inflection apart from a shared 3-gram ("a neighboring
  parish" / "the neighboring parishes"), and option text is immutable after
  freeze — worth the free edit now.
- q3 s3 (ruled and dated in advance, filled in as events came) is exactly the
  bookkeeping that makes q1 s3's two-wave chronology legible; support, not
  entailment, writable under all.

**Verdict: CLEAN on its own axes** — but p5 q3 is the batch's clearest instance
of the recurring codicological slate and is **REQUIRED at batch level by §4-B**,
which asks for it to be re-aimed off the ink axis entirely.

---

## atv2-b4-p6 (Acoustics, the Kuivalinn hall, Rebasmaa)

**REFUTABILITY:** none decisive. The hall, the researcher and the demolition are
fictional; the lost-legendary-hall literature is real and genuinely divided, and
q2's four readings (the reputation is deserved / it grew after the demolition /
it was really the resident orchestra / it was a period taste for long
reverberation that later audiences stopped prizing) are all live positions with
no winner for an invented building. Prior note: s2 and s4 are both debunks and
therefore offset.

**ASYMMETRY:** q4 s4 ("Mount an exhibition pairing the laboratory's instruments
with photographs of the hall in use") is the lone outreach option among three
research plans — pilot lone-logistical class. q4 s3 carries the batch's most
emotive rider ("before those memories go the way of the building") where its
siblings carry none. Both advisory individually; together they make q4 the
least symmetric slate in b4, and s3 is additionally the subject of a
cross-batch collision (§4-D).

**ORTHOGONALITY — one non-writable world:**

- **q3 s3 × q4 s2.** q3 s3 is "They tell us mostly about performing style,
  because the room's contribution sits below what the discs preserve." q4 s2 is
  "Track down the private discs said to have been cut at the closing concert."
  If both are drawn, the lecture's stated next step is to hunt more of the
  very medium it has just established cannot carry the question — self-defeating
  rather than merely awkward, and one of the 256 worlds is therefore not
  writable as a coherent 210–270 word transcript. The converse is also live:
  under q3 s1 or s4, both of which turn on what recordings can do, q4 s2 becomes
  the natural next step and is taken above chance. This is criterion 3 in its
  plain form — a setting whose value is *decided* by a sibling pivot. Minimal
  fix on **q4 s2**: replace the disc hunt with a next step that does not depend
  on the recordings at all (the slate already has one measurement plan in s1, so
  something like reconstructing a section of the hall's wall build-up at full
  scale to measure its absorption keeps four distinct families). Do not fix it
  by hedging q3 s3 — that weakens the pivot and leaves the dependence in place.

Advisory: q1 s1 (measured with the seats filled by factory workers given the
afternoon off) makes the numbers directly comparable to modern occupied-hall
practice and so mildly supports q2 s1's "values a modern designer would still
envy"; writable under all four q2 settings. q2 s3 (the fame belonged to the
resident orchestra) and q3 s1 (studio discs by the same players isolate what the
room added) are the thesis and its test — q3 s1 states a method without stating
its result, so no leak, but the transcript must not let the method presuppose
the answer.

**MECHANICAL:** sibling 3-gram q3 s4 × q4 s4 — "of the hall". Minimal fix:
q4 s4 "…with photographs **showing** the hall in use". Register and length
unchanged. (Moot if q4 s4 is otherwise reworked, but the check must be re-run
on any replacement.)

**Verdict: NEEDS REWRITE — atv2-b4-p6 q4/s2 (world q3 s3 × q4 s2 is not
writable) and q4/s4 (3-gram).**

---

## atv2-b4-p7 (Papyrology, the Aravik lot, the dealer Pellamaa) — worst lecture in the batch

**REFUTABILITY:** none decisive. Aravik and Pellamaa are fictional and q4's four
provenance accounts are all live real possibilities. Prior note: two of the four
(dealer-assembled, and a rubbish mound against the sale notice's tomb claim) are
the sophisticated modern verdicts a papyrologist reaches for, and the sealed-jar
account is the naive one — but s4 is a third sophisticated reading, so the slate
is not rankable to certainty. Advisory.

**ASYMMETRY:** q3 s4 ("Hand the receipts and tax lists to an economic historian,
keeping the literary texts for themselves") is the only next-step option with a
sly evaluative rider, and it belongs to the agency-handover family that §4-C
requires rewording on cross-batch grounds. q4's settings run long (16–21 words)
against the batch norm but are matched within the slate.

**ORTHOGONALITY — two leaks, the worst pair in b4:**

- **q2 s1 → the entire q4 slate.** "Sheets now in three cities were cut from the
  same rolls, so the divisions happened at or after the sale" *establishes* that
  the lot was one physical group divided late. That confirms q4 s1 (found as one
  group in a sealed jar), refutes q4 s2 (Pellamaa assembled it from several
  finds), and undercuts q4 s4 (most of it had passed through an earlier
  dispersed collection). One setting decides a sibling pivot's slate outright —
  the pilot p4/q1 s2 class, which was REQUIRED there. Minimal fix: re-aim
  **q2 s1** to a fibre finding that carries no lot-integrity inference (for
  example, that the sheets were manufactured to two distinct qualities, the
  finer reserved for the literary pieces). Rewording only the "so the divisions
  happened at or after the sale" clause is *not* enough — the shared-rolls
  finding by itself carries the inference.
- **q1 s4 ↔ q4 s1.** "A margin sketch in it preserves the arrangement of a
  wrapped bundle before it was opened" and "It was found as one group in a
  sealed jar, the pieces' shared damp stain still recording how they were
  stacked" are the same thesis — we know the lot's original arrangement, and it
  was an intact group — stated in two pivots. That is the pilot p3 q2/s2 ↔
  q4/s4 class, REQUIRED there. Minimal fix: give **q1 s4** a margin sketch of
  something that is not the bundle's arrangement, or replace the setting.

Advisory: q1 s1 (running numbers show the lot was renumbered at sale) and q2 s4
(parchment relabelled as papyrus for uniformity) are two register-confusion
stories; family echo, no entailment. q3 s3 (image the cartonnage without
dismantling it) strains q4 s3 (a town rubbish mound, not tombs) — writable, but
the transcript must place cartonnage in a non-funerary context wherever both are
drawn.

**MECHANICAL:** sibling 3-gram q2 s1 × q3 s1 — "from the same". This one is the
*shadow* of the semantic leak above, not an independent defect: q2 s1's "cut
from the same rolls" and q3 s1's "bought from the same source in the same
season" are two statements of the same join-hunting argument. Do not fix it by
wording alone. If q2 s1 is re-aimed as required above, the 3-gram goes with it;
if for any reason the pair is kept, the wording fix is q3 s1 "…a collection in
another city **supplied by that dealer** in the same season", and the semantic
echo would then still stand as a REQUIRED item.

**Verdict: NEEDS REWRITE — atv2-b4-p7 q2/s1 (decides the whole q4 slate; carries
the 3-gram) and q1/s4 (arrangement thesis shared with q4/s1).**

---

## atv2-b4-p8 (Limnology, Soorna, Virkland's readings, Kivrand)

**REFUTABILITY:** none decisive, with one prior worth naming. The lake, the
historical observer and Kivrand are fictional, and q3's four positions on an
early onset of darkening are live real argument-forms. The prior sits on q4:
that a historical transparency series reads deeper than a modern one *by about
the margin a larger disk and calm-day habits would produce* (s1) is the
documented, textbook observer-bias correction for exactly this kind of
comparison, so a limnology-literate solver's eye goes there first. It stays
advisory rather than REQUIRED because s3 (scatter too wide to carry a trend) and
s4 (holds on the open lake, breaks in the bays) are equally methodology-aware
answers — three of four are sophisticated, so the prior does not rank them. This
is the b1-p6 test: recognising the paradigm hands the solver the *debate*, not
the answer.

**ASYMMETRY:** q3 carries both the split-the-difference compromise (s2) and the
decline-to-rule (s4) against one accept-on-other-grounds and one reject — two
non-committal members, so offset in the pilot p1/q4 way rather than a lone
survivor. q1 s1 and s3 are the batch's shortest options (13 words) against s2's
19; inside the band, advisory.

**ORTHOGONALITY — one leak:**

- **q4 s4 → q1 s3.** "The comparison holds up on the open lake but breaks down
  in the bays, where his stations cannot now be fixed" states a limitation whose
  remedy is precisely q1 s3, "Recover the survey's sunken marker buoys, whose
  positions anchor the old depth grid" — the only setting in q1 that relocates
  old stations. This is the pilot p2 q3 → q4 shape (a stated limitation making
  one next-step option the near-forced answer) that both the pilot and b1-p6
  carried as REQUIRED. Minimal fix on **q4 s4**: relocate the breakdown to a
  cause that buoy recovery does not answer — e.g. "…but breaks down in the bays,
  where his readings are too few to carry a trend." Note the obvious alternative
  wording (weed in the bays) is not available: q2 s1 already owns weed beds.

Advisory: q4 s1 and s2 both amount to "no real change since Virkland", which
tilts q3 toward the early-onset readings (s1, s2) and away from s3; a soft
two-against-two tilt, not a force, and every combination stays writable because
Kivrand's rejection in q3 s3 is about the proxies rather than about a recent
onset. q2 s2 (the minute-books fix the survey seasons the notebooks leave
vague) is a precondition for q4 s2's season-matched method — support, not
entailment, since q4 s2 is writable when q2 s2 is not drawn. q1 s1 (instrument
the outflow) and q2 s3 (where the association believed the springs entered)
share a hydrology motif with no entailment.

**Verdict: NEEDS REWRITE — atv2-b4-p8 q4/s4 (near-forces q1/s3).**

---

## atv2-b4-p9 (Garden History, Kaldevere, Nurmsaar, Tiidema) — the replacement lecture

Reviewed at extra scrutiny as the ninth lecture standing in for the quarantined
atv2-b1-p4.

**REFUTABILITY:** none. Kaldevere, Nurmsaar and Tiidema are fictional;
country-house garden attribution is a real and genuinely open genre, and q1's
four positions (upholds on a payment entry / upholds the design but doubts the
visit / reassigns to the pupil / reads it as the family's own project with the
name attached later) are all attested outcomes. q2's four drawing-to-planting
relations are likewise all real. No world-decidable setting.

**ASYMMETRY:** q1 s2 is the lone compound verdict ("upholds the design but
doubts he came") in a slate of three simple ones — pilot p1/q4 shape, advisory,
and see §4-E for the batch-level recurrence of the compound member. q4 s2 ("his
running quarrel with a neighboring estate's gardener, **the professor's favorite
thread in the archive**") is the third lone-colour function option in b4 (with
p1 q2 s4 and p4 q3 s2); see §4-F.

**ORTHOGONALITY — one leak:**

- **q1 s4 ↔ q2 s2.** "She reads the garden as the family's own project, dressed
  with the designer's name a generation later" and "The showpiece drawing was
  made after the planting, a record of the garden rather than a guide to it"
  are the same retrospective-construction thesis: in both, the designer's
  documented role is a document made after the fact. A solver given q1 s4 takes
  q2 s2 well above chance, and the transcript that asserts both is making one
  argument in answer to two questions. Pilot p3 q2/s2 ↔ q4/s4 class, REQUIRED
  there. Minimal fix on **q2 s2**, which keeps q1's fourth verdict family
  intact: make the drawing's relation to the planting something other than
  retrospective record — e.g. "The showpiece drawing tidies the beds into a
  symmetry the planting never had."

Advisory: q3 s1 ("The orders date the water garden a full generation later than
the guidebooks have it") repeats q1 s4's "a generation later" chronology move
in near-identical prose; the checker's 3-gram rule does not catch it (verified —
"a full generation later" and "a generation later" share no 3-gram), which is
precisely why it belongs in a human review. q1 s2's "the plans traveled by post
and were adapted on site" needs the transcript to keep "the plans" distinct from
q2's "showpiece drawing" wherever q2 s2 or s4 is drawn. q4 s3 (blotting pages
preserving letters the family later destroyed) and q4 s1 (weekly letters
amounting to a diary) are within-pivot and correctly exclusive.

**MECHANICAL:** sibling 3-gram q2 s2 × q4 s1 — "of the garden". Minimal fix:
q4 s1 "…amount to **a garden diary** nobody meant to keep". Meaning and register
unchanged; keeps the "nobody meant to keep it" rider that gives the setting its
point. (Fixing the q2 side would touch the load-bearing "a record of the garden
rather than a guide to it" contrast, so fix q4.)

**Verdict: NEEDS REWRITE — atv2-b4-p9 q2/s2 (retrospective-construction thesis
shared with q1/s4) and q4/s1 (3-gram).**

---

## §4 CROSS-LECTURE AND CROSS-BATCH PATTERNS

A solver sees items from every batch with topic tags visible. The CR-V7 lesson
applies at the level of the *brief*, not the item: the more uniform the
authoring recipe, the more the answer becomes predictable from the recipe. b4 is
the most internally uniform batch in the programme so far, and four of these
patterns are at the severity tranche 1 treated as must-fix-before-freeze.

### §4-A — every lecture in b4 is an archive lecture (advisory, but it is the root)

All nine lectures resolve their pivots out of a document or a physical
substrate: antiquarian drawings and paper squeezes, a station logbook, a
notation roll's paper and wrapper, an auction catalogue and specimen labels, a
parish register's hands and its rebinding, laboratory notebooks and discs, a
dealer's day-book, an association's minute-books, nursery invoices and a head
gardener's letter-book. Seven of b4's eight function pivots are literally "why
does the professor bring up / mention [an archival document]" (p1 q2, p2 q1,
p4 q3, p5 q4, p7 q1, p8 q2, p9 q4). The b1 review logged this pivot kind as
dense across the union at four-per-batch (its §4 item 6, advisory); at
seven-of-eight it is a batch signature. It is advisory here only because it
leaks no answer — but it is the common cause of §4-B, §4-C and §4-F below, and
if a later batch is authored on the same charter the union will have a
recognisable roster.

### §4-B — REQUIRED: the physical-analysis-of-writing chronology slate, three times inside b4 and duplicating two frozen batches

Three of b4's detail pivots run the same slate recipe under different dressing,
with member-for-member correspondences:

| | p3 q2 (paper) | p4 q4 (handwriting) | p5 q3 (hands and ink) |
|---|---|---|---|
| it postdates the object | s1 "made no earlier than the 1840s, ruling the roll a later copy" | s4 "rewritten during a 1930s re-curation" | s2 "a fair copy made a decade on, from a draft now lost" |
| two campaigns / two hands | s2 "combines papers of two mills… two shorter rolls were joined" | s1 "inked over earlier pencil… finished in two sittings"; s2 "two assistants wrote most of the labels" | s3 "a change of ink partway through" |
| matches a known stock/hand, re-dating it | s3 "matches stock the company bought in bulk, placing the roll inside its working years" | s3 "matches Sarvela's schoolmaster, pushing the collection's start a generation earlier" | — |
| added later by another agent | — | — | s4 "marginal crosses added later in a different ink… from a visitation" |

p7 q2 (fibre analysis) is a fourth pivot on the same substrate axis, though its
slate is genuinely differently shaped.

This is the round-2 D1 finding of the b1 review — *a recurring slate, not a
recurring setting* — which was carried as REQUIRED there, reproduced three times
inside one batch. Worse, it also collides outward:

- **p5 q3 reproduces the frozen b2-p4/q2 ink-chronology slate** (same batch of
  ink / added a generation after / drawn first / worked on twice in two inks
  separated by some years) and the frozen b3-p3/q2 s2 ("Ink differences showing
  the entries were added in three separate campaigns"). That is the very slate
  b1 was REQUIRED to abandon in its round 2, on the reasoning that a solver who
  has seen one instance can classify the other's whole option set by family. b2
  and b3 are frozen; the fix lands in b4.
- **p3 q2 corresponds to the unfrozen b6-p2/q2 paper-stock slate**: b4 s4 "a
  watermark tied to a mill that supplied theaters in the southern provinces" ↔
  b6 s1 "a watermark from a mill that supplied presses on both sides of the
  pass" (near-identical prose shape), and b4 s2 "combines papers of two mills…
  joined" ↔ b6 s2 "The stocks change partway through, as though the run paused
  and resumed with fresh paper". **b4 is the batch being frozen first, and
  neither version is clearly better, so b4 should move**; the b6 reviewer should
  be told the family is claimed.

**Required:** re-aim **p5 q3** off the ink axis entirely (the register offers
plenty that is not codicological — what the crisis pages record about ages, or
about who reported the deaths, or a gap where the pastor was absent), and re-aim
**one of p3 q2 / p4 q4** so that at most one b4 detail pivot is a
physical-analysis-of-writing chronology. Because p3 q1 already requires a
pivot-level rebuild, re-aiming p3 q2 has the lower total cost.

### §4-C — REQUIRED: the hand-it-over-to-another-body next step reaches its third live batch

b1's §4 item 1 required rewording b1-p2/q3 s4 when the agency-handover family
reached three batches with near-identical prose. It now stands in
**b2-p5/q4 s3** (frozen, "Routine monitoring will be handed over to the national
weather service"), **b7-p4/q1 s3** (unfrozen, "The routine measurements will
pass to the harbor office, freeing the group for work farther offshore"), and
**b4-p7/q3 s4** ("Hand the receipts and tax lists to an economic historian,
keeping the literary texts for themselves"). Three again, and by the standing
convention the fix lands in the file under review. **Required: reword
b4-p7 q3/s4 into a different plan family.** Note the b4 instance is the one that
also carries the evaluative rider flagged under p7's ASYMMETRY, so a single edit
clears both.

### §4-D — REQUIRED: the publish-one-class-first-and-hold-the-rest next step, four times inside b4

- p1 q4 s1 "Publish them from the squeezes, with the drawings printed alongside"
- p3 q3 s2 "Issue a facsimile with the notation left as it stands, and hold
  interpretation for a commentary volume"
- p4 q1 s3 "Publish the collection register online first, and let specialists
  request loans from there"
- p7 q3 s2 "Publish the documentary pieces first, since the literary fragments
  will take years of piecing together"

Four of b4's seven next-step pivots carry a member of one family, and three of
them run the identical "publish the tractable class first, hold the hard class"
argument. Calibration: b3's round 1 carried batch-level defer-family saturation
at five of seven attitude slates as REQUIRED; this is the same shape at four of
seven. It also collides outward with near-identical prose in unfrozen siblings —
**b8-p7/q2 s3** ("Publish the set in facsimile first, so other researchers can
work on them in parallel") and **b6-p1/q4 s4** ("Publishing the archive
sequencing first, with the field claims held for a later paper") — plus the
looser frozen instances b1-p6/q4 s2 and b3-p1/q3 s4. **Required: cut b4 to at
most two, and let the survivors not both be "publish class A, hold class B".**
b4 freezes first, so where the prose match with b6/b8 is tight, b4 moves.

### §4-E — REQUIRED: the verdict-slate recipe across b4's six attitude pivots

Two findings, one fix.

1. **The "accepts it, [but/mainly] on [ground X] rather than [ground Y]"
   formula.** b1's round-2 D3 flagged this as a tight syntactic match between
   b1-p1/q3 s4 and b3-p1/q4 s4 (both now frozen) and closed with: *do not let a
   third batch pick it up*. b4 picks it up twice — **p1 q3 s2** ("He accepts it,
   but on the ground that the memorial formulas echo printed models issued much
   later") and **p8 q3 s1** ("He accepts it, mainly on the pollen and charcoal
   work rather than on Kivrand's own arguments"). Required: at most one survives
   in b4, and it should be reworded off the formula.
2. **Slate composition, not slot order.** Option placement is shuffled by a
   seeded stream after freeze and the blind file shuffles item order, so the
   literal s1..s4 order is invisible to a solver — but the *composition* is not,
   and that is what the pilot's §4 was really about. In all six b4 attitude
   pivots the slate opens with the endorsement (p1 q3 s1, p2 q4 s1, p3 q1 s1,
   p4 q2 s1, p8 q3 s1, p9 q1 s1), and **p1 q3 and p8 q3 run near-identical
   family compositions** — accept / accept-on-other-grounds / reject / one
   non-committal member. A solver who has classified one can classify the other
   by speech act without reading the content, which is exactly the CR-V7 tell one
   level up. Required per the pilot's own §4, which treated a three-lecture
   template as must-fix: **vary the composition — let at least two b4 slates omit
   the non-committal member entirely and carry two flavours of endorsement, or
   two distinct reassignments, instead.** Note that b4's compound/split member
   also recurs (p1 q3 s4 narrows, p2 q4 s4 partitions, p8 q3 s2 splits the
   difference, p9 q1 s2 upholds-but-doubts) — the b1 §4 advisory-3 shape, and
   the same edit thins it.

### §4-F — advisory items

1. **Three lone-colour function options.** p1 q2 s4 ("an aside about how he came
   to the material in the first place"), p4 q3 s2 (the prices explain the
   careless storage), p9 q4 s2 ("the professor's favorite thread in the
   archive"). Each is the pilot p4/q3 s4 class in isolation; three in one batch
   makes "the option that is the professor being charming" a recognisable
   family. Do not let a fourth in.
2. **Interview-the-last-witnesses collides with an unfrozen sibling.**
   b4-p6/q4 s3 "Interview the last listeners who heard the hall, before those
   memories go the way of the building" ↔ **b8-p8/q4 s3** "Interview elderly
   keepers in the parish before the remembered practice is lost with them" —
   same job, same rider, near-identical prose. Two batches with tight prose sat
   at advisory in b1's round-2 D3, so it stays advisory here, but **b4 freezes
   first and should be the one to move**; if b4's is kept, the b8 reviewer must
   be told the family is claimed. Do not let a third batch take it.
3. **Extend-to-the-neighbours-to-see-if-it-is-local** appears twice in b4
   (p5 q2 s2, p8 q1 s2 "to see whether Soorna's story is its own or the
   district's") and across most other batches (b5-p3/q3 s4, b6-p1/q4 s2,
   b7-p1/q4 s1, b7-p8/q1 s1, b8-p5/q1 s4). A legitimate and unavoidable family;
   logged for density only.
4. **Uniform invented-name language.** All eighteen of b4's invented names —
   Vaissalu, Kolgama, Luhemaa, Kolmsaare, Ridamets, Sarvela, Turvaste, Maldvere,
   Kuivalinn, Rebasmaa, Pellamaa, Aravik, Soorna, Virkland, Kivrand, Kaldevere,
   Nurmsaar, Tiidema — are Finnic, across nine disciplines and several implied
   countries (a papyrus dealer and an Egyptian rubbish mound included). No answer
   leaks and there are **no collisions with any other batch** (swept across all
   nine files), which is the improvement over b1's Brenna/Halvorsen/Serrano
   problem. But the other batches mix their onomastics and b4 does not, so b4's
   items are trivially clusterable in the union and read as one author's tic.
   Free to fix now, permanent after freeze.
5. **Every batch's p1 shares a qtype order.** detail / function / attitude /
   inference is the p1 order in b1, b2, b4, b5, b6, b7 and b8 (b3 alone
   differs). Low severity — the blind render shuffles item order and the
   placement stream shuffles options, so no solver sees a slot — but it is an
   authoring-template fingerprint of the kind the pilot's §4 asked to be
   checked, and it is free to rotate before freeze.
6. **Mechanical near-misses on immutable text.** Two pairs sit one inflection
   from a hard checker failure: p5 q4 s4 "a neighboring parish" vs p5 q2 s2 "the
   neighboring parishes", and p9 q3 s1 "a full generation later" vs p9 q1 s4 "a
   generation later". Both pass today. Option text is immutable after freeze and
   the checker is not; widen the gap now.

---

## Summary of required rewrites

| Lecture | Verdict |
|---|---|
| atv2-b4-p1 | REWRITE: q4/s1 (squeeze echo with q2/s1); q1/s4 (3-gram) |
| atv2-b4-p2 | REWRITE: q4/s4 (multiple-source thesis shared with q2/s1) |
| atv2-b4-p3 | REWRITE: **q1 PIVOT-LEVEL** (paradigm recognition, s2); q2/s4 (southern echo with q4/s4); q1/s2 (3-gram) |
| atv2-b4-p4 | CLEAN (advisories: q3/s4 ↔ q1/s4; q4/s2 tilt on q2; q2/s2 prior) — but q4 is in scope for §4-B |
| atv2-b4-p5 | CLEAN on its own axes; REWRITE q3 required by §4-B (ink slate duplicates frozen b2-p4/q2) |
| atv2-b4-p6 | REWRITE: q4/s2 (world q3 s3 × q4 s2 not writable); q4/s4 (3-gram) |
| atv2-b4-p7 | REWRITE: q2/s1 (decides the whole q4 slate; carries the 3-gram); q1/s4 (arrangement thesis shared with q4/s1); q3/s4 per §4-C |
| atv2-b4-p8 | REWRITE: q4/s4 (near-forces q1/s3) |
| atv2-b4-p9 | REWRITE: q2/s2 (retrospective-construction thesis shared with q1/s4); q4/s1 (3-gram) |

### REQUIRED — per lecture

1. **atv2-b4-p3 q1 — PIVOT-LEVEL rebuild.** Master-choreographer-versus-
   rehearsal-director is a world-decidable configuration; s2 is the real-world-
   true one. Re-aim the pivot's axis, or replace s2 with a non-régisseur
   alternative. Renaming will not fix it. *(batch-level blocker)*
2. **atv2-b4-p7 q2/s1** — the same-rolls finding decides the entire q4
   provenance slate. Re-aim the fibre finding; deleting the inference clause is
   insufficient.
3. **atv2-b4-p7 q1/s4** — "arrangement of a wrapped bundle before it was opened"
   is q4/s1's intact-group thesis stated a second time.
4. **atv2-b4-p6 q4/s2** — under q3/s3 the disc hunt is self-defeating and the
   world is not writable; under q3/s1 or s4 it is near-forced. Replace with a
   next step independent of the recordings.
5. **atv2-b4-p9 q2/s2** — retrospective-construction thesis shared with q1/s4.
6. **atv2-b4-p1 q4/s1** — the squeezes appear in exactly one setting of q2 and
   one of q4; publish from the drawings instead.
7. **atv2-b4-p2 q4/s4** — multiple-source thesis shared with q2/s1; replace with
   a verdict that does not partition the event.
8. **atv2-b4-p8 q4/s4** — "his stations cannot now be fixed" near-forces q1/s3's
   buoy recovery; move the breakdown to a cause buoy recovery cannot answer (not
   weed — q2/s1 owns it).
9. **atv2-b4-p3 q2/s4** (or q4/s4) — the lone southern setting in each of two
   pivots.

### REQUIRED — batch and cross-batch

10. **§4-B** — re-aim **p5 q3** off the ink axis (it reproduces frozen
    b2-p4/q2 and b3-p3/q2 s2) and re-aim **one of p3 q2 / p4 q4**, so at most
    one b4 detail pivot is a physical-analysis-of-writing chronology. p3 q2 also
    collides with unfrozen **b6-p2/q2**; b4 freezes first and neither is better,
    so b4 moves.
11. **§4-C** — reword **p7 q3/s4** out of the agency-handover family (third live
    batch, with frozen b2-p5/q4 s3 and unfrozen b7-p4/q1 s3).
12. **§4-D** — cut the publish-one-class-first family from four to at most two
    (p1 q4 s1, p3 q3 s2, p4 q1 s3, p7 q3 s2), and where the prose matches
    unfrozen b8-p7/q2 s3 or b6-p1/q4 s4, b4 moves.
13. **§4-E** — one of **p1 q3/s2** / **p8 q3/s1** must leave the "accepts it,
    but on X rather than Y" formula (b1 round-2 D3: do not let a third batch
    pick it up), and at least two of b4's six attitude slates must change
    composition so that endorse / accept-on-other-grounds / reject /
    non-committal is not the batch's standing recipe.

### REQUIRED — mechanical (all five confirmed independently; `atv2-checks.mjs` hard-fails these post-freeze)

| Hit | Minimal fix, no weakening |
|---|---|
| p1 q1×q2 "of the stones" | q1 s4: "…placed three **stones** at the wrong churchyards" |
| p3 q1×q3 "the roll to" | q1 s2: "She assigns **it** to his rehearsal director…" (stem names the roll) — re-run on the replacement slate if q1 is rebuilt |
| p6 q3×q4 "of the hall" | q4 s4: "…with photographs **showing** the hall in use" |
| p7 q2×q3 "from the same" | **not a wording fix** — it is the shadow of REQUIRED item 2; re-aiming q2 s1 removes it. If the pair were kept: q3 s1 "…another city **supplied by that dealer** in the same season", and the semantic echo would remain REQUIRED |
| p9 q2×q4 "of the garden" | q4 s1: "…amount to **a garden diary** nobody meant to keep" |

Re-run the 3-gram scan over every rewritten setting before freeze; four of the
nine lectures are being edited and new hits are cheap to introduce.

### ADVISORY

- p1: q2/s4 lone personal aside; q4/s4 novelistic rider; q1/s3 prior; transcript
  must source q3/s2's formulas from the stones when q1/s2 is drawn.
- p2: q2/s4 lone reframe; q3/s2 timing burden on q2/s1 and q2/s3; q1/s2 mild
  support for q2/s1; place Kolmsaare relative to the coast in every q2 × q4.
- p3: q1/s4 defer member; q4/s4 length outlier (22 vs 16–17); three separate
  date-mismatch stories (q2/s1, q2/s2, q4/s3) to keep distinct; q1/s4's demand
  that the correspondence be read sits beside a q3 slate that does not read it.
- p4: q3/s4 ↔ q1/s4 recovery bridge; q4/s2 tilts q2 toward s2/s3; q2/s2
  collector-effort prior; q3/s3 ↔ q4/s1 pencil motif.
- p5: q3/s2 fair-copy strain on every q1 setting (heaviest transcript burden in
  b4); three loss-and-recovery stories; q2/s3 self-referential rider; q3/s3
  length outlier; q4/s4 ↔ q2/s2 neighbouring-parish near-miss.
- p6: q4/s4 lone outreach option and q4/s3 emotive rider make q4 the least
  symmetric slate in b4; q1/s1 mild support for q2/s1; q2/s3 and q3/s1 are
  thesis and test.
- p7: sophisticated-provenance prior (two of four); q1/s1 ↔ q2/s4 register-
  confusion echo; cartonnage (q3/s3) needs a non-funerary context under q4/s3.
- p8: q4/s1 observer-bias prior; q4/s1+s2 tilt toward early onset in q3; q2/s2
  as precondition for q4/s2's method; q1 short options.
- p9: q1/s2 lone compound verdict; q4/s2 lone colour option; q3/s1 ↔ q1/s4
  "a generation later" prose repeat (invisible to the 3-gram check); keep "the
  plans" distinct from "the showpiece drawing".
- Batch: §4-A archive-lecture uniformity; §4-F1 three lone-colour functions;
  §4-F2 interview-the-last-witnesses vs unfrozen b8-p8/q4 s3 (b4 should move);
  §4-F3 extend-to-the-neighbours density; §4-F4 uniformly Finnic naming (no
  collisions, but a batch fingerprint); §4-F5 shared p1 qtype order across seven
  batches; §4-F6 two mechanical near-misses on soon-to-be-immutable text.

NOT FREEZE-READY. Thirteen required items across seven lectures plus the five
mechanical hits; p3 q1 needs a pivot-level rebuild and p7 needs two settings
re-aimed. Re-review by a fresh reviewer after the rewrites, with the cross-batch
scope held (b6, b7 and b8 all carry families b4 is being asked to give up, and
their reviewers should be told which ones b4 kept).

---

## ROUND 2 (fresh reviewer)

Independent round-2 pre-freeze review of `atv2-b4-quads.json`, after the rewrite
author applied the round-1 REQUIRED list. Read in full before opening the target:
`ATV2-DESIGN.md`, `atv2-prefreeze-review.md` (criteria and output format), and the
round-1 section above. Read for cross-batch pattern comparison only, with no change
proposed to any of them: `atv2-quads.json` (pilot), `atv2-b1/b2/b3-quads.json`
(FROZEN), `atv2-b5/b6/b7/b8-quads.json` (unfrozen siblings; b4 freezes first, so
where b4 collides with one of these, b4 moves).

Structure re-counted independently: 9 lectures x 4 pivots x 4 settings = 144
settings, no duplicate setting text, four distinct qtypes per lecture. The
orchestrator's mechanical clearances were spot-checked rather than re-derived: a
re-implementation of the sibling 3-gram rule over the option layer returns **zero**
hits (all five round-1 hits are gone and none were reintroduced), and a cross-batch
option-level Jaccard sweep at >= 0.30 against all eight other files returns **zero**
hits. Everything below is semantic.

### Part A — verification of the round-1 REQUIRED list

Each item was checked against the criterion it was raised under, not against the
wording of the instruction, to distinguish a fix from a relabel.

| # | Round-1 item | Status |
|---|---|---|
| 1 | p3 q1 pivot-level (master vs rehearsal director) | **Genuinely rebuilt.** The pivot is re-aimed onto premiere-vs-later-state ("does the roll record the ballet as it was first staged"); the regisseur axis is gone entirely, not renamed. See A-note 1 for a residual prior. |
| 2 | p7 q2/s1 decides the whole q4 slate | **Fixed at the axis, not the clause.** The shared-rolls finding is replaced by two manufacturing qualities "mixed indifferently across the documentary and literary pieces", which carries no lot-integrity inference: it is co-assertable with all four q4 settings and singles out none. |
| 3 | p7 q1/s4 arrangement thesis | **Fixed.** Replaced by the day-book's blank stretches matching suspended excavation permits. No q4 setting is confirmed or refuted by it. |
| 4 | p6 q4/s2 non-writable world | **Fixed.** The disc hunt is replaced by rebuilding a section of the vanished wall at full scale to measure absorption — independent of the recordings, so q3 s3 x q4 s2 is now writable, and q3 s1/s4 no longer near-force it. |
| 5 | p9 q2/s2 retrospective-construction thesis | **Fixed.** The drawing now "tidies the beds into a symmetry the planting on the ground did not follow"; the after-the-fact-record thesis that duplicated q1 s4 is gone. Residual soft tilt at B-9. |
| 6 | p1 q4/s1 squeeze echo | **Fixed.** q4 s1 publishes from the drawings; "squeezes" now occurs in exactly one setting in the lecture (q2 s1). |
| 7 | p2 q4/s4 multiple-source thesis | **Fixed.** Replaced by an inherited-weakness-re-used reading, which shares no thesis with q2 s1's two-ruptures setting and echoes nothing else in the lecture. |
| 8 | p8 q4/s4 near-forces q1/s3 | **Fixed.** "his stations cannot now be fixed" is gone; the breakdown is now attributed to visit frequency, which buoy recovery cannot remedy. Prose wobble noted at B-10; it does not restore the leak. |
| 9 | p3 q2/s4 southern echo | **Fixed.** q2 was rebuilt wholesale onto notation coverage; q4 s4 is now the only geography setting in the lecture. |
| 10 | §4-B physical-analysis-of-writing slates | **Fixed.** p5 q3 is re-aimed onto registration practice (who brought word / cause column dropped / multi-day entry / separate infant list) and p3 q2 onto notation coverage. Exactly one such slate survives in b4 (p4 q4), which is what §4-B asked for, and the collision with unfrozen b6-p2/q2 is gone. |
| 11 | §4-C agency handover | **Fixed.** p7 q3 s4 is now a concordance of hands; no handover setting remains anywhere in b4. The evaluative rider went with it, as round 1 predicted a single edit would do. The b7 and b2 instances are untouched. |
| 12 | §4-D publish-one-class-first | **Fixed.** Down from four to two (p1 q4 s1, p7 q3 s2), and only one of the two is the publish-class-A-hold-class-B argument. No prose match with b6-p1/q4 s4 or b8-p7/q2 s3 survives. |
| 13 | §4-E verdict-slate recipe | **Fixed on both halves.** The "accepts it, but on ground X rather than ground Y" formula is out of b4 (p1 q3 s2 reworded to "grants... resting the case on...", p8 q3 s1 replaced by a rejection). Slate composition now varies: p3 q1 carries two reinterpretations plus two endorsements and p8 q3 opens on a rejection, so endorse / accept-on-other-grounds / reject / non-committal is no longer the standing recipe, and the non-committal member has largely left the batch. Residual at B-11. |
| M | The five mechanical 3-grams | **All five gone**, verified independently, with no new hits introduced by four lectures' worth of rewriting. |
| F6 | The two near-miss pairs on soon-immutable text | **Both widened** ("the next parish upriver"; "some thirty years later"). |
| F2 | interview-the-last-witnesses vs unfrozen b8-p8/q4 s3 | **b4 moved**, as the convention requires — p6 q4 s3 is now a press search. The b8 reviewer can be told the family is unclaimed by b4. |

**A-note 1 — p3 q1's residual prior, and why it is not the pilot-p2 class.** The
rebuilt slate does carry a discipline prior: that a surviving notation roll records
a later revival with the ensembles thinned (s1), and that such rolls are rehearsal
or teaching documents rather than performance records (s2), are both standard
real-world descriptions of surviving dance notation, so a well-read solver will
rank s1 and s2 above s3 and s4. That is a two-above-two split, not the one-true-
setting ranking that broke pilot p2 and that round 1 correctly killed here: no
single setting is world-decidable, and the two survivors offset each other exactly
as p7's and p8's priors do. Advisory, on the pilot-p1 precedent that random keying
neutralizes a prior that does not isolate one setting.

### Part B — new findings and what round 1 missed

**B-1 (REQUIRED) — atv2-b4-p3 q1/s4 <-> q3/s3, introduced by the q1 rebuild.**
q1 s4 is "She endorses it for the figures, though she takes the entrances to have
been redrawn for a later season" — the only setting in q1 that asserts part of the
roll was worked on later. q3 s3 is "Take the roll to the conservation lab to have
the later ink additions imaged separately" — the only setting in q3 that mentions
later additions. Two independent pivots, one physical fact, one setting each. This
is structurally identical to round 1's REQUIRED item 6 (the squeezes appearing in
exactly one q2 setting and one q4 setting of p1) and to the b1-p6 q3/s1 -> q4/s1
shape: a solver handed either takes the other well above chance, and q3 s3's
presupposition that later additions are an established feature of the roll is
motivated by q1 s4 and by nothing else in the lecture. It is new — the q1 slate it
attaches to did not exist at round 1 — which is why round 1 could not have caught
it. Minimal fix on the **q3 s3** side, which leaves the rebuilt q1 untouched:
re-aim the lab visit at a feature no q1 setting owns, e.g. imaging the rubbed
passages under raking light. Re-run the sibling 3-gram scan on the replacement.

**B-2 (advisory, round 1 missed it) — p7 q2/s4 -> q4/s2.** "What the register lists
as papyrus includes a dozen pieces of parchment, relabeled at some point for
uniformity" and "Pellamaa assembled it from several finds, matching pieces by look
to make a more salable whole" are both cosmetic-homogenization-for-sale stories.
Round 1 read q2 s4 only against q1 s1 (register confusion) and did not test it
against q4. It stays advisory rather than REQUIRED because q2 s4's agent is
genuinely unspecified — a later curator standardizing a register is as available a
reading as the dealer — and because it refutes no q4 setting. But it is the second
q2 setting to lean on the q4 provenance pivot in one lecture, and the edit is
cheap: attributing the relabelling to the museum's own accession work removes the
lean entirely.

**B-3 (advisory) — the qualified-endorsement member is now in five of six attitude
slates, up from four.** p1 q3 s4 (narrows), p2 q4 s4 (credits the link but reads
the fault differently), p3 q1 s4 (endorses for the figures but not the entrances),
p8 q3 s2 (accepts an early start but dates it later), p9 q1 s2 (upholds the design
but doubts the visit). Round 1's §4-E asked for this family to be thinned; the
p3 q1 rebuild added one. This is a direct trade-off with §4-E's other half, which
asked p3 q1 to carry two flavours of endorsement, so it is not a regression the
author could have avoided while complying — logged, not charged. It leaks no
answer (letters and worlds are dealt after freeze), and the tight syntactic formula
b1's round-2 D3 quarantined is genuinely out of b4: p2 q4 s4's "X rather than Y"
governs the object's nature, not which evidence supports the verdict, and that
broad family is present in every batch including both frozen ones. Do not let a
sixth in, and do not let a later batch reinstate the "on ground X rather than
ground Y" wording.

**B-4 (advisory, cross-batch) — the rebuilt p3 q1 lands on the same axis as
unfrozen b8-p3/q1.** b8-p3 q1 asks whether a director recut a film after its first
release; its slate runs convincing / alterations by another agent / the story is a
mislabelling and the versions are identical / "accepts a narrower reading: one
sequence was shortened, while the rest went out as premiered". b4-p3 q1 now asks
whether a roll records the ballet as first staged, with a corresponding narrower-
reading member. Same pivot kind (is this artifact the premiere state or a later
one), member-for-member correspondence on two of four. The prose is not tight and
the media differ, so by round 1's own calibration (two batches, loose prose =
advisory) this does not block. b4 freezes first, so if either moves it is b4; more
cheaply, **tell the b8 reviewer the axis is claimed** so a third batch does not take
it.

**B-5 (advisory) — the look-elsewhere member is now in all seven next-step slates.**
p1 q4 s2 (handlist to county museums), p3 q3 s4 (provincial ballroom manuals),
p4 q1 s4 (duplicates in other museums), p5 q2 s2 (neighbouring parishes), p6 q4 s1
(the architect's other hall), p7 q3 s1 (joins with another city's collection),
p8 q1 s2 (the other lakes on the moraine). Round 1 logged this as §4-F3 at a lower
count; the §4-D cuts raised it, because two of the removed publish-first settings
were replaced by look-elsewhere ones. It is a legitimate and near-unavoidable
family that constrains nothing about the key, so advisory — but it is now b4's
single most uniform next-step feature and should be watched if a later batch is
authored on the same charter.

**B-6 (advisory) — §4-F1's three lone-colour function options all survive.**
p1 q2 s4 ("an aside about how he came to the material in the first place"),
p4 q3 s2 (the prices explain the careless storage), p9 q4 s2 ("the professor's
favorite thread in the archive"). Round 1 rated these advisory with "do not let a
fourth in"; no fourth was added, and none was removed. Confirmed at three.

**B-7 (advisory) — §4-A and §4-F4/F5 are unchanged by the rewrite.** All nine
lectures still resolve their pivots out of a document or physical substrate; all
eighteen invented names are still Finnic across nine disciplines and several
implied countries (still colliding with nothing in any other batch, re-swept);
b4-p1 still runs the detail / function / attitude / inference qtype order shared
with six other batches. All three were advisory in round 1 and remain so — none
leaks an answer — but F4 and F5 are free to change now and permanent after freeze.

**B-8 (advisory) — p6 q2/s2 <-> q4/s3.** "She thinks the reputation grew after the
demolition, fed by memoir writers mourning the building" and "Comb the local press
for what listeners said about the hall when it was new" are thesis and decisive
test. The replacement of the witness-interview setting brought the next step closer
to q2 s2's memoir-writers than the original was. It stays advisory because a
contemporary press search is equally motivated under q2 s1, s3 and s4 — three of
four settings support it, so it is a tilt and not a single-setting force.

**B-9 (advisory) — p9 q1/s2 <-> q2/s2, the residue of round-1 item 5.** "the plans
traveled by post and were adapted on site" and "The showpiece drawing tidies the
beds into a symmetry the planting on the ground did not follow" both entail
drawing-does-not-match-ground. The fix moved the echo off q1 s4, where it was one
thesis stated twice, onto q1 s2, where it is a three-against-one tilt: q2 s3 and
q2 s4 also entail partial divergence, and only q2 s1 is close-following. That is
below the round-1 bar. Transcript note stands: keep "the plans" distinct from "the
showpiece drawing" wherever both are drawn.

**B-10 (advisory, prose) — p8 q4/s4's new causal clause is opaque.** "The comparison
holds on the open lake but breaks down in the bays, which he visited twice a
season" states a breakdown and then a fact whose bearing on it the reader has to
supply (too few visits to carry a bay series). The leak round 1 raised is genuinely
gone — buoy recovery cannot remedy visit frequency — but a setting whose stated
ground is this indirect is harder to kill with a verbatim transcript span at step 5,
which is where it will cost. Free to sharpen now (e.g. "where two visits a season
leave too few readings to carry a trend").

**B-11 (advisory) — p5's new q3 discharges the batch's heaviest transcript burden.**
Round 1's worst writability problem was old q3 s2's fair copy straining every
fine-grained q1 claim. The replacement slate is about registration practice, and I
checked all sixteen q1 x q3 combinations: the tightest is q1 s3 (two waves a year
apart) against q3 s3 (burials entered several days at a time, so day-level dating
is the historians'), and a wave separated by a year survives day-level imprecision
comfortably. No combination now needs special pleading. Recorded because it is the
clearest improvement in the file and should not be undone by a later edit.

### Part C — summary

**REQUIRED**

1. **atv2-b4-p3 q3/s3** — "the later ink additions" is the only later-work mention
   in q3 and pairs one-to-one with q1 s4's redrawn entrances, the only later-work
   mention in q1. Re-aim the lab visit at a feature no q1 setting owns; re-run the
   3-gram scan on the replacement. (New, created by the round-1 q1 rebuild.)

**ADVISORY** — B-2 (p7 q2/s4 leans on q4/s2; round 1 missed it), B-3 (qualified-
endorsement member in five of six attitude slates), B-4 (p3 q1's axis matches
unfrozen b8-p3/q1; tell the b8 reviewer), B-5 (look-elsewhere member in all seven
next-step slates), B-6 (three lone-colour function options), B-7 (§4-A archive
uniformity, uniformly Finnic naming, shared p1 qtype order), B-8 (p6 q2/s2 tilt on
q4/s3), B-9 (p9 q1/s2 tilt on q2/s2), B-10 (p8 q4/s4 opaque causal clause), B-11
(p5 q3 burden discharged — do not undo), plus every round-1 advisory not listed as
fixed in Part A, all of which stand unchanged.

All thirteen round-1 REQUIRED items and all five mechanical hits are genuinely
fixed at the axis rather than relabelled, and the rewrite introduced exactly one
new defect at REQUIRED severity. One setting stands between b4 and freeze.

NOT FREEZE-READY

---

## ROUND 3 (targeted)

Narrow re-check of the single ROUND 2 required item after the rewrite. The file was
re-read fresh, not recalled: `atv2-b4-p3` q3 s3 now reads **"Take the roll to the
conservation lab and have its rubbed passages read under raking light"** (was: "…to
have the later ink additions imaged separately").

**1. Is the q1/s4 <-> q3/s3 pairing gone, or relabelled? — Gone, at the fact and not
the wording.** The old setting presupposed *later work on the roll*, which exactly
one q1 setting asserts (s4, the entrances redrawn for a later season). "Rubbed
passages" is physical abrasion — a property the roll has under all four q1 readings
and one that no q1 setting asserts, implies or excludes. Checked in both directions
and across all three siblings:

- **q1.** A worn roll is equally available under s1 (revival record), s2 (teaching
  document), s3 (endorsement on the ensemble figures) and s4, and recovering rubbed
  text advances the argument under each of them identically — it is the step that
  gets you *more notation*, whatever the notation turns out to record. Nothing in
  q3 s3 now distinguishes s4 from its siblings, and nothing in s4 makes q3 s3 more
  natural than the other three next steps.
- **q2.** The one combination worth testing is q2 s3 ("It carries two numbers
  complete and no more than the opening figures for the rest") against a legibility
  step. It does not bridge: s3's limitation is about what was *notated*, not about
  what has since worn away, and raking light is motivated under all four coverage
  settings. No above-chance transfer.
- **q4.** The wrapper/customs-stamp settings share no object with the roll's
  surface condition. Nothing.

**2. Symmetry with its three q3 siblings — holds.** Word counts 17 / 16 / **16** /
15; all four are bare imperative next steps with no hedging in any, each naming a
distinct object and method, and the four remain genuinely different families
(performance test / archival collation / conservation-legibility / comparative
circulation). It is not a restatement of any sibling. One minor, pre-existing
asymmetry survives the edit rather than being introduced by it: s1, s2 and s4 each
carry an explicit purpose clause and s3's purpose is implicit in the method, as the
old wording's "imaged separately" also was. Acceptable as it stands; if the author
chooses to add a purpose clause, keep it strictly about recovering legibility and
re-run the checks, since any added clause is a fresh leak surface.

**3. Anything new? — No.** Mechanically re-derived over the current file: sibling
3-gram hits **0**, cross-batch option Jaccard >= 0.30 against all eight other files
**0**, within-b4 cross-lecture Jaccard >= 0.30 **0**. "raking" and "rubbed" occur
nowhere else in the nine files; "conservation" appears elsewhere only as b3's topic
label and in a b3 setting about conservation standards — a different sense with no
prose echo. Refutability: raking light on an abraded surface is ordinary practice
in several disciplines, not a recognisable episode, and it decides no setting.
Asymmetry: no length or specificity outlier created. One family note, improved
rather than worsened by the edit: b4 carries two recover-what-cannot-easily-be-read
next steps (this one and p7 q3 s3, "Image the cartonnage without dismantling it"),
and the old wording put both in the *imaging* vocabulary while the new one does not
— two instances with no prose overlap, below the bar, and looser cousins in
unfrozen b6 and b8 have different purposes and no prose match. Advisory note only,
and pre-existing through p7.

The ROUND 2 required item is discharged. Every ROUND 2 advisory stands unchanged;
none of them blocks, and the round-1 advisories carried forward in Part C are
likewise unaffected by this edit.

FREEZE OK

---

## ROUND 3 (fresh reviewer)

Independent round-3 pre-freeze review of `atv2-b4-quads.json`, commissioned because
two settings changed after round 2 was written and because the round-2 reviewer
diagnosed one of them and therefore cannot certify its own fix. Read in full before
opening the target: `ATV2-DESIGN.md`, `atv2-prefreeze-review.md` (criteria and output
format), and rounds 1, 2 and the round-2 reviewer's targeted round-3 section above —
that section treated as NON-BINDING; every claim in it re-derived from the file
rather than accepted. Read for pattern comparison only, with no change proposed to
any of them: `atv2-quads.json` (pilot) and `atv2-b1/b2/b3-quads.json` (FROZEN);
`atv2-b5/b6/b7/b8-quads.json` (unfrozen — b4 freezes first, so a collision moves the
other batch).

Structure re-counted: 9 lectures x 4 pivots x 4 settings = 144 settings, no repeated
setting text, four distinct qtypes per lecture, qtype order varied across the nine
lectures. Mechanical checks re-implemented from scratch rather than accepted from the
orchestrator: sibling 3-gram hits in b4 **0** (the same script returns the five known
hits in the pilot, b5 and b6, so it is not silently returning zero — the check would
have failed if there were anything to find); cross-batch option-level Jaccard >= 0.30
against all eight other files **0**; within-b4 cross-lecture Jaccard >= 0.30 **0**;
per-slate word counts all inside 13-21 with no slate spread beyond 6 words. As
instructed, none of that is treated as evidence about the semantics, and everything
below is semantic.

**Calibration note used throughout, stated so it can be attacked.** Several standing
advisories in this file are of the form "one option in the slate is eliminable a
priori" (lone outreach option, lone personal aside, lone logistical option, a
two-above-two discipline prior). Because the world is chosen by a seeded RNG that
never sees the text, eliminating one of four options with a heuristic uncorrelated
with the key yields 0.75 x 1/3 = 25.0% — exactly control. A prior that splits a slate
two-above-two yields 0.5 x 1/2 = 25.0%. Such tells therefore cost **nothing** on the
blind attack; they cost face validity with the audio, and they cost the transcript
author a harder kill quote at step 5. That is why they stay ADVISORY here. The tells
that do carry a margin are the ones where one setting *transfers information about a
sibling pivot* — those are graded strictly.

### Finding (a) — atv2-b4-p3 q3/s3, "Take the roll to the conservation lab and have its rubbed passages read under raking light"

**Verdict: the round-2 pairing is genuinely gone, at the fact and not the label. No
new pairing created. ADVISORY only.**

The round-2 defect was a presupposition dependency: "the later ink additions" presumes
that later work on the roll is an established fact, and exactly one setting in the
lecture — q1 s4, "she takes the entrances to have been redrawn for a later season" —
supplies it. The replacement's presupposition is that some passages are abraded. That
is true of a nineteenth-century paper roll under **all four** q1 readings, is asserted
by none of them, and is excluded by none of them, so it transfers nothing in either
direction:

- **q1.** Recovering worn notation advances the argument identically under s1 (revival
  record), s2 (teaching document), s3 (endorsement on the ensemble figures) and s4.
  Nothing in q3 s3 now distinguishes s4; nothing in s4 makes q3 s3 more natural than
  the other three next steps. I ran the test in the direction round 1 used for the p1
  squeezes (does either setting supply a presupposition the other needs, and is it the
  lecture's only supply?) and it fails in both directions.
- **q2.** The one combination worth testing is q2 s3 ("carries two numbers complete and
  no more than the opening figures for the rest") against a legibility step. It does
  not bridge: s3's limitation is about what was *notated*, not about what has since
  worn; raking light is equally motivated under all four coverage settings, and under
  s3 it is if anything less useful, not more.
- **q4.** The wrapper and customs stamp share no object with the roll's surface. Nothing.

**The one residual, and why it does not block.** Raking light is used in manuscript
work to detect scraping and erasure as well as to read faded ink, so a solver could in
principle read "rubbed passages... under raking light" as *alteration detection*, which
would re-open the bridge to q1 s4's redrawn entrances. I weighed making this REQUIRED
and decided against it on the presupposition test: the setting's plain object is worn
passages, it does not presuppose that any alteration exists, and the inference chain a
solver needs ("we need raking light" -> "part of the roll was altered" -> q1 s4) runs
against the obvious reading ("the roll is worn"). It is a wording risk, not a
structural one. **Free nudge if the author is editing anyway: "its worn passages" or
"its faded passages" closes even the second reading at zero cost.** Do not add a
purpose clause to buy the same thing — a clause is a fresh leak surface, and the slate
does not need it.

**Symmetry with the three siblings — holds.** Word counts 18/16/**16**/15; four bare
imperatives, no hedging in any, four genuinely distinct families (performance test /
archival collation / conservation-legibility / comparative circulation), none a
restatement of another. s3 is the only non-interpretive member — it produces more data
rather than an argument — which is the pilot p4/q3 s4 lone-logistical shape; under the
calibration note above that is worth 0 on the attack, and unlike the pilot instance
this one does carry a payload (recovering notation), so it is not eliminable on
"answers a different question" grounds either. One pre-existing asymmetry survives the
edit rather than being introduced by it: s1, s2 and s4 state their purpose explicitly
and s3's is implicit in the method — as "imaged separately" also was. Acceptable.

**Refutability / paradigm recognition:** none. Raking light on an abraded surface is
ordinary practice across several disciplines, not a recognisable episode, and it
decides no setting. **Cross-batch:** "raking" and "rubbed" occur nowhere else in the
nine files; "conservation" appears elsewhere only in b3's topic label and one b3
setting about conservation standards (different sense, no prose echo); "lab" likewise.
No new echo. Family note, improved by the edit rather than worsened: b4 carries two
recover-what-cannot-easily-be-read next steps (this and p7 q3 s3, "Image the cartonnage
without dismantling it"); the old wording put both in the *imaging* vocabulary and the
new one does not. Two instances, no prose overlap, pre-existing through p7 — below any
bar.

### Finding (b) — atv2-b4-p7 q2/s4, "A dozen pieces entered in the register as papyrus are parchment, a slip nobody has caught since"

Reviewed as a first-class item; round 2 raised the old version only as an advisory and
never saw this text.

**Co-existence with the whole q4 provenance slate — holds, all four.** The defect the
old wording carried was a *motive*: "relabeled at some point for uniformity" is
cosmetic homogenisation for sale, which is q4 s2's dealer thesis in miniature. The
replacement removes the motive and attributes the error to the accession register — an
agent (a cataloguer) that no q4 setting names. Checked one by one: s1 (sealed jar, shared
damp stain) — parchment and papyrus in one deposit is ordinary and a shared stain is
unaffected; s2 (dealer assembled from several finds) — compatible, and no longer
*supported*, since a register slip is not an act of the dealer; s3 (town rubbish mound)
— compatible; s4 (through an earlier dispersed collection, marks on the frames) —
compatible, with a mild curatorial-handling family echo and no entailment. **No q4
setting is confirmed, refuted or raised by it. The lean round 2 identified is gone at
the agent, which is the load-bearing part.**

**q1 and q3 — no leak.** q1 s1 ("running numbers show the lot was renumbered at sale,
which explains a long-standing confusion in the catalogues") and q2 s4 are the second
instance of a documentation-error story in one lecture, which is the same family echo
round 1 logged and which survives the rewrite unchanged: different objects (numbering
vs material), different agents (the dealer's sale vs the accession register), no
transfer in either direction. Advisory, as before. q3 is untouched by it: joins with
another city (s1), documentary-first (s2), cartonnage imaging (s3) and a concordance of
hands (s4) are all equally available whether or not a dozen pieces are parchment.

**Symmetry — one real asymmetry, ADVISORY, and it is in the stem, not the setting.**
Lengths 15/17/18/17, register flat across all four, no hedging anywhere, two settings
carry an evaluative rider (s3's "itself now the oldest text in the lot", s4's "a slip
nobody has caught since") and two do not — offset. The asymmetry is stem fit: the stem
asks what **the fiber analysis** established, and only s1 (two manufacturing qualities)
and s4 (papyrus vs parchment) are findings a fiber analysis actually yields. s2
(literary texts on reused account rolls, "the accounts still legible on the back") is a
reading result, and s3's "itself now the oldest text in the lot" is a dating result. It
is two-against-two, so it eliminates nothing and is worth 0 on the attack by the
calibration note — but it is free to fix now and permanent after freeze. **Suggested
free edit: broaden the stem to "the material analysis of the pieces" or "the laboratory
examination of the pieces", which licenses all four equally and touches no option text.**

Secondary: s4 is the only setting whose sentence subject is the modern register rather
than the ancient object. It is not the pilot p3/q4 s4 premise-rejecting meta-option — it
does answer "what the analysis established about the pieces" (a dozen of them are not
papyrus) — but the register framing is what makes it read as paperwork. If the stem is
broadened as above, this reads cleanly; if not, dropping "entered in the register as"
in favour of a plain material claim would do the same job. Advisory either way.

**Refutability:** none — parchment among papyri is ordinary for the later periods and
decides nothing. **Cross-batch:** "papyrus" and "slip" occur nowhere else in the nine
files. "Parchment" occurs once elsewhere, **b6-p5/q2 s2** ("The cords were threaded
through the parchment in the manner favored by the count's chancery") — a charter
membrane in a legal-history lecture, a different sense with no prose, argument or family
overlap. **Explicitly not a collision; b6 should not move on account of it.** Jaccard
against every option in every other file is below 0.30.

**One transcript note that is not a defect of s4 but of its neighbour.** q2 s1's "two
manufacturing qualities, mixed indifferently across the documentary and literary pieces"
is weakly usable in both directions as a lot-integrity argument (indifferent mixing reads
as one source pool; two qualities read as assembly). That ambiguity is exactly why round
2 was right that it no longer decides q4 — but wherever q2 s1 and q4 s2 are drawn
together the transcript must not let the fibre finding become the assembly argument, or
it will re-create round 1's REQUIRED item 2 in the spoken layer.

### Per-lecture independent pass (the other seven)

Every lecture re-read from the file and all six pivot pairs tested in both directions.
Nothing at REQUIRED severity. New findings not in rounds 1 or 2 are marked **[new]**.

**p1 Epigraphy — CLEAN.** Round-1 item 6 confirmed discharged: "squeezes" occurs in
exactly one setting in the lecture (q2 s1), and q4 s1 now publishes from the drawings.
**[new, advisory]** q1 s1 ("The letterforms are rendered faithfully...") and q3 s1 ("...
persuaded by letter shapes that belong to a later century") are the lecture's only two
letterform mentions, one per pivot — the shape round 1 called REQUIRED for the squeezes.
It does not reach that bar because q3 s1's argument needs no drawings at all: the stem
establishes that the stones survive, so the letter-shape case is runnable directly and
q1 supplies no presupposition it needs. Tilt, not transfer. **[new, advisory]** q1 s2
(letters supplied where the surface flaked) and q1 s3 (drawings copied from an earlier
antiquarian) both make q4 s1's publish-from-the-drawings plan awkward; "flagged as
unverified" discharges it, and it is a 2-vs-2 tilt. **[new, transcript note]** p1 q1 is
the batch's least mutually-exclusive slate — s1, s2 and s4 are three independent claims
about the drawings that could all be true at once, so step 5 will need explicit denials
rather than contrasts for the three non-chosen settings. Standing advisories (q2 s4 lone
personal aside, q4 s4 novelistic rider, q1 s3 prior) all stand. Note q4 carries two
publication-plan members (s1, s3) and two find-them members (s2, s4) — a 2+2 slate,
which is good composition, not the §4-D family problem.

**p2 Seismology — CLEAN.** Round-1 item 7 confirmed: q4 s4's inherited-weakness reading
shares no thesis with q2 s1's two ruptures, and I could find no other pairing it created.
**[new, advisory — the strongest new observation in the batch]** q3 s4 ("Sheets from
three stations were interfiled decades ago, and reattributing them has taken most of the
project's first year") ↔ q2 s3 ("The source lay well out under the sea, not beneath the
coastal parish the catalogues name"). Station identity is what fixes a source location,
so a solver given q3 s4 asks what the reattribution bought and lands on relocation. It
stays ADVISORY on the presupposition test: the shared element is inferential, not a
shared object — q2 s3 never mentions stations and q3 s4 never states its payoff — and
the reattribution equally underwrites q2 s2 (which instrument's response to correct),
so it raises two of four rather than one. Named because it is cheap to close if edits
are being made anyway: interfiling between two *collections'* accession sequences, or
between two *years*, removes the location inference and costs the setting nothing.
Standing advisories (q2 s4 lone reframe; q3 s2's time-mark burden on q2 s1/s3; q1 s2's
mild support for q2 s1; placing Kolmsaare relative to the coast under every q2 x q4)
all stand.

**p4 Entomology — CLEAN.** **[new, advisory]** q1 s2's rider "starting with the series
whose localities are secure" presupposes that some localities are not, which q4 s2
(assistants' coastal abbreviations differ) and q4 s4 (spellings modernized in a 1930s
re-curation) supply and q4 s1/s3 do not — a 2-of-4 tilt in the same direction as the
standing q4 s2 -> q2 advisory, and the two tilts stack on the same coastal-locality
fact. Below the bar, but it is the one place in b4 where two separate soft tilts point
the same way; if any edit lands in p4, dropping the "whose localities are secure" rider
is the cheapest way to break the stack. Standing advisories (q3 s4 ↔ q1 s4 recovery
bridge; q4 s2 tilt on q2; q2 s2 collector-effort prior; q3 s3 ↔ q4 s1 pencil motif)
stand. §4-B confirmed: p4 q4 is the only surviving physical-analysis-of-writing
chronology slate in b4. p7 q2 is now *further* from that family than at round 1, because
a register error is not a chronology of the writing act.

**p5 Historical Demography — CLEAN, and the batch's best lecture on orthogonality.**
Round-2 B-11 re-verified independently: all sixteen q1 x q3 combinations are writable
without special pleading, and the tightest (q1 s3 two waves a year apart x q3 s3
several-days-at-a-time entry) survives comfortably, since a year-scale separation is
immune to day-level imprecision. **[new, advisory]** q3 s1 ("each entry names who brought
word of the death, and for long stretches it was one household") supplies exactly the
linkage evidence that q2 s3 (full household reconstitution) and q2 s1 (linking to the
rent rolls) need — support spread over two settings, no transfer. **[new, transcript
note]** q4 s2 ("the bill... names which volumes there were, showing one has since gone
missing") must be placed outside the crisis years wherever a fine-grained q1 setting is
drawn, or the missing volume undercuts the claim. Standing advisories (q2 s3
self-referential rider; three loss-and-recovery stories; q4 s4 ↔ q2 s2 neighbouring
parish, prose now widened to "the next parish upriver") stand.

**p6 Acoustics — CLEAN.** Round-1 item 4 confirmed discharged: the wall-rebuild next
step is independent of the recordings, q3 s3 x q4 s2 is now writable, and I checked all
sixteen q3 x q4 combinations rather than only the one round 1 named. **[new, advisory —
a residual of that fix]** q3 s4 ("Digitally cleaned, they can anchor a computed model of
the hall that no drawing on its own could support") makes q4 s2 (rebuild a wall section
and measure its absorption) unusually motivated, because absorption data is precisely
what a drawing cannot supply to a model. It does not reach round 1's bar: q4 s1
(measuring the architect's surviving hall) is motivated by q3 s4 just as strongly, so it
is a 2-of-4 elevation, and q4 s2 remains a sensible next step under q3 s1, s2 and s3 —
no world is unwritable. Recorded because it is the same q3-decides-q4 shape the round-1
fix was aimed at, one notch weaker. Round-2 B-8 (q2 s2 ↔ q4 s3 press comb) re-derived
and agreed: all four q2 settings motivate a contemporary press search, so it is a tilt.
q4 is now more symmetric than at round 1 — the emotive rider is gone with the
witness-interview setting — leaving s4's lone outreach colour, worth 0 on the attack.

**p7 Papyrology — CLEAN** (round-1 items 2 and 3 re-verified at the axis: q2 s1 carries
no lot-integrity inference and q1 s4's blank-permit stretches confirm and refute nothing
in q4). Advisories as under Finding (b), plus the standing ones (sophisticated-provenance
prior at two of four; cartonnage needs a non-funerary context under q4 s3). q4's slate
runs long (16-21 words) but is matched within itself.

**p8 Limnology — CLEAN.** Round-1 item 8 confirmed discharged and tested beyond the one
direction round 1 named: q4 s4's breakdown is now grounded in visit frequency, which
buoy recovery cannot remedy, and no *other* q4 setting pairs with q1 s3 either (s1 is
about disk size and habits, s2 about matching weeks — neither is a position problem).
Round-2 B-10 agreed: the causal clause is genuinely opaque and will be the hardest kill
quote in b4 at step 5; "where two visits a season leave too few readings to carry a
trend" is free now and impossible later. **[new, advisory]** q1 s1's rider "the season
the old surveys left untouched" leans on q4 s2's "his summer readings" for the fact that
the old series is summer-biased; the general premise supplies it anyway, and it is a
rider rather than the payload. **[new, transcript note]** under q2 s1 (weed beds) x q4 s4
(bays), the transcript must not let weed become the implied cause of the bay breakdown,
since the setting's stated ground is visit frequency and step 5 needs the other three
killed on that ground. Standing advisories (q4 s1 observer-bias prior; q4 s1+s2 tilt
toward early onset in q3; q2 s2 as precondition for q4 s2) stand.

**p9 Garden History (the replacement lecture, held to extra scrutiny) — CLEAN.**
Round-1 item 5 confirmed: q2 s2's symmetry-tidying claim is compatible with a real
designer whose plan was altered, so q1 s4's retrospective-construction thesis is no
longer stated twice. Round-2 B-9 re-derived and agreed (the residue on q1 s2 is a
3-against-1 tilt). **[new, advisory]** q4 s4 ("It shows he trained at Kaldevere from
boyhood, against the story that he was hired from abroad") is mildly consonant with q1
s4 ("the family's own project, dressed with the designer's name a generation later") —
both push a made-in-house reading, and each is the only setting of its pivot to do so.
Below the bar because the head gardener's biography belongs to a later period than the
attribution and q4 s4's payload is about Tiidema, not about the designer's role; named
because it is the only one-to-one-shaped consonance I found in p9. **[new, advisory]**
q3 s2 (constant substitutions) and q3 s3 (most stock from the estate's own nursery) each
weaken q1 s3's argument from the pupil's planting lists matching Kaldevere's beds — a
2-of-4 tilt against one setting, writable but a real transcript burden. Standing:
q1 s4's "a generation later" and q3 s1's "some thirty years later" are still the same
chronological move in different words — the prose was widened as round 1 asked, the
semantic repeat was not, and it remains advisory because the objects differ (the
attribution vs the water garden). q4 s2 lone colour and q1 s2 lone compound verdict
stand.

### Cross-lecture and cross-batch

- **§4-E re-derived from the file, not from round 2's claim.** All six b4 attitude
  slates now have distinct compositions: p1 q3 (two acceptances on different grounds /
  reject / narrow), p2 q4 (persuaded / prefers a rival / doubts any fault is needed /
  credits-but-reinterprets), p3 q1 (two reinterpretations / two endorsements), p4 q2
  (accept / three rival explanations), p8 q3 (reject / accept-but-later / endorse-and-
  extend / periodic), p9 q1 (two upholds / two reassignments). endorse /
  accept-on-other-grounds / reject / non-committal is not the standing recipe, the "on
  ground X rather than ground Y" formula b1's round-2 D3 quarantined is absent, and
  **there is now no defer / judgment-should-wait member anywhere in b4** — which is a
  real gain over the pilot and b1. B-3 confirmed at five of six for the qualified-
  endorsement member; do not let a sixth in, and do not let a later batch reinstate the
  quarantined wording.
- **§4-B, §4-C, §4-D re-counted.** One physical-analysis-of-writing chronology slate
  (p4 q4). Zero agency-handover settings. Two publication-plan next-step pivots (p1 q4,
  p7 q3), only one of which is publish-class-A-hold-class-B. All three round-1 batch
  items hold under an independent count.
- **B-5 confirmed and it is b4's most uniform feature.** A look-elsewhere member sits in
  all seven next-step slates (p1 q4 s2, p3 q3 s4, p4 q1 s4, p5 q2 s2, p6 q4 s1,
  p7 q3 s1, p8 q1 s2). Unavoidable as a family and it constrains nothing about the key;
  logged for the union, not for b4.
- **[new, advisory] three lone public-engagement next steps.** p1 q4 s4 (a national
  radio appeal), p6 q4 s4 (an exhibition), p8 q1 s4 (bringing landowners into the
  sampling rounds) are each the only non-research member of their slate. This is §4-F1's
  shape moved from function pivots to next-step pivots, and §4-F1's three lone-colour
  function options (p1 q2 s4, p4 q3 s2, p9 q4 s2) all still stand alongside them — six
  eliminable-by-genre options in one batch. It costs 0 on the blind attack for the
  reason set out in the calibration note, and it does not block; it is logged because a
  seventh, or a later batch authored on the same charter, would make "the option where
  the professor is being charming or public-spirited" a union-level roster feature, and
  because each such setting is the one hardest to kill convincingly with audio.
- **§4-A / F4 / F5 unchanged and still advisory.** All nine lectures resolve out of a
  document or physical substrate; all eighteen invented names are Finnic across nine
  disciplines and several implied countries (re-swept: still zero collisions in any
  other file); b4-p1 still runs the detail / function / attitude / inference order shared
  with six other batches, though b4's other eight lectures vary. F4 and F5 are free now
  and permanent after freeze.

**Cross-batch collisions (b4 freezes first; the other batch moves):**

1. **b8-p3/q1 — confirmed, and slightly tighter than round 2 rated it.** Same pivot axis
   as the rebuilt b4-p3/q1 (is this artifact the premiere state or a later one), with a
   near member-for-member partial-endorsement match: b8 s4 "accepts a narrower reading:
   one sequence was shortened, while the rest went out as premiered" ↔ b4 s4 "endorses it
   for the figures, though she takes the entrances to have been redrawn for a later
   season". Prose is loose and the media differ, so it does not block b4. Already assigned
   to b8 per the orchestrator's brief; this round confirms it independently and adds that
   it is the *s4 member*, not just the axis, that b8 should move.
2. **b6-p5/q2 s2 is NOT a collision.** It is the only other occurrence of "parchment" in
   the nine files and it is a charter membrane in legal history — different sense,
   different family, no prose overlap with b4-p7/q2 s4. Named so that nobody moves b6 on
   a keyword hit.
3. **Families b4 has vacated, so the unfrozen batches may keep theirs**: the
   interview-the-last-witnesses next step (b4 moved; **b8-p8/q4 s3** is now the sole live
   instance and is unclaimed), and the agency-handover next step (b4 moved; b7-p4/q1 s3
   stands with frozen b2-p5/q4 s3 — two live, do not let a third batch take it).
4. **Families b4 has kept, so the unfrozen batches should be told**: publish-one-class-
   first-and-hold-the-rest (b4 keeps **p7 q3 s2**; b8-p7/q2 s3 and b6-p1/q4 s4 are the
   other live instances — no prose match at Jaccard >= 0.30 today, but the family is at
   three live batches and a fourth should not take it), and the paper-stock / substrate
   analysis detail slate (b4 keeps **p4 q4** only; b6-p2/q2 is clear of it since b4 moved
   p3 q2).

### Summary

**REQUIRED: none.**

Both post-round-2 changes are fixes at the axis rather than relabels. (a) removes a
presupposition dependency by replacing a fact that exactly one q1 setting supplies with
a property all four q1 settings license, and creates no pairing with q1, q2 or q4.
(b) removes a shared motive by handing the error to an agent no q4 setting names, and
co-exists with all four q4 settings and with q1 and q3. Neither introduces a length,
register, hedging or specificity outlier; neither is refutable or paradigm-recognisable;
neither creates a cross-lecture or cross-batch prose echo, and the sibling 3-gram and
cross-batch lexical scans are zero on a from-scratch re-implementation that still finds
the five known hits elsewhere.

**ADVISORY — free to fix now, permanent after freeze, none blocking:**

1. p3 q3/s3 — "worn" or "faded" for "rubbed" closes the residual erasure reading.
2. p7 q2 — broaden the stem to "the material analysis of the pieces"; only two of the
   four settings are findings a fibre analysis yields.
3. p2 q3/s4 — make the interfiling between collections or years rather than stations,
   and the inference to q2 s3's relocation disappears.
4. p8 q4/s4 — sharpen the opaque causal clause (round-2 B-10); it will be the hardest
   kill quote in b4 at step 5.
5. p6 q3/s4 -> q4 s1+s2 elevation; p4 q1/s2's "localities are secure" rider stacking with
   the q4 s2 tilt on q2; p9 q4/s4 consonance with q1/s4 and q3 s2/s3's strain on q1 s3;
   p1 q1/s1 ↔ q3/s1 letterform tilt and p1 q1's low mutual exclusivity; p5 q3/s1 support
   for q2 s1/s3 and q4/s2's missing volume.
6. Batch: three lone public-engagement next steps on top of §4-F1's three lone-colour
   functions; B-5 look-elsewhere in all seven next-step slates; B-3 qualified endorsement
   in five of six attitude slates; §4-A archive uniformity, uniformly Finnic naming,
   shared p1 qtype order.
7. Every round-1 and round-2 advisory not listed above stands unchanged; none blocks.

Transcript-authoring burdens carried into step 5, listed here because option text is
immutable after freeze and the transcript is not: p1 q1's three compossible settings
need explicit denials rather than contrasts; p2's Kolmsaare-relative-to-the-coast and
time-mark burdens; p5 q4 s2's missing volume placed outside the crisis; p7 q2 s1 must
not become the q4 s2 assembly argument; p8's weed must not become the bays' cause;
p9 must keep "the plans" distinct from "the showpiece drawing".

FREEZE OK
