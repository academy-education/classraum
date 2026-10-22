import json
def W(kind,act,line,reply,expl,kills): return {"kind":kind,"keyAct":act,"line":line,"reply":reply,"explanationIfSpoken":expl,"kills":{str(k):v for k,v in kills.items()}}
Q=[]
def item(lid,setting,ws): Q.append({"localId":lid,"setting":setting,"worlds":ws})
# b11a: work and everyday errands. Strict rule: every line makes each other reply CONTRADICTED or nonsensical.

item("cr15-a01","construction site gate, foreman to new laborer",[
 W("request","asking how to comply with a safety rule","Put on a hard hat before you step past this fence.","Got it, are there spare helmets in the trailer?","The foreman requires head protection, so asking where to get a helmet is the natural reply.",
   {1:"\"before you step past\" - work is going ahead on site, so nobody has the day off.",2:"\"Put on a hard\" - an order about safety gear; no ride was offered, so there is nothing to call great.",3:"\"Put on a hard hat\" - no time was mentioned or changed, so nothing is an hour earlier."}),
 W("bad news","checking the consequence of a stoppage","The concrete truck broke down, so there's no pouring today.","So we've all got the whole day off, then?","Work cannot happen, so asking whether the crew is free is the natural reply.",
   {0:"\"no pouring today\" - the job is stopped, so nobody is about to go past the fence needing a helmet.",2:"\"truck broke down\" - nothing is offered, so there is nothing to accept.",3:"\"no pouring today\" - there is no shift today, so no earlier start or early train."}),
 W("offer","accepting a ride","I can give you a lift to the bus stop after the shift.","That'd be great, it's a long walk otherwise.","The foreman offers a ride, so accepting it is the natural reply.",
   {0:"\"give you a lift\" - an offer of a ride, not a safety instruction needing a helmet.",1:"\"after the shift\" - there is a shift to finish, so the day is not off.",3:"\"after the shift\" - the offer is about leaving; no start time was changed."}),
 W("correction","adjusting to an earlier start","Sorry, your start time is seven, not eight like I said.","An hour earlier? I'll need to catch the first train.","The start is earlier than stated, so planning an earlier commute is the natural reply.",
   {0:"\"your start time is\" - only a time is corrected; nobody is being sent past a fence.",1:"\"your start time\" - work starts at seven, so there is no day off.",2:"\"start time is seven\" - a correction, not an offer, so \"That'd be great\" accepts nothing."})])

item("cr15-a02","office building reception, receptionist to visitor",[
 W("good news","reacting to immediate access","Mr. Ortiz is free now, so you can go straight up.","Oh good, that was quicker than I expected.","The host is available at once, so remarking on the speed is the natural reply.",
   {1:"\"is free now\" - a statement, not an either/or question, so \"The first one\" answers nothing.",2:"\"free now\" - there is no wait, so there is no meantime to fill.",3:"\"go straight up\" - nothing was handed over, so \"it\" refers to nothing."}),
 W("question","choosing between alternatives","Are you here for an interview, or are you dropping something off?","The first one, for the junior analyst job.","The receptionist asks the reason for the visit, so picking one is the natural reply.",
   {0:"\"Are you here for\" - the purpose is still unknown, so nothing quick has happened yet.",2:"\"Are you here for\" - a question; no wait was announced, so there is no meantime.",3:"\"or are you dropping\" - nothing was handed over, so there is nothing to give back."}),
 W("neutral info","filling a wait","Mr. Ortiz's meeting ends at ten, which is in twenty minutes.","No problem, I'll grab a coffee in the meantime.","The host is busy for twenty minutes, so planning to wait is the natural reply.",
   {0:"\"in twenty minutes\" - the visitor must wait, so nothing was quick.",1:"\"meeting ends at ten\" - a statement, not an either/or question.",3:"\"meeting ends at ten\" - nothing was handed over, so \"it\" refers to nothing."}),
 W("request","asking about a borrowed item","Please sign in here and clip this badge to your jacket.","Sure, should I hand it back when I leave?","The visitor is given a badge, so asking whether to return it is the natural reply.",
   {0:"\"Please sign in\" - nothing has happened yet, so nothing has been quick.",1:"\"Please sign in\" - an instruction, not an either/or question.",2:"\"sign in here\" - no wait is announced, so there is no meantime to fill."})])

