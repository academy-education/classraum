import json
def W(kind,act,line,reply,expl,kills): return {"kind":kind,"keyAct":act,"line":line,"reply":reply,"explanationIfSpoken":expl,"kills":{str(k):v for k,v in kills.items()}}
Q=[]
def item(lid,setting,ws): Q.append({"localId":lid,"setting":setting,"worlds":ws})
# b10 rule: every line must make each other reply CONTRADICTED or nonsensical, not merely unmentioned.

item("cr14-a01","academic advising office, advisor to student",[
 W("good news","welcoming an approval","Your petition for a sixth course this term was approved.","Great news, so my schedule's final now.","The extra course was approved, so treating the schedule as settled is the natural reply.",
   {1:"\"was approved\" - nothing was refused, so there is no class to be disappointed about.",2:"\"was approved\" - the line asks no which-question, so naming the early section answers nothing.",3:"\"was approved\" - no offer was made, so \"Yes, please\" accepts nothing."}),
 W("bad news","reacting to a refusal","The committee turned down your overload request, I'm afraid.","That's a shame, I was counting on that class.","The request was refused, so expressing disappointment is the natural reply.",
   {0:"\"turned down\" - the request failed, so the schedule cannot be final with the course in it.",2:"\"turned down your\" - no section choice is offered; the course is refused.",3:"\"turned down your overload request\" - nothing is offered, so there is nothing to accept."}),
 W("question","choosing between alternatives","Would you rather take the morning or the afternoon section?","The early one, since I work most evenings.","The advisor asks which section, so picking one is the natural reply.",
   {0:"\"Would you rather take\" - the section is still undecided, so the schedule cannot be final.",1:"\"Would you rather take\" - a section is being offered, so nothing was refused.",3:"\"the morning or the afternoon\" - an either/or question; \"Yes, please\" picks neither."}),
 W("offer","accepting help","I can email the professor for you, if that helps.","Yes, please, that would save me a trip.","The advisor offers to email, so accepting is the natural reply.",
   {0:"\"if that helps\" - the matter is still being arranged, so nothing is final.",1:"\"I can email\" - this is help on offer, not a refusal to be disappointed by.",2:"\"email the professor\" - a yes/no offer; no section choice is asked."})])

item("cr14-a02","campus testing center check-in, proctor to student",[
 W("bad news","reacting to a cancellation","Your exam booking was cancelled because the instructor never sent the file.","So I'd need another date? How annoying.","The exam cannot happen today, so asking about rescheduling with annoyance is the natural reply.",
   {1:"\"was cancelled\" - no exam today, so there is no locker to lock.",2:"\"was cancelled because\" - no question was asked, so \"No\" answers nothing.",3:"\"was cancelled\" - there is no exam to finish sooner."}),
 W("request","complying with a rule","Please leave your phone and bag in a locker first.","Sure, do I need a coin for that?","The proctor gives an instruction, so asking how to comply is the natural reply.",
   {0:"\"in a locker first\" - the exam is going ahead, so no new date is needed.",2:"\"Please leave your phone\" - an instruction, not a question about extra time.",3:"\"a locker first\" - something must happen before starting, so the student is not about to finish."}),
 W("question","answering a yes/no question","Do you need the extra time your accommodation letter allows?","No, the standard ninety minutes is plenty.","The proctor asks about extra time, so answering is the natural reply.",
   {0:"\"Do you need\" - the exam is going ahead, so no new date is needed.",1:"\"Do you need the extra time\" - a question about time, not about a locker.",3:"\"Do you need the extra time\" - a yes/no question that \"Perfect\" does not answer."}),
 W("good news","welcoming an early start","Room four is free now, so you can start early.","Perfect, the sooner I'm done the better.","The student can begin early, so welcoming that is the natural reply.",
   {0:"\"you can start early\" - the exam is happening now, not cancelled.",1:"\"Room four is free\" - no locker is mentioned, so a coin question makes no sense.",2:"\"Room four is free now\" - no question was asked, so \"No\" answers nothing."})])

