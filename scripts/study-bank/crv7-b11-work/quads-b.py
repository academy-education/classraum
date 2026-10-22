import json
def W(kind,act,line,reply,expl,kills): return {"kind":kind,"keyAct":act,"line":line,"reply":reply,"explanationIfSpoken":expl,"kills":{str(k):v for k,v in kills.items()}}
Q=[]
def item(lid,setting,ws): Q.append({"localId":lid,"setting":setting,"worlds":ws})
# b11 strict rule: every line must make each other reply CONTRADICTED or nonsensical, not merely unmentioned.
# Each reply commits to the situation its own line creates (relief, refusal, a pick, a compliance step, an acceptance).

item("cr15-b01","TA review session before a midterm, TA to student",[
 W("good news","welcoming a reduced syllabus","Good news, the midterm won't cover chapter nine after all.","Phew, that's the part I understood least.","A chapter has been dropped from the exam, so expressing relief about it is the natural reply.",
   {1:"\"won't cover chapter nine\" - nothing was refused, so there is no help to do without.",2:"\"Good news, the midterm\" - a statement; no either/or choice is asked, so naming one answers nothing.",3:"\"won't cover chapter nine\" - nothing is requested, so there is no reason to fetch a marker."}),
 W("bad news","accepting a refusal of help","Sorry, I can't answer questions about the take-home part.","Fair enough, I'll work it out alone then.","The TA refuses to help with the take-home part, so accepting that and working alone is the natural reply.",
   {0:"\"I can't answer\" - a refusal; nothing was removed from the exam, so there is no relief.",2:"\"I can't answer questions\" - a refusal, not a choice between problems.",3:"\"I can't answer\" - nothing is asked of the student, so fetching a marker makes no sense."}),
 W("question","picking a problem to review","Should we go over problem four or problem six first?","The later one, that's where I got stuck.","The TA asks which problem to review, so picking one is the natural reply.",
   {0:"\"Should we go over\" - nothing has been dropped from the exam, so relief has no cause.",1:"\"Should we go over\" - the TA is offering help, so nothing was refused.",3:"\"problem four or problem six\" - an either/or question; \"Sure\" picks neither."}),
 W("request","complying with a request","Could you write your answer to this one on the board?","Sure, let me grab a marker first.","The TA asks the student to write on the board, so agreeing and getting a marker is the natural reply.",
   {0:"\"Could you write\" - a request; nothing was removed from the exam.",1:"\"write your answer\" - the TA wants the answer shared, so working it out alone contradicts the request.",2:"\"Could you write\" - a yes/no request; no choice between problems is offered."})])

item("cr15-b02","biology lab partner at the bench, one student to another",[
 W("offer","accepting a division of labour","I can do the dissections if you'd rather keep the notes.","Deal, my handwriting's neater anyway.","The partner offers to split the work, so agreeing to take the writing role is the natural reply.",
   {1:"\"I can do\" - an offer; no mistake was pointed out, so nothing was caught.",2:"\"I can do the dissections\" - the dissecting is still ahead, so the work is not nearly done.",3:"\"I can do the dissections\" - the experiment is going ahead, so nothing has to restart."}),
 W("correction","thanking for a correction","Wait, the sample goes in at thirty-seven degrees, not forty.","Oops, good thing you caught that in time.","The partner corrects a mistake before it happens, so being glad it was caught is the natural reply.",
   {0:"\"the sample goes in\" - a correction, not an offer, so \"Deal\" accepts nothing.",2:"\"the sample goes in\" - a step is still to come, so they are not nearly done.",3:"\"Wait, the sample goes in\" - the sample is fine and unstarted, so nothing has failed."}),
 W("neutral info","reacting to a finishing condition","The professor said we can leave once our slides are labeled.","Nice, so we're nearly done for today.","Labeling slides is the last step, so noting that they are almost finished is the natural reply.",
   {0:"\"The professor said\" - a rule is passed on; no offer is made to accept.",1:"\"we can leave once\" - no mistake is mentioned, so nothing was caught.",3:"\"we can leave once\" - the work is nearly finished, so nothing has to start over."}),
 W("bad news","reacting to a failed experiment","Our seedlings all died over the weekend, every single tray.","Seriously? Then we're back to square one.","All the plants died, so realising they must restart is the natural reply.",
   {0:"\"seedlings all died\" - nothing is offered, so \"Deal\" accepts nothing.",1:"\"all died over the weekend\" - the damage is done, so nothing was caught in time.",2:"\"every single tray\" - everything was lost, so they cannot be nearly done."})])

