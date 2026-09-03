#!/usr/bin/env node
/**
 * build-act-reading-v6.mjs — emits scripts/study-bank/act-reading-v6.batch.json
 *
 * One ACT Reading form: 4 passages x 9 items. Passages are held once as
 * consts and stamped onto all nine of their items, so the byte-identity
 * the checker demands is structural rather than a promise about copy-paste.
 *
 * Every item is authored as { key, distractors[3], slot } and the key is
 * SPLICED into position `slot`. That keeps the 9/9/9/9 slot balance a
 * property of a table (SLOTS below) instead of something that has to be
 * eyeballed across 36 hand-ordered option lists — the "key in slot A"
 * finding.
 *
 * All four passages are original.
 */
import { writeFileSync } from 'node:fs'

/* ------------------------------------------------------------------ *
 * P1 — literary narrative, PAIRED. Two siblings on the day their
 * grandfather's hardware store was emptied.
 * ------------------------------------------------------------------ */
const P1 = `Passage A

[1] My mother made the list before we unlocked the door. She stood on the sidewalk with a legal pad against her forearm and wrote: front counter, back room, the loft. Then she wrote the hours she thought each would take, and she was wrong about all three, which I did not point out. Theo says she was wrong on purpose, to make the day sound smaller than it was. I think she was simply a woman who had never inventoried a hardware store and had no way to know that a wall of drawers holds four hours of decisions.

[2] Grandpa had run Ferrell & Son on Wyandotte for fifty-one years, and the son in the name was his father's optimism, not a fact. We started at the counter. The register was a machine with a crank, kept because a repairman had once told him it would outlast anything with a cord, and it had. Under it we found receipts in rubber bands by year, back to 1974, which my mother did not read. She wrote receipts on the pad and put a number beside it and carried the whole bundle out to the truck without opening one.

[3] That is the part Theo cannot forgive, and it is the part I keep. There were nine hundred customers in those bands. If she had started reading we would still be standing there. Somebody has to be the one who decides what the day is for, and she decided it was for emptying a building, and so the building got emptied.

[4] In the third drawer from the floor were the brass hinges, two hundred of them, unsold since before I was born. My mother wrote hinges, 200, brass. Theo asked why anyone would order two hundred hinges. My mother said, because he did not like the sound of no, and kept writing. I remember thinking it was the truest thing said all day, and that she had said it without stopping her pen, and that both of those things were her exactly.

Passage B

[1] What I remember is that people kept coming. We had the door propped for the truck, and by noon six of them had been through it, none buying anything, all standing just inside with their hands in their pockets saying they had heard. A man named Delgado told me our grandfather had cut him a key at seven in the morning once, in 1989, for nothing, because Delgado was locked out of a job site. Nell was in the back with the pad and did not hear any of it.

[2] My mother's list is famous in our family now. Front counter, back room, the loft, with times beside them. Nell tells it as competence. I have never been able to hear it that way. My mother loved him, and she spent the whole of the day he stopped existing writing down what a thing was and how many of it there were, and when Delgado came in she shook his hand and then asked me to bring down the tape measure. I do not think she was cold. I think a list is a place to stand when the floor is gone.

[3] The hinges were the argument. Two hundred brass hinges in the third drawer, and Nell asked, or I asked, and my mother said he did not like the sound of no. Nell repeats that line as though it settles something. It never settled anything for me. He ordered them the year a contractor wanted forty and he had eleven, and he stood in the doorway a long time afterward, our grandmother said. He was not avoiding a word. He was making sure the store could answer.

[4] We finished at nine, four hours past every number on the pad. Nell drove. I sat with the receipt bundles on my knees, and somewhere on Wyandotte I pulled one band off, and it was a carbon for two dollars and ten cents, 1981, a name I did not know. I put the band back on. My sister was right that somebody had to decide what the day was for. I have never been sure it was ours to decide.`

/* ------------------------------------------------------------------ *
 * P2 — social science. Volunteer fire departments and recruitment.
 * ------------------------------------------------------------------ */
const P2 = `[1] There are roughly a million firefighters in the United States, and about two-thirds of them are not paid to be. They are volunteers, and they are concentrated in the places least able to do without them: townships of eight hundred people, county districts of forty square miles, stretches of highway where the nearest career department is twenty-five minutes away. For most of the twentieth century this arrangement was invisible, because it worked. It is visible now because the rosters are shrinking. National counts put the volunteer force at its lowest in four decades, and the decline has been steepest in departments serving fewer than twenty-five hundred residents.

[2] The explanation offered at nearly every conference is that Americans are busier than they used to be. Two earners in a household, longer commutes, an economy that pulls young adults toward metropolitan areas: the story is intuitive, and it is not wrong. But when the sociologist Marisol Etheredge assembled exit interviews from four hundred and twelve departing volunteers across six states, the busyness story explained less than she had expected. Only about a fifth of the departures named work or family schedule as the primary reason. A larger share named the training.

[3] Volunteer firefighting has become a credentialed occupation performed for free. In 1975 a rural recruit in most states could ride to fires after a weekend orientation. Today the entry-level structural certification runs between one hundred fifty and three hundred hours, depending on the state, and it is followed by annual refreshers, medical certifications, and a documentation load that a paid administrator elsewhere spends her working week maintaining. Nobody in Etheredge's sample argued that the standards were wrong. Firefighters who have watched a colleague die in a residential fire do not campaign for less training. What they said instead was that the standards had been written for a career workforce and then handed to an unpaid one without anyone asking what a volunteer's calendar could absorb.

[4] The second finding was about the work itself. Fire departments in the United States respond to far more medical emergencies than fires; in many rural districts, emergency medical calls are seventy percent or more of the annual total, and the fire has become the rare event. Recruits arrive having imagined one job and find themselves doing another, at three in the morning, for a neighbor whose overdose or fall or cardiac arrest they will attend again in six weeks. Etheredge's interviews are full of people who left not because the work was too much but because it was not the work they had joined.

[5] This points at a distinction that recruitment campaigns tend to blur. A department that cannot fill its roster assumes it has a recruiting problem and buys billboards, and the billboards work: applications rise. The attrition curve, however, does not bend, and the department is back at its old number within two years. Etheredge's data put the most common departure in the third year of service, well past the point where a recruit could be called a poor fit and well past the district's investment in certifying her. A department losing people at year three does not need more applicants. It needs to find out what happens in year three.

[6] Some departments have. The district in Callowhill County, which had eleven active members in 2011 and fifty-one in 2023, did nothing recognizable as a recruiting campaign. It rewrote its membership categories. A person may now join as a support member: traffic control, air bottles, rehabilitation at the scene, the radio, the endless paperwork, with no requirement ever to enter a burning structure and no structural certification to earn. Roughly half of Callowhill's growth sits in that category, and a quarter of its interior firefighters came up through it, having discovered on a cold road at midnight that they wanted the rest of the training after all.

[7] The model has been copied, and it should be copied carefully. Callowhill sits within commuting distance of a university, and its median resident is nine years younger than the median for districts of its size. Etheredge, asked whether the tiered roster would travel, was unwilling to promise that it would: the intervention and the demographics arrived together, and no one has yet run the tiered model in a district whose population under forty is actually falling. What Callowhill demonstrates is narrower but still useful, which is that a district's roster is partly a product of the roles the district has decided to offer, and that those roles are not fixed by the nature of the work.

[8] The alternative is arithmetic. A volunteer district that fails converts to a paid or combination department, and a township that has never levied for salaries discovers what the service it received for a bake sale and a raffle actually costs. Estimates of the labor volunteers donate nationally run to tens of billions of dollars a year. That figure is usually offered as a tribute. It is better read as an invoice that has not yet been presented.`

