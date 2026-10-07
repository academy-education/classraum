import type { LadderPrompt } from '../grader-ladder'

/**
 * Rubric-anchored answer ladders for the TOEFL grader — a CONSISTENCY
 * instrument, not a calibration (see src/lib/study/grader-ladder.ts).
 *
 * Owner decision 2026-10-07. Prompts are copied verbatim from OUR bank
 * (study_item_bank, ids below), never from ETS samples. Every answer was
 * drafted by Claude by DEGRADING one strong anchor answer, one rubric
 * dimension per step, against the descriptors of THAT task's own ETS
 * guide (Writing and Speaking guides differ — CLAUDE.md). Each step was
 * then checked by hand against its parent: the `note` says what moved,
 * and that nothing else did.
 *
 * Scope = the three task types the rubric grader actually scores
 * (RESPONSE_SKILL_BY_TYPE): writing_email, writing_discussion,
 * speaking_interview. Listen and Repeat is scored deterministically by
 * listen-repeat-accuracy.ts and Build a Sentence is key-matched, so
 * neither reaches this grader.
 *
 * Speaking is tested on the TRANSCRIPT path only — there is no audio, so
 * delivery (pace, pausing, intelligibility) is never a ladder dimension,
 * and no step adds fillers or hesitation marks that would smuggle a
 * delivery change into a language step.
 *
 * Known confounds, accepted and recorded rather than hidden:
 *  - `development` steps are shorter than their parents. Removing
 *    elaboration removes words; padding them back would be a relevance
 *    change ("restating the same idea is not elaboration").
 *  - Email `social_conventions` steps on prompts whose bullet points are
 *    themselves about tone ("does not read as a flat refusal") also brush
 *    task completion. Noted per step.
 *  - Speaking intended bands use half bands where one weaker feature
 *    leaves two adjacent bands defensible under "a typical response
 *    exhibits the following" at every band.
 */

// ---------------------------------------------------------------------------
// Write for an Academic Discussion — prompt 1 (tuition-free universities)
// ---------------------------------------------------------------------------

const DISC_TUITION_PASSAGE = `Professor Kim: Many countries are debating whether public universities should be tuition-free for all students. Proponents argue that eliminating tuition increases access to higher education, reduces student debt, and helps create a more educated workforce, which can benefit society as a whole. However, critics contend that making university free for everyone could strain government budgets, reduce educational quality, and unfairly subsidize wealthier families who can afford to pay. Should public universities be tuition-free for all, or should students continue to pay tuition? Why or why not? Aisha: I believe public universities should be tuition-free for all students. In countries like Germany and Norway, free tuition has led to higher university attendance rates and lower student debt, which allows young people to start their careers without financial burdens.

This policy especially benefits students from low-income backgrounds, who might otherwise be discouraged from pursuing higher education. While funding is a challenge, investing in education pays off in the long run by creating a more skilled workforce and reducing inequality. Diego: I disagree with making public universities tuition-free for everyone. While increasing access is important, free tuition can lead to overcrowding and strain resources, potentially lowering the quality of education. Additionally, many students from wealthier families do not need financial assistance, so a targeted approach—such as means-tested scholarships—would be more efficient. This way, limited public funds can support those who truly need help, while maintaining high academic standards and sustainable university funding.`

const DISC_TUITION_A = `Diego's point about targeting aid is persuasive, but I think it underestimates what a universal policy does that a means-tested one cannot. Scholarships only help students who already know they qualify and who manage to complete complicated applications; many first-generation students never apply because they assume university is simply not for them. A tuition-free system removes that psychological barrier, because the message is unambiguous: if you are admitted, you can attend. Aisha's examples support this, since Germany's enrolment gains came largely from families with no university tradition. That said, Diego is right that free tuition can strain quality if funding does not keep pace with enrolment. The solution is not to charge students but to finance universities through progressive taxation, so wealthier families still contribute, only later and in proportion to their income. In my view, this approach keeps the access benefits Aisha describes while answering Diego's fairness concern, which is why I would support making public universities tuition-free.`

const DISC_TUITION_C = `I think Diego's idea about helping only some students is good, but I think free tuition for everyone is better. Scholarships only help students who know they can get them and who finish long applications. Many students whose parents did not go to university never apply, because they think university is not for them. If tuition is free, this problem goes away, because the message is very clear: if you are accepted, you can study. Aisha's examples show this, because in Germany many of the new students came from families where nobody went to university before. But Diego is right that free tuition can make quality lower if there is not enough money for more students. The answer is not to make students pay but to pay for universities with taxes, and rich people pay more taxes. So rich families still pay, just later and depending on how much they earn. In my opinion, this way keeps the good points Aisha talks about and also answers Diego's worry about fairness, so I support free public universities.`

const DISC_TUITION_E = `Diego's point about targeting aid is persuasive, but I think it underestimates what a universal policy does that a means-tested one cannot. When I was in high school, my favourite teacher ran a debate club after classes, and those afternoons taught me how to structure an argument and listen carefully to people I disagreed with. I still use those skills in every seminar, and I believe extracurricular activities deserve far more recognition than they currently receive in university admissions. That said, Diego is right that free tuition can strain quality if funding does not keep pace with enrolment. The solution is not to charge students but to finance universities through progressive taxation, so wealthier families still contribute, only later and in proportion to their income. In my view, this approach keeps the access benefits Aisha describes while answering Diego's fairness concern, which is why I would support making public universities tuition-free.`

const DISC_TUITION_F = `I think Diego idea about help only some student is good, but I think free tuition for everyone is more better. Scholarship only helping student who knows they can get it and who finish long application. Many student whose parent not go university never apply, because they thinking university not for them. If tuition is free, this problem go away, because message is very clear: if you accept, you can study. Aisha example show this, because in Germany many new student come from family where nobody go university before. But Diego right that free tuition can make quality more low if there is not enough money for more student. The answer is not make student pay but pay university with tax, and rich people pay more tax. So rich family still pay, just later and depend how much they earn. In my opinion this way keep good point Aisha talk and also answer Diego worry about fair, so I support free public university.`