item("cr15-b03","graduate thesis formatting office, reviewer to student",[
 W("good news","welcoming a pass","Your margins and citations all passed the format review.","Wonderful, so no more revisions needed.","The thesis passed review, so treating it as finished is the natural reply.",
   {1:"\"all passed\" - nothing failed, so there is nothing to sort out tonight.",2:"\"all passed the format review\" - a result, not an offer, so \"Please\" accepts nothing.",3:"\"all passed\" - no question about a signature was asked, so \"No\" answers nothing."}),
 W("request","agreeing to fix an error","Please fix the page numbers in chapter three before resubmitting.","Sure, I'll sort those out tonight.","The reviewer asks for a fix, so agreeing to do it is the natural reply.",
   {0:"\"Please fix\" - a correction is required, so revisions are not over.",2:"\"Please fix the page\" - an instruction, not an offer of help.",3:"\"Please fix the page\" - no question about a signature, so \"No, she's away\" answers nothing."}),
 W("offer","accepting help","I could walk you through the embargo form now, if you like.","Please, the legal part lost me.","The reviewer offers help with a form, so accepting is the natural reply.",
   {0:"\"walk you through\" - nothing was reviewed or passed, so no verdict is being welcomed.",1:"\"walk you through the embargo form\" - nothing is wrong, so there is nothing to sort out.",3:"\"I could walk you\" - an offer; \"No, she's away\" refers to no person and answers no question."}),
 W("question","answering a yes/no question","Did your committee chair sign the approval page yet?","No, she's away until Monday, sadly.","The reviewer asks about the chair's signature, so answering it is the natural reply.",
   {0:"\"Did your committee chair\" - a question, not a review result.",1:"\"Did your committee chair sign\" - asks about a signature; nothing needs fixing.",2:"\"Did your committee chair\" - a question, not an offer, so \"Please\" answers nothing."})])

item("cr15-b04","art studio equipment checkout, student monitor to student",[
 W("bad news","adapting to unavailability","Sorry, every easel's already been signed out today.","Ugh, then I'll paint flat on a table.","No easel is available, so planning to paint without one is the natural reply.",
   {1:"\"already been signed out\" - nothing is offered, so \"Yes, please\" accepts nothing.",2:"\"every easel's already been\" - no deadline is given, so nothing would have been late.",3:"\"signed out today\" - no cleaning rule is given, so \"Even if\" has nothing to qualify."}),
 W("offer","accepting a hold","Want me to hold the last drafting lamp for you?","Yes, please, I'll be back in ten.","The monitor offers to save a lamp, so accepting is the natural reply.",
   {0:"\"hold the last drafting\" - equipment is being kept for the student, so nothing forces painting on a table.",2:"\"Want me to hold\" - an offer; no due date was corrected.",3:"\"Want me to hold\" - a yes/no offer, not a cleaning rule."}),
 W("correction","noting a corrected due date","That brush set's due tomorrow, not next Monday like I said.","Good to know, I'd have been late with it.","The due date is earlier than stated, so noting the near miss is the natural reply.",
   {0:"\"due tomorrow, not\" - the student already has equipment; nothing is unavailable.",1:"\"That brush set's due\" - a correction, not an offer.",3:"\"due tomorrow, not next\" - a date, not a cleaning rule."}),
 W("neutral info","questioning a rule's scope","Palettes have to be rinsed before you bring them back.","Even if the paint's dried on solid?","A cleaning rule is given, so asking whether it covers dried paint is the natural reply.",
   {0:"\"Palettes have to be\" - a return rule; nothing is unavailable.",1:"\"have to be rinsed\" - a rule, not an offer.",2:"\"have to be rinsed\" - no due date is mentioned, let alone corrected."})])

item("cr15-b05","career fair employer booth, recruiter to student",[
 W("question","picking a job type","Are you looking for a summer internship or a full-time role?","The temporary kind, I've got a year left.","The recruiter asks which type of job, so picking one is the natural reply.",
   {1:"\"Are you looking\" - a question; nothing is asked to be scanned.",2:"\"Are you looking for\" - no one is named, so \"she\" refers to nobody.",3:"\"Are you looking for\" - a neutral question; nothing bad happened to regret."}),
 W("request","complying with an instruction","Scan this code to drop your résumé into our system.","Sure, give me a sec to find my camera.","The recruiter asks the student to scan a code, so preparing to do it is the natural reply.",
   {0:"\"Scan this code\" - an instruction, not an either/or question.",2:"\"Scan this code\" - no person is mentioned, so \"she\" refers to nobody.",3:"\"Scan this code to drop\" - an invitation to apply, so nothing has gone wrong."}),
 W("good news","following up on interest","Our hiring manager liked your profile and wants to meet you.","Wow, when would she have time to talk?","A manager wants an interview, so asking when is the natural reply.",
   {0:"\"wants to meet you\" - news, not a choice between job types.",1:"\"wants to meet you\" - nothing is to be scanned, so a camera is irrelevant.",3:"\"liked your profile\" - good news, so regret makes no sense."}),
 W("correction","reacting to a mismatch","Sorry, we're actually only hiring engineers this year, not designers.","Shame, my whole portfolio is visual work.","The company does not hire the student's field, so expressing disappointment is the natural reply.",
   {0:"\"only hiring engineers\" - no choice is offered; one type of role is ruled out.",1:"\"only hiring engineers\" - nothing is requested of the student.",2:"\"only hiring engineers\" - no one wants to meet, so \"she\" refers to nobody."})])