item("cr14-a03","interlibrary loan desk",[
 W("good news","collecting an arrival","The book you ordered from Ohio arrived this morning.","Great, can I check it out right now?","The book has arrived, so asking to borrow it now is the natural reply.",
   {1:"\"arrived this morning\" - the book is here, so buying one is pointless.",2:"\"The book you ordered\" - a physical book arrived; no email address is asked for.",3:"\"arrived this morning\" - it hasn't been borrowed yet, so no deadline exists to shrink."}),
 W("bad news","reacting to a failed request","The lending library reported their copy missing, so we couldn't get it.","Too bad, maybe I'll try buying one used.","The loan failed, so finding another source is the natural reply.",
   {0:"\"we couldn't get it\" - there is nothing to check out.",2:"\"we couldn't get it\" - there is nothing to send to any inbox.",3:"\"we couldn't get it\" - nothing was borrowed, so there is no due date."}),
 W("question","choosing between alternatives","Should we send the scan to your school email or your personal one?","The university address, I read that inbox daily.","The clerk asks which address, so picking one is the natural reply.",
   {0:"\"send the scan\" - it will be emailed, so there is nothing to check out at the desk.",1:"\"send the scan\" - the material was found, so buying a copy is pointless.",3:"\"Should we send\" - nothing has been lent, so no due date applies."}),
 W("correction","adjusting to a corrected date","Actually, it's due back on the tenth, not the twentieth.","Oh, so I've got less time than I thought.","The due date is earlier than expected, so noting the shorter time is the natural reply.",
   {0:"\"it's due back\" - the book is already borrowed, so it cannot be checked out now.",1:"\"it's due back\" - the student already has the book, so buying one is pointless.",2:"\"due back on the tenth\" - a statement about a date; no address is asked for."})])

item("cr14-a04","chemistry stockroom window, technician to student",[
 W("good news","collecting an order","Your group's glassware order is packed and waiting on the cart.","Thanks, I'll wheel it over to our bench.","The order is ready on a cart, so taking it is the natural reply.",
   {1:"\"glassware order is packed\" - this is glassware that is ready, not a missing reagent.",2:"\"packed and waiting\" - no question was asked, so \"Not yet\" answers nothing.",3:"\"Your group's glassware order\" - nothing is being lent, so there is nothing to thank for or replace."}),
 W("bad news","reacting to a shortage","We're out of the sodium chloride solution until Thursday's delivery.","Ugh, that's the one reagent we can't skip.","A needed chemical is unavailable, so reacting to the shortage is the natural reply.",
   {0:"\"We're out of\" - nothing is ready to wheel away.",2:"\"We're out of\" - a statement, not a question, so \"Not yet\" answers nothing.",3:"\"We're out of the sodium chloride\" - nothing is offered to the student."}),
 W("question","answering a yes/no question","Have you done the safety quiz for this lab?","Not yet, I'll finish it tonight.","The technician asks about the quiz, so answering is the natural reply.",
   {0:"\"Have you done\" - a question, so there is no cart to take.",1:"\"the safety quiz\" - a quiz is not a reagent, so \"the one reagent\" refers to nothing.",3:"\"Have you done the safety quiz\" - nothing is lent, so thanks for a loan make no sense."}),
 W("offer","accepting a loan","I could lend you goggles if you forgot yours.","Thanks, mine are cracked anyway.","The technician offers goggles, so accepting is the natural reply.",
   {0:"\"lend you goggles\" - goggles are not a loaded cart to wheel away.",1:"\"I could lend\" - something is being offered, not running out.",2:"\"lend you goggles\" - an offer, not a question about a quiz."})])

item("cr14-a05","rec center climbing wall desk",[
 W("good news","welcoming a certification","You passed the belay test, so you can climb without staff now.","Awesome, so no more waiting for an instructor.","The student is now certified, so welcoming independence is the natural reply.",
   {1:"\"you can climb\" - climbing is open, so the trip was not wasted.",2:"\"You passed the belay test\" - no size question is asked.",3:"\"You passed\" - nothing is required to be signed, so no pen is needed."}),
 W("bad news","reacting to a closure","The wall's closed today while they replace some of the holds.","Oh no, I came all this way for nothing.","The wall is closed, so expressing disappointment is the natural reply.",
   {0:"\"The wall's closed today\" - nobody can climb, with or without an instructor.",2:"\"The wall's closed\" - no shoes are being handed out.",3:"\"The wall's closed today\" - no climbing, so no waiver is signed."}),
 W("question","choosing a size","What shoe size should I grab for you, nine or ten?","The bigger pair, my feet are a bit wide.","The attendant asks for a size, so picking one is the natural reply.",
   {0:"\"What shoe size\" - a size question, not news of a passed test.",1:"\"should I grab for you\" - shoes are being handed out, so the wall is open.",3:"\"What shoe size\" - a which-question; nothing needs signing."}),
 W("request","complying with a requirement","You'll need to sign this waiver before going up.","Sure, could I borrow a pen for that?","The attendant requires a signature, so asking for a pen is the natural reply.",
   {0:"\"You'll need to sign\" - a form is still required, so nothing has been passed or granted.",1:"\"before going up\" - climbing is about to happen, so the trip is not wasted.",2:"\"sign this waiver\" - a form, not a size question."})])

