# SAT duplicates: 8% are real, not the 20% first reported

**CORRECTED 2026-08-14, before anything was archived.** The first version
of this file said 19.6% of the live SAT bank was duplicated and
recommended archiving 228 items. That number conflated two different
things and the recommendation would have destroyed ~100 sound items.
The original analysis is kept below the correction because the mistake
is the useful part.

## The correction

Splitting the 895 flagged pairs by whether the ANSWER also matches:

| | pairs | what it is |
|---|---|---|
| same question **and same answer** | **106** | true duplicate — a leak |
| same template, **different answer** | **789** | practice variety — not a leak |

**128 items** sit in a same-answer pair, not 308.

The stated harm was "a student who has seen one gets the other free".
That is true of the SEC triplet (all keyed `is`) and the cos(C)/sin(A)
pair (both 4/5). It is FALSE of the largest cluster — 32 "right triangle
ABC, right angle at B" items with different legs (20/21, 5/12, 15/36,
41/9, 17/8 …). Same skill, different arithmetic, different answer. A
student still has to compute. That is a curriculum question about how
much drill one template deserves, not a defect.

Same-answer pairs per cohort: Geometry 53, Advanced Math 21, Algebra 18,
SEC 11, PSDA 3.

**This is the MATH-HUB-RESULT mistake, caught one step earlier.** There,
a real defect measured on one authoring cohort was nearly generalised to
690 sound items. Here a real defect (106 pairs) was nearly generalised to
789 pairs that share only a shape. The checker was right; the harm story
attached to its output was not, and the harm story is what licenses a
destructive fix.

**Nothing has been archived.** `dedupe-cluster.mjs` remains dry-run; it
must be re-scoped to the same-answer subset before `--apply` is used.

---

# Original analysis (the 19.6% figure — superseded above)

SAT-PLAN.md Phase 1 item 4. Run 2026-08-14, whole live population,
no model calls, no human. `check-duplicate-items.mjs`.

## Result

| cohort | items | pairs | items involved | |
|---|---|---|---|---|
| Geometry and Trigonometry | 219 | 647 | **119** | **54.3%** |
| Advanced Math | 191 | 99 | **73** | **38.2%** |
| Algebra | 199 | 87 | **64** | **32.2%** |
| Problem-Solving and Data Analysis | 211 | 48 | 28 | 13.3% |
| Standard English Conventions | 234 | 14 | 24 | 10.3% |
| Information and Ideas | 240 | 0 | 0 | 0.0% |
| Craft and Structure | 211 | 0 | 0 | 0.0% |
| Expression of Ideas | 66 | 0 | 0 | 0.0% |
| **TOTAL** | **1,571** | **895** | **308** | **19.6%** |

**The defect is a MATH defect.** Three of four R&W cohorts are perfectly
clean; the fourth has a single template repeated. Geometry is more than
half duplicated.

## Why it matters more than it looks

Unseen-first draw ordering does not protect against this. Duplicates are
distinct rows with distinct ids, so both count as unseen and both can be
drawn — into the same test, or into a later one. Two consequences:

1. A test drawing both measures one skill twice and reports it as two,
   which inflates the apparent precision of the score.
2. A student who has seen one gets the other free. That is a leaked
   answer arriving by a different route.

## Verified, not assumed — two live pairs read by hand

**Standard English Conventions, three items, similarity 1.000.** Same
boilerplate stem, same four options (`is / are / were / have been`),
same key, and near-identical sentences:

> The collection of rare medieval manuscripts, **along with** several
> first-edition novels donated last spring by the retired professor,
> ____ now housed in the library…
>
> The collection of rare medieval manuscripts, **along with** several
> first-edition novels donated by the late professor, ____ housed in a
> climate-controlled room…
>
> The collection of rare medieval manuscripts, **together with** several
> first-edition novels donated last spring by an anonymous benefactor,
> ______ now housed in the…

One grammar point — subject-verb agreement across an intervening phrase
— with the nouns reworded. Learn one, you have all three.

**Geometry, similarity 0.969.** Same triangle (AB=9, BC=12, AC=15), same
options, same key 4/5. One asks for cos(C), the other for sin(A). In a
right triangle with the right angle at B those are the SAME ratio,
12/15. Same computation, twice, with the same figure.

## Two corrections the checker forced, both before any number was believed

- **The first run included ARCHIVED rows** and reported 3,714 pairs over
  694 items. The three worst offenders turned out to be `archived:true`
  identical triplets left by a repair cycle. Archived items are served
  to nobody, so counting them measures the bank's history, not its
  present. Live-only is 895 pairs / 308 items.
- **The self-test rejected the first two designs.** Word 3-shingles
  scored the Math constant-swap at 0.41 — the exact defect the check
  exists for, missed. Character 5-grams lifted it to 0.62 but a
  single combined signature still could not separate two legitimate
  resemblances: R&W's boilerplate stems (shared question, different
  passage) and passage groups (shared passage, different question).
  The rule is now two-part — question AND passage must both match —
  which rejects both traps and keeps the true positives.

## Limits

- **The threshold is a judgement, not a measurement.** 0.50 on each half
  was set from the separation the fixtures showed (constant-swap 0.62 vs
  boilerplate 0.36) and not moved afterwards. A different threshold
  gives a different count; the pairs at 0.95+ are duplicates on any
  reading, the ones near 0.50 are a matter of taste.
- **Near-duplicate is not identical.** 308 items are involved in at
  least one pair. That is not 308 items to delete — a cluster of four
  near-copies should collapse to one, so the number to REMOVE is smaller
  and needs the clusters resolved first.
- Says nothing about whether any item is correct, only whether it is
  distinct.

## Recommended next step

Cluster the 895 pairs into connected components, keep the best item in
each, archive the rest. Geometry alone should recover most of the 119.
This is mechanical and needs no human judgement beyond picking which of
a set of near-identical items to keep — and even that can default to the
most recently authored.