item("cr15-b06","campus radio DJ booth, station manager to volunteer DJ",[
 W("bad news","protesting a cancellation","Your Thursday night show got cut from the new schedule.","No way, I had a whole season planned.","The show was cancelled, so protesting is the natural reply.",
   {1:"\"show got cut\" - no equipment is mentioned, so \"the right one\" refers to nothing.",2:"\"got cut from\" - nothing is to be read on air, so no script is needed.",3:"\"got cut from the new\" - no offer is made, so there is nothing to thank for."}),
 W("neutral info","adjusting to equipment information","The microphone on the left picks up more background noise.","Noted, I'll use the right one, then.","One microphone is noisier, so choosing the other is the natural reply.",
   {0:"\"The microphone on the\" - equipment advice; nothing was cancelled.",2:"\"picks up more background\" - nothing is to be read, so no script is needed.",3:"\"The microphone on the left\" - information, not an offer of help."}),
 W("request","asking for materials","Please read the weather update right after this song ends.","Sure, where's the script for it?","The DJ is asked to read something on air, so asking for the text is the natural reply.",
   {0:"\"Please read the weather\" - the DJ is on air now; nothing was cut.",1:"\"Please read the weather\" - an instruction about reading, not about microphones.",3:"\"Please read the weather\" - a request, not an offer of cover."}),
 W("offer","accepting cover","I can cover your shift this Saturday if you're traveling.","What a lifesaver, my flight's at noon.","The manager offers to take the shift, so accepting gratefully is the natural reply.",
   {0:"\"I can cover your shift\" - help is offered; nothing was cancelled.",1:"\"cover your shift\" - an offer, not microphone advice.",2:"\"I can cover your shift\" - the DJ will not be on air, so no script is needed."})])

item("cr15-b07","orientation leader with a new student",[
 W("question","answering a yes/no question","Have you picked up your student ID card yet?","No, I'm headed there after lunch.","The leader asks whether the card was collected, so answering is the natural reply.",
   {1:"\"Have you picked up\" - a question; no location was corrected.",2:"\"your student ID card\" - nothing about rooms, so being a light sleeper is beside the question.",3:"\"Have you picked up\" - a yes/no question, not a request, so \"Sure\" answers nothing."}),
 W("correction","thanking for a correction","Oh, the welcome dinner's in the gym, not the main hall.","Glad you said, I'd have gone wrong.","A location is corrected, so being thankful is the natural reply.",
   {0:"\"the welcome dinner's in\" - no question was asked, so \"No\" answers nothing.",2:"\"dinner's in the gym\" - a venue, not housing news.",3:"\"in the gym, not\" - nothing is requested, so no pen is needed."}),
 W("good news","welcoming a room assignment","You got a single room, so no roommate this year.","Perfect, I'm a really light sleeper.","The student will live alone, so welcoming that is the natural reply.",
   {0:"\"You got a single\" - news, not a question, so \"No\" answers nothing.",1:"\"You got a single room\" - nothing was corrected.",3:"\"You got a single\" - nothing is requested, so no pen is needed."}),
 W("request","complying with a request","Could you write your phone number on this sign-in sheet?","Sure, mind if I borrow your pen quickly?","The leader asks the student to write something, so asking for a pen is the natural reply.",
   {0:"\"Could you write\" - a request to do something now; \"No, I'm headed there\" refuses nothing sensible.",1:"\"Could you write your\" - nothing was corrected.",2:"\"Could you write your\" - a request, not housing news."})])