item("cr14-a06","campus food pantry, volunteer to student",[
 W("good news","welcoming a delivery","Fresh produce just arrived, so you can take as much as you like.","Perfect timing, it's usually all gone by now.","Food has just come in, so welcoming the timing is the natural reply.",
   {1:"\"Fresh produce just arrived\" - the shelves are full, so there is nothing to call a shame.",2:"\"just arrived\" - a statement, not a question about earlier visits.",3:"\"you can take\" - no bag is offered, so \"Yes, please\" accepts nothing."}),
 W("bad news","reacting to a shortage","Sorry, we're completely empty until Monday's donation arrives.","That's a shame, my fridge is bare too.","The pantry has nothing, so expressing disappointment is the natural reply.",
   {0:"\"completely empty\" - nothing is there, so the timing is not perfect.",2:"\"we're completely empty\" - a statement; no question about visits is asked.",3:"\"completely empty\" - nothing is offered and nothing to carry."}),
 W("question","answering a question","Is this your first visit, or have you been registered before?","It is, a friend told me about this place.","The volunteer asks about earlier visits, so answering is the natural reply.",
   {0:"\"Is this your first visit\" - a question, not news of a delivery.",1:"\"Is this your first visit\" - a question, not bad news to regret.",3:"\"first visit, or\" - an either/or question; \"Yes, please\" picks neither."}),
 W("offer","accepting an offer","Would you like a tote bag to carry everything?","Yes, please, my backpack's already full.","The volunteer offers a bag, so accepting is the natural reply.",
   {0:"\"a tote bag\" - a bag offer, not news about food arriving.",1:"\"carry everything\" - there is food to carry, so the shelves are not empty.",2:"\"Would you like\" - an offer, not a question about earlier visits."})])

item("cr14-a07","international student office",[
 W("good news","collecting a document","Your visa extension letter is signed, and you can pick it up.","Great, I'll come collect it after lunch.","The letter is ready, so arranging to collect it is the natural reply.",
   {1:"\"letter is signed\" - nothing was rejected, so no new document is needed.",2:"\"letter is signed\" - a statement, not a when-question.",3:"\"Your visa extension letter\" - no room was corrected, so nobody nearly went astray."}),
 W("bad news","fixing a rejection","Your application was rejected because the bank statement is too old.","Then I'll download a more recent one tonight.","The statement was too old, so getting a newer one is the natural reply.",
   {0:"\"was rejected\" - nothing is ready to collect.",2:"\"was rejected because\" - a statement, not a when-question.",3:"\"was rejected\" - this is about a document, not a location mix-up."}),
 W("question","answering a when-question","When does your current work permit run out?","Sometime in March, I think, but I'll check.","The officer asks when, so giving a date is the natural reply.",
   {0:"\"When does\" - a question, so there is nothing ready to collect.",1:"\"When does your current\" - a question, not a rejection to fix.",3:"\"When does\" - a question about a date, not a corrected location."}),
 W("correction","thanking for a correction","Actually, the orientation is in Hall B, not Hall A.","Oh, thanks, I'd have gone to the wrong place.","The location is corrected, so thanking for it is the natural reply.",
   {0:"\"the orientation is\" - an event, not a document to collect.",1:"\"in Hall B\" - nothing was rejected, so no newer document is needed.",2:"\"Hall B, not Hall A\" - no question was asked, so a date answers nothing."})])

item("cr14-a08","campus laptop repair desk",[
 W("good news","welcoming a finished repair","We replaced the screen, and your laptop's ready to take home.","Fantastic, I can finally finish my essay tonight.","The laptop is fixed, so planning to use it is the natural reply.",
   {1:"\"We replaced the screen\" - it was repaired, so buying another is pointless.",2:"\"your laptop's ready\" - a statement, so \"Yes\" answers nothing.",3:"\"ready to take home\" - nothing needs waiting for."}),
 W("bad news","accepting a loss","The motherboard's fried, so repairing it would cost more than a new one.","Then I guess it's time to buy another.","Repair is not worth it, so deciding to replace the laptop is the natural reply.",
   {0:"\"The motherboard's fried\" - the laptop is dead, so no essay tonight.",2:"\"The motherboard's fried\" - a statement, not a question.",3:"\"would cost more\" - nothing is on order, so there is nothing to wait for."}),
 W("question","answering a yes/no question","Do you have a backup of your files somewhere?","Yes, everything's saved in the cloud.","The technician asks about a backup, so answering is the natural reply.",
   {0:"\"Do you have\" - a question; nothing says the laptop is fixed.",1:"\"Do you have a backup\" - a question; nothing says the laptop is dead.",3:"\"Do you have\" - a question; no part is on order."}),
 W("neutral info","accepting a wait","The part has to be ordered, so it'll take about a week.","That's fine, I can wait for it to come in.","A week's wait is explained, so accepting it is the natural reply.",
   {0:"\"about a week\" - the laptop won't be back tonight.",1:"\"The part has to be ordered\" - it can be repaired, so buying another is not forced.",2:"\"has to be ordered\" - a statement, so \"Yes\" answers nothing."})])

