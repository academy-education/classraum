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

**Moved to confirmed 2026-09-12, but by an uncitable source — see §9:** the
number of options on a MAP multiple-choice item (4); multiselect and
drag-and-drop present in live events, with option counts of 5 and 7 on
multiselect; ~40-41 items in a Reading event.

**Not confirmed from a primary source:** any prep-vendor claim;
prep pricing; whether NWEA has ever acted against a prep vendor; the full extent of
state-by-state strand divergence (CCSS and NY verified only); raw Korean
parent-forum demand.

---

## 9. 2026-09-12 — WHAT ANDY SUPPLIED IS NOT SCORE REPORTS. IT IS LIVE NWEA ITEMS.

Thirteen PDFs were supplied as MAP "score reports" (G7/G8/G9, Reading and
Language Usage, each labelled with a RIT and a percentile). **They contain no
scores, no reports and no student data.** Every one is a sequence of test
questions: passage, stem, numbered options, one item per page.

**Provenance, from the files themselves.** All thirteen carry
`Creator: wkhtmltopdf 0.12.5`, `Producer: GPL Ghostscript 9.15`, and creation
timestamps on **2026-10-27 between 14:29 and 14:39 KST** — thirteen documents
rendered from HTML in a ten-minute window, in Korea. That is the signature of a
browser print of live test sessions, not of anything NWEA issues. There is no
NWEA branding, no copyright line, and no student name, ID or academy mark
anywhere in the extracted text — consistent with a capture of the item frame
only.

**This is the single thing §8 and the conclusion tell us never to touch:**
"Do not reproduce a single NWEA item, ever — including 'reconstructed from
memory' items sourced from students who sat the test." These are better sourced
than reconstructions and therefore worse, not better, to hold. Consequences
taken immediately:

- The PDFs live in the session scratchpad and **were never added to the repo**.
  Nothing in this file quotes an item, a passage, a stem or an option.
- **No item in any Classraum bank may be authored from, checked against, or
  informed by this corpus.** That includes using it as a style reference, as a
  difficulty anchor, or as validation data — which is tempting precisely because
  §"What this means for Classraum" names the absence of a validation corpus as
  the biggest risk in the whole product. It is still the biggest risk. This does
  not fix it; it is the one source that cannot be used to fix it.
- Anyone reading this later: the useful output of that corpus is the **structural
  table below and nothing else**. It is recorded so nobody needs to open the
  files again.

### Structural facts, which are format and not expression

Measured over ~380 items across the 13 captures.

| Question | Prior state | Measured |
|---|---|---|
| Options on a MAP multiple-choice item | **assumed 4, unconfirmed** | **4, confirmed** — ~370 stems each carrying exactly options 1-4 |
| Items per test event, Reading | max 43 incl. field test (tech report) | **40-41** in all 6 Reading captures — consistent with complete events |
| Items per test event, Language Usage | same | **18-20** in all 7 LU captures — these are **partial**, roughly half an event |
| Multiselect exists | tech report only | **confirmed**, in BOTH Reading and Language Usage. Phrased "Which **two**…" / "Select the **three**…". Option counts **5 and 7**, not 4. ~1 per event. |
| Drag-and-drop exists | tech report, listed as Language Usage | **confirmed, Language Usage only** — 0 in 6 Reading captures. Renders as a flat word bank plus in-sentence blanks. |
| Format mix | "unknown, MC likely the plurality" | 4-option MC is the overwhelming majority; multiselect and drag-and-drop are each roughly **1 item per event** |

**Two limits on the mix number, both of which matter.** (1) A print-to-PDF of an
interactive test may silently drop a format that has no static rendering, so the
mix is a floor on MC share and a ceiling on nothing. Drag-and-drop *did* render,
which is reassuring but not proof that every format did. (2) The text extraction
is corrupted in places — a systematic `h`→`u` substitution ("tue" for "the") and
dropped spaces — so counts driven by keyword matching **undercount**; the
drag-and-drop tally in particular missed at least one item that was confirmed by
eye. Read the table as "at least this, of these kinds", not as a census.