item("cr15-b08","language exchange table, partner to partner",[
 W("offer","accepting a swap","I can correct your Korean essay if you check my English one.","Deal, I'll email mine over tonight.","The partner offers a trade, so accepting it is the natural reply.",
   {1:"\"I can correct\" - an offer; no new place is mentioned, so \"that's closer\" refers to nothing.",2:"\"I can correct your\" - the partner is staying, so there is no need to keep in touch remotely.",3:"\"I can correct your Korean\" - an offer, not a choice between activities."}),
 W("neutral info","reacting to a venue change","Our meetups are moving to the student union starting next month.","Okay, that's closer to my dorm anyway.","The venue is changing, so commenting on its location is the natural reply.",
   {0:"\"Our meetups are moving\" - information, not an offer, so \"Deal\" accepts nothing.",2:"\"Our meetups are moving\" - meetings continue in person, so nobody needs to go online.",3:"\"meetups are moving\" - no choice between activities is offered."}),
 W("bad news","reacting to a departure","My visa ran out, so this is my last session.","Oh no, we'll have to keep in touch online.","The partner is leaving, so suggesting staying in contact is the natural reply.",
   {0:"\"this is my last session\" - no offer is made, so \"Deal\" accepts nothing.",1:"\"my last session\" - no new venue is named, so \"that's closer\" refers to nothing.",3:"\"My visa ran out\" - news, not a choice between activities."}),
 W("question","picking an activity","Do you prefer speaking practice or grammar drills today?","Conversation, I'm hopeless at listening.","The partner asks which activity, so picking one is the natural reply.",
   {0:"\"Do you prefer\" - an either/or question, not an offer, so \"Deal\" picks nothing.",1:"\"Do you prefer speaking\" - no venue is mentioned, so \"that's closer\" refers to nothing.",2:"\"practice or grammar drills today\" - the session is happening, so nobody is leaving."})])

item("cr15-b09","anatomy lab open hours, demonstrator to student",[
 W("request","asking how to comply","Please put your gloves on before you touch the specimens.","Oops, sorry, which size should I grab?","The demonstrator tells the student to wear gloves, so asking which size is the natural reply.",
   {1:"\"Please put your gloves\" - nothing is being made available, so there is nothing to carry.",2:"\"Please put your gloves\" - no date is changed, so no days are gained.",3:"\"Please put your gloves\" - no closing time is given, so there is no hour to count."}),
 W("good news","collecting an available item","The skeleton model you asked for is free now.","Great, I'll carry it to my table.","The requested model is available, so taking it is the natural reply.",
   {0:"\"The skeleton model\" - no gloves are mentioned, so a size question makes no sense.",2:"\"is free now\" - nothing about an exam date, so no days are gained.",3:"\"is free now\" - no closing time, so there is no hour left to count."}),
 W("correction","welcoming a later date","Actually, the practical exam is Friday, not Wednesday.","Oh good, two extra days to review.","The exam is later than thought, so welcoming the extra time is the natural reply.",
   {0:"\"the practical exam is\" - no gloves are mentioned.",1:"\"the practical exam is Friday\" - a date, not an available model, so there is nothing to carry.",3:"\"Friday, not Wednesday\" - days are gained, so the student is not down to one hour."}),
 W("neutral info","calculating remaining time","The lab shuts at five tonight for a staff meeting.","Okay, that leaves me about an hour.","The lab closes soon, so working out the time left is the natural reply.",
   {0:"\"The lab shuts at\" - a closing time, not a glove rule.",1:"\"The lab shuts at five\" - nothing has become available to carry.",2:"\"shuts at five tonight\" - time is being cut, not extended by days."})])

item("cr15-b10","geology field-camp equipment tent, coordinator to student",[
 W("offer","accepting a loan","I could lend you a rock hammer, since yours snapped.","Please, I'll give it back at dinner.","The coordinator offers a tool, so accepting and promising to return it is the natural reply.",
   {1:"\"I could lend you\" - an offer; no either/or question about footwear is asked.",2:"\"I could lend you\" - help is offered, so nothing was lost to be sad about.",3:"\"lend you a rock hammer\" - no water information, so the bottle reasoning has no basis."}),
 W("question","picking footwear","Did you bring boots with ankle support, or just sneakers?","The sturdy pair, they're in my pack.","The coordinator asks which footwear, so naming one is the natural reply.",
   {0:"\"Did you bring boots\" - a question, not an offer, so \"Please\" accepts nothing.",2:"\"Did you bring boots\" - the student is going, so missing the site is contradicted.",3:"\"boots with ankle support\" - footwear, not water, so the bottle reasoning has no basis."}),
 W("bad news","reacting to exclusion","The van to the quarry is full, so you can't come.","Shame, I really wanted to see that site.","The student cannot go, so expressing disappointment is the natural reply.",
   {0:"\"the quarry is full\" - nothing is offered to accept.",1:"\"so you can't come\" - no footwear question is asked.",3:"\"you can't come\" - the student is not going, so planning water for the hike is contradicted."}),
 W("neutral info","planning from information","Water stations are at the trailhead and the summit.","So I can get by with one bottle.","Refills are available along the route, so concluding one bottle is enough is the natural reply.",
   {0:"\"Water stations are\" - information, not an offer, so \"Please\" accepts nothing.",1:"\"Water stations are at\" - no question about footwear.",2:"\"at the trailhead and\" - the student is going, so there is nothing to miss."})])