item("cr14-a09","commencement ticket office",[
 W("good news","welcoming extra seats","Good news, we found four extra seats for your family.","Wonderful, my grandparents can come after all.","More seats were found, so welcoming it is the natural reply.",
   {1:"\"four extra seats\" - there is room, so nobody has to watch online.",2:"\"we found four\" - a statement, so \"Yes\" answers nothing.",3:"\"Good news, we found\" - nothing is requested, so there is nothing to hand over."}),
 W("bad news","accepting a limit","Each graduate gets only two guest passes, no exceptions this year.","So my brother will have to watch online.","Guests are limited, so planning around the limit is the natural reply.",
   {0:"\"only two guest passes\" - no extra room, so not everyone can come.",2:"\"no exceptions this year\" - a statement, not a question about seating needs.",3:"\"only two guest passes\" - a rule, not a request for ID."}),
 W("question","answering a yes/no question","Will anyone in your party need wheelchair seating?","Yes, my grandfather uses one these days.","The clerk asks about accessible seating, so answering is the natural reply.",
   {0:"\"Will anyone\" - a question, not news of extra seats.",1:"\"Will anyone in your party\" - a question, not a limit to plan around.",3:"\"need wheelchair seating\" - a question, not a request for ID."}),
 W("request","complying with a request","Please show your student ID to collect the tickets.","Sure, it's right here in my wallet.","ID is requested, so producing it is the natural reply.",
   {0:"\"Please show your\" - a request, not news of extra seats.",1:"\"to collect the tickets\" - tickets are ready; no limit is announced.",2:"\"Please show\" - a request, not a seating question."})])

item("cr14-a10","campus shuttle dispatch office",[
 W("bad news","reacting to a cancellation","The late-night shuttle isn't running tonight because of the storm.","Ugh, then I'll have to call a cab.","The shuttle is cancelled, so finding another ride is the natural reply.",
   {1:"\"isn't running tonight\" - no driver is coming, so no stop is chosen.",2:"\"isn't running\" - no driver is on the way, so there is nothing to wait outside for.",3:"\"isn't running tonight\" - no ride is booked, so no name is needed."}),
 W("question","choosing between alternatives","Which stop should the driver drop you at, North Gate or the library?","The first one, it's nearer my dorm.","The dispatcher asks which stop, so picking one is the natural reply.",
   {0:"\"should the driver drop\" - a ride is coming, so no cab is needed.",2:"\"Which stop\" - a which-question; waiting outside picks no stop.",3:"\"Which stop\" - asks for a stop, not a spelled name."}),
 W("good news","welcoming an arrival","A driver's on the way and should be here in five minutes.","Perfect, I'll wait right outside then.","A ride is coming soon, so getting ready is the natural reply.",
   {0:"\"A driver's on the way\" - a ride is coming, so no cab is needed.",1:"\"should be here\" - a statement; no stop choice is asked.",3:"\"on the way\" - the ride is booked, so no name is asked for."}),
 W("request","complying with a request","Please spell your last name so I can book the ride.","Sure, it's L-O-P-E-Z, with a Z.","The dispatcher asks for a spelling, so giving it is the natural reply.",
   {0:"\"book the ride\" - a ride is available, so no cab is needed.",1:"\"spell your last name\" - asks for a name, not a stop.",2:"\"so I can book\" - nothing is booked yet, so no driver is coming."})])