item("cr15-a03","internship coordinator's desk, coordinator to intern",[
 W("good news","welcoming a confirmation","Your placement at the design firm got confirmed this morning.","Brilliant, so it's official at last.","The placement is settled, so welcoming it is the natural reply.",
   {1:"\"got confirmed this\" - nothing was dropped, so there is no reason to apply elsewhere.",2:"\"got confirmed\" - a statement, not an offer, so \"Yes, please\" accepts nothing.",3:"\"confirmed this morning\" - the result is already known, so there is nothing to wait for."}),
 W("bad news","planning after a cancellation","The firm dropped its summer internships because of budget cuts.","Ugh, I'll have to start applying elsewhere.","The internships are gone, so planning other applications is the natural reply.",
   {0:"\"dropped its summer internships\" - there is no placement, so nothing is official.",2:"\"dropped its summer\" - nothing is offered, so there is nothing to accept.",3:"\"dropped its summer internships\" - nothing is pending, so there is nothing to find out."}),
 W("offer","accepting help","I could read over your cover letter before you submit it.","Yes, please, a second pair of eyes would help.","The coordinator offers feedback, so accepting is the natural reply.",
   {0:"\"before you submit it\" - nothing is sent yet, so nothing can be official.",1:"\"before you submit\" - the application is still open, so nothing was dropped.",3:"\"I could read\" - an offer of help; no announcement date is given."}),
 W("neutral info","noting a timeline","The firm will announce its intern picks on Friday.","Okay, so I'll find out by the weekend.","The decision comes on Friday, so noting when the answer will come is the natural reply.",
   {0:"\"will announce its\" - nothing is decided yet, so nothing is official.",1:"\"will announce its intern picks\" - interns are still being chosen, so the program was not dropped.",2:"\"will announce\" - a statement, not an offer, so \"Yes, please\" accepts nothing."})])

item("cr15-a04","café shift, shift lead to part-time barista",[
 W("question","choosing a station","Which station do you want today, register or espresso bar?","The till, I'm still slow at making lattes.","The lead asks which station, so picking one is the natural reply.",
   {1:"\"Which station do you\" - a which-question; nothing is to be fetched, so \"they\" refers to nothing.",2:"\"Which station\" - no time was corrected, so nothing moves later.",3:"\"Which station do you want\" - a question, not news, so there is nothing to have hoped for."}),
 W("request","asking where supplies are","Please restock the cups and lids before the morning rush.","Sure, are they still in the storeroom?","The lead asks for a restock, so asking where the supplies are is the natural reply.",
   {0:"\"Please restock the\" - no station choice is offered.",2:"\"before the morning rush\" - nothing about a break is changed, so nobody eats later.",3:"\"Please restock\" - an instruction, not good news worth waiting months for."}),
 W("correction","adjusting to a later break","Actually, your break is at two, not at noon.","Oh, so I'll eat a bit later than planned.","The break moves later, so adjusting the meal plan is the natural reply.",
   {0:"\"your break is at\" - a time correction, not a station choice.",1:"\"your break is\" - nothing is to be fetched, so \"they\" refers to nothing.",3:"\"your break is at two\" - a schedule change, not long-awaited news."}),
 W("good news","welcoming a pay rise","Your raise was approved, starting with this paycheck.","Finally, I've been hoping for that for months.","A raise came through, so welcoming it is the natural reply.",
   {0:"\"Your raise was approved\" - news, not a station choice.",1:"\"Your raise was\" - nothing is to be fetched, so \"they\" refers to nothing.",2:"\"raise was approved\" - no break time was changed, so nobody eats later."})])

item("cr15-a05","orthodontist's front desk, receptionist to patient",[
 W("bad news","reacting to a wasted trip","Your retainer isn't back from the lab yet, sorry.","Oh, so I came in for nothing today?","The appliance is not ready, so complaining about the wasted trip is the natural reply.",
   {1:"\"isn't back from\" - a statement, not an either/or question about days.",2:"\"isn't back from the lab\" - nothing is ready and nobody is being called in.",3:"\"isn't back\" - no task is given, so \"it\" refers to nothing to do."}),
 W("question","choosing a day","Would you prefer a Tuesday or a Thursday for your next adjustment?","The latter works better around my classes.","The receptionist offers two days, so picking one is the natural reply.",
   {0:"\"your next adjustment\" - an either/or question; this reply names neither day.",2:"\"your next adjustment\" - the visit is in the future, so nobody goes in now.",3:"\"Tuesday or a Thursday\" - a choice of day; no task is given to do on a phone."}),
 W("offer","accepting an earlier slot","We have a cancellation, so the doctor could see you early.","Yes, I'll go right in, thanks so much.","An earlier appointment is offered, so accepting it is the natural reply.",
   {0:"\"see you early\" - the visit is happening sooner, so the trip is not for nothing.",1:"\"could see you early\" - an offer for now, not a choice between two days.",3:"\"We have a cancellation\" - no form or task is given, so \"it\" refers to nothing."}),
 W("request","asking how to complete a form","Please fill in this insurance form while you wait.","Of course, can I do it on my phone?","The patient is handed a form, so asking how to complete it is the natural reply.",
   {0:"\"while you wait\" - the patient will be seen, so the trip is not for nothing.",1:"\"Please fill in\" - an instruction, not an either/or question about days.",2:"\"while you wait\" - there is a wait, so the patient cannot go right in."})])