item("cr15-b11","moot court practice room, coach to law student",[
 W("correction","adjusting to a shorter limit","You've got fifteen minutes for your argument, not twenty.","Then I'll cut my second point short.","The time limit is shorter than expected, so trimming material is the natural reply.",
   {1:"\"fifteen minutes for\" - nothing about posture was asked, so there is no habit to apologize for.",2:"\"You've got fifteen minutes\" - a limit, not a selection to celebrate.",3:"\"not twenty\" - no choice is offered, so \"You, please\" picks nothing."}),
 W("request","apologizing for a habit","Could you stand up when you address the bench?","Sorry, habit from my debate days.","The coach corrects the student's posture, so apologizing is the natural reply.",
   {0:"\"Could you stand up\" - no time limit is given, so there is nothing to cut.",2:"\"Could you stand up\" - a correction, not news of selection.",3:"\"Could you stand up\" - a yes/no request; \"You, please\" chooses nothing."}),
 W("good news","reacting to a selection","The judges picked your team for the final round.","Wow, we didn't expect to get that far.","The team advanced, so expressing surprise is the natural reply.",
   {0:"\"picked your team\" - news, not a time limit.",1:"\"The judges picked\" - nothing was requested, so there is nothing to apologize for.",3:"\"The judges picked\" - news, not a choice, so \"You, please\" answers nothing."}),
 W("question","picking a practice partner","Do you want to practise with me or with the timer alone?","You, please, I need someone pushing back.","The coach offers two ways to practise, so picking one is the natural reply.",
   {0:"\"Do you want to\" - no time limit is set, so nothing needs cutting.",1:"\"Do you want to\" - a choice, not a correction, so no apology is due.",2:"\"Do you want to practise\" - a question, not news of a win."})])

item("cr15-b12","campus herbarium specimen desk, curator to student",[
 W("neutral info","inferring an arrangement","The fern collection is organized by the region it came from.","Then the Chilean ones sit side by side.","Specimens are grouped by origin, so inferring where some will be is the natural reply.",
   {1:"\"The fern collection is\" - information, not an offer, so there is no trip to save.",2:"\"is organized by\" - the collection is in order, so nothing was lost.",3:"\"organized by the region\" - no log is mentioned, so asking how to sign makes no sense."}),
 W("offer","accepting help","I could scan the moss sheets and email them tonight.","That would save me another trip.","The curator offers digital copies, so accepting is the natural reply.",
   {0:"\"scan the moss sheets\" - nothing is said about arrangement, so \"Then\" draws on nothing.",2:"\"I could scan\" - the sheets exist and are available, so nothing was destroyed.",3:"\"I could scan\" - an offer, not an instruction to sign."}),
 W("bad news","reacting to a loss","The orchid collection got water damage and is closed indefinitely.","That's awful, those were irreplaceable.","Specimens were damaged, so expressing dismay is the natural reply.",
   {0:"\"closed indefinitely\" - the collection cannot be browsed, so locating items is pointless.",1:"\"got water damage\" - no offer is made, so no trip is saved.",3:"\"closed indefinitely\" - nothing can be opened, so no log needs signing."}),
 W("request","asking how to comply","Please sign the handling log before opening any folders.","Sure, do I print or just initial?","The curator asks for a signature, so asking how to sign is the natural reply.",
   {0:"\"Please sign the\" - an instruction, not information about arrangement.",1:"\"Please sign the handling\" - a request, not an offer, so nothing saves a trip.",2:"\"before opening any folders\" - the folders can be opened, so nothing was lost."})])

item("cr15-b13","phonetics lab recording booth, lab manager to student",[
 W("question","answering a yes/no question","Have you used this kind of condenser mic before?","Never, so a quick demo would help.","The manager asks about experience, so answering and asking for a demonstration is the natural reply.",
   {1:"\"Have you used\" - a question; no booth change, so there is nothing to move.",2:"\"Have you used this\" - recording has not happened yet, so the student is not finished.",3:"\"Have you used\" - a yes/no question, not an offer, so \"Yes, please\" fits nothing."}),
 W("correction","adjusting to a room change","Sorry, your session's in booth B, not booth A.","No problem, I'll move my stuff over.","The booth was wrong, so agreeing to relocate is the natural reply.",
   {0:"\"your session's in booth\" - no question was asked, so \"Never\" answers nothing.",2:"\"your session's in booth\" - the session is still ahead, so nothing is finished.",3:"\"in booth B\" - a correction, not an offer, so \"Yes, please\" accepts nothing."}),
 W("good news","welcoming completion","Your recordings came out clean, no need to redo any.","Phew, so I'm finished in here for good.","No re-recording is needed, so welcoming being done is the natural reply.",
   {0:"\"came out clean\" - the student has already recorded, so asking for a demo makes no sense.",1:"\"no need to redo\" - nothing is relocated.",3:"\"came out clean\" - news, not an offer."}),
 W("offer","accepting a booking","I can book you the booth again next Tuesday.","Yes, please, same time if possible.","The manager offers another session, so accepting is the natural reply.",
   {0:"\"I can book you\" - an offer, not a question about experience.",1:"\"book you the booth again\" - nothing was corrected, so there is nothing to move.",2:"\"the booth again next\" - more sessions are coming, so the student is not done for good."})])