item("cr14-a11","ceramics studio kiln room",[
 W("good news","reacting to a good result","Your bowls came out of the kiln without a single crack.","Amazing, I was sure the thin one would break.","The pieces survived firing, so relief is the natural reply.",
   {1:"\"without a single crack\" - nothing failed, so there is nothing to explain.",2:"\"came out of the kiln\" - already fired, so it is too late to choose a glaze.",3:"\"came out of the kiln\" - they are finished, not waiting on a shelf."}),
 W("bad news","explaining a failure","Two of your mugs exploded in the firing, I'm sorry.","Oh no, I must have left air bubbles inside.","Pieces broke in firing, so guessing the cause is the natural reply.",
   {0:"\"mugs exploded\" - pieces did break, so relief is contradicted.",2:"\"exploded in the firing\" - already fired, so no glaze choice remains.",3:"\"mugs exploded\" - a loss, so \"That's fine\" is contradicted."}),
 W("question","choosing between alternatives","Do you want these glazed blue or left clear?","The color, please, it'll match my kitchen.","The tech asks about the glaze, so choosing is the natural reply.",
   {0:"\"Do you want these\" - not yet fired, so no result is known.",1:"\"Do you want these\" - not yet fired, so nothing has exploded.",3:"\"blue or left clear\" - an either/or question that \"That's fine\" does not answer."}),
 W("neutral info","accepting a wait","The next firing isn't until Saturday, so they'll sit on the shelf.","That's fine, I'm not in any rush.","The firing is days away, so accepting the wait is the natural reply.",
   {0:"\"isn't until Saturday\" - not fired yet, so no result is known.",1:"\"isn't until Saturday\" - not fired yet, so nothing has exploded.",2:"\"so they'll sit\" - a statement; no glaze question is asked."})])

item("cr14-a12","campus observatory open night",[
 W("bad news","reacting to a cancellation","It's too cloudy, so the telescope viewing is cancelled tonight.","What a shame, I was hoping to see Saturn.","Viewing is off, so disappointment is the natural reply.",
   {1:"\"too cloudy\" - nothing is visible, so no dots can be made out.",2:"\"is cancelled tonight\" - a statement, so \"Never\" answers nothing.",3:"\"viewing is cancelled\" - nobody is observing, so a phone screen spoils nothing."}),
 W("good news","reacting to a view","The sky's perfectly clear, and Jupiter's moons are visible right now.","Wow, I can actually make out four little dots.","The moons are visible, so describing what one sees is the natural reply.",
   {0:"\"perfectly clear\" - viewing is on, so there is nothing to call a shame.",2:"\"are visible right now\" - a statement, so \"Never\" answers nothing.",3:"\"The sky's perfectly clear\" - no complaint was made, so there is nothing to apologize for."}),
 W("question","answering a yes/no question","Have you ever used a telescope like this one before?","Never, so I might need a little help.","The guide asks about experience, so answering is the natural reply.",
   {0:"\"Have you ever used\" - a question; nothing is cancelled.",1:"\"Have you ever used\" - a question about experience, not a view to describe.",3:"\"Have you ever\" - a question, not a complaint to apologize for."}),
 W("request","complying with a request","Please keep your phone screen off, the light ruins everyone's view.","Sorry, I'll put it away right now.","The guide asks for the screen off, so apologizing and complying is the natural reply.",
   {0:"\"ruins everyone's view\" - people are viewing, so nothing is cancelled.",1:"\"Please keep your phone\" - a request, not a description of the sky.",2:"\"Please keep\" - a request, so \"Never\" answers nothing."})])

item("cr14-a13","student government elections office",[
 W("good news","welcoming an approval","Your candidacy was approved, so your name will be on the ballot.","Great, so it's official, I'm running.","The candidacy is approved, so celebrating it is the natural reply.",
   {1:"\"was approved\" - nothing is missing, so there is nothing more to collect.",2:"\"will be on the ballot\" - a statement; no day choice is asked.",3:"\"was approved\" - the decision is already made, so there is nothing to hear back about."}),
 W("bad news","fixing a shortfall","You're twelve signatures short, so we can't accept your nomination yet.","Then I'll collect more in the dining hall.","Signatures are missing, so gathering more is the natural reply.",
   {0:"\"we can't accept\" - not accepted, so nothing is official.",2:"\"twelve signatures short\" - a statement; no day choice is asked.",3:"\"twelve signatures short\" - the outcome is already known, so there is nothing to wait for."}),
 W("question","choosing between alternatives","When would you like to give your two-minute speech, Monday or Wednesday?","Early in the week works best for me.","The clerk asks for a day, so picking one is the natural reply.",
   {0:"\"When would you like\" - a question, not news of approval.",1:"\"When would you like\" - a scheduling question; nothing is missing.",3:"\"Monday or Wednesday\" - a choice of day, not a review date to wait for."}),
 W("correction","adjusting to a corrected date","Actually, the committee reviews nominations Friday, not today.","Oh, so I'll hear back at the end of the week.","The review is later than expected, so noting when the result comes is the natural reply.",
   {0:"\"reviews nominations Friday\" - no decision yet, so nothing is official.",1:"\"reviews nominations Friday\" - nothing is reported missing, so there is nothing more to collect.",2:"\"Friday, not today\" - a correction, not a question about a speech day."})])