item("cr15-a06","contact lens fitting, optometry assistant to customer",[
 W("good news","preparing to try something on","Your trial lenses came in, so you can try them on now.","Great, let me wash my hands first.","The lenses are ready to try, so getting ready to handle them is the natural reply.",
   {1:"\"try them on now\" - they are here now, so there is no waiting period with glasses.",2:"\"Your trial lenses came\" - nothing about the prescription was corrected.",3:"\"try them on now\" - nothing is offered by mail, so \"That'd be handy\" accepts nothing."}),
 W("neutral info","planning around a delay","The lenses take about ten days to arrive from the supplier.","So I'll stick with my glasses until then.","The lenses are not here yet, so planning to wait is the natural reply.",
   {0:"\"take about ten days\" - there is nothing to put in now, so no hand-washing yet.",2:"\"take about ten days\" - a delivery time; no prescription number was corrected.",3:"\"take about ten days\" - a statement, not an offer, so nothing is accepted."}),
 W("correction","reacting to a milder prescription","Sorry, your prescription is minus two, not minus three.","Oh, so my eyes aren't as bad as I thought.","The prescription is weaker than stated, so relief is the natural reply.",
   {0:"\"your prescription is\" - no lenses are here to handle.",1:"\"minus two, not minus three\" - no delay is named, so \"until then\" refers to nothing.",3:"\"Sorry, your prescription\" - a correction, not an offer."}),
 W("offer","accepting a delivery service","We can mail your next supply straight to your home.","That'd be handy, I hate making the trip.","Home delivery is offered, so accepting it is the natural reply.",
   {0:"\"mail your next supply\" - nothing is here to try on now.",1:"\"We can mail\" - an offer, with no delay named, so \"until then\" refers to nothing.",2:"\"your next supply\" - nothing about the prescription was corrected."})])

item("cr15-a07","self-service laundromat, attendant to customer",[
 W("bad news","going elsewhere after a breakdown","All the washers are broken until the repairman comes Monday.","Then I'll have to try another place.","Nothing works here, so going elsewhere is the natural reply.",
   {1:"\"All the washers are broken\" - no loads can run, so no instruction about loads applies.",2:"\"washers are broken\" - nobody can wash, so no detergent is being chosen.",3:"\"All the washers\" - none can be used, so \"I'll use one\" is impossible."}),
 W("request","agreeing to a rule","Please empty the lint trap after each load.","Will do, I didn't know that was my job.","The attendant gives a rule, so agreeing to it is the natural reply.",
   {0:"\"after each load\" - loads can be run here, so there is no need to go elsewhere.",2:"\"Please empty the\" - an instruction, not a which-question about detergent.",3:"\"Please empty the lint trap\" - no price was given, so nothing is pricey."}),
 W("question","choosing a product","Which detergent do you want, scented or unscented?","The plain one, I've got sensitive skin.","The attendant asks which detergent, so picking one is the natural reply.",
   {0:"\"Which detergent do you\" - washing is going ahead here, so no other place is needed.",1:"\"Which detergent\" - a question, not an instruction to agree to.",3:"\"scented or unscented\" - no price was given, so nothing is pricey."}),
 W("neutral info","accepting a price","The large machines cost five dollars and take about an hour.","That's pricey, but I'll use one anyway.","A price is given, so grudgingly accepting it is the natural reply.",
   {0:"\"The large machines cost\" - the machines are working, so there is no reason to go elsewhere.",1:"\"cost five dollars\" - a price, not an instruction.",2:"\"cost five dollars\" - a statement, not a which-question about detergent."})])