// ---------------------------------------------------------------------------
// Write for an Academic Discussion — prompt 2 (universal basic income)
// ---------------------------------------------------------------------------

const DISC_UBI_PASSAGE = `Professor Chen: Universal Basic Income (UBI), where all citizens receive a regular, unconditional sum of money from the government, has been proposed as a solution to economic inequality and job loss due to automation. Supporters argue that UBI can reduce poverty and give people more freedom to pursue education or entrepreneurship. Critics, however, worry that it may discourage people from working and strain public finances. Given the potential for both positive and negative impacts on society and the economy, do you think implementing a UBI is a wise policy choice? Why or why not? Aisha: I believe implementing a UBI is a wise policy choice, especially as automation threatens to eliminate many traditional jobs. A recent study in Finland showed that recipients of a basic income reported higher well-being and were more willing to take short-term or entrepreneurial work.

This suggests that UBI can empower people to adapt to a changing economy rather than just relying on traditional employment. While funding is a challenge, the long-term benefits of reducing poverty and encouraging innovation are worth the investment. Kenji: While I understand the appeal of UBI, I think it is not the best solution. My main concern is that providing unconditional income could reduce the incentive to work, especially for lower-wage jobs that are still essential for society. Instead, targeted programs like job retraining and wage subsidies would help people transition to new industries without risking a decline in workforce participation. Moreover, the cost of UBI could force governments to cut funding for other critical services like healthcare and education.`

const DISC_UBI_A = `Kenji raises the incentive problem, but I think the evidence points the other way, and the real weakness of UBI lies elsewhere. In the Finnish experiment Aisha mentions, recipients did not work less; employment was roughly unchanged, while stress and anxiety fell noticeably. That makes sense, because a guaranteed floor lets people accept short contracts or retrain without risking their entire livelihood, whereas conventional benefits are often withdrawn the moment someone takes a part-time job. Where Kenji is right is cost. Paying every citizen a meaningful amount would require either very high taxes or cuts to services such as healthcare, and a basic income that replaced public healthcare would leave sick people worse off. So I would support UBI only in a modest form, funded by consolidating existing cash benefits rather than replacing services. That version keeps the security Aisha values without forcing the trade-off Kenji is worried about.`

const DISC_UBI_C = `Kenji talks about people not wanting to work, but I think the evidence shows something different, and the real problem with UBI is another one. In the Finland study that Aisha talks about, people who got the money did not work less. The number of people with jobs stayed about the same, and people felt less stress. This makes sense, because when people have a basic amount of money every month, they can take short jobs or study new skills without losing everything. With normal benefits, people often lose the money when they get a part-time job. But Kenji is right about the cost. Giving every person enough money would need very high taxes or cuts to services like healthcare, and if UBI replaced free healthcare, sick people would be in a worse situation. So I support UBI only if it is small and paid for by combining the benefits we already have, not by cutting services. This way people get the security Aisha likes, and we avoid the problem Kenji worries about.`

const DISC_UBI_E = `Kenji raises the incentive problem, but I think the evidence points the other way, and the real weakness of UBI lies elsewhere. Last summer I worked at a café near my university, and I was surprised by how much I learned about managing time and dealing with difficult customers. My manager trusted me to open the shop alone after only two weeks, and that experience made me much more confident about speaking to strangers. Where Kenji is right is cost. Paying every citizen a meaningful amount would require either very high taxes or cuts to services such as healthcare, and a basic income that replaced public healthcare would leave sick people worse off. So I would support UBI only in a modest form, funded by consolidating existing cash benefits rather than replacing services. That version keeps the security Aisha values without forcing the trade-off Kenji is worried about.`

const DISC_UBI_F = `Kenji talk about people not want to working, but I think evidence is show something different, and real problem of UBI is other one. In Finland study that Aisha talk, people who get money not work less. Number of people with job stay about same, and people feel less stress. This make sense, because when people has basic money every month, they can take short job or study new skill without lose everything. With normal benefit, people often losing money when they get part-time job. But Kenji right about cost. Give every person enough money need very high tax or cut service like healthcare, and if UBI replace free healthcare, sick people is in worse situation. So I support UBI only if is small and pay by combine benefit we already have, not by cut service. This way people get security Aisha like, and we avoid problem Kenji worry.`

// ---------------------------------------------------------------------------
// Write an Email — prompt 1 (Professor Lee, symposium)
// ---------------------------------------------------------------------------

const EMAIL_LEE_PASSAGE = `Professor Martin Lee has emailed you to ask whether you can help organize next month’s Departmental Research Symposium, praising your organizational work at last semester’s conference. They note that this is a busy period for you given your thesis, and say that even limited involvement would be appreciated.

You are in the final months of your thesis and could not take on the full role.

In your email to Professor Lee, be sure to:
• Acknowledge the request and the recognition it reflects
• Explain your thesis commitments in a way that does not read as a flat refusal
• Propose the specific, limited form of help you could realistically offer`

const EMAIL_LEE_A = `Dear Professor Lee,

Thank you so much for thinking of me for the Research Symposium, and for your kind words about last semester's conference. It means a great deal that you trusted that work.

I would genuinely like to help, but I am in the final months of my thesis, and my committee expects a complete draft by the end of next month. Taking on the full organizing role would mean doing both jobs badly, which would not be fair to you or to the department.

What I could realistically offer is to manage the speaker schedule: collecting abstracts, building the session timetable, and sending reminders in the week before the event. That would take a few hours a week, which I can protect. Would that kind of help be useful?

Best regards,
Jordan`