### Two corrections to earlier sections of this file

1. **§4's 4-option assumption was right**, and can be moved to the confirmed
   list — but sourced to a corpus this project must not cite, so it stays
   unciteable in anything customer- or partner-facing.
2. **"Reading only for admissions" is weaker than §7 states.** That claim came
   from a secondary Korean source. Seven of the thirteen captures are Language
   Usage, from the same academy in the same session. That is not direct evidence
   about *admissions* use, but it does refute the working assumption that Korean
   MAP prep demand is Reading-only, and the "do not build all four subjects,
   Reading first" recommendation should be re-derived rather than inherited.

### One thing the labels give us for free, with no IP question at all

The RITs and percentiles in Andy's filenames are his own data about his own
students and carry no NWEA content. Thirteen sittings: **Reading RIT 216-251,
Language Usage RIT 220-249, percentiles 54th to 98th — every single student at
or above the median.** The authoring-band recommendation in
§"What this means for Classraum" uses "targeted at RIT 201-210" as its worked
example. For this audience that is far too low. The band to author against is
roughly **215-250**, and the audience is an above-median cohort, so authoring to
the median student would miss all thirteen.

### The practice test — the citable substitute, and it did not run

`practice.mapnwea.org` is NWEA's own public practice player. The credentials are
**`grow` / `grow`**, published by NWEA on its own help page
([PracticeTest.htm](https://teach.mapnwea.org/impl/maphelp/Content/Testing/PracticeTest.htm)),
which also confirms from primary source: "about 5 questions, depending on the
grade", **no score and no adaptive behavior**, and that MAP Math uses the
**Desmos** calculator (scientific and four-function).

This matters because it is the ONE source of NWEA-authored item formats that
this project may cite. Everything §9 measured is confirmed far better by the
Herald corpus and can never be quoted; the same facts taken off the public
practice test would be usable in a brief, a disclaimer, or a partner
conversation.

**It did not run here.** All static assets return 200 (`assessment-frontend`,
`assessment-item-renderer`, Datadog RUM), the login form accepts `grow`/`grow`,
and the player then stalls on "It's taking a while to load your content" through
both the submit button and Enter, with no XHR to a session endpoint and no
console error. Most likely the session handshake is a WebSocket or a
lockdown-browser check that the sandboxed browser blocks. **Unfinished — worth
ten minutes in a normal browser**, and the only reason to bother is citability,
not new information.

---

## 10. 2026-09-12 — SECOND RESEARCH PASS: THE NORMS, AND THE NUMBER THAT DECIDES THE PRODUCT

All primary, all from NWEA's own published PDFs, all citable. `pdftotext -layout`
again; the resource-center links serve an HTML gate, so fetch the `/uploads/`
or third-party-mirrored PDF.

### The 2020 norms are retired. Everything in §7 and §9 was read against them.

NWEA replaced the 2020 norms with the **2025 norms on 2025-07-11**
([quick reference](https://www.nwea.org/resource-center/fact-sheet/87992/MAP-Growth-2025-norms-quick-reference_NWEA_onesheet.pdf/),
[blog](https://www.nwea.org/blog/2025/whats-new-in-the-2025-map-growth-norms/)).
Sampled from 116 million scores of 13.8 million students across 30,000 schools,
fall 2022 to spring 2024. They recalibrate to post-pandemic achievement AND to
**EISA**, the enhanced item-selection algorithm, which is now fully rolled out —
so the 2025 norms describe the test as it actually behaves today and the 2020
norms do not. NWEA states the consequence plainly: *"the same RIT score will now
correspond to a higher percentile rank than it did under the 2020 norms."*

**2025 fall student achievement norms, the grades we care about:**

| Grade | Reading mean (SD) | Language Usage mean (SD) |
|---|---|---|
| 7 | 212 (17) | 210 (16) |
| 8 | 216 (17) | 214 (16) |
| 9 | 216 (18) | 214 (17) |

Andy's thirteen sittings were taken in **October 2022**, so their percentile
labels are **2020-norm numbers** and understate the students by today's
reference. Recomputed against the 2025 fall norms (normal approximation, so
treat as ±2): every one of the thirteen moves **up**, mean **+6.2 points** —
G9 Reading 226 goes 62nd → 71st, G7 Language Usage 220 goes 62nd → 73rd. That
all thirteen move the same way, unprompted, is an independent reproduction of
NWEA's own stated direction and is the reason to trust the arithmetic.

**Rule this fixes:** a percentile is meaningless without its norms vintage. Any
figure this product ever shows a parent must be stamped *2025 norms*, and any
historical score a family brings in from before July 2025 must be restated
before it is compared to anything.

### THE NUMBER THAT DECIDES THE PRODUCT: a year of growth is smaller than the noise

2025 **reading student growth norms**, fall-to-spring:

| Grade | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|
| mean RIT gained | **2** | **2** | **1** | 1 | 0 | **-1** |
| SD | 9 | 9 | 10 | 11 | 12 | 13 |

Language Usage is the same shape (G7 3, G8 3, G9 2). Reading growth has
essentially **stopped by grade 7** — the scale is vertical and near-asymptotic
at the top, and grade 12 is negative.

Set that against the test's own precision. §3 already records **CSEM ≈ 3.5 RIT**
from the technical report. A fall-to-spring *difference* is two measurements, so
its standard error is 3.5 × √2 ≈ **4.9 RIT**. Therefore:

> **A full school year of nationally typical reading growth for a 7th-9th grader
> is 1-2 RIT, and the measurement error on detecting that growth is ~4.9 RIT.
> The noise is two to five times the signal.**

This is the most important fact found in either research pass, and it cuts three
ways:

1. **Nobody can demonstrate MAP prep efficacy on an individual student, ever.**
   Not us, not a hagwon, not NWEA. §"The single biggest risk" called our efficacy
   *unfalsifiable*; it is now precisely quantified, and it is unfalsifiable for
   everyone selling into this market. That is a defence as much as a limitation
   — but only if we say it first and in writing.
2. **Never promise, imply, or display a RIT gain.** A student who "gains 8 RIT"
   after our course has moved less than one SD of the ordinary growth
   distribution and under two standard errors of pure measurement noise. Framing
   that as our effect would be a fabrication of the same class as printing a RIT.
3. **It reframes what the product honestly sells.** Not growth. Format
   familiarity, stamina on an untimed 40-item test, and practice at a targeted
   band — which is exactly what §"Mitigation" already said, now with a number
   behind it instead of a scruple.

### The Learning Continuum — the legitimate authoring spec, and it is gated

Confirmed from
[NWEA's help page](https://teach.mapnwea.org/impl/maphelp/Content/Data/SampleReports/LearningContinuumRef.htm):
statements are *"instruction-oriented statements that describe the concepts and
skills assessed by MAP Growth"*, organised in **10-point RIT bands**, and each
statement *"corresponds to at least one item on the selected test in the
displayed 10-point RIT band."* NWEA's blog adds the definition that matters for
authoring: a statement describes questions that students in that band *"got
right about 50% of the time."*

So the Continuum is a per-band skill specification derived from real items —
precisely the authoring blueprint §"The minimum honest product" recommends
building against, and it carries no item text, so using it is clean. **It is
behind a district login at `start.mapnwea.org`** and NWEA publishes no public
copy; the strand names are visible in correlation documents from third parties.
Obtaining a legitimate copy is a partnership question, not a research one.

**Where Andy's cohort sits on it:** RIT 216-251 Reading spans roughly **five**
10-point bands (210-219 through 250-259). A product targeting this audience
needs five band-specific item pools per subject, not one.

### Two corrections to §7's Korea section, and they point opposite ways

- **The admissions premise is still unconfirmed by any school.** §7 rests the
  entire commercial case on Korean secondary commentary that international
  schools use MAP — Reading only — as an entrance exam. A pass over the named
  schools' own admissions pages (NLCS Jeju, Branksome Hall Asia, Chadwick, KIS)
  found **no school stating a MAP requirement or a cutoff**. The one concrete
  use found is KIS Jeju, where MAP appears alongside AMC and STAR Reading for
  **Honors course placement** — placement, not admission. The Korean-language
  search likewise surfaced the same edumontis claim repeated and **no published
  cutoff at any school**. This does not refute §7; absence from a public page is
  weak evidence about admissions practice. But the load-bearing commercial
  premise of this entire product is sourced to blog commentary and hagwon
  marketing, and that should be stated plainly before anyone builds.
- **Placement use cuts the other way, commercially.** If MAP gates Honors
  placement for students *already enrolled*, the addressable moment is recurring
  and in-school rather than one-shot and pre-admission — a different product,
  and a larger one.

### Added to the citable list

4-option MC now has an independent, quotable confirmation route (the public
practice test, still unrun — see §9). 2025 norms tables, growth norms, EISA
rollout, Learning Continuum structure and the 50%-correct definition are all
primary and quotable today.

---

## 11. 2026-09-12 — THE CO-FOUNDER CORRECTS THE MARKET QUESTION, AND §10 WAS WRONG TO LEAN ON A NEGATIVE

§10 recorded that no named school publishes a MAP admissions requirement and
treated the admissions premise as unconfirmed. **The co-founder states it
directly: in Korea MAP is BOTH an entrance exam AND a periodic progress /
evaluation test, taken by middle and high school students.**

That is better evidence than the absence I was reasoning from. A school not
publishing its entrance testing on a public page is unremarkable — Korean
international-school admissions run through admissions offices and agencies, not
marketing pages — and "no public cutoff found" was never evidence of no cutoff.
**Recorded as a correction because the failure mode is one this file keeps
catching in other forms: I read a silent source as a negative source.** §7's
original reading was right and §10's doubt is withdrawn.

**Both uses are now confirmed, and they are different products:**

| use | when | what a customer wants | what we can honestly sell |
|---|---|---|---|
| **Entrance** | once, before applying | a higher score on a gate | format familiarity, stamina, band-targeted practice |
| **Progress / evaluation** | every term, in school | to know where the child is and what to fix | a diagnostic — which skills miss, at which band |

The second is the larger and the more defensible of the two, and it is the one
this bank is actually built to serve. It is also the one where §10's growth
finding stops being an obstacle: **a diagnostic does not have to move a RIT, it
has to locate a student**, and locating a student is exactly what a
band-targeted item pool does. Selling "we will raise your RIT" remains
indefensible — 1-2 RIT of annual growth against ~4.9 RIT of measurement error —
but that was never the only product available.

### What this changes about scope

- **Two subjects, not one.** §9 already weakened "Reading only" (seven of
  thirteen captures were Language Usage). With the progress use confirmed,
  Reading **and** Language Usage are both in scope; Math and Science are not,
  yet.
- **Grades 6-10, RIT roughly 200-250.** Middle and high school, which is where
  both uses sit and where the reading scale is flattest.
- **Four-option multiple choice is enough to start.** §4's "six of eight formats
  unrepresentable" reads as fatal and the measurement in §9 says otherwise:
  multiselect and drag-and-drop run at roughly **one item each per ~40-item
  event**, so a 4-option MC practice test reproduces the large majority of a real
  event. Note the provenance limit — that count may not be cited outside this
  file, and the public practice test (§9, still unrun) is the citable route to
  the same fact.
- **Report a band with a range. Never a RIT, never a predicted score, never a
  gain.** Unchanged and now more important, not less: an entrance exam is
  precisely where a fabricated number does real harm to a real family.

---

## 12. 2026-09-12 — THE COVERAGE MAP: WHAT WE ALREADY HOLD AGAINST MAP'S REAL STRANDS

The strand list below is **primary and citable**: NWEA's own
[CCSS instructional areas](https://www.nwea.org/uploads/CCSS_2024.pdf)
(dated 2024-10-08). This replaces the guesswork in §"The minimum honest
product", which named three Reading strands from a third-party correlation page.

**MAP Growth Reading 6+ — 3 areas, 5 sub-strands**
- Literary Text → *Analyze Theme and Literary Elements; Summarize* · *Analyze Point of View, Features, and Structure*
- Informational Text → *Analyze Central Idea, Concepts, and Events; Summarize* · *Analyze Point of View, Purpose, Features, and Structure*
- Vocabulary → *Vocabulary*

**MAP Growth Language 2+ — 3 areas, 8 sub-strands**
- Writing: Write, Revise Texts for Purpose and Audience → *Plan, Organize; Create Cohesion, Use Transitions* · *Provide Support; Develop Topics; Conduct Research* · *Establish and Maintain Style; Use Precise Language*
- Language: Understand, Edit for Grammar, Usage → *Parts of Speech* · *Phrases, Clauses, Agreement, Sentences*
- Language: Understand, Edit for Mechanics → *Capitalization* · *Punctuation* · *Spelling*

### What we hold, measured

Pool: live, unarchived, **four-choice** (MAP's MC width) items in SAT/ACT/ISEE
reading, writing and verbal sections. **1,706 items.** The mapping from our
domains to MAP strands is a JUDGEMENT and is written out so it can be argued
with; the counts under it are exact.

| MAP strand | our nearest material | items | verdict |
|---|---|---|---|
| Informational Text | SAT Information and Ideas 250, SAT Craft & Structure ~224, ACT natural science 45 / humanities 36 / social science 36 | **~591** | **covered, richly** |
| Writing: Purpose and Audience | SAT Expression of Ideas 244 (Transitions 150, Rhetorical Synthesis 94), ACT Production of Writing 75 | **~319** | **covered** |
| Grammar, Usage | SAT Standard English Conventions (non-boundary portion) ~253, ACT Conventions 87, ACT Knowledge of Language 38 | **~378** | **covered** |
| Mechanics · Punctuation | SAT SEC boundary/punctuation subskills ~56, plus ACT punctuation | **~56+** | thin but real |
| Literary Text | ACT literary narrative 45; part of ISEE Reading Comprehension 117 | **45 firm** | **thin** |
| Vocabulary | SAT Words in Context 55; ISEE Verbal 180 is adjacent, not the same construct (isolated synonyms and completions, not vocabulary in a passage) | **55 direct** | **thin** |
| Mechanics · Capitalization | — | **0** | **ABSENT** |
| Mechanics · Spelling | — | **0** | **ABSENT** |

**The two zeros are real and were checked, not assumed**: a scan of subskill and
prompt text across all 1,706 items returns **0 spelling items and 0
capitalization items.** Neither the SAT nor the ACT tests either one, so no
amount of borrowing from those banks can cover them. MAP does test both — they
are two of the three Mechanics sub-strands. **Any Language Usage product has to
author these from scratch**, and they are the cheapest items in the whole plan
to write.

### THE REAL CONSTRAINT IS DIFFICULTY, NOT COVERAGE

    the 1,706-item pool:   easy 291 (17.1%)   medium 1,070   hard 345

Our reading and language material was authored for the **SAT and the ACT** —
grade 11-12 entrance tests. MAP Growth 6+ has to serve **RIT ~200-250, roughly
grade 5 through 11**, and a diagnostic's whole job is to place a student
anywhere in that range. We are top-heavy for this audience: SAT Craft and
Structure holds **zero** easy items out of 244, and Information and Ideas holds
**four** out of 250.

So the honest shape of the build is the opposite of the intuition. It is not
"author a MAP bank" — the upper-middle of the range is already well covered by
material we own. **It is: author the bottom of the range, and author Mechanics.**

### Recommended first build, in order

1. **Run the public practice test** (§9, ten minutes, still unrun). Citable
   confirmation of option count and format mix. Do this before any authoring so
   the brief can cite something.
2. **Author Capitalization and Spelling.** Zero coverage, three sub-strands
   between them with Punctuation, and they are short, cheap, band-scalable
   items. This is the only place where a MAP product needs material that cannot
   be adapted from anything we own.
3. **Author easy-band Reading.** 291 easy items across all reading and language
   is thin for five RIT bands across two subjects, and it is exactly where a
   grade-6 student is placed.
4. **Re-band, do not re-author, the middle and top.** ~591 Informational Text
   and ~378 Grammar items already exist. The work there is assigning RIT bands,
   not writing items — and per §10 those band assignments are unvalidated until
   response data exists, so they ship as "targeted at" and never as a measured
   level.
5. **Literary Text and Vocabulary need topping up** — 45 and 55 firm items are
   real but will not carry a strand across five bands.

**What NOT to do, restated because it survives every version of this plan:** no
RIT, no predicted score, no gain claim. The product locates a student in a band
and names what they missed. That is both the honest claim and, per §11, the one
the recurring progress use actually wants.

---

## 13. 2026-09-12 — SCOPED TO GRADES 5-11: WHAT IS ACTUALLY READY

Scope set by Andy: **grades 5-11, Reading and Language Usage.**

**One simplification, confirmed from the CCSS instructional-areas PDF:** MAP
Reading ships as two tests (2-5 and 6+) and grade 5 sits in the lower one — but
**their instructional areas are IDENTICAL**, Literary Text / Informational Text
/ Vocabulary with the same five sub-strands. Language Usage is a single 2+ test.
So grades 5-11 needs **one strand model per subject**, not two. The tests differ
in difficulty, not in structure.

**The range, from the 2025 norms.** Taking each grade's mean ±2SD and unioning
grades 5 through 11: **RIT 170-260 for both subjects — nine ten-point bands.**
Grade medians (fall) run Reading 204 → 218 and Language Usage 202 → 218 across
those seven grades, which is the flat top of the vertical scale doing what §10
described.

Nine bands × six strands = **54 band-strand cells** a full diagnostic would
eventually want.

### READY — usable with re-banding, no authoring

| strand | items | where it sits |
|---|---|---|
| Informational Text | ~591 | top of the range |
| Grammar and Usage | ~378 | top of the range |
| Writing: Purpose and Audience | ~319 | top of the range |
| Mechanics · Punctuation | ~56 | top of the range |
| **total** | **~1,344** | |

### NOT READY — and the reason is one fact

**Every item we own was authored for SAT, ACT, ISEE Upper Level or SSAT Upper
Level. The bank has no material written below grade 8.**

"Easy" in this bank means *easy for a grade-11 test-taker*, which is not
grade-5 material and must never be relabelled as if it were. Our floor lands
around **RIT 210-215**. The grade-5 median is **204** and the grade-7 median is
**212**.

**So the bottom four bands (170-209) are empty, and they are not the "weak
student" bands — for grades 5, 6 and 7 they are where the TYPICAL student
sits.** We currently have nothing at the grade-5 median.

Plus the strand holes already recorded in §12, which apply at every band:
Literary Text 45, Vocabulary 55, **Capitalization 0, Spelling 0.**

### The honest one-line answer

**Ready for roughly the top five of nine bands and for grades 9-11 — about a
third of the stated scope. Grades 5-8 are the product, and they do not exist
yet.**

### What that makes the first authoring brief

Not "author a MAP bank". In order:

1. **Grades 5-7 Reading and Language Usage, RIT 170-209.** Four bands, six
   strands. This is the whole gap and the whole product; everything else is
   trimming. It is also material this project has never written — every brief on
   file targets an admissions test for 11th-graders.
2. **Capitalization and Spelling, all bands.** Zero coverage, cheap items, and
   the only strands no borrowing can reach.
3. **Literary Text and Vocabulary top-up**, which are thin rather than absent.
4. **Re-band the ~1,344 we already own** into the top bands — assignment work,
   not authoring, and per §10 it ships as "targeted at" and never as a measured
   RIT.

**A caution that belongs in the brief itself:** authoring below grade 8 is new
ground for this bank, and CLAUDE.md's standing lesson is that a batch built to
one brief develops a cross-item tell. The first grade-5 batch should be small
and attacked before a second is commissioned.