item("cr14-a14","campus recycling center",[
 W("neutral info","following directions","Batteries go in the red bin by the door.","Thanks, I'll drop mine in there now.","The worker says where batteries go, so using that bin is the natural reply.",
   {1:"\"Batteries go in\" - items are accepted here, so there is no need to go elsewhere.",2:"\"the red bin\" - a statement, not a question about what the box holds.",3:"\"by the door\" - no pickup service is offered."}),
 W("bad news","asking for an alternative","Sorry, we don't take electronics here anymore.","Oh, where can my old printer go, then?","The center refuses electronics, so asking where else to go is the natural reply.",
   {0:"\"we don't take\" - nothing can be dropped here.",2:"\"we don't take electronics\" - a statement, not a question about the box.",3:"\"we don't take\" - no service is offered, so there is nothing to schedule."}),
 W("question","answering an either/or question","Is that box full of glass or plastic?","Mostly jars, plus a few bottles.","The worker asks what the box holds, so answering is the natural reply.",
   {0:"\"Is that box\" - a question; no bin is named to drop things in.",1:"\"glass or plastic?\" - a question; nothing is refused.",3:"\"Is that box full\" - a question; no pickup is offered."}),
 W("offer","accepting an offer","We can pick up large loads from your dorm for free.","Really? I'll schedule that for next week.","A free pickup is offered, so arranging it is the natural reply.",
   {0:"\"pick up large loads\" - the center collects, so there is no bin to drop into.",1:"\"We can pick up\" - items are accepted, so no alternative is needed.",2:"\"We can pick up\" - an offer, not a question about the box."})])

item("cr14-a15","dorm bike storage room, hall staff to resident",[
 W("good news","welcoming a renewal","Your bike tag's been renewed, so the storage room's yours all year.","Perfect, I won't have to chain it outside.","A storage spot is secured, so welcoming it is the natural reply.",
   {1:"\"storage room's yours\" - there is space, so it won't stay out in the rain.",2:"\"been renewed\" - a statement, not a question about a lock.",3:"\"the storage room's yours\" - nothing changed about access, so no stuck door is explained."}),
 W("bad news","reacting to no space","Every rack's taken, so there's no space until someone moves out.","Ugh, then it stays out in the rain.","No space is left, so complaining about leaving it outside is the natural reply.",
   {0:"\"Every rack's taken\" - no space, so it will have to be chained outside.",2:"\"Every rack's taken\" - a statement, not a question about a lock.",3:"\"no space until\" - nothing about a door code, so no stuck door is explained."}),
 W("question","answering an either/or question","Does your bike have a lock, or do you need to borrow one?","I brought my own, thanks, a heavy chain.","The staff ask about a lock, so answering is the natural reply.",
   {0:"\"Does your bike\" - a question; no storage spot is granted.",1:"\"Does your bike have\" - a question; no lack of space is announced.",3:"\"have a lock\" - a question; no code change explains a stuck door."}),
 W("correction","understanding a correction","Actually, the room code changed to 4471 this morning.","Oh, that's why the door wouldn't open.","A new code explains a problem, so realizing that is the natural reply.",
   {0:"\"the room code changed\" - a code update, not news of a renewed spot.",1:"\"the room code\" - a code update, not a lack of space.",2:"\"code changed to 4471\" - a statement, not a question about a lock."})])

item("cr14-a16","student health insurance office",[
 W("good news","welcoming an approval","Your waiver went through, so you won't be charged for the school plan.","Great, that saves me a few hundred dollars.","The waiver was approved, so welcoming the savings is the natural reply.",
   {1:"\"won't be charged\" - the student does not have to pay for the campus plan.",2:"\"went through\" - a statement, so \"No\" answers nothing.",3:"\"went through\" - it is already done, so no time is left to count."}),
 W("bad news","reacting to a denial","Your private plan doesn't cover care here, so the waiver was denied.","So I'm stuck paying for the campus one?","The waiver was denied, so asking about paying is the natural reply.",
   {0:"\"was denied\" - nothing is saved.",2:"\"the waiver was denied\" - a statement, so \"No\" answers nothing.",3:"\"was denied\" - the decision is made, so no time remains."}),
 W("question","answering a yes/no question","Is your current coverage through a parent's employer?","No, I bought it myself last year.","The clerk asks about coverage, so answering is the natural reply.",
   {0:"\"Is your current coverage\" - a question; nothing is approved.",1:"\"Is your current coverage\" - a question; nothing is denied.",3:"\"through a parent's employer\" - a question, not a deadline."}),
 W("neutral info","noting a deadline","The deadline to submit a waiver is September fifteenth.","Then I still have a couple of weeks.","A deadline is given, so working out the time left is the natural reply.",
   {0:"\"to submit a waiver\" - not yet submitted, so nothing is saved.",1:"\"to submit a waiver\" - not yet submitted, so nothing is denied.",2:"\"The deadline to\" - a statement, so \"No\" answers nothing."})])

