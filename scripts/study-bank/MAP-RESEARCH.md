# NWEA MAP Growth — research for a Classraum prep product

Research only. No practice questions were written. Compiled 2026-09-11.

**Source policy.** PRIMARY = nwea.org, NWEA technical/normative PDFs, NWEA platform
terms, school assessment pages. SECONDARY = prep vendors, blogs, news, hagwon
marketing — labelled inline. The single most useful document is the
[MAP Growth Technical Report for 2024–2025](https://www.nwea.org/uploads/MAP-Growth-Technical-Report-2025.pdf)
(dated April 2, 2026); nearly every structural claim below is from it and is
quoted rather than paraphrased where the wording matters. `pdftotext -layout`
reads it; WebFetch does not.

**One fact to hold onto before anything else:** NWEA is no longer a nonprofit.
HMH completed its acquisition of NWEA on 2023-05-01
([HMH press release](https://www.hmhco.com/about-us/press-releases/hmh-completes-acquisition-of-nwea),
[K-12 Dive](https://www.k12dive.com/news/HMH-finalizes-NWEA-acquisition/649135/) — secondary).
The 2026 technical report carries "© 2026 HMH Education Company," and copyright
complaints route to HMH Legal. Family-facing PDFs still dated 2022 describe NWEA
as "a not-for-profit organization"; that framing is stale.

---

## 1. What it is

**"The MAP test" means MAP Growth.** The three products are unrelated in
construction:

| Product | Grades | What it is |
|---|---|---|
| **MAP Growth** | K–12 (Math, Reading); 2–12 (Language Usage, Science) | The computer-adaptive interim achievement test. This is the one. |
| **MAP Reading Fluency** | K–5 | Oral-reading screener; automated speech recognition, foundational skills + fluency. ~30 min for a whole class ([nwea.org/map-reading-fluency](https://www.nwea.org/map-reading-fluency/)). Separate blueprint, no task types in common with MAP Growth. |
| **MAP Accelerator** | 3–8 Math | Was a Khan Academy-powered practice product driven by MAP RIT scores. **Discontinued — NWEA ended support 2025-08-31**, replaced by Khan Academy Districts' "Learning Paths informed by MAP Growth" ([NWEA Connection notice](https://connection.nwea.org/s/nwea-news/map-accelerator-end-of-life-transition-MCRFIXV64YEFDDRHJCMFSJJEG7CY?language=en_US), [Khan blog](https://blog.khanacademy.org/learning-paths-informed-by-map-growth/)). Do not build against it. |

**Who administers it and why.** Districts and schools, via a proctor, typically
three times a year (fall/winter/spring, optional summer). It is an *interim*
assessment: the test report frames it as universal screening, growth measurement,
placement, and program evaluation. NWEA claims 13M+ students, 35,900+ schools,
146 countries ([nwea.org/map-growth](https://www.nwea.org/map-growth/)).
It is not an admissions test in the US — but see §7, because in Korea it is used
as one.

---

## 2. Structure

All from the 2024–2025 Technical Report unless noted.

- **Subjects:** Math, Reading, Language Usage, Science. Spanish Math and Spanish
  Reading also exist. Math and Reading span K–12 on one vertical scale;
  Language Usage and Science cover grades 2–12.
- **Grade bands:** "typically K–2, 2–5, and 6+", plus course-specific tests —
  "commonly Algebra 1, Algebra 2, Geometry, and Life Sciences."
- **Length:** "All test events have a maximum of 43 items, including field test
  items." Math/Science/Language Usage carry up to 3 field-test items; Reading and
  Spanish Reading up to 4 (which may include one field-test item *set*). So
  roughly **39–40 scored items**.
- **Timing:** **untimed.** "MAP Growth 2–12 assessments are untimed and take
  approximately 45–60 minutes per content area. MAP Growth K–2 assessments are
  also untimed, and students typically take 25–40 minutes per content area."
  NWEA's family FAQ says ~45–55 minutes and "about 43 questions"
  ([Common Questions](https://www.nwea.org/the-map-suite/common-questions-families/)).
- **Security posture:** lockdown browser, proctor must activate the session,
  responses not cached locally, item exposure controls prevent a student seeing
  the same item twice "for a specified period of time."

### How the adaptivity actually works

This is the part most secondary sources get wrong, so it is worth being exact.

**Start.** "Each student begins the test with a preliminary student score based on
past test performance. If a student has no prior test score, a default starting
value is assigned according to test subject and the student's grade."

**Each step.** After every response the momentary ability estimate is updated
using **Bayesian** methods (Owen, 1975) over all responses so far, and that
estimate feeds selection of the next item. Right answer → estimate rises → harder
item. Wrong answer → estimate falls → easier item. That much matches the
folk description.

**But selection is not difficulty-only.** Since 2023 (fully rolled out 2025) NWEA
uses its **Enhanced Item Selection Algorithm (EISA)**, a compensatory heuristic
that scores every candidate item with a weighted blend of normalized item
information and a set of content "reward functions":

> R_j = λ·I'_j(θ) + (1−λ)·(Σ c_jk w_k f_k)/K

The reward functions cover each instructional area, cognitive complexity (Math
only, using Achieve's Aspects of Rigor), and — the EISA innovation — **the
distance between the item's grade and the student's enrolled grade**. On-grade
items get the highest priority; priority falls off as item grade departs from
student grade. The specific reward functions "are proprietary and not shared
publicly." Items are ranked by total reward and the top one is taken; ties are
broken randomly, which doubles as randomesque exposure control.

Consequences worth internalising:
- Item difficulty is a *preference*, not a constraint. So is the blueprint: "The
  engine prefers to meet the targets, but it will not require that they be met."
- A student can and will see **off-grade** items. "An extremely low-performing
  student could see items from two or three grades below their enrolled grade,"
  and symmetrically above. This is deliberate — EISA is designed to mimic the
  curriculum a student actually experiences.
- The predecessor algorithm was pure difficulty-matching plus instructional-area
  balancing. Anything written about MAP adaptivity before ~2023 describes that
  older engine.

**Stopping.** "The test continues until the minimum test length is reached and
standard error associated with the estimate is within acceptable limits or the
maximum test length is reached." So it is a hybrid SEM/length rule with a hard
cap of 43. The target conditional SEM is **~3.5 RIT points**, and simulation
gating requires median SEM ≤ 3.5 and true-vs-estimated score correlation ≥ 0.95.
NWEA's family FAQ says the design aims for students to answer about **50 percent**
of questions correctly — this is the intuitive statement of maximum-information
selection under a Rasch model, and is the single most important expectation to set
with a parent.

**Final score.** Maximum likelihood with fencing (Han, 2016), on the logit metric,
then RIT = 10·θ + 200. Fencing exists so an all-correct or all-incorrect pattern
is still estimable.

---

## 3. Scoring — the RIT scale

**What it is.** RIT = Rasch unIT. It is a **vertical, equal-interval** scale
"that ranges from about 100 to 350 with a mean of 200 and a standard deviation of
10." Vertical means a grade-3 fall math score and a grade-4 spring math score are
directly comparable. Equal-interval means 150→151 is the same amount of learning
as 250→251. It is **grade-independent**: a 4th grader and an 8th grader with the
same reading RIT are reading at the same level.

**Typical ranges.** From the
[2025 MAP Growth Norms Technical Manual](https://www.nwea.org/uploads/MAP-Growth-Norms-Technical-Manual-1.pdf)
(sampled from 116M scores / 13.8M students, fall 2022–spring 2024), student-level
mean RIT:

| Grade | Math fall | Math spring | Reading fall | Reading spring |
|---|---|---|---|---|
| K | 141.2 | 157.8 | 138.1 | 152.0 |
| 3 | 184.1 | 199.1 | 184.7 | 193.8 |
| 5 | 206.2 | 216.0 | 203.7 | 208.4 |
| 8 | 222.1 | 228.9 | 215.7 | 217.8 |
| 11 | 229.2 | 233.0 | 218.2 | 217.8 |

The [2025 norms quick reference](https://www.nwea.org/resource-center/fact-sheet/87992/MAP-Growth-2025-norms-quick-reference_NWEA_onesheet.pdf/)
gives the same table rounded, plus SDs (~16–20 RIT at most grades) and growth
norms.

**"Growth" means a normed change score.** Fall-to-spring growth norms, mean RIT
gain: Math K=17, G3=15, G5=10, G8=7, G11=4. Reading K=14, G3=9, G5=5, G8=2,
G11=0, **G12=−1**.

Two things follow that a prep product must not paper over:

1. **Growth collapses with age.** Reading growth is essentially zero from grade 9
   on and slightly negative in grade 12. A UI that promises "raise your RIT" to a
   high-schooler is promising something the norm sample does not do.
2. **At the upper grades, one year of normed growth is smaller than the test's own
   standard error.** Normed grade-8 reading fall-to-spring growth is 2 RIT against
   a target CSEM of 3.5. Any single-score comparison at that scale is noise.

**Parent vs teacher reading of a RIT.**
- *Parent:* the RIT alone is meaningless; the **percentile** is what they want —
  "227 was 70th percentile, now 240 is 87th." NWEA's family guide leads with
  percentile, and NWEA also publishes norms for **private, accredited,
  English-based international schools outside the US**
  ([Family Guide](https://cdn.nwea.org/docs/Family+Guide+to+MAP+Growth.pdf)) —
  directly relevant to Korea. NWEA's stated caveat: MAP Growth "scores are just
  one data point."
- *Teacher:* the RIT plus the **instructional-area subscores** and the **Learning
  Continuum**, which maps Learning Statements (skill descriptors) into 10-point
  RIT bands. The Continuum is the closest thing to a public specification of what
  content sits where on the scale, and it is the artifact any honest prep product
  would build against.

**Reliability caveat on subscores.** Overall marginal reliability is ~0.95–0.97.
But instructional-area scores are computed from only ~13 items each, and their
marginal reliability runs **0.86–0.91 on average, with some as low as 0.75**.
Building a diagnostic that tells a parent "your child is weak in Geometry" off one
13-item subscore is over-reading the instrument.

---

## 4. Item types — the part that matters most for us

Verbatim taxonomy from §4.5 of the technical report. **All items are scored
dichotomously — one point or zero, no partial credit** — which is a genuine
simplification in our favour.

**Selection items**
- *Multiple choice* — one correct option from a list. (Note: NWEA does not state
  a fixed option count. Our 4-option assumption is plausible but **unconfirmed
  from a primary source**.)
- *Multiselect* — "select two or more options... The student must select all
  correct options and nothing else to earn a point."
- *Hot text / selectable text* — select text, an equation, or a symbol from
  *within* a passage or table. Used in Language Usage and Math.

**Construction items**
- *Drag-and-drop / click-and-click* — drag options from a toolbar into containers;
  the click-and-click variant exists for keyboard accessibility. Language Usage.
- *Click-and-pop* — the selection "pops" into the container. Math. "All parts must
  be selected and placed into the right container" for credit.

**Generation items**
- *Text entry* — keyboard-typed free response. "Correct responses, and known
  variations of them, are scored as correct." Math.

**Composite structures**
- *Item sets* — several items on one stimulus. "Typically, a reading item set has
  four items per passage, with the possibility of an additional field-test item."
  Reading blueprint allows up to 2 passage-backed item sets per test event.
- *Composite items* — one stimulus, multiple sub-questions, **all parts must be
  correct for the single point**. Reading and Science.

NWEA's family guide states plainly: "The MAP Growth tests include multiple choice,
drag-and-drop, and other types of questions."

### What our 4-option MC bank can and cannot represent

| Format | Can we represent it? |
|---|---|
| Multiple choice | Yes — this is our bank |
| Item set (shared passage) | Yes — we already do passage-grouped items |
| Multiselect | **No.** Needs a select-N-of-M widget and all-or-nothing scoring. |
| Hot text / selectable text | **No.** Needs span selection inside a rendered stimulus. |
| Drag-and-drop / click-and-click | **No.** Needs a toolbar + drop containers + keyboard-equivalent path. |
| Click-and-pop | **No.** |
| Text entry | **No.** Needs a free-text answer with a variant-acceptance list. |
| Composite item | **No.** Needs multi-part items scored as one point. |

That is **six of eight formats** unrepresentable today. Two of them —
multiselect and text entry — are cheap; hot text and drag-and-drop are real
front-end work; composite scoring is a data-model change (one item, N responses,
one point).

We do not know the *mix*. NWEA does not publish what fraction of the pool is
multiple choice. It is likely the plurality, but that is an inference, not a
sourced fact.

---

## 5. Content domains (instructional areas)

**Critical caveat first, from the technical report:** *"Instructional area names
differ from state to state, even when the content of the instructional area is the
same."* NWEA publishes a separate instructional-areas PDF per standard set, and
they genuinely diverge. Any schema that hardcodes strand names must key on
**(standard set × release version)**, not on subject + grade band.

From [MAP Growth: CCSS Instructional Areas, April 2025](https://www.nwea.org/uploads/CCSS_2025.pdf):

**Math K–2 and Math 2–5** (same four names, different sub-strands):
Operations and Algebraic Thinking · Number and Operations · Measurement and Data ·
Geometry.
Blueprint item counts for Math 2–5 (from the tech report): Number and Operations
13, Measurement and Data 11, Operations and Algebraic Thinking 10, Geometry 6.
Math item counts are proportional to standards emphasis.

**Math 6+:** Operations and Algebraic Thinking · The Real and Complex Number
Systems · Geometry · Statistics and Probability.

**Reading K–2:** Foundational Skills · Language and Writing · Literature and
Informational Text · Vocabulary Use and Functions (four areas — does *not* match
the older bands).

**Reading 2–5 and Reading 6+:** Literary Text · Informational Text · Vocabulary.
Identical strand names across both bands; the tests differ in item difficulty and
passages, not in reported strands. Blueprint is **balanced — 13 items each**.

**Language Usage 2+:** Writing: Write, Revise Texts for Purpose and Audience ·
Language: Understand, Edit for Grammar, Usage · Language: Understand, Edit for
Mechanics. Balanced, 13 items each.

**Science** (from [NGSS Instructional Areas, July 2023](https://www.nwea.org/uploads/NGSS_STANDARDS_2023.pdf)):
Science 2–5, 6–8, and 9–12 all use Life Science · Physical Science · Earth and
Space Science.

**How much the state axis matters — a worked example.** New York
([NEW-YORK_2025.pdf](https://www.nwea.org/uploads/NEW-YORK_2025.pdf)) keeps the
CCSS Math and Language Usage strands unchanged, but its Reading 2–5 / 6+ strands
are **Understand Key Ideas, Details, and Connections · Understand Craft and
Structure · Vocabulary Acquisition and Use** — a cut by cognitive demand rather
than by text type. Same items underneath, entirely different reporting labels.
Other state PDFs exist (Georgia, Michigan, Minnesota, Nebraska, New Mexico, New
Hampshire, New Jersey, Wyoming) plus a generic NWEA_2025 set and separate "July
2025 Release" editions; we verified CCSS and NY only, so the *extent* of
divergence is established but not mapped.

---

## 6. The hard part for a prep product

**NWEA does not release retired items, and says so as a design claim.** From the
test-security section, verbatim:

> "the size of the item pool makes it impossible for someone to anticipate and
> practice for the specific questions that will be encountered during a test event"

NWEA's own free practice test (practice.mapnwea.org, login `grow`/`grow`) is an
**interface warm-up, not prep**: roughly five questions per grade, no score, and
the technical report confirms "Non-adaptive practice tests are available online to
familiarize students with the types of questions and item types used in MAP
Growth." Also served at [warmup.nwea.org](https://warmup.nwea.org/), split K–2 and
2+.

So every commercial product is writing original items. What they actually sell
(all SECONDARY — vendor marketing, self-reported, unverified):

| Product | What it sells | Official items? | Simulates adaptivity? | RIT-targeted? |
|---|---|---|---|---|
| [TestPrep-Online MAP PrepPack](https://www.testprep-online.com/map-5th-grade) | Per-grade K–12 packs; 5th-grade pack claims 1,000+ questions, 3 full-length tests | No — copy says "**MAP-style** questions" | Not claimed | No — organized by grade |
| [TestingMom](https://www.testingmom.com/tests/nwea-map-test-prep-2026-how-to-prepare-for-the-map-growth-test/) | Membership; claims 10,000+ MAP practice questions | No | Not claimed | Not claimed |
| [Pear Assessment (ex-Edulastic)](https://www.peardeck.com/assessments/state-test-prep/map-practice-test) | Free teacher-authored aligned item sets | No | No | No |
| eTutorWorld, Lumos Learning, Test-Guide, Jayas Academy | Tutoring + static practice sets | No | No | No |
| [Teachers Pay Teachers](https://www.teacherspayteachers.com/Product/SET-1-NWEA-MAP-Prep-Math-Practice-Worksheets-RIT-Band-191-200-Distance-Learning-3497182) | Printable worksheet sets sold explicitly by **RIT band** ("RIT Band 191–200") | No | No — printable | **Yes, explicitly** |
| Khan Academy × NWEA | The one genuinely licensed relationship — real RIT scores placed students on Khan math content, grades 3–8 | Official *partnership*, but instructional content, not MAP items | No | **Yes, genuinely** — now "Learning Paths informed by MAP Growth" |

**Not one product claims to simulate the adaptive test.** That is the most
interesting negative in this whole document. The market has converged on static,
grade- or RIT-bucketed practice sets plus tutoring.

**How they construct practice without official items:** original items written to
CCSS/state standards and mapped onto NWEA's published Learning Continuum
descriptors; RIT-band bucketing off that Continuum; repurposed state-released
items from SBAC/PARCC/state summatives; and, at the bottom of the market, generic
grade-level worksheets relabelled "MAP."

**Pricing could not be confirmed** — TestPrep-Online and TestingMom both gate
prices behind checkout flows.

---

## 7. Korea

Evidence here is stronger than expected, and it changes the shape of the
opportunity.

**MAP has an official Korean distributor.** [MAP Growth Support Korea](https://www.mapgrowthsupportkorea.com/)
self-describes as "NWEA 공식 MAP Growth 한국 유통사," based in Seoul, operating **22
official test centres nationwide** and selling licences plus a Korean-language
AI RIT/Lexile report layer. MAP is therefore a *commercially distributed product*
in Korea, not only an in-school assessment. (Distributor's own site — treat the
"official" claim as self-reported.)

**Korean schools confirmed using it** (primary — school assessment pages):
- [Korea Foreign School](https://koreaforeign.org/assessments) — NWEA MAP through the year
- [International Christian School Uijeongbu](https://icsu.kr/maptesting) — MAP Growth, explicitly not graded, parent guides in Korean and English
- Jeju English Education City: BHA and KIS Jeju run MAP each term (secondary: [home-learn newsroom](https://www.home-learn.co.kr/newsroom/news/A/2105))

**The demand driver is admissions, not benchmarking.** This is the key difference
from the US. Korean sources state consistently that international schools use MAP
as an **entrance exam**, and that most use **Reading only** for admissions —
"한국의 국제학교들은 대부분 입학시에 영어 독해만을 활용합니다"
([edumontis](https://www.edumontis.com/entry/국제학교-맵테스트-MAP-Growth-소개-결과분석-및-시험전략) — secondary).
A high-stakes gate creates prep demand that a low-stakes growth measure never
would.

**Hagwons already advertising MAP prep** (all SECONDARY, marketing copy):
- **트리니티 아카데미 / Trinity Academy** ([trinityacademy.kr](http://trinityacademy.kr/)) — Jeju EEC and Apgujeong branches, "MAP TEST·ISEE 완벽 대비," targeting NLCS, Chadwick, CMIS, BHA, KIS, SJA. Site returned 403 on direct fetch; claims are from indexed copy.
- [HIS 헤럴드교육센터](https://www.hisacademy.co.kr/international/sub1000) — school-by-school international admissions prep
- [블루키프렙](https://bluekeyprep.com/) — a Korean post titled "MAP Test의 중요성" (URL 404'd on fetch)
- General reporting that Daechi-dong hagwons are *starting* to offer MAP English prep — "생겨나고 있다," i.e. emerging, not established

**Parent-side demand signals:** a 지역내일 article titled
["국제학교 맘들만 아는 MAP Test란 무엇인가?"](https://www.localnaeil.com/News/View/630213),
a Korean-diaspora forum thread asking how to prepare for MAP as an international
school entrance exam, and — the strongest market-validation signal — TestPrep-Online
has **localised its MAP page into Korean**
([map-ko-테스트-연습](https://www.testprep-online.com/map-ko-테스트-연습)). A US vendor
spending on Korean localisation for MAP specifically implies measurable traffic.

**Honest limits.** We found no raw 네이버 블로그 or 맘카페 threads (the search tool
indexes Naver poorly), so parent demand is inferred from article framing and forum
posts rather than observed directly. Two hagwon sites could not be fetched.
And notably, **every Korean commentator who discusses hagwon MAP prep discourages
it**, recommending extensive reading instead.

---

## 8. Legal / IP

**NWEA has no public statement about third-party prep vendors.** We searched
specifically for takedowns, cease-and-desist reports, or a "we do not endorse
commercial prep" position and found none. Recording that as **unconfirmed, not
absent.**

What NWEA does say:

- **On test prep generally** ([10 do's and don'ts](https://www.nwea.org/resource-center/resource/10-dos-and-donts-of-student-test-preparation/)):
  "Preparation does not mean, 'teaching to the test,' and it bears repeating —
  preparation is not teaching to the test." Preparation is "the information,
  encouragement, and setting they need to do their best." (The full list is behind
  a lead-capture form.)
- **To families**, NWEA offers *no study advice at all* — device checks, a quiet
  room, sleep, and reassurance that the test is not tied to grades. It warns that
  helping a student answer "compromises test data." The implicit position: there
  is nothing to study for.
- **Copyright / security** ([Platform Terms of Use](https://www.nwea.org/policy/nwea-platform-terms-of-use/)):
  users agree "not to duplicate, publish, display, distribute, modify, or create
  derivative works of any NWEA Platform or Assessment Products unless expressly
  permitted." Items, images, graphs and charts are copyrighted and "may not be
  copied or reproduced in any form, including... photographs, video and/or audio
  recordings." Copyright complaints go to **Houghton Mifflin Harcourt, Attn: Legal
  Department – Copyrights**.
- **Trademarks** ([NWEA trademark statements](https://teach.mapnwea.org/impl/maphelp/Content/Overview/FrontMatter_GuideOverview/TrademarksStatements.htm)):
  NWEA® and MAP® are registered; MAP Growth™ and MAP Reading Fluency™ are
  unregistered marks.

**The industry pattern is nominative fair use behind a disclaimer.** TestingMom's
is the fullest example (secondary): "NWEA® and MAP® are registered trademarks of
NWEA... TestingMom.com is not affiliated with nor related to NWEA... NWEA does not
sponsor or endorse any TestingMom.com product."

**Practical read:** saying "MAP prep" is not the exposure — the whole industry
does it behind a disclaimer. The exposure is **reproducing actual NWEA items**,
which the Terms treat as both a copyright violation and a test-security violation
with an HMH legal contact attached. Original items plus a clear non-affiliation
disclaimer is what every surviving vendor does.

---

## What this means for Classraum

**Can a static 4-option item bank meaningfully simulate an adaptive test?**

No, and it is worth being precise about why, because two of the three reasons are
fixable and one is not.

1. *Format coverage — fixable, and cheap to partially fix.* Six of eight NWEA item
   formats are outside our bank. But every item is scored 0/1 with no partial
   credit, so multiselect and text entry are small additions. Hot text and
   drag-and-drop are real front-end work. Composite items need a data-model change.
2. *Adaptivity — partially fixable, and cheaper than it looks.* MAP is a
   Rasch/1PL CAT. If our items carried calibrated difficulties we could run a
   perfectly honest maximum-information CAT with a SEM stopping rule. **We already
   have the harder half of this:** our SAT/ACT/TOEFL work has produced per-item
   difficulty bands and a blind-attack methodology for detecting whether an item's
   difficulty is real. What we do *not* have is a calibration sample — Rasch
   difficulties need response data from real students, and per
   `attempts-data-contaminated`, our `study_attempts` rates are internal testing,
   not students. Provisional difficulties can bootstrap it; a RIT-*equated* score
   cannot be bootstrapped at all.
3. *Score equating — not fixable, ever.* A RIT is defined by NWEA's item bank and
   its vertical scale. We cannot produce a number on that scale. Any figure we show
   that looks like a RIT would be a fabrication, and given that MAP is used for
   **admissions** in Korea, a fabricated RIT is not a cosmetic error — it is a
   family making an application decision on a made-up number. Note also that the
   real test's own CSEM is ~3.5 RIT and normed upper-grade growth is 2–4 RIT; even
   NWEA's real number is noisier than most people assume.

**The minimum honest product.**

Given that no existing vendor even claims to simulate adaptivity, the bar is low
and there is room to be both better and more honest:

- **Reading-first, admissions-framed.** Korean international schools reportedly
  use Reading only for admissions. That is one subject, three instructional areas
  (Literary Text / Informational Text / Vocabulary), and passage-backed item sets
  of ~4 items — a shape our bank already produces. Do not build all four subjects.
- **Format-faithful before adaptive.** Add multiselect and text entry first; they
  are the cheap two and they immediately make practice look like the real thing.
  Ship hot text and drag-and-drop only if Language Usage or Math is added.
- **Bucket by RIT band, don't report a RIT.** Author against NWEA's public
  Learning Continuum bands, label practice as "targeted at RIT 201–210," and report
  a *practice band with an explicit range* — never a point score styled as a RIT.
  This is what the TpT sellers do, and it is defensible.
- **Set the 50%-correct expectation up front.** The real test is designed so
  students get about half wrong. A Korean parent who sees a 50% practice score
  without that framing will conclude the product is broken or the child is failing.
- **Keep strand names keyed to (standard set × release).** Korean international
  schools are unlikely to be on New York standards, but they are on *something*,
  and CCSS vs NY Reading strands are entirely different labels for the same items.
- **Carry the disclaimer from day one.** Non-affiliation with NWEA/HMH, original
  items, no claim of official content.
- **Do not reproduce a single NWEA item, ever** — including "reconstructed from
  memory" items sourced from students who sat the test. That is the one thing the
  Terms of Use explicitly names, with an HMH legal contact attached.

**The single biggest risk.**

Not IP, and not adaptivity. It is **unfalsifiable efficacy on a high-stakes gate.**

In Korea, MAP is functioning as an admissions test. Parents will buy prep against
an admissions test at almost any price, and they will judge it by whether the child
gets in. But we have no way to know whether our items resemble MAP items — NWEA
releases nothing, so unlike SAT or ACT there is **no public item corpus to
validate against, and no way to run the blind attack that our entire bank-quality
process depends on**. Every quality instrument we have built assumes we can compare
our items to the real thing. Here we cannot. We would be selling preparation for a
test we cannot see, into a market where the consequence of it not working is a
rejected application — and per §7, the Korean commentators who already discuss this
market recommend extensive reading over hagwon MAP prep. If they are right, the
product does not work and we will not be able to prove otherwise before parents do.

Mitigation is to be structurally honest about what is being sold: familiarity with
formats, stamina on an untimed 40-item test, and practice at a targeted skill band
— not a predicted RIT and not an admissions outcome.

---

### Confirmed vs unconfirmed — quick index

**Primary-sourced:** 43-item cap, untimed, 45–60 min, subject/grade coverage,
EISA mechanics and formula, Bayesian momentary updating, SEM stopping rule,
CSEM ~3.5, RIT definition and norms, all eight item formats and their dichotomous
scoring, instructional areas per standard set, state-by-state strand variation,
Terms of Use / trademark language, MAP Accelerator end-of-life, HMH ownership,
practice test is non-adaptive.

**Not confirmed from a primary source:** the number of options on a MAP multiple-
choice item (we assumed 4); the format mix of the item pool; any prep-vendor claim;
prep pricing; whether NWEA has ever acted against a prep vendor; the full extent of
state-by-state strand divergence (CCSS and NY verified only); raw Korean
parent-forum demand.