const EMAIL_LEE_C = `Dear Professor Lee,

Thank you for asking me to help with the Research Symposium, and thank you for your nice words about last semester's conference. I am happy that you liked my work.

I want to help, but I am in the last months of my thesis, and my committee wants a full draft by the end of next month. If I take the full organizing job, I will not do either job well, and that is not fair to you or the department.

I can help with the speaker schedule. I can collect the abstracts, make the timetable for the sessions, and send reminders in the week before the event. This will take a few hours each week, and I can find that time. Is this kind of help useful for you?

Best regards,
Jordan`

// ---------------------------------------------------------------------------
// Write an Email — prompt 2 (Professor Lin, seminar)
// ---------------------------------------------------------------------------

const EMAIL_LIN_PASSAGE = `Professor Lin, of the Biology department, has emailed you to ask whether you would present your group’s research findings at next Friday’s departmental seminar. They call the work particularly impressive and say it would benefit your peers, while acknowledging the short notice and that you may have other commitments.

Your group has not prepared presentation materials, and one member is unavailable that week.

In your email to Professor Lin, be sure to:
• Answer directly whether you are able to present next Friday
• Explain the specific difficulty the short notice creates for your group
• Propose an alternative, or ask for the guidance you would need to make it work`

const EMAIL_LIN_A = `Dear Professor Lin,

Thank you for the invitation to present at next Friday's seminar, and for describing our work so generously. The whole group was delighted to hear it.

I am afraid we will not be able to present next Friday. We have not yet turned our findings into presentation materials, and Mina, who ran most of the statistical analysis, is at a conference that week. Without her, we could describe what we found but not explain how we tested it, and your students would rightly ask.

Would it be possible to present at the seminar on the 24th instead? That would give us time to prepare proper slides with Mina involved. If that date is already taken, any later slot this term would work for us.

Kind regards,
Daniel`

const EMAIL_LIN_C = `Dear Professor Lin,

Thank you for inviting us to present at the seminar next Friday, and thank you for your kind words about our work. Everyone in the group was very happy to hear it.

I am sorry, but we cannot present next Friday. We have not made the presentation materials yet, and Mina, who did most of the statistics, will be at a conference that week. Without her, we can say what we found but not how we tested it, and the students will probably ask about that.

Can we present at the seminar on the 24th instead? Then we will have time to make good slides with Mina. If that date is not free, any later date this term is fine for us.

Kind regards,
Daniel`

// ---------------------------------------------------------------------------
// Take an Interview — prompt 1 (describe a performance)
// ---------------------------------------------------------------------------

const ARTS_PASSAGE = 'The university is reviewing its arts programme and is interviewing students about music, theatre and other performances on campus.'

const INT_OCCASION_A = `Yes, last spring I went to a student production of Arthur Miller's The Crucible in the campus theatre. A friend of mine was playing John Proctor, so I went mainly to support him, but I ended up being completely absorbed. What struck me most was the staging: they used almost no scenery, just a few wooden chairs and harsh white lighting, so all your attention went to the actors' faces. In the courtroom scene the whole audience went silent. Afterwards the cast stayed to talk with us, and they explained how they'd rehearsed the accusations to feel like they were spreading through the room. It actually made me want to see more student theatre.`

const INT_OCCASION_B = `Yes, last spring I went to a student play, The Crucible by Arthur Miller, in the campus theatre. My friend played John Proctor, so I went to support him, but I really enjoyed it. The thing I liked most was the stage: they used almost no scenery, just some wooden chairs and very white light, so you looked at the actors' faces all the time. In the court scene everybody in the audience was very quiet. After the play the actors stayed to talk with us, and they explained how they practiced the accusations so it feel like it was spreading in the room. It made me want to see more student plays.`

const INT_OCCASION_C = `Yes, last spring I went to a student play, The Crucible, in the campus theatre. My friend was in it, so I went to support him. I really enjoyed it. The stage was very simple, almost no scenery, just some chairs. The lighting was very white. The actors were good, especially in the court scene, everybody was quiet. After the play the actors stayed and talked with us about how they practiced. It made me want to see more student plays.`

const INT_OCCASION_D = `Yes, last spring I go to student play, The Crucible, in campus theatre. My friend is in it, so I go for support him. I enjoy it very much. The stage is very simple, almost nothing, only some chair. The light is very white. The actor is good, special in the court scene, everybody is quiet. After the play the actor stay and talk with us about how they practice. It make me want to see more student play.`

const INT_OCCASION_E = `Yes, last spring I go to student play in campus theatre. My friend is in it. I enjoy it very much. The stage is simple. The actor is good. It is very good night and I want to see more play.`

const INT_OCCASION_F = `Yes, I have been to a concert, play or exhibition. On campus or elsewhere, I think concert, play or exhibition is very good. The university arts programme is important for student. Music and theatre is good for relax. I like music very much, I listen music every day.`

// ---------------------------------------------------------------------------
// Take an Interview — prompt 2 (are the arts a luxury?)
// ---------------------------------------------------------------------------

const INT_LUXURY_A = `I don't think it's entirely fair, although I understand where it comes from. When money is short, it's natural to protect things like lab equipment or financial aid first. But calling the arts a luxury assumes they only benefit the people who perform, and that isn't true. At my university, the music society runs free lunchtime concerts, and they're one of the few places where students from completely different departments actually meet. For a lot of international students, that's how they make friends in their first term. So cutting the arts wouldn't just remove entertainment; it would remove part of what makes campus feel like a community. I'd accept reducing the budget, but not eliminating it.`