/* ------------------------------------------------------------------ *
 * P3 — humanities. How a museum decides what to deaccession.
 * ------------------------------------------------------------------ */
const P3 = `[1] On the table in the registrar's office there is a list of ninety-one objects, and the meeting that begins in ten minutes will decide whether any of them stay. This is deaccessioning: the formal removal of an object from a museum's permanent collection, by sale, transfer, or destruction. It is the least discussed of a museum's routine activities and the one most likely to end in a newspaper.

[2] The discomfort is old and it is earned. In the early 1970s a large American museum quietly sold paintings out of a bequest to fund purchases it preferred, and the resulting scandal produced the rule that governs the practice today: proceeds from a deaccession may be used only to acquire other objects, or, under a later and contested revision, to care for the ones that remain. They may never be used to repair a roof or meet a payroll. The rule is not a technicality. It exists to prevent a museum from experiencing its own collection as a liquid asset, which is precisely what a collection becomes the moment anyone is allowed to spend it.

[3] Against that history stands a fact museums have been slow to say out loud. A collection is not a fixed library; it is an accumulating one. A regional museum that has been accepting gifts for a hundred and twenty years holds objects it did not choose, in quantities nobody planned, and the great majority of them will never be exhibited. Ninety-five percent is the figure most often quoted for storage, and while it varies wildly by institution and by discipline, no curator disputes its direction. Every object in storage is being paid for: shelf space, climate, insurance, the hours of the one conservator. A museum that will not remove anything is not preserving its collection equally. It is spreading a fixed budget across a growing number of things.

[4] The counterargument does not depend on sentiment. When a donor gives an object to a museum, she is not selling it; she is accepting a lower price, sometimes a price of nothing at all, in exchange for a belief about where the object will be. Deaccessioning revises that bargain after the other party has died. And the object that leaves rarely enters another public collection. It enters the market, and from the market it usually enters a private room, out of which it may not come in the lifetime of anyone now working.

[5] I sat in on such a meeting for two days, and what surprised me was how little of it concerned the objects a visitor would assume were at issue. The forgeries and the ruined things went in four minutes. The duplicates took longer, but not much: a museum holding nine near-identical pressed-glass compotes can defend keeping three. What consumed the two days were two other categories. The first was the good object the museum has no reason to hold, an accomplished eighteenth-century Dutch still life in a museum whose mission statement says it documents the industrial river valley outside its windows. Nobody in the room doubted the painting's quality. The question was whether quality is a reason, and the room could not agree.

[6] The second category was the object nobody could identify. A carved wooden figure, an accession number and a date and the word African, entered in 1931 in a hand that recorded nothing else. It cannot be exhibited, because a label would have to lie. It cannot be researched, because there is nothing to research it from. It cannot be repatriated, because there is no one named to return it to. The registrar had put it on the list. By the end of the second afternoon it had come off, and the reason given was that the museum's inability to say what the object is tells us nothing about the object. It tells us about the museum.

[7] If I were asked for a test, it would be this one: would the museum accept this object today, offered by a stranger, with no gift attached and no donor's name to carry? The question is unsentimental and it is answerable, and it moves the argument off the object's merit, where it always stalls, and onto the museum's purpose, where it belongs.

[8] I would then have to admit the test's weakness, which is not small. It asks a museum to judge a hundred-year-old holding by what it wants now, and museums have wanted badly and been certain of it. The industrial-valley museum was, for its first forty years, a museum of local prominent men, and it removed nothing then, because it saw nothing to remove. A test that hands back the taste of the present as though it were a finding is worth only as much as the humility of the people applying it, which is an argument for writing the reasons down, in the minutes, where whoever is holding the list in 2140 can read them and see exactly how sure we were.`

/* ------------------------------------------------------------------ *
 * P4 — natural science. Desert biological soil crusts.
 * ------------------------------------------------------------------ */
