/**
 * Hand-written explanation rewrites for the 38 items whose explanation names
 * an option by LETTER (bank-integrity-sweep `explanation/letter-reference`,
 * BANK-INTEGRITY-2026-10-04.md §3). Consumed by apply-2026-10-04-integrity.mjs.
 *
 * Each entry: `key` = stored key letter (asserted against the live row, so a
 * re-ordered row refuses), and `edits` = [old, new] substring replacements on
 * the explanation. `old` must occur exactly once. Everything outside the
 * replaced spans is preserved byte for byte.
 *
 * In `new`, «X|fragment» renders as “fragment” and is ASSERTED to be a verbatim
 * substring of stored choice X and of no other choice. X is the letter in
 * STORED order — i.e. this file is where the hand mapping lives, and the
 * assertion makes it mechanical: a fragment pointed at the wrong option fails.
 *
 * talk-c1 / talk-c2: the original letters do NOT follow stored order (the
 * descriptions fit the distractors under an earlier order). Each letter was
 * re-mapped by CONTENT, hand-checked against the item; the comment on each
 * entry records old letter -> stored letter. v2: letters agree with stored
 * order (checked item by item).
 */
export const LETTER_REWRITES = [
  // ── talk-c1 ──────────────────────────────────────────────────────────────
  { id: '2015b18b-1a08-48f9-ad33-4042ff990f22', key: 'C', // A->D, C->B, D->A
    edits: [["A is the position he is rejecting, restated with a qualifier; C names a possibility the talk never raises; D overshoots",
      "The choice «D|a sound rule of thumb» is the position he is rejecting, restated with a qualifier; the choice «B|the direction of causation has simply been reversed» names a possibility the talk never raises; the choice «A|observational studies should be abandoned» overshoots"]] },
  { id: '21902fcd-8bb7-477d-98b5-5bfbd7500372', key: 'C', // A->A, C->B, D->D
    edits: [["A hardens his remark about flattery into a charge of fabrication; C ignores the reason he gives for discounting the citation pattern; D inverts",
      "The choice «A|an invention of the very industries» hardens his remark about flattery into a charge of fabrication; the choice «B|as having settled the question» ignores the reason he gives for discounting the citation pattern; the choice «D|the strongest of Marshall’s three mechanisms» inverts"]] },
  { id: '2c821492-142c-45ae-aae8-78f6bf937f0a', key: 'A', // A->D, B->B, C->C
    edits: [["A confuses the aside with the evidence discussed next; B turns a remark about self-image into an allegation about money; C credits",
      "The choice «D|why patent citations are concentrated» confuses the aside with the evidence discussed next; the choice «B|funded by the firms they study» turns a remark about self-image into an allegation about money; the choice «C|technology firms understand agglomeration better» credits"]] },
  { id: '3e2b1990-d380-415c-a631-6f762b0ae4cc', key: 'A', // A->B, B->C, C->D
    edits: [["A takes the shared premise for agreement with the conclusion; B has him retracting the circle he spent the talk establishing; C invents",
      "The choice «B|He accepts it» takes the shared premise for agreement with the conclusion; the choice «C|an independent check on the thermometer was available» has him retracting the circle he spent the talk establishing; the choice «D|ignored the historical record» invents"]] },
  { id: '43509c46-5bf0-4507-9901-4e2404a5f10c', key: 'D', // B->B, C->A, D->C
    edits: [["B contradicts his explicit concession that the arithmetic works; C ignores that he confines the parable to anonymous, mobile users; D misreports",
      "The choice «B|its central calculation is mistaken» contradicts his explicit concession that the arithmetic works; the choice «A|a general law of resource use» ignores that he confines the parable to anonymous, mobile users; the choice «C|found no cheating or disputes» misreports"]] },
  { id: '5058c7da-3086-4f90-9832-932a82373557', key: 'D', // A->A, B->C, D->B
    edits: [["A misstates a criticism he calls fair; B ignores his continued defence of the concept; D contradicts",
      "The choice «A|a misunderstanding of what ecological inheritance means» misstates a criticism he calls fair; the choice «C|He agrees with them» ignores his continued defence of the concept; the choice «B|no way at all of representing feedback» contradicts"]] },
  { id: '6b76825b-a62e-4db7-b066-2378e9481a34', key: 'C', // B->D, C->A, D->B
    edits: [["B invents a constraint on spillovers; C is the selection worry, which those very studies were designed to answer; D introduces",
      "The choice «D|spillovers are confined to industries that patent» invents a constraint on spillovers; the choice «A|simply collected the workers» is the selection worry, which those very studies were designed to answer; the choice «B|rents in clustered cities rise» introduces"]] },
  { id: '70520b02-dcd8-4924-9c8b-a656810cc07d', key: 'A', // B->D, C->B, D->C
    edits: [["B denies existence he grants; C reverses his ranking; D contradicts",
      "The choice «D|a fabrication of the press» denies existence he grants; the choice «B|the principal cause» reverses his ranking; the choice «C|widespread but undetectable» contradicts"]] },
  { id: '7d77877e-6667-40ee-9aab-ef9f9f5c4be0', key: 'D', // A->C, B->B, C->A
    edits: [["A treats an illustration as a finding; B reverses the talk's refusal to rank document types; C is a real",
      "The choice «C|To settle how many people actually took part» treats an illustration as a finding; the choice «B|official reports record quantities more precisely» reverses the talk's refusal to rank document types; the choice «A|conventional rather than literal» is a real"]] },
  { id: '821bfc6a-a6eb-40af-acb3-2bfe06892e0d', key: 'B', // A->D, B->C, D->A
    edits: [["A borrows real content about disputes but reverses the causal story; B contradicts the chronology given; D is the overgeneralisation",
      "The choice «D|already collapsing under the cheating» borrows real content about disputes but reverses the causal story; the choice «C|adopted before Hardin's parable circulated» contradicts the chronology given; the choice «A|always inferior to community management» is the overgeneralisation"]] },
  { id: '867be863-19ff-446e-b29d-7f961ec3fa89', key: 'D', // B->B, C->A, D->C
    edits: [["B is precisely what the agreeing silences are introduced to undercut; C is a blanket ranking he rejects by treating reliability as claim-specific; D overstates",
      "The choice «B|Agreement between two independent sources» is precisely what the agreeing silences are introduced to undercut; the choice «A|Private correspondence should be preferred» is a blanket ranking he rejects by treating reliability as claim-specific; the choice «C|Details irrelevant to a writer’s purpose» overstates"]] },
  { id: 'ccafa443-cfad-4a2a-98ec-b578b4f553bf', key: 'A', // B->D, C+D->B+C
    edits: [["B is the trap: dams really are niche construction, but that is not why the phrase appears here. C and D are true-sounding",
      "The choice «D|a second, more familiar illustration of ecological inheritance» is the trap: dams really are niche construction, but that is not why the phrase appears here. The choices «B|constructed environments commonly outlast» and «C|large-bodied animals reshape their habitats» are true-sounding"]] },
  { id: 'e476ead1-0fd4-4342-b85f-6aeec6fba1d7', key: 'D', // A+C->A+C, D->B
    edits: [["A and C both convert one half of the evidence into a verdict the lecturer says the data cannot support, and D confuses",
      "The choices «A|The second reader is the more sensitive» and «C|She is the better reader» both convert one half of the evidence into a verdict the lecturer says the data cannot support, and the choice «B|Their sensitivity must be identical» confuses"]] },
  { id: 'edd5429a-afc2-48b2-bb21-e78f5a98b5a8', key: 'B', // A->C, C->D, D->A
    edits: [["A is a plausible textbook inference the talk never licenses; C reverses the direction of the argument; D is a general principle",
      "The choice «C|must be vestigial» is a plausible textbook inference the talk never licenses; the choice «D|the soil environment must, over enough generations, have come to select» reverses the direction of the argument; the choice «A|adaptation of a trait always lags» is a general principle"]] },
  { id: 'fb93b3b8-ef52-4fe7-bc51-c62b44f26cc3', key: 'B', // A->D, B->C, C->A
    edits: [["A misreads a framing choice as a computational mistake; B inverts exactly the condition he sets; C denies",
      "The choice «D|a statistical error that inflates estimates» misreads a framing choice as a computational mistake; the choice «C|He accepts it wherever the two kinds of error carry unequal costs» inverts exactly the condition he sets; the choice «A|sensitivity cannot be estimated separately» denies"]] },
  // ── talk-c2 ──────────────────────────────────────────────────────────────
  { id: 'a2f36a0a-e9a8-4ac9-8a18-138d8ebee33e', key: 'A', // A->B, B->C, D->D
    edits: [
      ["answers A, the sealed-ocean story, which", "answers with the sealed-ocean story («B|the ocean froze over from pole to pole»), which"],
      ["disposes of B by entailment", "disposes of the tilt account («C|a tilt past fifty-four degrees») by entailment"],
      ["and D fails because", "and the debris-flow reading («D|the diamictites are debris flows») fails because"]] },
  // ── v2 SAT R&W (letters agree with stored order) ─────────────────────────
  { id: '0420ce0e-0d88-4897-afa9-fa1ed6b789a6', key: 'D',
    edits: [["both the benefit and the cost in D. A is the rosy", "both the benefit and the cost in the answer, «D|gain greater heat tolerance while growing more slowly». The choice «A|fully recover, ending up better suited to warm water at no lasting cost» is the rosy"],
      ["B is invented", "The choice «B|quickly shed the hardy strain» is invented"],
      ["C reverses the passage", "The choice «C|photosynthesize more efficiently» reverses the passage"]] },
  { id: '0602276b-bf6e-4e1a-ab37-a95886cf05a8', key: 'C',
    edits: [["C matches Text 2's conclusion", "The answer «C|partly a reflection of whether a child's environment had made delayed rewards trustworthy» matches Text 2's conclusion"],
      ["A is Text 1's fixed-trait view", "The choice «A|a fixed individual trait» is Text 1's fixed-trait view"],
      ["B misreads", "The choice «B|deliberately drill into their children» misreads"],
      ["D is too strong", "The choice «D|an artifact of measurement error» is too strong"]] },
  { id: '067c9901-5809-4faf-8a8b-08fe532e2b4c', key: 'B',
    edits: [["B follows directly", "The answer «B|the amount of carbon dioxide it required exceeds what the geological record permits» follows directly"],
      ["A overreaches", "The choice «A|methane rather than carbon dioxide was the only significant greenhouse gas» overreaches"],
      ["C is false", "The choice «C|carbon dioxide does not in fact trap heat» is false"],
      ["D contradicts", "The choice «D|the young Sun was actually brighter» contradicts"]] },
  { id: '2c67f590-8c5e-48a9-b078-57218f4e790e', key: 'B',
    edits: [["A restates the raw correlation", "The choice «A|growth rates fell sharply in the years immediately following a major mineral discovery» restates the raw correlation"],
      ["C is true but irrelevant", "The choice «C|Countries with strong institutions tend to have more diversified economies» is true but irrelevant"],
      ["D directly contradicts", "The choice «D|Resource windfalls have been shown to weaken the institutions» directly contradicts"]] },
  { id: '2ca0e0ee-995f-4a13-b0f5-eec3d70615c6', key: 'D',
    edits: [["D reflects Text 2's actual point", "The answer «D|the textbook prediction assumes a market structure that low-wage labor may not fit» reflects Text 2's actual point"],
      ["A is the tempting misreading", "The choice «A|the law of demand is simply false» is the tempting misreading"],
      ["B contradicts", "The choice «B|minimum wage increases always reduce employment» contradicts"],
      ["C invents", "The choice «C|too small to affect any hiring decisions» invents"]] },
  { id: '3537c297-db07-4802-a824-88b7036dc3f7', key: 'C',
    edits: [["exactly the split C describes (", "exactly the split described by the answer, «C|improve a stand's performance under typical dry conditions while failing to protect it under the most severe droughts» ("],
      ["A is the old assumption", "The choice «A|reliably increases a forest stand's resistance to drought regardless of the drought's severity» is the old assumption"],
      ["B reverses", "The choice «B|monoculture stands generally lose less biomass» reverses"],
      ["D reverses", "The choice «D|the trees most tolerant of extreme water stress» reverses"]] },
  { id: '4082122b-6024-4d1d-8b40-ce0d83b66660', key: 'B',
    edits: [["later exploited by flight, which is B. A restates", "later exploited by flight, which is the answer «B|a structure that flight later exploited and refined». The choice «A|decisive proof that feathers must originally have evolved» restates"],
      ["C reverses Text 2", "The choice «C|cannot have served for insulation or for visual display» reverses Text 2"],
      ["D garbles", "The choice «D|the reason that so many feathered dinosaurs» garbles"]] },
  { id: '4089e991-7b0e-426b-8055-b541b9a88d91', key: 'C',
    edits: [["C captures the structure", "The answer «C|identifying a condition under which a generally reliable relationship reverses» captures the structure"],
      ["A contradicts", "The choice «A|scientific literacy has no effect» contradicts"],
      ["B is the expectation", "The choice «B|more information reliably narrows the gap» is the expectation"],
      ["D treats", "The choice «D|the specific dangers of smoking» treats"]] },
  { id: '5c06d7dc-1cd8-443e-94dc-3b22d5c98bbe', key: 'D',
    edits: [["—precisely D. A is the face-value", "—precisely the answer, «D|cannot by itself settle the question». The choice «A|proves that human neurogenesis stops after childhood» is the face-value"],
      ["B overstates", "The choice «B|definitively traced to improperly preserved specimens» overstates"],
      ["C reverses", "The choice «C|more trustworthy than the positive finding» reverses"]] },
  { id: '5c2f343b-8998-40f5-b488-f13733cd09b4', key: 'D',
    edits: [["exactly the relocation D describes. A is the misreading", "exactly the relocation the answer describes, «D|a challenge to one assumption rather than to economic theory itself». The choice «A|dismiss standard economic theory» is the misreading"],
      ["B is unsupported", "The choice «B|concede that the competitive model correctly describes» is unsupported"],
      ["C wrongly frames", "The choice «C|present monopsony as an odd exception» wrongly frames"]] },
  { id: '65ee7f40-b2fc-4966-98cf-c8cb4bf3da72', key: 'B',
    edits: [["which is B. A contradicts", "which is the answer «B|relocates the source of the apparent defect». The choice «A|concedes that loss-averse behavior is, on balance, irrational» contradicts"],
      ["C invents", "The choice «C|introduces a new experiment» invents"],
      ["D overgeneralizes", "The choice «D|broadens the argument into the sweeping claim» overgeneralizes"]] },
  { id: '7da9ac67-b8a5-421d-b2a8-f45cd9aa70e2', key: 'A',
    edits: [["which is A. B overstates", "which is the answer «A|reflects preexisting differences in who volunteers». The choice «B|Volunteering has no genuine effect at all» overstates"],
      ["C reverses the finding", "The choice «C|reliably generate large and lasting gains» reverses the finding"],
      ["D reverses the direction", "The choice «D|the group least likely to take up volunteering» reverses the direction"]] },
  { id: '8750e65d-3b00-48c7-a91b-a3ede1968a78', key: 'C',
    edits: [["C matches the passage's core claim", "The answer «C|Wolf predation was neither the sole nor the decisive cause» matches the passage's core claim"],
      ["A is the popular narrative", "The choice «A|Wolves reengineered the ecosystem» is the popular narrative"],
      ["B overgeneralizes", "The choice «B|would have recovered to exactly the same extent» overgeneralizes"],
      ["D reverses", "The choice «D|Drought and hunting were the primary drivers» reverses"]] },
  { id: '95fb8d9f-a01d-49aa-bd12-92c6d4f72909', key: 'B',
    edits: [["B undercuts Rivera", "The answer «B|widespread injuries consistent with combat» undercuts Rivera"],
      ["A, C, and D all reinforce", "The other three choices, «A|a decades-long dry period», «C|Neighboring settlements that drew on the same water sources» and «D|a sharp decline in cultivated crops», all reinforce"]] },
  { id: 'c11235e4-5da4-47dd-9209-31f79df730ad', key: 'A',
    edits: [["—so A captures", "—so the answer «A|agreeing that readers complete a text but denying that this makes every reading equally valid» captures"],
      ["B is the tempting misreading", "The choice «B|only the author's biographical intentions» is the tempting misreading"],
      ["C contradicts", "The choice «C|texts possess no stable meaning» contradicts"],
      ["D contradicts", "The choice «D|readers play no legitimate role» contradicts"]] },
  { id: 'cecc1e41-4015-480b-97e4-0d66b9532327', key: 'D',
    edits: [["which is D. A restates", "which is the answer «D|underscore how little the characters understand». The choice «A|imposes a false and arrogant order» restates"],
      ["B overreaches", "The choice «B|more concerned with exposing human ignorance» overreaches"],
      ["C reverses the passage", "The choice «C|generally praise omniscient narration for the humility» reverses the passage"]] },
  { id: 'd17b19aa-de7d-4cd3-b46d-aed56d8de6b4', key: 'A',
    edits: [["B is the tempting misreading", "The choice «B|corrects an outdated date» is the tempting misreading"],
      ["C overstates continuity", "The choice «C|catalogs the administrative continuities» overstates continuity"],
      ["D seizes", "The choice «D|contrasts the indifference of contemporaries» seizes"]] },
  { id: 'ded7d316-75cc-4a5d-955f-034e559d8806', key: 'B',
    edits: [["the caution in B. A overstates", "the caution in the answer, «B|an elegant causal story can substitute for proof». The choice «A|deny that warfare contributed in any way» overstates"],
      ["C is only floated", "The choice «C|commercial wealth, rather than warfare, produced» is only floated"],
      ["D describes", "The choice «D|gunpowder weaponry rendered traditional fortifications obsolete» describes"]] },
  { id: 'e480843a-30d7-4fd2-8530-244a1387adb7', key: 'C',
    edits: [["C matches the passage's account", "The answer «C|remaining unrefuted despite being genuinely open to refutation» matches the passage's account"],
      ["A is the popular defense", "The choice «A|become proven true once enough confirming evidence» is the popular defense"],
      ["B overgeneralizes", "The choice «B|no more reliable than any other beliefs» overgeneralizes"],
      ["D distorts", "The choice «D|already been refuted at least once» distorts"]] },
  { id: 'e9036cc2-fdc6-4359-a75b-47afd63d5fe9', key: 'C',
    edits: [["C removes exactly", "The answer «C|Willows recovered no more in the risky sites elk avoided» removes exactly"],
      ["A is the tempting trap", "The choice «A|elk numbers across the park fell by more than half» is the tempting trap"],
      ["B is a downstream", "The choice «B|Songbird diversity rose most sharply» is a downstream"],
      ["D concerns", "The choice «D|Beaver colonies expanded only after willow stands» concerns"]] },
  { id: 'ec751918-be15-4ca2-b35b-e79bd6e59fa4', key: 'D',
    edits: [["D captures the paradox", "The answer «D|succeeded well enough to make the disease seem unthreatening» captures the paradox"],
      ["A misreads", "The choice «A|carry risks greater than those posed by the disease» misreads"],
      ["B invents", "The choice «B|failed to communicate the vaccine's value» invents"],
      ["C contradicts", "The choice «C|has itself grown more dangerous» contradicts"]] },
  { id: 'f7c3b760-032b-4529-ad28-87244f7d0a2a', key: 'B',
    edits: [["structure in B. A is the very interpretation", "structure in the answer, «B|reinterprets that feature as achieving nearly the reverse». The choice «A|defends the conventional view» is the very interpretation"],
      ["C overgeneralizes", "The choice «C|should therefore be abandoned by serious novelists» overgeneralizes"],
      ["D invents", "The choice «D|contrasts two rival schools of criticism» invents"]] },
]