const INT_LUXURY_B = `I don't think it is totally fair, but I understand why people say it. When there is not much money, it is normal to protect things like lab equipment or money for students first. But if you say the arts are a luxury, you think only the performers get something from it, and that is not true. At my university, the music club has free concerts at lunchtime, and it is one of the few places where students from different departments really meet. For many international students, this is how they make friends in their first semester. So if we cut the arts, we don't only lose fun, we lose part of what make the campus a community. I can accept a smaller budget, but not no budget.`

const INT_LUXURY_C = `I don't think it is totally fair. When there is not much money, it is normal to protect lab equipment first. But the arts are not only for performers. At my university, there are free concerts at lunchtime. Students from different departments meet there. International students make friends there too. The arts are part of the community. I can accept a smaller budget, but not no budget.`

const INT_LUXURY_D = `I think is not totally fair. When not much money, is normal protect lab equipment first. But art is not only for performer. In my university, have free concert in lunchtime. Student from different department meet in there. International student make friend there also. Art is part of community. I can accept small budget, but not no budget.`

const INT_LUXURY_E = `I think is not totally fair. Art is not only for performer. In my university have free concert. Art is important for community. I can accept small budget.`

const INT_LUXURY_F = `Arts programme is sometimes criticise as luxury when budget is tight. Is the criticism fair? I think criticism is, is luxury when budget is tight. Budget is tight in many place. Arts programme is luxury, yes, maybe.`

// ---------------------------------------------------------------------------