item("cr15-b14","student orchestra instrument loan closet, librarian to student",[
 W("request","apologizing for a lapse","Please bring the cello back with its case latched properly.","Will do, sorry it was left open.","The librarian asks for the case to be closed properly, so apologizing is the natural reply.",
   {1:"\"bring the cello back\" - no strings are mentioned, so \"mine snapped\" refers to nothing.",2:"\"bring the cello back\" - the student has an instrument, so they are not left without one.",3:"\"Please bring the cello\" - an instruction, not a choice between bows."}),
 W("neutral info","noting where a part is","Strings for loaner violins are kept in the top drawer.","Handy, mine snapped in rehearsal.","Spare strings are available, so mentioning a broken one is the natural reply.",
   {0:"\"Strings for loaner violins\" - information, not a request, so there is nothing to apologize for.",2:"\"are kept in the\" - supplies are available, so nothing is missing.",3:"\"kept in the top drawer\" - no choice between bows is offered."}),
 W("bad news","protesting a loss","The viola you reserved was sent off for repairs.","So what am I supposed to play tonight?","The reserved instrument is unavailable, so protesting is the natural reply.",
   {0:"\"The viola you reserved\" - the student never got it, so there is nothing to have left open.",1:"\"sent off for repairs\" - bad news, so \"Handy\" makes no sense.",3:"\"was sent off\" - nothing is offered to choose from."}),
 W("question","picking a bow size","Would you like the full-size bow or the shorter one?","The longer, I've got big hands.","The librarian asks which bow, so picking one is the natural reply.",
   {0:"\"Would you like\" - a question, not a request, so no apology is due.",1:"\"the full-size bow\" - bows, not strings, so \"mine snapped\" refers to nothing.",2:"\"Would you like\" - something is on offer, so nothing is missing."})])

item("cr15-b15","dissertation defense room setup, department coordinator to candidate",[
 W("good news","welcoming confirmation","All three outside examiners confirmed they can attend.","Fantastic, so the committee's complete.","Every examiner can attend, so concluding the panel is set is the natural reply.",
   {1:"\"confirmed they can attend\" - news, not an offer, so \"Yes, please\" accepts nothing.",2:"\"examiners confirmed\" - no file is requested, so asking about format makes no sense.",3:"\"confirmed they can attend\" - no time was changed, so no hour is lost."}),
 W("offer","accepting catering","I can order coffee and pastries for the audience.","Yes, please, just bill my department.","The coordinator offers refreshments, so accepting is the natural reply.",
   {0:"\"I can order\" - an offer; nothing is said about examiners.",2:"\"I can order coffee\" - nothing is requested, so no file format matters.",3:"\"I can order\" - no time was changed."}),
 W("request","asking about format","Please send me your slides by noon tomorrow.","Sure, would a PDF format be all right?","The coordinator asks for the slides, so asking about the file type is the natural reply.",
   {0:"\"Please send me\" - a request; nothing is said about examiners.",1:"\"Please send me\" - a request, not an offer.",3:"\"by noon tomorrow\" - a deadline for slides; the start time is not changed."}),
 W("correction","reacting to an earlier start","Your defense starts at two, not three as the email said.","Oh, so I've got an hour less to prepare.","The start is earlier than expected, so noting less time is the natural reply.",
   {0:"\"starts at two, not\" - a time change; nothing about examiners.",1:"\"Your defense starts\" - a correction, not an offer.",2:"\"Your defense starts\" - no file was requested."})])

item("cr15-b16","planetarium show entrance, usher to student",[
 W("bad news","accepting a sell-out","Tonight's show is sold out, I'm afraid.","Oh well, maybe I'll try next week.","No seats are left, so planning another visit is the natural reply.",
   {1:"\"is sold out\" - no question about a ticket is asked.",2:"\"is sold out\" - no device rule is given.",3:"\"sold out, I'm afraid\" - no seat is offered, so there is nothing to thank for."}),
 W("question","picking a purchase channel","Did you buy your ticket online or at the window?","The website, it's in my inbox somewhere.","The usher asks how the ticket was bought, so naming one is the natural reply.",
   {0:"\"Did you buy your\" - the student has a ticket, so there is no reason to come back later.",2:"\"Did you buy\" - no device rule is given.",3:"\"Did you buy your\" - a question, not a seat offer."}),
 W("neutral info","confirming compliance","The dome goes fully dark, so phones must stay off.","No problem, I left mine in the car.","A rule about phones is given, so confirming compliance is the natural reply.",
   {0:"\"phones must stay off\" - the show is going ahead for this student, so there is no need to wait a week.",1:"\"The dome goes\" - no question about buying is asked.",3:"\"The dome goes fully\" - a rule, not a seat offer."}),
 W("offer","accepting a seat","I can seat you by the aisle, since you've got crutches.","Thanks, that'll make getting out easier.","The usher offers a convenient seat, so accepting is the natural reply.",
   {0:"\"I can seat you\" - a seat exists, so there is no need to try next week.",1:"\"I can seat you\" - an offer, not a question about buying.",2:"\"seat you by the aisle\" - a seat offer, not a device rule."})])