const P4 = `[1] Walk across an undisturbed stretch of the Colorado Plateau and the ground underfoot is not loose sand. It is dark, knobby, faintly spongy, and in places it stands up in miniature pinnacles a few centimeters high. This surface is alive. Biological soil crust, or biocrust, is a community of cyanobacteria, lichens, mosses, and fungi occupying the top few millimeters of soil, and across drylands, which are roughly two-fifths of the planet's land surface, it holds ground that vascular plants cannot.

[2] The organism that builds the foundation is a filamentous cyanobacterium of the genus Microcoleus. When the soil is wet its filaments glide through it, trailing a sheath of polysaccharide behind them; when the soil dries the filaments retreat and the abandoned sheaths remain, a mesh of sticky fibers that binds loose grains into a cohesive mat. A single gram of crust may hold a kilometer of these filaments. What was a surface of independent particles becomes a fabric, and the practical consequence is that the wind can no longer lift it. Wind tunnel work on Plateau soils finds that a mature crust multiplies the wind speed required to move surface grains.

[3] Once the cyanobacteria have stabilized the surface, slower organisms arrive: darkly pigmented cyanobacteria first, then lichens, then mosses, each adding roughness and thickness. Along with stability the crust supplies nitrogen. Free-living and lichen-associated cyanobacteria fix atmospheric nitrogen, and in many drylands this biological fixation is the principal input to a system with no legume-rich vegetation and little deposition from elsewhere. Nitrogen released from crusts has been traced into the tissue of neighboring shrubs.

[4] A third claimed function is more contested. Crusts are often said to improve infiltration by holding water behind their pinnacled surfaces, and on the cool, rough, moss-and-lichen crusts of the Plateau they do. In hot deserts, where crusts are smooth and dominated by cyanobacteria, several studies find the opposite: the polysaccharide sheath swells when wetted, seals the pore spaces, and runoff increases. Both results are real, and the quarrel in the literature turns out to be substantially a quarrel about which crusts were measured, which is a useful reminder that biocrust names a category and not a thing.

[5] What every worker in the field agrees on is the fragility. The crust's strength is compressive rather than shearing: it will take a raindrop's impact and it will not take a boot. One footstep crushes the pinnacles, tears the filament mesh, and returns the surface to loose grains. Recovery is slow, and unevenly so. Cyanobacterial cover can return in a decade or two under favorable conditions; the lichens and mosses, which supply most of the roughness and much of the nitrogen, have been estimated at fifty to two hundred and fifty years, and those estimates come from comparing surfaces of different known ages rather than from anyone having watched one recover.

[6] The disturbance does not stay where it happens. Sand released from a broken crust abrades the crust downwind, so a single track can widen into a corridor. Finer material travels much further. Dust flux from the Colorado Plateau rose several-fold over the twentieth century, and that dust settles on the snowpack of the Rocky Mountains, where it darkens the surface, absorbs sunlight the snow would have reflected, and advances the melt by weeks. A trail in Utah and a river's timing in Colorado are joined by a mechanism with no local step in it.

[7] Warming experiments have produced the field's least expected result. Plots on the Plateau were warmed by a few degrees, and separately were given supplemental water in small, frequent applications of the kind that climate projections favor for the region. Warming alone did comparatively little. The small waterings were lethal to the moss Syntrichia caninervis, which lost most of its cover within a few years. The proposed explanation is metabolic: a brief wetting rouses the moss into respiration but does not last long enough for photosynthesis to repay the cost, so each small rain is a withdrawal. On this account more precipitation, delivered in the wrong parcels, is a drought.

[8] Restoration is being attempted, and it is honest about its record. Crust organisms can be cultured and applied as a slurry, and greenhouse trials establish readily. Field trials do much worse, largely because what a crust needs in order to establish is what an intact crust already provides, a stable surface, and the surface it is given is the one that failed. The most consistent finding across restoration programs is unglamorous, and it is the same finding as the recovery times: it is far cheaper to fence a crust than to rebuild one.`

/* ------------------------------------------------------------------ *
 * Items. `key` + three `distractors`; `slot` decides where the key goes.
 * ------------------------------------------------------------------ */