item("cr15-a08","grocery deli counter, clerk to customer",[
 W("good news","collecting an early order","Your party platter's ready, a day earlier than we promised.","Oh nice, I can grab it right now, then.","The order is ready early, so collecting it now is the natural reply.",
   {1:"\"Your party platter's ready\" - a statement, not a question about slicing.",2:"\"platter's ready\" - nothing is offered to taste.",3:"\"a day earlier\" - no price was corrected, so no smaller amount is needed."}),
 W("question","choosing a slice thickness","Do you want the turkey sliced thin or thick?","As fine as you can, it's for sandwiches.","The clerk asks how to slice, so picking a thickness is the natural reply.",
   {0:"\"Do you want the\" - the meat is not sliced yet, so nothing is ready to take.",2:"\"sliced thin or thick\" - an either/or question; nothing is offered to taste.",3:"\"thin or thick\" - no price was corrected, so \"then\" has no reason."}),
 W("offer","accepting a sample","Would you like a taste of the new smoked ham first?","Oh, yes, I've been curious about that one.","A sample is offered, so accepting it is the natural reply.",
   {0:"\"a taste of\" - only a sample, not a finished order to take.",1:"\"Would you like a\" - a yes/no offer, not a thickness question.",3:"\"a taste of the new\" - no price was corrected, so \"then\" has no reason."}),
 W("correction","adjusting to a higher price","Sorry, that cheese is nine dollars a pound, not six.","Hmm, then just a small wedge, please.","The price is higher, so buying less is the natural reply.",
   {0:"\"that cheese is nine\" - a price, not a finished order to take.",1:"\"nine dollars a pound\" - nothing is asked about thickness.",2:"\"not six\" - a correction, not an offer of a taste."})])

item("cr15-a09","pet grooming salon, groomer to owner",[
 W("bad news","reacting to an unwanted change","Your dog's coat was too matted, so we had to shave him.","Oh no, he'll look so different now.","The dog was shaved, so dismay at his new look is the natural reply.",
   {1:"\"we had to shave\" - the groom is done, so there is no wait for errands.",2:"\"had to shave him\" - not an instruction, and the dog is not in a waiting room.",3:"\"had to shave him\" - nothing is offered, so \"Yes\" accepts nothing."}),
 W("neutral info","using a long wait","A full groom usually takes about three hours.","Then I'll run some errands while I wait.","The groom is long, so planning to use the time is the natural reply.",
   {0:"\"usually takes about\" - nothing has been done yet, so his look has not changed.",2:"\"A full groom\" - no instruction about other pets is given.",3:"\"usually takes about three hours\" - a statement, not an offer."}),
 W("request","agreeing to a rule","Please keep him on the leash in the waiting area.","Of course, he gets excited around other pets.","The owner is told to restrain the dog, so agreeing is the natural reply.",
   {0:"\"keep him on the\" - he has not been groomed yet, so he looks the same.",1:"\"in the waiting area\" - the owner is waiting with the dog, so cannot leave for errands.",3:"\"keep him on\" - an instruction, not an offer to accept."}),
 W("offer","accepting an add-on","We could add a nail trim for five dollars more.","Yes, his claws have gotten quite long.","An extra service is offered, so accepting it is the natural reply.",
   {0:"\"We could add\" - nothing has been cut yet, so his look has not changed.",1:"\"for five dollars more\" - a price for an extra, not a long wait.",2:"\"add a nail trim\" - an offer, not a rule about other pets."})])

item("cr15-a10","animal shelter adoption desk, staff to visitor",[
 W("good news","welcoming an approval","Your application was approved, so the kitten can go home today.","Yay, I already bought her a litter box.","The adoption is approved, so excitement and readiness is the natural reply.",
   {1:"\"can go home today\" - the kitten is still available, so nothing is heartbreaking.",2:"\"was approved\" - a statement, not a which-day question.",3:"\"Your application was approved\" - nothing about its sex was corrected, so no name needs rethinking."}),
 W("bad news","reacting to a loss","Someone else adopted that kitten yesterday, I'm afraid.","That's heartbreaking, I'd fallen for that one.","The kitten is gone, so expressing sadness is the natural reply.",
   {0:"\"Someone else adopted\" - the visitor gets no kitten, so the litter box is pointless.",2:"\"adopted that kitten yesterday\" - a statement, not a which-day question.",3:"\"Someone else adopted\" - the visitor will not name it, so there is nothing to rethink."}),
 W("question","choosing a day","Which day works for our home visit, Saturday or Sunday?","The first one, I'm busy on the second.","The staff ask which day, so picking one is the natural reply.",
   {0:"\"our home visit\" - the check is still to come, so nothing is approved yet.",1:"\"Which day works\" - the adoption is going ahead, so nothing was lost.",3:"\"Saturday or Sunday\" - a which-question, not a correction about the kitten."}),
 W("correction","reacting to a corrected detail","Actually, she's a female, not a male like the card says.","Oh, then I'll have to rethink her name.","The kitten's sex was wrong, so changing the planned name is the natural reply.",
   {0:"\"not a male like\" - a correction, not news of an approval.",1:"\"Actually, she's a\" - she is still there to adopt, so nothing is lost.",2:"\"she's a female\" - a statement, not a which-day question."})])