item("cr15-b17","group project meeting at a library table, teammate to teammate",[
 W("neutral info","noting new guidance","Professor Lin posted the rubric for our presentation this morning.","Good, now we know how points are split.","Grading criteria are out, so welcoming the clarity is the natural reply.",
   {1:"\"Professor Lin posted\" - news, not a request, so \"Sure\" agrees to nothing.",2:"\"posted the rubric\" - no date is changed, so no days are gained.",3:"\"Professor Lin posted\" - the professor is not on the team, so \"carrying this team\" is contradicted."}),
 W("request","accepting a task","Could you take charge of the survey slides?","Sure, I made most of the charts anyway.","The teammate asks for help with a section, so accepting is the natural reply.",
   {0:"\"Could you take charge\" - a request; nothing about grading criteria.",2:"\"Could you take charge\" - no date is changed.",3:"\"Could you take charge\" - work is being handed out, so no one has carried it."}),
 W("correction","welcoming a later date","Wait, we present on the fourteenth, not the twelfth.","Good, that buys us a couple more days.","The deadline is later than thought, so welcoming the extra time is the natural reply.",
   {0:"\"we present on the\" - a date, not grading criteria.",1:"\"Wait, we present\" - a correction, not a request.",3:"\"we present on the fourteenth\" - no person is mentioned, so \"she\" refers to nobody."}),
 W("good news","praising a teammate","Maya finished the whole literature review over the weekend.","Wow, she's carrying this entire team.","A teammate did a big task, so praising her is the natural reply.",
   {0:"\"Maya finished the\" - work news, not grading criteria.",1:"\"Maya finished the\" - news, not a request.",2:"\"Maya finished the whole\" - no date is changed, so no days are gained."})])

item("cr15-b18","model UN conference registration desk, staffer to delegate",[
 W("question","naming a committee","Which committee did you sign up for, security or trade?","The defense one, I'm representing Norway.","The staffer asks which committee, so naming one is the natural reply.",
   {1:"\"Which committee did you\" - a question; nothing was corrected.",2:"\"Which committee did you\" - a question, not directions to badges.",3:"\"did you sign up\" - the staffer assumes registration, so nothing strange is reported."}),
 W("correction","thanking for a correction","Opening session's in Hall C, not Hall B like the program says.","Glad you caught that, I'd have been lost.","A location is corrected, so thanking the staffer is the natural reply.",
   {0:"\"Opening session's in\" - a statement, not a choice between committees.",2:"\"in Hall C\" - about the session, not where badges are.",3:"\"Opening session's in Hall\" - nothing suggests a registration problem."}),
 W("neutral info","following directions","Placards and badges are handed out at the side table.","Great, I'll grab mine over there.","The staffer gives directions, so planning to go there is the natural reply.",
   {0:"\"Placards and badges are\" - directions, not a question.",1:"\"are handed out\" - nothing was corrected.",3:"\"badges are handed out\" - the delegate is expected, so no problem is reported."}),
 W("bad news","disputing a missing registration","Your name isn't on any of our delegate lists.","Strange, my advisor signed me up in May.","The delegate is not registered, so disputing it is the natural reply.",
   {0:"\"Your name isn't on\" - not registered, so there is no committee to name.",1:"\"Your name isn't\" - a problem, not a helpful correction.",2:"\"isn't on any of\" - the delegate is not registered, so there is no badge to grab."})])