item("cr14-a17","campus greenhouse volunteer shift, coordinator to volunteer",[
 W("request","complying with a request","Could you water the orchids in the back room before you leave?","Sure, is the hose by the sink?","The coordinator asks for a task, so agreeing and asking how is the natural reply.",
   {1:"\"Could you water\" - a request; nothing has died.",2:"\"Could you water the orchids\" - a single task, not a choice between two.",3:"\"Could you water\" - a request, not news of a bloom."}),
 W("bad news","reacting to a loss","The tomato seedlings all died over the weekend from the heat.","Oh no, all those weeks wasted.","The seedlings died, so disappointment is the natural reply.",
   {0:"\"seedlings all died\" - no task is asked, so there is nothing to agree to.",2:"\"all died over\" - a statement, not a choice of tasks.",3:"\"seedlings all died\" - nothing bloomed to photograph."}),
 W("question","choosing between alternatives","Would you rather repot cacti or label seed packets today?","Nothing prickly, my hands are still sore.","The coordinator offers two tasks, so picking one is the natural reply.",
   {0:"\"Would you rather\" - an either/or question; \"Sure\" picks neither.",1:"\"repot cacti or\" - a choice of tasks; nothing has died.",3:"\"Would you rather\" - a question, not news of a bloom."}),
 W("good news","reacting to good news","The sunflowers you planted have finally bloomed.","Really? I've got to take a picture!","The student's plants bloomed, so excitement is the natural reply.",
   {0:"\"have finally bloomed\" - news, not a task to agree to.",1:"\"have finally bloomed\" - the plants thrived, so nothing was wasted.",2:"\"The sunflowers you planted\" - news, not a choice of tasks."})])

item("cr14-a18","lab safety training sign-up desk",[
 W("good news","welcoming access","You've completed the training, so your lab badge is active now.","Great, I can start my experiment tomorrow.","Access is granted, so planning lab work is the natural reply.",
   {1:"\"You've completed the training\" - the student passed, so nothing was rushed and failed.",2:"\"badge is active now\" - a statement; no day choice is asked.",3:"\"completed the training\" - the session is over, so nothing needs bringing to it."}),
 W("bad news","reacting to a failure","You failed the quiz, so you'll have to retake the session.","Ugh, I knew I rushed through it.","The student failed, so self-blame is the natural reply.",
   {0:"\"You failed the quiz\" - no access, so no experiment tomorrow.",2:"\"You failed\" - a statement; no day choice is asked.",3:"\"You failed the quiz\" - news of a result, not a request to bring a number."}),
 W("question","choosing between alternatives","Which day works for you, Tuesday morning or Thursday afternoon?","The second, I have class until lunch.","The clerk asks for a day, so picking one is the natural reply.",
   {0:"\"Which day works\" - training is not done, so no experiment can start.",1:"\"Which day works\" - the session is still ahead, so no quiz has been failed.",3:"\"Which day works\" - a which-question, not a request for a number."}),
 W("request","complying with a request","Please bring your student number to the session.","Sure, it's printed on my ID card anyway.","The clerk asks the student to bring a number, so agreeing is the natural reply.",
   {0:"\"to the session\" - the session is still ahead, so no experiment can start.",1:"\"to the session\" - the session hasn't happened, so no quiz was failed.",2:"\"Please bring\" - a request, not a choice of days."})])

item("cr14-a19","campus film society screening, club member to attendee",[
 W("bad news","accepting a postponement","The projector broke, so tonight's screening is postponed to Friday.","Oh well, I'll come back in a few days.","The film is moved, so planning to return is the natural reply.",
   {1:"\"is postponed\" - no screening tonight, so no snacks are offered.",2:"\"The projector broke\" - a statement, not a question about films seen.",3:"\"is postponed to Friday\" - nothing is starting, so no seat is needed."}),
 W("offer","accepting an offer","There's free popcorn at the back if you want some.","Ooh, yes, I skipped dinner tonight.","Free food is offered, so accepting is the natural reply.",
   {0:"\"free popcorn at the back\" - the event is on, so no need to come back.",2:"\"if you want some\" - an offer of food, not a question about films.",3:"\"There's free popcorn\" - an offer of food, not a seating instruction."}),
 W("question","answering a question","Have you seen any other films by this director?","Just one, years ago in high school.","The member asks about the director, so answering is the natural reply.",
   {0:"\"Have you seen\" - a question; nothing is postponed.",1:"\"any other films\" - a question about films, not an offer of food.",3:"\"Have you seen\" - a question, not a seating instruction."}),
 W("request","complying with a request","We're starting in two minutes, so grab a seat.","Okay, I'll sit near the aisle.","The film is starting, so taking a seat is the natural reply.",
   {0:"\"starting in two minutes\" - the film is on now, so no need to come back.",1:"\"grab a seat\" - no food is offered.",2:"\"We're starting in\" - an instruction, not a question about films."})])