item("cr15-a11","community center room rental desk, clerk to resident",[
 W("neutral info","judging capacity","The hall holds sixty people and comes with folding tables.","That's plenty for our club's dinner.","A capacity is given, so judging it big enough is the natural reply.",
   {1:"\"holds sixty people\" - no closing time is set, so \"anyway\" answers no deadline.",2:"\"The hall holds\" - a statement, not an offer.",3:"\"holds sixty people\" - no price was corrected, so no budget changes."}),
 W("request","agreeing to a deadline","Please return the key to this desk by nine p.m.","Sure, our event wraps up around seven anyway.","A return time is set, so confirming it is easy to meet is the natural reply.",
   {0:"\"return the key\" - no size is given, so \"plenty\" measures nothing.",2:"\"Please return the\" - an instruction, not an offer to accept.",3:"\"by nine p.m.\" - a time, not a price, so no budget changes."}),
 W("offer","accepting a hold","I can hold the room for you until Friday.","Yes, please, I need to check with my group.","The clerk offers a hold, so accepting it is the natural reply.",
   {0:"\"hold the room\" - no size is given, so \"plenty\" measures nothing.",1:"\"until Friday\" - a booking hold, not an evening deadline for the event.",3:"\"I can hold\" - no price was corrected, so no budget changes."}),
 W("correction","reacting to a higher price","Sorry, the rental's eighty dollars an hour, not per day.","Wow, that changes my budget quite a bit.","The cost is far higher, so worry about the budget is the natural reply.",
   {0:"\"eighty dollars an hour\" - a price, not a size, so \"plenty\" measures nothing.",1:"\"the rental's eighty\" - no return time is set.",2:"\"Sorry, the rental's\" - a correction, not an offer."})])

item("cr15-a12","science museum ticket desk, cashier to visitor",[
 W("good news","welcoming a discount","Kids under twelve get in free this weekend.","Great, that saves us quite a bit.","Children are free, so welcoming the saving is the natural reply.",
   {1:"\"get in free\" - nothing is closed, so no exhibit is missed.",2:"\"Kids under twelve\" - a statement, not a which-show question.",3:"\"get in free\" - no closing time is corrected, so no need to rush."}),
 W("bad news","reacting to a closure","The dinosaur hall is closed for renovation this month.","Shame, my son only came for the fossils.","The main exhibit is shut, so disappointment is the natural reply.",
   {0:"\"is closed for renovation\" - bad news, so there is no saving.",2:"\"The dinosaur hall\" - a statement, not a which-show question.",3:"\"this month\" - no closing time is corrected, so no need to rush."}),
 W("question","choosing a showtime","Which planetarium show do you want, the two o'clock or the four?","The later one, so we can eat lunch first.","The cashier asks which show, so picking one is the natural reply.",
   {0:"\"Which planetarium show\" - a question; no price or saving is mentioned.",1:"\"do you want\" - shows are on offer, so nothing is closed.",3:"\"the two o'clock\" - a choice of time; the visit is not cut short."}),
 W("correction","reacting to an earlier closing","Sorry, we close at five today, not six.","Oh, then we'll have to rush a bit.","The museum closes earlier than expected, so planning to hurry is the natural reply.",
   {0:"\"we close at five\" - a time, not a price, so nothing is saved.",1:"\"not six\" - only the hours change; no exhibit is closed.",2:"\"we close at\" - a correction, not a which-show question."})])