const items = [
/* ===== P1 — literary narrative, paired ===== */
{
  slot: 2, domain: 'Key Ideas and Details', subskill: 'inference', difficulty: 'medium',
  prompt: `In Passage A, Nell's account most strongly suggests that her mother carried the bundled receipts out to the truck unopened because:`,
  key: `reading them would have made finishing the day impossible.`,
  distractors: [
    `she had already written the bundles down and thought their contents no one's business.`,
    `she did not believe the receipts held anything the family would want.`,
    `Theo had asked that they be left for him to go through later.`,
  ],
  explanation: `Nell writes that there were nine hundred customers in those bands and that "If she had started reading we would still be standing there," which is exactly "reading them would have made finishing the day impossible." Her mother did write receipts on the pad, but Nell never says she judged the contents "no one's business," and never suggests she thought the bundles worthless. Theo does end up with the bundles on his knees in the car, but nobody asks for them.`,
},
{
  slot: 0, domain: 'Craft and Structure', subskill: 'vocabulary in context', difficulty: 'easy',
  prompt: `As it is used in Passage B, in the sentence "My mother's list is famous in our family now," the word "famous" most nearly means:`,
  key: `often retold.`,
  distractors: [
    `praised by outsiders.`,
    `universally admired.`,
    `notorious.`,
  ],
  explanation: `The list is a story the family keeps repeating and arguing over: Nell "tells it as competence" and Theo has "never been able to hear it that way," so the word marks it as "often retold." It is not "universally admired," since the two siblings disagree about it; the sentence confines the word to "in our family," which rules out "praised by outsiders"; and "notorious" would attach a disgrace neither sibling assigns to their mother.`,
},
{
  slot: 3, domain: 'Key Ideas and Details', subskill: 'explicit detail', difficulty: 'easy',
  prompt: `According to Passage A, the store's crank register had been kept because:`,
  distractors: [
    `it was the only machine the building's wiring could support.`,
    `their grandfather's father had bought it when the store first opened on Wyandotte.`,
    `the receipts stored under it could not be moved without it.`,
  ],
  key: `a repairman had told their grandfather it would outlast anything with a cord.`,
  explanation: `Passage A says the register was "kept because a repairman had once told him it would outlast anything with a cord, and it had," so "a repairman had told their grandfather it would outlast anything with a cord" is exact. Nothing is said about the wiring. The father in that paragraph is attached to the store's name, not to the register, so "bought it when the store opened" borrows the wrong detail; the receipts were found under the register but were carried out on their own.`,
},
{
  slot: 1, domain: 'Key Ideas and Details', subskill: 'inference', difficulty: 'medium',
  prompt: `Passage B most strongly suggests that Theo's objection to his mother's list is that it:`,
  key: `occupied her with counting on the day her father died.`,
  distractors: [
    `understated how many hours the day would need.`,
    `treated the store's contents as property rather than as inheritance.`,
    `was made before anyone had opened the door.`,
  ],
  explanation: `Theo writes that his mother "spent the whole of the day he stopped existing writing down what a thing was and how many of it there were" — that is, the list "occupied her with counting on the day her father died," and he adds "I do not think she was cold," so his objection is to the occupation, not to her feeling. The day did run four hours past the pad's numbers, and the list was made before the door was unlocked, but Theo raises neither as a complaint; the contents-as-property reading is Nell's language about emptying a building, not his.`,
},
{
  slot: 3, domain: 'Craft and Structure', subskill: 'function of a paragraph', difficulty: 'medium',
  prompt: `In Passage A, the paragraph beginning "That is the part Theo cannot forgive" serves mainly to:`,
  distractors: [
    `correct Theo's count of how many customers the store had.`,
    `concede that her mother should have opened at least one of the bundles.`,
    `explain why the receipts were finally left behind at the store.`,
  ],
  key: `justify her mother's decision by naming what reading would have cost.`,
  explanation: `The paragraph puts the nine hundred customers beside the consequence — "If she had started reading we would still be standing there" — and ends by approving the decision, so it does "justify her mother's decision by naming what reading would have cost." Nell states the customer count rather than correcting it; she concedes nothing, calling this "the part I keep"; and the receipts went to the truck rather than being left behind.`,
},
{
  slot: 0, domain: 'Integration of Knowledge and Ideas', subskill: 'compare paired passages', difficulty: 'medium',
  prompt: `Both passages report their mother's remark that their grandfather "did not like the sound of no." The passages differ in that Passage B:`,
  key: `supplies an occasion that gives the hinges a different motive.`,
  distractors: [
    `denies that their mother ever made the remark.`,
    `attributes the remark to Nell rather than to their mother.`,
    `reports that their grandmother disputed the remark.`,
  ],
  explanation: `Theo repeats the remark and then sets against it the year "a contractor wanted forty and he had eleven," concluding "He was making sure the store could answer" — that is, Passage B "supplies an occasion that gives the hinges a different motive." He quotes the remark rather than denying it, and assigns it to their mother; the uncertainty over who asked ("Nell asked, or I asked") is about the question, not the remark. Their grandmother is cited only for how long he stood in the doorway.`,
},
{
  slot: 2, domain: 'Integration of Knowledge and Ideas', subskill: 'compare paired passages', difficulty: 'hard',
  prompt: `Passage A and Passage B both take up the question of who should decide what the day was for. Their positions differ chiefly in that:`,
  distractors: [
    `Nell holds that the decision belonged to their mother, while Theo holds that it belonged to the store's customers.`,
    `Nell is certain the day was for emptying the building, while Theo is certain it was for mourning.`,
  ],
  key: `Nell holds that somebody had to decide, while Theo doubts the family had the standing to.`,
  distractors2: [],
  explanation: `Nell writes "Somebody has to be the one who decides what the day is for"; Theo grants her that — "My sister was right that somebody had to decide" — and then adds "I have never been sure it was ours to decide," which makes it exactly the case that "Nell holds that somebody had to decide, while Theo doubts the family had the standing to." He never assigns the decision to the customers, never proposes mourning as the day's purpose, and expresses no regret on Nell's behalf.`,
  extraDistractor: `Nell now regrets having decided, while Theo has come to think the decision necessary and right.`,
},
{
  slot: 1, domain: 'Integration of Knowledge and Ideas', subskill: 'compare paired passages', difficulty: 'medium',
  prompt: `Which statement about the bundled receipts is supported by both passages?`,
  key: `They left the store without being read there.`,
  distractors: [
    `They recorded about nine hundred sales.`,
    `Their mother wrote a number for them on the pad.`,
    `Theo pulled a band off one of them before the truck was loaded.`,
  ],
  explanation: `Passage A has their mother carrying "the whole bundle out to the truck without opening one," and Passage B has Theo opening one only "somewhere on Wyandotte," after Nell had started driving — so in both accounts "They left the store without being read there." The nine hundred customers and the number on the pad appear only in Nell's account, and Theo's band comes off in the car, not before loading.`,
},
{
  slot: 0, domain: 'Key Ideas and Details', subskill: 'compare paired passages', difficulty: 'medium',
  prompt: `Passage B, but not Passage A, reports that:`,
  key: `a customer described a key cut for him early one morning.`,
  distractors: [
    `their grandfather had run the store for fifty-one years.`,
    `the brass hinges were in the third drawer.`,
    `their mother wrote the list before the door was unlocked.`,
  ],
  explanation: `Delgado's story about the key "cut him a key at seven in the morning once, in 1989" appears only in Theo's account, so "a customer described a key cut for him early one morning" is Passage B alone. The fifty-one years and the list written on the sidewalk are Passage A alone, and the third drawer is named in both.`,
},

/* ===== P2 — social science, volunteer fire departments ===== */
{
  slot: 1, domain: 'Key Ideas and Details', subskill: 'main idea', difficulty: 'medium',
  prompt: `The passage as a whole is primarily concerned with:`,
  key: `why volunteer rosters are shrinking, and what one district's response suggests.`,
  distractors: [
    `showing that failing volunteer departments ought to be replaced by paid career staff.`,
    `describing the training a volunteer firefighter is now required to complete.`,
    `comparing response times in rural and metropolitan districts.`,
  ],
  explanation: `The passage opens on shrinking rosters, tests the usual explanation against Etheredge's exit interviews, and then reports Callowhill's rewritten membership categories with a caution about copying them — "why volunteer rosters are shrinking, and what one district's response suggests." Training and the paid-conversion cost are steps in that argument rather than its subject, and the passage treats conversion to paid staffing as the expensive alternative, not as a recommendation. Response times are mentioned only to locate volunteer districts.`,
},
{
  slot: 3, domain: 'Key Ideas and Details', subskill: 'explicit detail', difficulty: 'easy',
  prompt: `According to the passage, work or family schedule was named as the primary reason for leaving by:`,
  distractors: [
    `about seventy percent of the departing volunteers.`,
    `nearly all of the departing volunteers.`,
    `none of the volunteers in the sample.`,
  ],
  key: `about a fifth of the departing volunteers.`,
  explanation: `The second paragraph states that "Only about a fifth of the departures named work or family schedule as the primary reason" — "about a fifth of the departing volunteers." Seventy percent is the share of calls that are medical emergencies, not a share of departures; "nearly all" is the busyness story the data are used to qualify; and the passage says a fifth, not none.`,
},
{
  slot: 0, domain: 'Key Ideas and Details', subskill: 'explicit detail', difficulty: 'medium',
  prompt: `The passage reports that volunteers in Etheredge's sample objected to the training requirements on the ground that:`,
  key: `the standards were written for a career workforce and then handed to an unpaid one.`,
  distractors: [
    `the standards themselves are stricter than the fires they actually fight require.`,
    `the certifications expire faster than a volunteer holding a full-time job can renew them.`,
    `districts had stopped paying for the certification courses.`,
  ],
  explanation: `The third paragraph gives their objection directly: the standards "had been written for a career workforce and then handed to an unpaid one without anyone asking what a volunteer's calendar could absorb" — "the standards were written for a career workforce and then handed to an unpaid one." The passage explicitly forecloses the stricter-than-necessary reading — "Nobody in Etheredge's sample argued that the standards were wrong." Annual refreshers are listed as a burden, not as expiring too fast, and who pays for the courses never comes up.`,
},
{
  slot: 2, domain: 'Craft and Structure', subskill: 'function of a detail', difficulty: 'medium',
  prompt: `In the fourth paragraph, the detail that a recruit will attend the same neighbor's emergency "again in six weeks" chiefly emphasizes:`,
  distractors: [
    `how often rural residents call for help without a true emergency.`,
    `the distance a volunteer must travel to reach a call.`,
  ],
  key: `the repetitive, personal character of the work recruits had not expected.`,
  extraDistractor: `how quickly medical certifications lapse and must be renewed.`,
  explanation: `The paragraph is about recruits who "arrive having imagined one job and find themselves doing another," and the repeated call on a neighbor makes that other job concrete — "the repetitive, personal character of the work recruits had not expected." The overdose, fall, or cardiac arrest are real emergencies rather than needless calls; travel distance belongs to the opening paragraph; and the refreshers belong to the discussion of training.`,
},
{
  slot: 1, domain: 'Key Ideas and Details', subskill: 'inference', difficulty: 'hard',
  prompt: `The passage indicates that a department whose members typically leave in their third year should conclude that:`,
  key: `raising the number of applicants will not by itself change the roster.`,
  distractors: [
    `its billboards have failed to increase the number of applications.`,
    `its recruits were screened poorly at the time they applied.`,
    `it should stop certifying members until attrition is understood.`,
  ],
  explanation: `The fifth paragraph says the billboards do work and applications do rise, but "The attrition curve, however, does not bend," and concludes that such a department "does not need more applicants" — so "raising the number of applicants will not by itself change the roster." The passage says the billboards succeed at what they do; it rules out poor fit, since year three is "well past the point where a recruit could be called a poor fit"; and it never proposes suspending certification.`,
},
{
  slot: 2, domain: 'Craft and Structure', subskill: 'vocabulary in context', difficulty: 'medium',
  prompt: `As it is used in the third paragraph, the word "absorb" most nearly means:`,
  distractors: [
    `soak up.`,
    `understand fully.`,
  ],
  key: `accommodate.`,
  extraDistractor: `cushion the force of.`,
  explanation: `The question in that sentence is how many hours of training a volunteer's calendar has room for, so the word means "accommodate." "Soak up" is the literal sense used of liquids, "understand fully" is the sense used of information rather than of a schedule, and "cushion the force of" is the sense used of impacts.`,
},
{
  slot: 3, domain: 'Key Ideas and Details', subskill: 'explicit detail', difficulty: 'easy',
  prompt: `According to the passage, a support member of the Callowhill County district:`,
  distractors: [
    `must complete the structural certification within three years of joining.`,
    `is assigned only to traffic control and radio work.`,
    `accounts for about a quarter of the district's total membership.`,
  ],
  key: `is never required to enter a burning structure.`,
  explanation: `The sixth paragraph defines the category as carrying "no requirement ever to enter a burning structure and no structural certification to earn," which makes "is never required to enter a burning structure" exact and rules out a three-year certification deadline. Support members also handle air bottles, rehabilitation, and paperwork, so the assignment list is too narrow, and the quarter figure describes interior firefighters who came up through the category, not the share of the roster.`,
},
{
  slot: 1, domain: 'Craft and Structure', subskill: 'function of a paragraph', difficulty: 'hard',
  prompt: `The paragraph beginning "The model has been copied" functions in the passage to:`,
  distractors: [
    `withdraw the earlier claim that Callowhill's membership grew.`,
  ],
  key: `limit what the Callowhill result can be taken to prove.`,
  extraDistractors: [
    `establish that districts with falling populations cannot use tiered rosters.`,
    `urge other districts to adopt the tiered roster without delay.`,
  ],
  explanation: `The paragraph keeps the growth figures and then narrows the claim: the intervention and the demographics "arrived together," and what Callowhill demonstrates "is narrower but still useful" — the paragraph works to "limit what the Callowhill result can be taken to prove." It does not withdraw the growth, and it does not settle the falling-population case either way, since "no one has yet run the tiered model" there; a call for immediate copying is what the paragraph's first sentence warns against.`,
},
{
  slot: 3, domain: 'Integration of Knowledge and Ideas', subskill: 'evaluate evidence', difficulty: 'hard',
  prompt: `Which finding, if established, would most weaken the passage's suggestion that the roles a district offers help determine its roster size?`,
  distractors: [
    `Callowhill's median resident is nine years younger than the median resident of other districts of comparable size.`,
    `Most volunteer departments answer more medical calls than fires.`,
    `Billboard campaigns raise the number of applications in districts of every size.`,
  ],
  key: `Support-member categories produced roster growth only where the under-forty population was already rising.`,
  explanation: `The suggestion is that the roles on offer are themselves a cause, so the damaging finding is one in which the role change does nothing on its own: "Support-member categories produced roster growth only where the under-forty population was already rising" makes demographics the operative factor. Callowhill's younger median and the share of medical calls are already in the passage and are consistent with it, and the billboard finding concerns applications, which the passage grants.`,
},

/* ===== P3 — humanities, deaccession ===== */
{
  slot: 3, domain: 'Key Ideas and Details', subskill: 'main idea', difficulty: 'medium',
  prompt: `The essay is best described as:`,
  distractors: [
    `a defense of the rule that the proceeds of a deaccession may be spent only on new acquisitions.`,
    `an argument that museums should stop accepting gifts they cannot exhibit.`,
    `a history of the controversy that produced current museum practice.`,
  ],
  key: `an account of how such decisions are made, with a test the author proposes and then qualifies.`,
  explanation: `The essay lays out both sides, reports two days of an actual committee, offers a test — "would the museum accept this object today" — and then devotes its closing paragraph to the test's weakness, which is "an account of how such decisions are made, with a test the author proposes and then qualifies." The proceeds rule and the 1970s scandal occupy one paragraph of background, and the essay never argues against accepting gifts.`,
},
{
  slot: 1, domain: 'Key Ideas and Details', subskill: 'explicit detail', difficulty: 'easy',
  prompt: `According to the essay, proceeds from a deaccession may never be used to:`,
  distractors: [
    `acquire other objects.`,
  ],
  key: `meet a payroll.`,
  extraDistractors: [
    `care for the objects the museum keeps.`,
    `compensate the heirs of the original donor.`,
  ],
  explanation: `The second paragraph states that proceeds "may never be used to repair a roof or meet a payroll." Acquiring other objects is the rule's primary permitted use, and caring for the objects that remain is permitted "under a later and contested revision"; compensating heirs is not discussed at all.`,
},
{
  slot: 2, domain: 'Craft and Structure', subskill: 'function of a detail', difficulty: 'medium',
  prompt: `The essay's remark that the rule keeps a museum from experiencing its collection as "a liquid asset" serves mainly to:`,
  distractors: [
    `concede that a museum is financially no different from any other institution.`,
    `identify which paintings the museum of the 1970s sold.`,
  ],
  key: `state what the rule guards against, rather than merely reporting the rule.`,
  extraDistractor: `propose that museums be allowed to sell during a fiscal emergency.`,
  explanation: `The remark follows the sentence "The rule is not a technicality," and supplies the reason behind it — a collection becomes spendable "the moment anyone is allowed to spend it" — so its work is to "state what the rule guards against, rather than merely reporting the rule." It is the opposite of a concession that museums are ordinary financial institutions, it names no paintings, and it argues against, not for, an emergency exception.`,
},
{
  slot: 0, domain: 'Key Ideas and Details', subskill: 'explicit detail', difficulty: 'medium',
  prompt: `The essay reports that the committee's two days were consumed chiefly by:`,
  key: `a well-made object outside the museum's mission, and an object nobody could identify.`,
  distractors: [
    `forgeries and objects damaged beyond repair.`,
    `nine near-identical pressed-glass compotes.`,
    `objects whose donors' families had written in to object to their removal from the collection.`,
  ],
  explanation: `The fifth paragraph says "What consumed the two days were two other categories," the first being the Dutch still life in a river-valley museum and the second the unidentifiable carved figure — "a well-made object outside the museum's mission, and an object nobody could identify." The forgeries and ruined things "went in four minutes," the compotes "took longer, but not much," and no objecting families appear in the account of the meeting.`,
},
{
  slot: 1, domain: 'Craft and Structure', subskill: 'vocabulary in context', difficulty: 'medium',
  prompt: `As it is used in the seventh paragraph, the word "stalls" most nearly means:`,
  distractors: [
    `delays on purpose.`,
  ],
  key: `comes to a halt.`,
  extraDistractors: [
    `takes shelter.`,
    `loses height.`,
  ],
  explanation: `The argument about an object's merit is described as going nowhere, which is why the author wants it moved onto the museum's purpose, so the word means "comes to a halt." "Delays on purpose" would make the argument evasive rather than stuck, and the stall of an aircraft ("loses height") and the stall as a shelter are other senses of the word that the sentence does not use.`,
},
{
  slot: 3, domain: 'Craft and Structure', subskill: 'function of an ending', difficulty: 'hard',
  prompt: `The closing reference to whoever is holding the list in 2140 recasts the author's proposal as:`,
  distractors: [
    `a prediction that this museum's judgments will be condemned.`,
    `a reason to postpone the ninety-one decisions indefinitely.`,
    `a claim that future curators will share the present ones' taste.`,
  ],
  key: `a demand for a written record rather than a rule that settles cases.`,
  explanation: `Having granted that his test "hands back the taste of the present," the author asks for the reasons to be written "in the minutes," where a later reader "can read them and see exactly how sure we were" — a demand for a written record rather than a rule that settles cases. He supposes future readers will judge, without predicting condemnation; he asks that decisions be recorded, not deferred; and his point rests on taste changing, not on its persisting.`,
},
{
  slot: 0, domain: 'Key Ideas and Details', subskill: 'explicit detail', difficulty: 'medium',
  prompt: `The essay states that the carved wooden figure was taken off the list because:`,
  key: `the museum's failure to identify it is evidence about the museum, not the object.`,
  distractors: [
    `a researcher had by then established where the figure was made and when it entered use.`,
    `a community had asked for it to be returned.`,
    `the 1931 accession record turned out to be complete after all.`,
  ],
  explanation: `The sixth paragraph gives the reason exactly: the museum's inability to say what the object is "tells us nothing about the object. It tells us about the museum" — "the museum's failure to identify it is evidence about the museum, not the object." The passage says the reverse of the other three: it cannot be researched "because there is nothing to research it from," it cannot be repatriated "because there is no one named to return it to," and the 1931 hand "recorded nothing else."`,
},
{
  slot: 2, domain: 'Integration of Knowledge and Ideas', subskill: 'apply a principle', difficulty: 'hard',
  prompt: `Applying the test the author proposes, which object would most clearly be kept?`,
  distractors: [
    `an accomplished still life the museum would not now go looking for.`,
    `an object whose donor's family is still prominent in the city.`,
  ],
  key: `an undistinguished mill tool from the river valley that has never been exhibited.`,
  extraDistractor: `an object the museum has kept in climate-controlled storage at expense for a century.`,
  explanation: `The test asks whether the museum would accept the object today from a stranger, with no donor's name attached, and a mill tool documents "the industrial river valley outside its windows," which is the museum's stated mission — so "an undistinguished mill tool from the river valley that has never been exhibited" passes even though it is neither fine nor displayed. The still life fails the test by the author's own example; the donor's prominence is precisely what the test strips out; and storage cost is an argument for removal, not for keeping.`,
},
{
  slot: 0, domain: 'Integration of Knowledge and Ideas', subskill: 'evaluate an argument', difficulty: 'hard',
  prompt: `A critic objects that deaccessioning breaks a promise made to donors. Which point in the essay most directly answers that objection?`,
  distractors: [
    `Most deaccessioned objects pass into private hands rather than public ones.`,
  ],
  key: `A museum that removes nothing spreads a fixed budget over a growing collection.`,
  extraDistractors: [
    `The proceeds rule already keeps a museum from treating a sale as income.`,
    `Donors who gave before the 1970s were operating under an entirely different set of rules.`,
  ],
  explanation: `The essay's answer to the donor argument is the cost of keeping everything: a museum that removes nothing "is not preserving its collection equally. It is spreading a fixed budget across a growing number of things," so "A museum that removes nothing spreads a fixed budget over a growing collection." The point about private hands is part of the donors' side of the case, not a reply to it; the proceeds rule governs the money rather than the promise; and the essay makes no claim about what rules earlier donors understood.`,
},

/* ===== P4 — natural science, biocrusts ===== */
{
  slot: 0, domain: 'Key Ideas and Details', subskill: 'explicit detail', difficulty: 'easy',
  prompt: `According to the passage, what binds loose sand grains into a cohesive mat is:`,
  key: `the polysaccharide sheaths left behind as filaments retreat.`,
  distractors: [
    `the living filaments themselves, which grip grains as they glide.`,
    `the lichens and mosses that arrive after the cyanobacteria.`,
    `the pinnacles that stand up from the crust's surface.`,
  ],
  explanation: `The second paragraph says that when the soil dries "the filaments retreat and the abandoned sheaths remain, a mesh of sticky fibers that binds loose grains into a cohesive mat," which is "the polysaccharide sheaths left behind as filaments retreat." The gliding filaments lay the sheaths down but are not what remains; lichens and mosses arrive later and add roughness and thickness; the pinnacles are a feature of the finished surface.`,
},
{
  slot: 2, domain: 'Key Ideas and Details', subskill: 'cause and effect', difficulty: 'medium',
  prompt: `The passage attributes the conflicting findings about infiltration chiefly to:`,
  distractors: [
    `errors in the wind tunnel measurements.`,
    `the difficulty of measuring runoff on a rough surface.`,
  ],
  key: `differences in which kind of crust each study measured.`,
  extraDistractor: `disagreement over how much nitrogen crusts fix.`,
  explanation: `The fourth paragraph says both results are real and that the quarrel "turns out to be substantially a quarrel about which crusts were measured" — cool moss-and-lichen crusts against smooth cyanobacterial ones — which is "differences in which kind of crust each study measured." The wind tunnel work concerns erosion rather than infiltration, no measurement difficulty is raised, and the nitrogen discussion is a separate paragraph and is not described as contested.`,
},
{
  slot: 1, domain: 'Craft and Structure', subskill: 'vocabulary in context', difficulty: 'medium',
  prompt: `As it is used in the seventh paragraph, the word "rouses" most nearly means:`,
  distractors: [
    `provokes to anger.`,
  ],
  key: `stirs into activity.`,
  extraDistractors: [
    `restores to full health.`,
    `shakes loose.`,
  ],
  explanation: `A brief wetting starts the moss respiring without lasting long enough for photosynthesis to repay the cost, so the word means "stirs into activity." Anger has no application to a moss; "restores to health" contradicts the point, since the wetting is a net loss described as "a withdrawal"; and "shakes loose" would describe physical dislodging, which is the footstep in an earlier paragraph.`,
},
{
  slot: 3, domain: 'Key Ideas and Details', subskill: 'cause and effect', difficulty: 'medium',
  prompt: `The passage explains that dust from broken crusts advances mountain snowmelt because the dust:`,
  distractors: [
    `insulates the snowpack against cooling at night.`,
    `carries fixed nitrogen that feeds dark algae growing on the snow's surface.`,
    `abrades the snow surface as the wind moves across it.`,
  ],
  key: `darkens the snow, so that it takes in sunlight it would have reflected.`,
  explanation: `The sixth paragraph says the dust "darkens the surface, absorbs sunlight the snow would have reflected, and advances the melt by weeks," which is "darkens the snow, so that it takes in sunlight it would have reflected." No insulating effect is described; the nitrogen in the passage is fixed by crusts and traced into neighboring shrubs, not carried to snow; and abrasion in the passage is sand acting on the crust downwind.`,
},
{
  slot: 2, domain: 'Key Ideas and Details', subskill: 'explicit detail', difficulty: 'medium',
  prompt: `According to the passage, the estimate of fifty to two hundred and fifty years applies to the recovery of:`,
  distractors: [
    `cyanobacterial cover.`,
    `the whole crust community, cyanobacteria included.`,
  ],
  key: `the lichens and mosses.`,
  extraDistractor: `the Plateau's twentieth-century dust flux.`,
  explanation: `The fifth paragraph gives cyanobacterial cover "a decade or two" and assigns the longer figure to "the lichens and mosses, which supply most of the roughness and much of the nitrogen." Applying it to the whole community would erase that contrast, and the dust flux is a rate of emission rather than a recovery time.`,
},
{
  slot: 1, domain: 'Craft and Structure', subskill: 'function of a detail', difficulty: 'hard',
  prompt: `In the fourth paragraph, the remark that biocrust "names a category and not a thing" serves to:`,
  distractors: [
    `question whether biological soil crusts are properly called alive.`,
  ],
  key: `warn that a finding about crusts may hold only for the type studied.`,
  extraDistractors: [
    `argue that the hot-desert studies were carried out incorrectly.`,
    `propose replacing the term with a more exact one.`,
  ],
  explanation: `The remark closes a paragraph in which two opposite infiltration results are both accepted because different crusts were measured, so it serves to "warn that a finding about crusts may hold only for the type studied." The passage insists in its first paragraph that the surface is alive; it calls both sets of results real rather than faulty; and it uses the term throughout without proposing a replacement.`,
},
{
  slot: 0, domain: 'Craft and Structure', subskill: 'text structure', difficulty: 'medium',
  prompt: `Which of the following best describes the way the passage is organized?`,
  key: `a description of the crust and how it works, then its fragility and what losing it costs.`,
  distractors: [
    `a chronological history of dryland crust research, from its beginnings to the present day.`,
    `a comparison of cool and hot deserts sustained from beginning to end.`,
    `a case for restoration, built from the experimental results that support it.`,
  ],
  explanation: `The passage moves from what a crust is and what it does — binding, nitrogen, infiltration — to the footstep, the recovery times, the dust downwind, and the failure of restoration, which is "a description of the crust and how it works, then its fragility and what losing it costs." Dates appear only inside individual studies, the cool-versus-hot contrast occupies a single paragraph, and restoration is reported as mostly unsuccessful rather than advocated.`,
},
{
  slot: 3, domain: 'Integration of Knowledge and Ideas', subskill: 'reason from a model', difficulty: 'hard',
  prompt: `The metabolic explanation offered for the moss die-off implies that a wetting event is costly to the moss when it is:`,
  distractors: [
    `long enough to dissolve the polysaccharide sheath that holds the grains beneath it.`,
    `accompanied by a rise of several degrees in air temperature.`,
    `frequent enough that the soil never dries completely.`,
  ],
  key: `long enough to begin respiration but too short for photosynthesis to repay it.`,
  explanation: `The seventh paragraph states that a brief wetting "rouses the moss into respiration but does not last long enough for photosynthesis to repay the cost," so the costly event is one "long enough to begin respiration but too short for photosynthesis to repay it." The sheath is not described as dissolving; warming alone "did comparatively little," so temperature is not the operative factor; and the harm in the experiment came from short waterings, not from soil that stayed wet.`,
},
{
  slot: 2, domain: 'Integration of Knowledge and Ideas', subskill: 'draw a conclusion', difficulty: 'hard',
  prompt: `The passage's account of restoration best supports which conclusion?`,
  distractors: [
    `Crust organisms cannot be grown outside their native soils.`,
    `Greenhouse establishment is a reliable guide to what field trials will do.`,
  ],
  key: `Preventing damage to a crust is cheaper than repairing it afterward.`,
  extraDistractor: `Field restoration fails because the organisms applied are the wrong species.`,
  explanation: `The final paragraph reports that field trials do "much worse" than greenhouse trials and closes with the finding that "it is far cheaper to fence a crust than to rebuild one," which is "Preventing damage to a crust is cheaper than repairing it afterward." Crust organisms "can be cultured and applied as a slurry"; the gap between greenhouse and field is exactly why greenhouse success is not a reliable guide; and the failure is attributed to an unstable surface, not to species choice.`,
},
]