item("cr14-a20","campus locksmith window, key replacement",[
 W("good news","collecting a replacement","Your new room key is cut and ready to go.","Finally, I can get back into my place.","The key is ready, so relief at getting back in is the natural reply.",
   {1:"\"cut and ready\" - nothing is waiting on anyone else.",2:"\"ready to go\" - a statement, not a question about how it was lost.",3:"\"cut and ready\" - no price is quoted, so nothing is \"steep\"."}),
 W("bad news","asking about a blocked step","We can't cut a new one until housing sends a work order.","So I'll need to go see them first?","Housing must act first, so asking about visiting them is the natural reply.",
   {0:"\"We can't cut\" - no key yet, so the student can't get back in.",2:"\"We can't cut\" - a statement, not a question about how it was lost.",3:"\"until housing sends\" - no price is quoted, so nothing is \"steep\"."}),
 W("question","answering an either/or question","Did you lose the key, or was it stolen?","It must've dropped out of my pocket on the bus.","The locksmith asks how the key went missing, so explaining is the natural reply.",
   {0:"\"Did you lose\" - a question; nothing is ready.",1:"\"Did you lose the key\" - a question; nobody else must act.",3:"\"or was it stolen?\" - a question; no price is quoted."}),
 W("neutral info","accepting a cost","A replacement costs twenty-five dollars, charged to your student account.","That's steep, but I don't have a choice.","A price is given, so grudgingly accepting it is the natural reply.",
   {0:"\"A replacement costs\" - only a price; the key is not said to be ready.",1:"\"charged to your student account\" - only a price; nothing is blocked by housing.",2:"\"costs twenty-five dollars\" - a statement, not a question about how it was lost."})])

json.dump({"cohort":"cr-v14","stage":"crv7-method batch 10a (seed offset 1000)","method":"four-world, seeded post-hoc selection (render-crv7.mjs)","items":Q},open('crv7-b10a-quads.json','w'),indent=1,ensure_ascii=False)
# pre-render self-checks across ALL worlds: echo, length ratio, line length, existing text, settings, kinds
import re
STOP=set('i im ill a an the to of and or is it its for you your me my we our be can could would will do does did that this then so on in at by up out now please okay yes no oh great thanks thank sure fine just there here what where when how any all have has get go'.split())
cw=lambda s:{w.rstrip('s') for w in re.findall(r"[a-z]+",s.lower().replace("'","")) if w not in STOP}
echo=[(it['localId'],i,sorted(cw(w['reply'])&cw(w['line']))) for it in Q for i,w in enumerate(it['worlds']) if cw(w['reply'])&cw(w['line'])]
ratio=[(it['localId'],round(max(len(w['reply']) for w in it['worlds'])/min(len(w['reply']) for w in it['worlds']),2)) for it in Q]
print(len(Q),'items; echo hits',len(echo)); [print('  echo',e) for e in echo]
print('ratio>1.5',[r for r in ratio if r[1]>1.5])
print('line len',[(it['localId'],i,len(w['line'].split())) for it in Q for i,w in enumerate(it['worlds']) if not 5<=len(w['line'].split())<=14])
norm=lambda s:re.sub(r'\s+',' ',s.replace('’',"'").replace('—','-').replace('–','-')).strip().lower()
ex={norm(l) for l in open('existing-cr-text.txt') if l.strip()}
print('dup existing',[t for it in Q for w in it['worlds'] for t in (w['line'],w['reply']) if norm(t) in ex])
used={norm(l) for l in open('used-settings.txt') if l.strip()}
print('used setting',[it['setting'] for it in Q if norm(it['setting']) in used])
print('kinds<3',[it['localId'] for it in Q if len({w['kind'] for w in it['worlds']})<3])
from collections import Counter
print('kinds',Counter(w['kind'] for it in Q for w in it['worlds']))