item("cr15-a13","warehouse loading dock, supervisor to temp worker",[
 W("request","asking for equipment","Scan every box before you stack it on the pallet.","Got it, where do I find the handheld reader?","The supervisor requires scanning, so asking for the device is the natural reply.",
   {1:"\"Scan every box\" - no delivery is named, so \"it\" refers to nothing to unload.",2:"\"Scan every box\" - an instruction, not an offer, so \"Please do\" accepts nothing.",3:"\"before you stack it\" - the job is continuing, so no new job is needed."}),
 W("neutral info","planning around an arrival","The truck from Denver usually pulls in around noon.","So I'll take my lunch after it's unloaded.","A delivery time is given, so planning lunch around it is the natural reply.",
   {0:"\"usually pulls in\" - nothing needs scanning yet, so no reader is needed.",2:"\"The truck from\" - a statement, not an offer.",3:"\"The truck from Denver\" - work goes on, so no new job is needed."}),
 W("offer","accepting a schedule change","I can switch you to the morning crew, if you want.","Please do, early hours suit me much better.","A crew change is offered, so accepting it is the natural reply.",
   {0:"\"I can switch\" - an offer, not an instruction needing a reader.",1:"\"the morning crew\" - no delivery is named, so \"it\" refers to nothing.",3:"\"switch you to\" - the worker is being kept on, so no new job is needed."}),
 W("bad news","reacting to losing a job","Your agency says they can't keep you after this week.","Oh, then I'll need to find another job.","The placement is ending, so looking for other work is the natural reply.",
   {0:"\"can't keep you\" - news, not an instruction needing a reader.",1:"\"after this week\" - no delivery is named, so \"it\" refers to nothing.",2:"\"can't keep you\" - nothing is offered, so \"Please do\" accepts nothing."})])

item("cr15-a14","car wash, attendant to driver",[
 W("good news","reacting to a free service","Your free wash coupon is still valid, so there's no charge.","Nice, I was sure it had already expired.","The coupon works, so surprise that it is still good is the natural reply.",
   {1:"\"Your free wash coupon\" - a statement, not a choice between washes.",2:"\"no charge\" - no wait is mentioned, so there is no lounge time.",3:"\"still valid\" - no instruction about mirrors, so no button is needed."}),
 W("question","choosing a package","Do you want the basic wash or the deluxe with wax?","The fancy one, I've got a wedding tomorrow.","The attendant asks which wash, so picking one is the natural reply.",
   {0:"\"Do you want the\" - no coupon is mentioned, so nothing expired.",2:"\"the basic wash or\" - no wait is mentioned.",3:"\"Do you want\" - a question, not an instruction about mirrors."}),
 W("correction","adjusting to a longer wait","Sorry, it's a twenty-minute wait, not five like I said.","Then I'll go sit in the lounge, I guess.","The wait is longer, so planning to sit somewhere is the natural reply.",
   {0:"\"twenty-minute wait\" - a wait time, not a coupon.",1:"\"not five like\" - a correction, not a choice between washes.",3:"\"twenty-minute wait\" - nothing about mirrors, so no button is needed."}),
 W("request","explaining how to comply","Please fold in your mirrors before you drive in.","Sure, the button's by the steering wheel.","The driver is told to fold the mirrors, so saying how is the natural reply.",
   {0:"\"Please fold in\" - an instruction; no coupon is mentioned.",1:"\"before you drive in\" - an instruction, not a choice between washes.",2:"\"before you drive in\" - the driver goes in now, so no lounge wait."})])

item("cr15-a15","blood donation center check-in, nurse to donor",[
 W("bad news","planning after being turned away","Your iron's a little low, so you can't donate today.","Oh, I'll eat more spinach and try next month.","The donor is refused today, so planning to return is the natural reply.",
   {1:"\"can't donate today\" - there is no process today, so free time is irrelevant.",2:"\"can't donate today\" - nothing is offered, so \"Yes, please\" accepts nothing.",3:"\"can't donate\" - no arm is being chosen."}),
 W("neutral info","confirming time","The whole process takes about forty-five minutes.","That's fine, I've got the afternoon free.","The duration is given, so confirming there is time is the natural reply.",
   {0:"\"The whole process takes\" - the donor can go ahead, so no need to try next month.",2:"\"takes about forty-five\" - a statement, not an offer.",3:"\"The whole process\" - no arm is being chosen."}),
 W("offer","accepting a snack","Would you like juice and cookies while you rest?","Yes, please, I'm feeling a little dizzy.","Refreshments are offered, so accepting is the natural reply.",
   {0:"\"while you rest\" - the donation happened, so there is no next month to try.",1:"\"Would you like\" - an offer; no duration is given, so there is nothing to have time for.",3:"\"juice and cookies\" - nothing asks which arm."}),
 W("question","choosing an arm","Which arm do you usually give from, left or right?","Whichever isn't my writing hand, please.","The nurse asks which arm, so stating a preference is the natural reply.",
   {0:"\"usually give from\" - the donation is going ahead today.",1:"\"Which arm\" - a which-question; no duration is given.",2:"\"left or right\" - an either/or question; nothing is offered."})])