item("cr15-b19","campus tour guide with a prospective student",[
 W("offer","accepting an offer","I can show you inside a dorm room if you'd like.","Please, I'm curious how big they are.","The guide offers a look inside, so accepting is the natural reply.",
   {1:"\"I can show you\" - no food is mentioned.",2:"\"I can show you inside\" - no road or traffic, so the cars refer to nothing.",3:"\"show you inside a\" - nothing about age, so \"held up\" refers to nothing."}),
 W("good news","welcoming a perk","The dining hall's giving free lunch to visitors today.","Nice, I skipped breakfast this morning.","Free food is offered, so welcoming it is the natural reply.",
   {0:"\"The dining hall's\" - news, not an offer to see rooms.",2:"\"The dining hall's giving\" - no road, so the cars refer to nothing.",3:"\"giving free lunch\" - nothing about a building's age."}),
 W("request","agreeing to a safety request","Please stay with the group as we cross the road.","Sure, those cars aren't slowing down.","The guide asks for caution at a road, so agreeing is the natural reply.",
   {0:"\"Please stay with\" - a request, not an offer.",1:"\"as we cross the\" - nothing about food.",3:"\"cross the road\" - nothing about a building's age."}),
 W("neutral info","commenting on age","This building is the oldest on campus, from 1890.","Wow, it's held up remarkably well.","The building is very old, so remarking on its condition is the natural reply.",
   {0:"\"This building is\" - information, not an offer.",1:"\"is the oldest\" - nothing about food.",2:"\"This building is the\" - no road, so the cars refer to nothing."})])

item("cr15-b20","architecture studio pin-up critique, instructor to student",[
 W("correction","reacting to an earlier deadline","Your model's due Thursday morning, not Thursday night.","Yikes, that's twelve hours less to work.","The deadline is earlier, so noting the lost time is the natural reply.",
   {1:"\"Your model's due\" - nothing was damaged, so nothing needs reprinting.",2:"\"Your model's due Thursday\" - a deadline, not a question about materials.",3:"\"due Thursday morning\" - no instruction about pinning, so \"Sure\" agrees to nothing."}),
 W("bad news","responding to damage","Your site plan got knocked off the wall and stepped on.","Ugh, I'll have to print another copy.","The drawing was ruined, so planning a reprint is the natural reply.",
   {0:"\"got knocked off\" - damage, not a time change, so no hours are lost.",2:"\"Your site plan\" - news, not a question about materials.",3:"\"knocked off the wall\" - no instruction, so \"Sure\" agrees to nothing."}),
 W("question","naming a material","Did you build this with foam board or basswood?","The timber one, it cuts more cleanly.","The instructor asks which material, so naming one is the natural reply.",
   {0:"\"Did you build this\" - a question; no deadline changed.",1:"\"Did you build this\" - the model is intact, so nothing needs reprinting.",3:"\"foam board or basswood\" - an either/or question; \"Sure\" picks neither."}),
 W("request","checking an instruction","Could you pin your sketches up in the order you drew them?","Sure, the earliest ones go on the left?","The instructor asks for a specific order, so checking the direction is the natural reply.",
   {0:"\"Could you pin your\" - a request; no deadline changed.",1:"\"Could you pin your sketches\" - nothing damaged, so no reprint needed.",2:"\"Could you pin\" - a request, not a question about materials."})])

json.dump({"cohort":"cr-v15","stage":"crv7-method batch 11b (seed offset 1100)","method":"four-world, seeded post-hoc selection (render-crv7.mjs)","items":Q},open('crv7-b11b-quads.json','w'),indent=1,ensure_ascii=False)
# pre-render self-checks across ALL worlds: echo, length ratio, line length, existing text, settings, kinds
import re
STOP=set('i im ill a an the to of and or is it its for you your me my we our be can could would will do does did that this then so on in at by up out now please okay yes no oh great thanks thank sure fine just there here what where when how any all have has get go'.split())
cw=lambda s:{w.rstrip('s') for w in re.findall(r"[a-z]+",s.lower().replace("'","")) if w not in STOP}
echo=[(it['localId'],i,sorted(cw(w['reply'])&cw(w['line']))) for it in Q for i,w in enumerate(it['worlds']) if cw(w['reply'])&cw(w['line'])]
ratio=[(it['localId'],round(max(len(w['reply']) for w in it['worlds'])/min(len(w['reply']) for w in it['worlds']),2)) for it in Q]
print(len(Q),'items; echo hits',len(echo)); [print('  echo',e) for e in echo]
print('ratio>1.3',[r for r in ratio if r[1]>1.3])
print('line len',[(it['localId'],i,len(w['line'].split())) for it in Q for i,w in enumerate(it['worlds']) if not 5<=len(w['line'].split())<=14])
norm=lambda s:re.sub(r'\s+',' ',s.replace('’',"'").replace('—','-').replace('–','-')).strip().lower()
ex={norm(l) for l in open('existing-cr-text.txt') if l.strip()}
print('dup existing',[t for it in Q for w in it['worlds'] for t in (w['line'],w['reply']) if norm(t) in ex])
used={norm(l) for l in open('used-settings.txt') if l.strip()}
print('used setting',[it['setting'] for it in Q if norm(it['setting']) in used])
print('kinds<3',[it['localId'] for it in Q if len({w['kind'] for w in it['worlds']})<3])
from collections import Counter
print('kinds',Counter(w['kind'] for it in Q for w in it['worlds']))
print('acts max',Counter(w['keyAct'] for it in Q for w in it['worlds']).most_common(4))