/* ------------------------------------------------------------------ *
 * Assemble
 * ------------------------------------------------------------------ */
const PASSAGES = [
  { pid: 'rd6-p1', title: 'Ferrell & Son', genre: 'literary_narrative', paired: true, text: P1 },
  { pid: 'rd6-p2', title: 'The Roster', genre: 'social_science', paired: false, text: P2 },
  { pid: 'rd6-p3', title: 'Ninety-One Objects', genre: 'humanities', paired: false, text: P3 },
  { pid: 'rd6-p4', title: 'The Living Surface', genre: 'natural_science', paired: false, text: P4 },
]

if (items.length !== 36) { console.error(`authored ${items.length} items, need 36`); process.exit(1) }

const out = []
items.forEach((it, i) => {
  const p = PASSAGES[Math.floor(i / 9)]
  const n = (i % 9) + 1
  // Distractors may be given in up to three fields so the authored order
  // reads naturally around the key; flatten in declaration order.
  const ds = [...(it.distractors ?? []), ...(it.extraDistractor ? [it.extraDistractor] : []), ...(it.extraDistractors ?? []), ...(it.distractors2 ?? [])]
  if (ds.length !== 3) { console.error(`${p.pid} Q${n}: ${ds.length} distractors`); process.exit(1) }
  const choices = ds.slice()
  choices.splice(it.slot, 0, it.key)
  out.push({
    id: `ACT-RD6-P${Math.floor(i / 9) + 1}-Q${n}`,
    passage_id: p.pid,
    passage_title: p.title,
    genre: p.genre,
    paired: p.paired,
    passage: p.text,
    prompt: it.prompt,
    choices,
    correct_answer: it.key,
    explanation: it.explanation,
    domain: it.domain,
    subskill: it.subskill,
    difficulty: it.difficulty,
  })
})