item("cr15-a16","tax preparation office, preparer to client",[
 W("good news","planning a windfall","You're getting a refund of about four hundred dollars.","Wonderful, that'll cover my car repair.","Money is coming back, so planning to spend it is the natural reply.",
   {1:"\"getting a refund\" - money comes in, so no savings are needed.",2:"\"about four hundred dollars\" - no date was corrected, so nothing is sooner.",3:"\"You're getting a\" - nothing is requested, so \"it\" refers to nothing to find."}),
 W("bad news","accepting a payment","You'll owe the government around two hundred, unfortunately.","Ouch, I'll have to dip into my savings.","Money is owed, so planning how to pay is the natural reply.",
   {0:"\"You'll owe\" - money goes out, so nothing pays for a repair.",2:"\"around two hundred\" - an amount, not a corrected date.",3:"\"You'll owe the government\" - nothing is requested, so \"it\" refers to nothing."}),
 W("correction","reacting to an earlier deadline","Actually, the deadline is the fifteenth, not the thirtieth.","Oh, that's sooner than I'd planned for.","The deadline is earlier, so noting that is the natural reply.",
   {0:"\"the deadline is\" - a date, not a refund to spend.",1:"\"the fifteenth, not\" - a date, not an amount owed.",3:"\"the deadline is\" - nothing is requested, so \"it\" refers to nothing to find."}),
 W("request","agreeing to bring a document","Please bring last year's return to our next meeting.","Sure, I'll dig it out of my files.","A document is requested, so agreeing to find it is the natural reply.",
   {0:"\"Please bring last\" - a request; no money is coming back.",1:"\"Please bring\" - a request; no amount is owed.",2:"\"our next meeting\" - no deadline was corrected."})])

item("cr15-a17","restaurant kitchen, head chef to new line cook",[
 W("question","choosing a station","Which station are you better at, the grill or salads?","The hot side, I've done burgers for years.","The chef asks which station, so picking one is the natural reply.",
   {1:"\"Which station\" - a question; no lesson is offered.",2:"\"are you better at\" - a question; no number of diners is given.",3:"\"the grill or salads\" - nothing was lost, so the menu needn't change."}),
 W("offer","accepting a lesson","I can show you how to fillet the salmon before service.","Yes, I've never quite gotten the hang of that.","The chef offers a demonstration, so accepting is the natural reply.",
   {0:"\"I can show\" - an offer, not a which-station question.",2:"\"before service\" - no number of diners is given, so nothing sounds hectic.",3:"\"fillet the salmon\" - there is fish to cut, so nothing was lost."}),
 W("neutral info","reacting to volume","We usually serve about two hundred covers on Fridays.","Wow, so it gets pretty hectic in here.","A busy service is described, so remarking on it is the natural reply.",
   {0:"\"We usually serve\" - a statement, not a which-station question.",1:"\"about two hundred covers\" - a statement, not an offer.",3:"\"We usually serve\" - nothing was lost, so no change to the menu."}),
 W("bad news","checking a consequence","The walk-in fridge broke, so we lost all the seafood.","So we'll need to change tonight's menu?","Ingredients are gone, so asking about the menu is the natural reply.",
   {0:"\"fridge broke\" - news, not a which-station question.",1:"\"lost all the seafood\" - there is no fish to learn on.",2:"\"walk-in fridge broke\" - a loss, not a description of a busy night."})])