export const GRADER_LADDERS: LadderPrompt[] = [
  {
    id: 'disc-tuition',
    taskType: 'academic_discussion',
    bankItemId: '7774c8cc-b7c5-4396-8af0-37b522b809c5',
    bankCohort: 'harvest-v1',
    passage: DISC_TUITION_PASSAGE,
    prompt: '[Academic Discussion] Read the discussion above and write your own contribution (target 150+ words). Engage at least one classmate by name.',
    steps: [
      {
        id: 'disc-tuition-A', parent: null, changed: null, intendedBand: 5,
        descriptor: 'relevant and very clearly expressed; consistently well-elaborated; wide range of accurate grammar and vocabulary',
        note: 'Anchor. Engages both classmates by name, a reasoned position with two supported points and a concession. ~165 words.',
        response: DISC_TUITION_A,
      },
      {
        id: 'disc-tuition-B', parent: 'disc-tuition-A', changed: 'errors_timed', intendedBand: 5,
        descriptor: 'errors expected from a competent writer writing under timed conditions (typos, there/their) do not keep a response out of band 5',
        note: 'A with exactly three slips: aplications, familys, there (for their). Nothing else touched.',
        response: DISC_TUITION_A
          .replace('complicated applications', 'complicated aplications')
          .replace('from families with no', 'from familys with no')
          .replace('proportion to their income', 'proportion to there income'),
      },
      {
        id: 'disc-tuition-C', parent: 'disc-tuition-A', changed: 'language_range', intendedBand: 4,
        descriptor: 'some variety and accuracy of grammar and vocabulary (vs a wide range)',
        note: 'Sentence-for-sentence paraphrase of A in plain vocabulary and simple clauses; every idea, example and concession kept in the same order. Accurate; repetitive ("because", "I think").',
        response: DISC_TUITION_C,
      },
      {
        id: 'disc-tuition-D', parent: 'disc-tuition-A', changed: 'development', intendedBand: 3,
        descriptor: 'SOME elaboration — part of which may be missing',
        note: 'A with the explanation removed: the scholarship mechanism, the first-generation example, the Germany detail and the taxation mechanism are cut to bare assertions. Sentences that remain are A\'s wording. ~85 words (length confound accepted).',
        response: `Diego's point about targeting aid is persuasive, but I think it underestimates what a universal policy does that a means-tested one cannot. A tuition-free system removes a psychological barrier for many students. Aisha's examples from Germany support this. That said, Diego is right that free tuition can strain quality. The solution is not to charge students but to finance universities differently. In my view, this approach keeps the access benefits Aisha describes while answering Diego's fairness concern, which is why I would support making public universities tuition-free.`,
      },
      {
        id: 'disc-tuition-E', parent: 'disc-tuition-A', changed: 'relevance', intendedBand: 3,
        descriptor: 'MOSTLY RELEVANT contribution with some elaboration, part of which is IRRELEVANT',
        note: 'A with its first supporting point (scholarships / first-generation / Germany, three sentences) replaced by a fluent, same-register tangent about a high-school debate club. Opener, concession and conclusion verbatim from A.',
        response: DISC_TUITION_E,
      },
      {
        id: 'disc-tuition-F', parent: 'disc-tuition-C', changed: 'errors', intendedBand: 2,
        descriptor: 'frequent errors that impede meaning (Writing band 2, ONE OR MORE)',
        note: 'C with agreement, article, tense and word-form errors in every sentence; "if you accept, you can study" inverts the meaning. Same ideas, same order, same length as C.',
        response: DISC_TUITION_F,
      },
      {
        id: 'disc-tuition-G', parent: 'disc-tuition-E', changed: 'relevance', intendedBand: 2,
        descriptor: 'ideas only partially relevant; limited connection to the discussion (Writing band 2, ONE OR MORE)',
        note: 'E with the remaining on-topic content (concession, taxation, conclusion) replaced by more of the admissions tangent. Only the opening clause still touches the question. Same register and accuracy as E.',
        response: `Diego's point about targeting aid is persuasive. When I was in high school, my favourite teacher ran a debate club after classes, and those afternoons taught me how to structure an argument and listen carefully to people I disagreed with. I still use those skills in every seminar, and I believe extracurricular activities deserve far more recognition than they currently receive in university admissions. Many universities focus only on grades and test scores, which ignores the leadership and teamwork that clubs develop. Admissions officers should ask applicants to describe what they learned outside the classroom, because those experiences often predict success better than exam results do.`,
      },
      {
        id: 'disc-tuition-H', parent: 'disc-tuition-F', changed: 'originality', intendedBand: 1,
        descriptor: 'MINIMAL ORIGINAL LANGUAGE, any coherent language MOSTLY BORROWED FROM THE STIMULUS; words strung together with little control',
        note: 'F\'s own sentences replaced by phrases lifted from the professor and both classmates, joined by a few broken words of the writer\'s own. Not ENTIRELY copied (so not a Writing 0).',
        response: `tuition free for all student. Aisha say free tuition has led to higher university attendance rates and lower student debt. Diego say free tuition can lead to overcrowding and strain resources. means-tested scholarships would be more efficient. I think is good. eliminating tuition increases access to higher education. yes free.`,
      },
    ],
  },
  {
    id: 'disc-ubi',
    taskType: 'academic_discussion',
    bankItemId: '6042f457-363a-41bd-ac76-d9856c2c0065',
    bankCohort: 'harvest-v1',
    passage: DISC_UBI_PASSAGE,
    prompt: '[Academic Discussion] Read the discussion above and write your own contribution (target 150+ words). Engage at least one classmate by name.',
    steps: [
      {
        id: 'disc-ubi-A', parent: null, changed: null, intendedBand: 5,
        descriptor: 'relevant and very clearly expressed; consistently well-elaborated; wide range of accurate grammar and vocabulary',
        note: 'Anchor. Rebuts Kenji with Aisha\'s evidence and a mechanism, concedes cost, lands on a qualified position. ~160 words.',
        response: DISC_UBI_A,
      },
      {
        id: 'disc-ubi-B', parent: 'disc-ubi-A', changed: 'errors_timed', intendedBand: 5,
        descriptor: 'errors expected from a competent writer writing under timed conditions do not keep a response out of band 5',
        note: 'A with exactly three slips: anxeity, there (for their), healtcare (first occurrence). Nothing else touched.',
        response: DISC_UBI_A
          .replace('stress and anxiety', 'stress and anxeity')
          .replace('risking their entire', 'risking there entire')
          .replace('services such as healthcare', 'services such as healtcare'),
      },
      {
        id: 'disc-ubi-C', parent: 'disc-ubi-A', changed: 'language_range', intendedBand: 4,
        descriptor: 'some variety and accuracy of grammar and vocabulary (vs a wide range)',
        note: 'Sentence-for-sentence plain paraphrase of A; every claim, the Finland evidence, the benefits mechanism and the cost concession kept in order. Accurate.',
        response: DISC_UBI_C,
      },
      {
        id: 'disc-ubi-D', parent: 'disc-ubi-A', changed: 'development', intendedBand: 3,
        descriptor: 'SOME elaboration — part of which may be missing',
        note: 'A reduced to its claims: the employment/stress finding, the benefits-withdrawal mechanism and the healthcare consequence are cut. Remaining wording from A. ~85 words.',
        response: `Kenji raises the incentive problem, but I think the evidence points the other way, and the real weakness of UBI lies elsewhere. The Finnish experiment Aisha mentions did not show people working less, and a guaranteed income gives people more security. Where Kenji is right is cost, since paying every citizen would be very expensive. So I would support UBI only in a modest form, funded differently. That version keeps the security Aisha values without forcing the trade-off Kenji is worried about.`,
      },
      {
        id: 'disc-ubi-E', parent: 'disc-ubi-A', changed: 'relevance', intendedBand: 3,
        descriptor: 'MOSTLY RELEVANT contribution with some elaboration, part of which is IRRELEVANT',
        note: 'A with the Finland/mechanism block (three sentences) replaced by a same-register café-job anecdote that never mentions income support. Rest verbatim.',
        response: DISC_UBI_E,
      },
      {
        id: 'disc-ubi-F', parent: 'disc-ubi-C', changed: 'errors', intendedBand: 2,
        descriptor: 'frequent errors that impede meaning (Writing band 2, ONE OR MORE)',
        note: 'C with errors in every sentence; "the real problem of UBI is other one" and "only if is small and pay by combine benefit" obscure the point. Same ideas and order as C.',
        response: DISC_UBI_F,
      },
      {
        id: 'disc-ubi-G', parent: 'disc-ubi-E', changed: 'relevance', intendedBand: 2,
        descriptor: 'ideas only partially relevant; limited connection to the discussion (Writing band 2, ONE OR MORE)',
        note: 'E with the remaining on-topic content replaced by more of the part-time-job tangent. Only "Kenji raises the incentive problem" still touches the question. Same register as E.',
        response: `Kenji raises the incentive problem. Last summer I worked at a café near my university, and I was surprised by how much I learned about managing time and dealing with difficult customers. My manager trusted me to open the shop alone after only two weeks, and that experience made me much more confident about speaking to strangers. I think every student should have a part-time job at least once, because it teaches responsibility that classes cannot. It also helps students understand the value of money and plan their spending more carefully.`,
      },
      {
        id: 'disc-ubi-H', parent: 'disc-ubi-F', changed: 'originality', intendedBand: 1,
        descriptor: 'MINIMAL ORIGINAL LANGUAGE, any coherent language MOSTLY BORROWED FROM THE STIMULUS',
        note: 'F replaced by lifted stimulus phrases plus a few broken words of the writer\'s own. Not entirely copied.',
        response: `UBI is wise policy choice. Aisha say automation threatens to eliminate many traditional jobs. recipients of a basic income reported higher well-being. Kenji say providing unconditional income could reduce the incentive to work. job retraining and wage subsidies. I agree UBI. is good money.`,
      },
    ],
  },
  {
    id: 'email-lee',
    taskType: 'email',
    bankItemId: 'f19757f8-5b95-4afe-b36e-0a4031d095d4',
    bankCohort: 'harvest-v1',
    passage: EMAIL_LEE_PASSAGE,
    prompt: '[Email] Read the email above and write your reply (target 100+ words).',
    steps: [
      {
        id: 'email-lee-A', parent: null, changed: null, intendedBand: 5,
        descriptor: 'fully successful; effective social conventions; well organised and elaborated; wide accurate range',
        note: 'Anchor. All three bullets, softened decline, concrete limited offer, closing question. ~130 words.',
        response: EMAIL_LEE_A,
      },
      {
        id: 'email-lee-B', parent: 'email-lee-A', changed: 'errors_timed', intendedBand: 5,
        descriptor: 'errors expected from a competent writer writing under timed conditions do not keep a response out of band 5',
        note: 'A with three slips: committe, abstarcts, usefull. Nothing else touched.',
        response: EMAIL_LEE_A
          .replace('my committee expects', 'my committe expects')
          .replace('collecting abstracts', 'collecting abstarcts')
          .replace('help be useful?', 'help be usefull?'),
      },
      {
        id: 'email-lee-C', parent: 'email-lee-A', changed: 'language_range', intendedBand: 4,
        descriptor: 'adequate range of grammar and vocabulary (vs wide)',
        note: 'Paragraph-for-paragraph plain paraphrase of A. Same salutation, same three points, same offer details, same polite closing question.',
        response: EMAIL_LEE_C,
      },
      {
        id: 'email-lee-D', parent: 'email-lee-A', changed: 'social_conventions', intendedBand: 3,
        descriptor: 'social conventions inconsistently observed',
        note: 'A\'s content and language level kept; politeness made inconsistent: formal salutation kept, but the warm acknowledgement shrinks, the decline becomes flat ("so I can\'t do it"), the offer ends in an ultimatum, sign-off "Cheers". CONFOUND: bullet 2 asks for a decline that is NOT flat, so this also brushes task completion.',
        response: `Dear Professor Lee,

Thanks for the email and the comments about last semester's conference.

I'm in the final months of my thesis, and my committee expects a complete draft by the end of next month. Taking on the full organizing role would mean doing both jobs badly, so I can't do it.

What I can do is manage the speaker schedule: collecting abstracts, building the session timetable, and sending reminders in the week before the event. That takes a few hours a week, which I can protect. Let me know by Friday if you want that, otherwise I'll assume you don't need me.

Cheers,
Jordan`,
      },
      {
        id: 'email-lee-E', parent: 'email-lee-A', changed: 'task_completion', intendedBand: 3,
        descriptor: 'partially successful response (one required point not addressed)',
        note: 'A with the third paragraph (the specific limited offer — bullet 3) replaced by a one-line well-wish. Paragraphs 1-2, salutation and sign-off verbatim.',
        response: `Dear Professor Lee,

Thank you so much for thinking of me for the Research Symposium, and for your kind words about last semester's conference. It means a great deal that you trusted that work.

I would genuinely like to help, but I am in the final months of my thesis, and my committee expects a complete draft by the end of next month. Taking on the full organizing role would mean doing both jobs badly, which would not be fair to you or to the department.

I hope the symposium goes very well, and I look forward to attending as a guest.

Best regards,
Jordan`,
      },
      {
        id: 'email-lee-F', parent: 'email-lee-C', changed: 'errors', intendedBand: 2,
        descriptor: 'frequent errors that obscure meaning (Email band 2, ONE OR MORE)',
        note: 'C with errors in every sentence; "full draft until end of next month" and "I will not do both job good" obscure meaning. Same points and politeness as C.',
        response: `Dear Professor Lee,

Thank you for ask me to help with Research Symposium, and thank for your nice word about last semester conference. I am happy that you like my work.

I want help, but I am in last month of my thesis, and my committee want full draft until end of next month. If I take full organize job, I will not do both job good, and that is not fair for you or department.

I can helping with speaker schedule. I can collect abstract, make timetable of session, and send remind in week before event. This will taking few hour each week, and I can find that time. Is this kind help useful to you?

Best regards,
Jordan`,
      },
      {
        id: 'email-lee-G', parent: 'email-lee-A', changed: 'relevance', intendedBand: 2,
        descriptor: 'addresses the task only minimally; LIMITED OR IRRELEVANT ELABORATION (Email band 2, ONE OR MORE)',
        note: 'A\'s body replaced by fluent, polite, same-register praise of the professor\'s seminar; the thesis is one bare clause, no acknowledgement of the recognition, no offer.',
        response: `Dear Professor Lee,

Thank you for your email about the symposium.

I wanted to tell you how much I have enjoyed your seminar this year. The session on research ethics was especially interesting, and it changed the way I think about consent forms in my own interviews. I have also started reading the book you recommended on qualitative methods, and I find the chapter on coding transcripts very useful.

Unfortunately, I am busy with my thesis.

I hope you have a wonderful weekend.

Best regards,
Jordan`,
      },
      {
        id: 'email-lee-H', parent: 'email-lee-F', changed: 'originality', intendedBand: 1,
        descriptor: 'minimal original language, any coherent language mostly borrowed from the prompt',
        note: 'F replaced by prompt phrases strung together plus "ok I help little. thank you". Not entirely copied.',
        response: `Professor Lee. help organize next month's Departmental Research Symposium. organizational work at last semester's conference. busy period thesis. could not take on the full role. limited involvement. ok I help little. thank you`,
      },
    ],
  },
  {
    id: 'email-lin',
    taskType: 'email',
    bankItemId: 'fabf733a-6716-4d02-b1e4-e33c14e49c92',
    bankCohort: 'harvest-v1',
    passage: EMAIL_LIN_PASSAGE,
    prompt: '[Email] Read the email above and write your reply (target 100+ words).',
    steps: [
      {
        id: 'email-lin-A', parent: null, changed: null, intendedBand: 5,
        descriptor: 'fully successful; effective social conventions; well organised and elaborated; wide accurate range',
        note: 'Anchor. Direct answer, specific difficulty with consequence, concrete alternative with fallback. ~130 words.',
        response: EMAIL_LIN_A,
      },
      {
        id: 'email-lin-B', parent: 'email-lin-A', changed: 'errors_timed', intendedBand: 5,
        descriptor: 'errors expected from a competent writer writing under timed conditions do not keep a response out of band 5',
        note: 'A with three slips: generousely, analisys, allready. Nothing else touched.',
        response: EMAIL_LIN_A
          .replace('so generously', 'so generousely')
          .replace('statistical analysis', 'statistical analisys')
          .replace('is already taken', 'is allready taken'),
      },
      {
        id: 'email-lin-C', parent: 'email-lin-A', changed: 'language_range', intendedBand: 4,
        descriptor: 'adequate range of grammar and vocabulary (vs wide)',
        note: 'Paragraph-for-paragraph plain paraphrase of A; same answer, same difficulty and consequence, same alternative and fallback, same politeness.',
        response: EMAIL_LIN_C,
      },
      {
        id: 'email-lin-D', parent: 'email-lin-A', changed: 'social_conventions', intendedBand: 3,
        descriptor: 'social conventions inconsistently observed',
        note: 'A\'s content and language level kept; formal salutation kept, but "Thanks for the invite", a blunt "We won\'t be presenting", "obviously ask", and an imperative request ("Put us down", "just give us whatever ... is left"). All three bullets still addressed.',
        response: `Dear Professor Lin,

Thanks for the invite to next Friday's seminar and the comments about our work.

We won't be presenting next Friday. We haven't turned our findings into presentation materials, and Mina, who ran most of the statistical analysis, is at a conference that week. Without her we could describe what we found but not how we tested it, and your students would obviously ask.

Put us down for the seminar on the 24th instead. That gives us time to prepare proper slides with Mina involved. If that date is taken, just give us whatever later slot is left this term.

Thanks,
Daniel`,
      },
      {
        id: 'email-lin-E', parent: 'email-lin-A', changed: 'task_completion', intendedBand: 3,
        descriptor: 'partially successful response (one required point not addressed)',
        note: 'A with the third paragraph (alternative / guidance — bullet 3) replaced by a one-line thanks. Rest verbatim.',
        response: `Dear Professor Lin,

Thank you for the invitation to present at next Friday's seminar, and for describing our work so generously. The whole group was delighted to hear it.

I am afraid we will not be able to present next Friday. We have not yet turned our findings into presentation materials, and Mina, who ran most of the statistical analysis, is at a conference that week. Without her, we could describe what we found but not explain how we tested it, and your students would rightly ask.

Thank you again for thinking of us.

Kind regards,
Daniel`,
      },
      {
        id: 'email-lin-F', parent: 'email-lin-C', changed: 'errors', intendedBand: 2,
        descriptor: 'frequent errors that obscure meaning (Email band 2, ONE OR MORE)',
        note: 'C with errors in every sentence; "present seminar on 24th instead of?" and "any late date" blur the request. Same content and politeness as C.',
        response: `Dear Professor Lin,

Thank you for invite us to present in seminar next Friday, and thank for your kind word about our work. Everyone in group was very happy for hear it.

I am sorry, but we cannot presenting next Friday. We have not make presentation material yet, and Mina, who did most of statistic, will in conference that week. Without her, we can say what we find but not how we test, and student probably ask about it.

Can we present seminar on 24th instead of? Then we will have time for make good slide with Mina. If that date not free, any late date this term is fine for us.

Kind regards,
Daniel`,
      },
      {
        id: 'email-lin-G', parent: 'email-lin-A', changed: 'relevance', intendedBand: 2,
        descriptor: 'addresses the task only minimally; LIMITED OR IRRELEVANT ELABORATION (Email band 2, ONE OR MORE)',
        note: 'A\'s body replaced by fluent, polite, same-register description of how the group works together; the answer is a vague "might be difficult", no difficulty explained, no alternative.',
        response: `Dear Professor Lin,

Thank you for your email about the seminar.

Our group has really enjoyed working together this semester. We meet every Tuesday in the library, and we have become good friends as well as colleagues. Last week we even celebrated Mina's birthday with a small dinner after our meeting. I think group projects are one of the best parts of studying at this university, because they teach us to cooperate and share ideas.

Next Friday might be difficult.

Kind regards,
Daniel`,
      },
      {
        id: 'email-lin-H', parent: 'email-lin-F', changed: 'originality', intendedBand: 1,
        descriptor: 'minimal original language, any coherent language mostly borrowed from the prompt',
        note: 'F replaced by prompt phrases plus "maybe other day. thanks". Not entirely copied.',
        response: `Professor Lin. present your group's research findings at next Friday's departmental seminar. particularly impressive. short notice. not prepared presentation materials, one member is unavailable. maybe other day. thanks`,
      },
    ],
  },
  {
    id: 'int-occasion',
    taskType: 'take_interview',
    bankItemId: 'd1424a53-98ee-4db2-bc09-58b5d9dc5f6b',
    bankCohort: null,
    passage: ARTS_PASSAGE,
    prompt: '[Interview] Have you been to a concert, play or exhibition, on campus or elsewhere? Describe the occasion.',
    steps: [
      {
        id: 'int-occasion-A', parent: null, changed: null, intendedBand: 5,
        descriptor: 'fully addresses the question; on topic and WELL ELABORATED; accurate range of grammar and vocabulary',
        note: 'Anchor transcript. A specific occasion, why, what stood out with a reason, a moment, the aftermath. ~115 words (~45 s).',
        response: INT_OCCASION_A,
      },
      {
        id: 'int-occasion-B', parent: 'int-occasion-A', changed: 'language_use', intendedBand: 4.5,
        descriptor: 'adequate grammar and vocabulary (vs accurate range) — one weaker feature; 4 or 5 defensible under "exhibits the following"',
        note: 'Sentence-for-sentence plain paraphrase of A with one error ("so it feel like"). Every detail and connector kept.',
        response: INT_OCCASION_B,
      },
      {
        id: 'int-occasion-C', parent: 'int-occasion-B', changed: 'topic_development', intendedBand: 4,
        descriptor: 'on topic and elaborated, though it may lack sentence-level connectors',
        note: 'B with the connections cut: same events and details, but the causal links ("so you looked at the faces", "how they practiced the accusations so it...") reduced to a list. Same plain register as B.',
        response: INT_OCCASION_C,
      },
      {
        id: 'int-occasion-D', parent: 'int-occasion-C', changed: 'language_use', intendedBand: 3.5,
        descriptor: 'limited range noticeably restricts precision (tense, articles, agreement)',
        note: 'C sentence-for-sentence with present tense for past events, dropped articles and agreement errors. Same details, same order.',
        response: INT_OCCASION_D,
      },
      {
        id: 'int-occasion-E', parent: 'int-occasion-D', changed: 'topic_development', intendedBand: 3,
        descriptor: 'generally on topic but elaboration relatively limited',
        note: 'D with the details removed (the play\'s name, the chairs, the light, the court scene, the talk afterwards); bare assertions remain. Same error pattern as D.',
        response: INT_OCCASION_E,
      },
      {
        id: 'int-occasion-F', parent: 'int-occasion-E', changed: 'relevance', intendedBand: 2.5,
        descriptor: 'minimally connected to the question, or consisting mainly of language from the question (relevance now at band 2, language still at 3 — 2 or 3 defensible under "exhibits the following")',
        note: 'E\'s occasion replaced by the question\'s own words ("concert, play or exhibition", "on campus or elsewhere") and the passage\'s ("arts programme") plus generic liking of music. No occasion is described. Same error level as E.',
        response: INT_OCCASION_F,
      },
      {
        id: 'int-occasion-G', parent: 'int-occasion-F', changed: 'language_use', intendedBand: 2,
        descriptor: 'a very limited range of grammar and vocabulary (all three band-2 features now present)',
        note: 'F\'s content re-said in shorter, simpler fragments. Nothing added, no fillers (delivery is out of scope).',
        response: `Yes, I go concert one time, on campus. It is good. Music and theatre good for student. I like music, every day listen.`,
      },
    ],
  },
  {
    id: 'int-luxury',
    taskType: 'take_interview',
    bankItemId: '06ca76e6-a165-4edb-88af-c428bee86344',
    bankCohort: null,
    passage: ARTS_PASSAGE,
    prompt: '[Interview] Arts programmes are sometimes criticised as a luxury when budgets are tight. Is that criticism fair?',
    steps: [
      {
        id: 'int-luxury-A', parent: null, changed: null, intendedBand: 5,
        descriptor: 'fully addresses the question; on topic and WELL ELABORATED; accurate range of grammar and vocabulary',
        note: 'Anchor transcript. Position, concession, the assumption challenged, a concrete campus example, consequence, qualified close. ~115 words.',
        response: INT_LUXURY_A,
      },
      {
        id: 'int-luxury-B', parent: 'int-luxury-A', changed: 'language_use', intendedBand: 4.5,
        descriptor: 'adequate grammar and vocabulary (vs accurate range) — one weaker feature',
        note: 'Sentence-for-sentence plain paraphrase of A with one error ("what make the campus"). All ideas and connectors kept.',
        response: INT_LUXURY_B,
      },
      {
        id: 'int-luxury-C', parent: 'int-luxury-B', changed: 'topic_development', intendedBand: 4,
        descriptor: 'on topic and elaborated, though it may lack sentence-level connectors',
        note: 'B\'s points kept but disconnected: the "you assume only performers benefit" reasoning and the "so cutting it loses community" link become stand-alone statements. Same register.',
        response: INT_LUXURY_C,
      },
      {
        id: 'int-luxury-D', parent: 'int-luxury-C', changed: 'language_use', intendedBand: 3.5,
        descriptor: 'limited range noticeably restricts precision',
        note: 'C sentence-for-sentence with dropped subjects, articles and plural/agreement errors. Same points, same order.',
        response: INT_LUXURY_D,
      },
      {
        id: 'int-luxury-E', parent: 'int-luxury-D', changed: 'topic_development', intendedBand: 3,
        descriptor: 'generally on topic but elaboration relatively limited',
        note: 'D with the support removed (lab equipment, departments meeting, international students); assertions remain. Same error pattern.',
        response: INT_LUXURY_E,
      },
      {
        id: 'int-luxury-F', parent: 'int-luxury-E', changed: 'relevance', intendedBand: 2.5,
        descriptor: 'consisting MAINLY OF LANGUAGE FROM THE QUESTION, with little or no relevant elaboration (language still at 3 — 2 or 3 defensible)',
        note: 'E\'s own points replaced by the question\'s words recycled ("criticised as a luxury when budgets are tight", "is that criticism fair"); no position is argued. Same error level.',
        response: INT_LUXURY_F,
      },
      {
        id: 'int-luxury-G', parent: 'int-luxury-F', changed: 'language_use', intendedBand: 2,
        descriptor: 'a very limited range of grammar and vocabulary (all three band-2 features now present)',
        note: 'F re-said in shorter, simpler fragments. Nothing added, no fillers.',
        response: `Art programme is luxury when budget tight. Criticism is fair, maybe. Budget is tight. Art is good but budget.`,
      },
    ],
  },
]