writeFileSync('scripts/study-bank/act-reading-v6.batch.json', JSON.stringify(out, null, 2) + '\n')

/* ---- author-side reports the checker does not do ---- */
const slots = [0, 0, 0, 0]
let longest = 0, shortest = 0
for (const it of out) {
  slots[it.choices.indexOf(it.correct_answer)]++
  const lens = it.choices.map(c => c.length)
  const kl = it.correct_answer.length
  if (kl === Math.max(...lens)) longest++
  if (kl === Math.min(...lens)) shortest++
}
const dom = {}
for (const it of out) dom[it.domain] = (dom[it.domain] ?? 0) + 1
console.log('wrote scripts/study-bank/act-reading-v6.batch.json —', out.length, 'items')
console.log('key slots        :', slots.join(' / '), slots.every(s => s === 9) ? 'OK' : 'NOT 9/9/9/9')
console.log('key longest      :', longest, longest <= 9 ? 'OK' : 'OVER 9')
console.log('key shortest     :', shortest, shortest <= 9 ? 'OK' : 'OVER 9')
console.log('domain mix       :', JSON.stringify(dom))
for (const p of PASSAGES) {
  const w = p.text.replace(/\[\d+\]/g, ' ').split(/\s+/).filter(Boolean).length
  console.log(`words ${p.pid.padEnd(7)}: ${w}${p.paired ? ' (paired, both halves)' : ''}`)
}
/* vocab targets must occur exactly once in their own passage */
for (const it of out) {
  if (!/most nearly means/i.test(it.prompt)) continue
  const quoted = [...it.prompt.matchAll(/"([^"]+)"/g)].map(m => m[1])
  const t = quoted.slice().sort((a, b) => a.length - b.length)[0]
  const hits = (it.passage.toLowerCase().match(new RegExp(`\\b${t.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')) ?? []).length
  console.log(`vocab ${it.id}: "${t}" x${hits}${hits === 1 ? '' : '   <-- MUST BE 1'}`)
}