item("cr15-a18","city hall permit counter, clerk to resident",[
 W("good news","welcoming an approval","Your fence permit's been signed off, so you can start building.","Great, my contractor is eager to begin.","The permit is approved, so welcoming it is the natural reply.",
   {1:"\"been signed off\" - approval is done, so there is nothing to hold off for.",2:"\"been signed off\" - nothing more is requested, so \"that\" refers to nothing.",3:"\"you can start building\" - no fee was corrected, so nobody is short."}),
 W("neutral info","planning around a delay","Permits like this usually take two to three weeks to process.","So I'll hold off on hiring anyone till then.","Approval will take weeks, so waiting is the natural reply.",
   {0:"\"take two to three weeks\" - not approved yet, so the contractor still waits.",2:"\"usually take two\" - nothing is requested, so \"that\" refers to nothing.",3:"\"to process\" - no fee was corrected, so nobody is short."}),
 W("request","asking about a requirement","Please attach a drawing showing where the fence will go.","Sure, does a hand sketch work for that?","A drawing is required, so asking if a sketch is enough is the natural reply.",
   {0:"\"Please attach a\" - the application is incomplete, so nothing is approved.",1:"\"Please attach a drawing\" - no processing time is given, so \"till then\" refers to nothing.",3:"\"Please attach\" - no fee was corrected, so nobody is short."}),
 W("correction","adjusting to a higher fee","Sorry, the fee is sixty dollars, not forty.","Oh, then I'm twenty short, just a second.","The fee is higher, so finding more money is the natural reply.",
   {0:"\"the fee is\" - only a price; nothing is approved.",1:"\"sixty dollars, not forty\" - a price, not a waiting time.",2:"\"the fee is sixty\" - nothing is requested, so \"that\" refers to nothing."})])

item("cr15-a19","butcher shop counter, butcher to customer",[
 W("question","choosing a thickness","How thick do you want the steaks, one inch or two?","The thinner cut, they cook faster.","The butcher asks how thick, so picking one is the natural reply.",
   {1:"\"How thick do\" - a question; nothing is offered to grind.",2:"\"How thick do you want\" - meat is available, so nothing is missing.",3:"\"one inch or two\" - a cutting question; no cooking time is set."}),
 W("offer","accepting a service","I can grind that chuck into burger meat for you.","Please do, we're grilling this weekend.","The butcher offers to grind the meat, so accepting is the natural reply.",
   {0:"\"I can grind\" - an offer, not a thickness question.",2:"\"grind that chuck\" - the meat is here, so nothing is missing.",3:"\"into burger meat\" - burgers cook fast, so no noon start."}),
 W("bad news","reacting to a missing item","We're out of lamb chops until the Tuesday delivery.","Shoot, I wanted those for my mom's birthday.","The wanted cut is unavailable, so disappointment is the natural reply.",
   {0:"\"We're out of\" - nothing to cut, so no thickness choice.",1:"\"We're out of lamb\" - nothing is offered.",3:"\"We're out of\" - nothing to cook, so no noon start."}),
 W("neutral info","planning cooking time","That brisket needs about six hours in a slow oven.","Then I'd better get it in by noon.","A long cook is described, so planning an early start is the natural reply.",
   {0:"\"That brisket needs\" - a statement, not a thickness question.",1:"\"needs about six hours\" - a statement, not an offer.",2:"\"That brisket needs\" - the meat is in hand, so nothing is missing."})])

item("cr15-a20","recruitment agency office, recruiter to job seeker",[
 W("good news","reacting to a callback","The bank wants you back for a second interview.","Fantastic, the first one must've gone well.","A callback came, so inferring the first went well is the natural reply.",
   {1:"\"wants you back\" - news, not a request to update anything.",2:"\"The bank wants\" - news, not an offer, so \"That'd be great\" accepts nothing.",3:"\"a second interview\" - no salary figure was corrected."}),
 W("request","agreeing to an update","Please update your résumé with your latest job.","Sure, I'll add my current position tonight.","An update is requested, so agreeing to it is the natural reply.",
   {0:"\"Please update your\" - a request; no interview result is reported.",2:"\"Please update\" - a request, not an offer.",3:"\"your latest job\" - no salary figure was corrected."}),
 W("offer","accepting help","I could set up a mock interview with you tomorrow.","That'd be great, I could use the practice.","Practice is offered, so accepting it is the natural reply.",
   {0:"\"set up a mock\" - a practice offer; no result from any interview is reported.",1:"\"I could set\" - an offer, not a request to update anything.",3:"\"a mock interview\" - no salary figure was corrected."}),
 W("correction","reacting to a lower figure","Sorry, the salary's forty thousand, not fifty like I said.","Hmm, that's less than I was hoping for.","The pay is lower, so mild disappointment is the natural reply.",
   {0:"\"the salary's forty\" - a figure, not an interview result.",1:"\"not fifty like\" - a correction, not a request.",2:"\"Sorry, the salary's\" - a correction, not an offer."})])

json.dump({"cohort":"cr-v15","stage":"crv7-method batch 11a (seed offset 1100)","method":"four-world, seeded post-hoc selection (render-crv7.mjs)","items":Q},open('crv7-b11a-quads.json','w'),indent=1,ensure_ascii=False)
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
print('acts max',Counter(w['keyAct'] for it in Q for w in it['worlds']).most_common(3))
