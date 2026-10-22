import json
def W(kind,act,line,reply,expl,kills): return {"kind":kind,"keyAct":act,"line":line,"reply":reply,"explanationIfSpoken":expl,"kills":{str(k):v for k,v in kills.items()}}
Q=[]
def item(lid,setting,ws): Q.append({"localId":lid,"setting":setting,"worlds":ws})
# b10 rule: every kill names a FACT in the line that the other reply contradicts or presupposes falsely.

item("cr14-b01","car rental counter",[
 W("good news","welcoming a found item","Oh, we found the sunglasses you left in your last rental.","Thank goodness, I thought they were lost.","A lost item has turned up, so expressing relief that it was not lost is the natural reply.",{
  1:"\"we found the sunglasses\" - nothing has been declined or cancelled, so offering a replacement way to pay answers a problem the line does not have.",
  2:"\"we found the sunglasses\" is news, not a question; naming a day and time answers nothing that was asked.",
  3:"\"we found the sunglasses\" - no upgrade or bigger vehicle is on offer, so there is no \"bigger one\" to accept."}),
 W("bad news","replacing a payment method","I'm afraid your booking was cancelled because the card on file expired.","Oh, then let me pay with this other one.","The booking failed because of an expired card, so offering a different card is the natural reply.",{
  0:"\"booking was cancelled\" - nothing was found; relief about a lost item contradicts the bad news.",
  2:"\"booking was cancelled\" - there is no rental to bring back, and no return day was asked.",
  3:"\"booking was cancelled\" - with no booking there is no vehicle, let alone a bigger one, to accept."}),
 W("question","giving a return day","What day are you planning to bring it back to us?","Sunday evening, around six if possible.","The agent asks for a return day, so naming one is the natural reply.",{
  0:"\"What day are you planning\" asks for a day; relief about something lost answers nothing asked.",
  1:"\"What day are you planning\" - the rental is going ahead, so no failed payment needs replacing.",
  3:"\"What day are you planning\" asks a when-question; accepting a bigger vehicle answers an offer that was never made."}),
 W("offer","accepting an upgrade","We can upgrade you to an SUV at no extra charge today.","Sure, the bigger one sounds great.","A free upgrade is offered, so accepting the larger vehicle is the natural reply.",{
  0:"\"upgrade you to an SUV\" - nothing was lost or found, so relief that something turned up is nonsensical.",
  1:"\"at no extra charge\" - nothing is being charged, so offering another way to pay contradicts the line.",
  2:"\"We can upgrade you\" is an offer, not a question about when the car comes back; a day and time answers nothing."})])

item("cr14-b02","locksmith key-cutting counter",[
 W("question","giving a quantity","How many copies of each key would you like today?","Two of the front door, one of the garage.","The locksmith asks how many, so giving the numbers is the natural reply.",{
  1:"\"would you like today\" - the work can be done today, so planning to come back on Saturday presupposes a delay that does not exist.",
  2:"\"How many copies\" asks for a number; \"Sure, just the letters\" accepts an engraving offer that was never made.",
  3:"\"How many copies of each key\" - nothing has been cut yet, so a reaction to a finished, working copy is impossible."}),
 W("bad news","rescheduling after a shortage","We're out of blanks for that brand until Friday's delivery.","Then I'll swing by again on Saturday.","No copies can be cut until the Friday delivery, so planning to return after it is the natural reply.",{
  0:"\"We're out of blanks\" - no copies can be cut, so ordering a number of them contradicts the line.",
  2:"\"out of blanks\" - no key will be made today, so there is nothing to engrave and no engraving was offered.",
  3:"\"out of blanks\" - no new copy exists, so relief that it works is impossible."}),
 W("offer","accepting an add-on","We can also engrave your initials on them for a dollar each.","Sure, just the letters J and K.","Engraving is offered, so accepting and giving the letters is the natural reply.",{
  0:"\"engrave your initials\" asks about initials; a count of door and garage keys answers a different question.",
  1:"\"We can also engrave\" - the job is going ahead now, so nothing is delayed until a Saturday return.",
  3:"\"We can also engrave\" is an offer about lettering; nothing has been tested, so relief that it works has no basis."}),
 W("good news","reacting to a successful test","I tested your new key in our lock and it turns smoothly.","What a relief, the last copy never worked.","The new key has been tested and works, so relief is the natural reply.",{
  0:"\"your new key\" is already cut and tested; no count of copies is being asked for.",
  1:"\"I tested your new key\" - the key exists, so a return trip after a shortage contradicts the line.",
  2:"\"it turns smoothly\" is a report, not an offer; there is no engraving for \"Sure\" to accept."})])

item("cr14-b03","tailor's alteration shop",[
 W("question","specifying a measurement","How much shorter do you want the sleeves, roughly?","About two centimetres, just above the wrist.","The tailor asks how much, so giving a measurement is the natural reply.",{
  1:"\"How much shorter do you\" - the alteration is possible; a belt as a workaround presupposes a refusal that was not made.",
  2:"\"How much shorter\" - nothing has been altered yet, so asking to try a finished suit on contradicts the line.",
  3:"\"How much shorter do you want\" asks for an amount; excusing a delay answers news that was never given."}),
 W("bad news","choosing a workaround","We can't take the dress in any further without ruining the seams.","Then I'll just wear a belt with it.","The tailor refuses to take the dress in more, so a workaround is the natural reply.",{
  0:"\"We can't take the dress in\" - no alteration is going ahead, so there is no measurement to give.",
  2:"\"We can't take the dress\" - nothing has been finished, so a cheerful request to try it on contradicts the refusal.",
  3:"\"We can't take the dress in\" is a refusal, not a delay; saying the wedding date leaves time misreads it."}),
 W("good news","trying on finished work","Your suit's finished early, so you can try it on now.","Wonderful, where's the fitting room?","The suit is ready now, so asking where to try it on is the natural reply.",{
  0:"\"Your suit's finished early\" - the work is done, so a measurement for sleeves is no longer being asked for.",
  1:"\"Your suit's finished early\" - nothing was refused, so a belt as a fallback contradicts the good news.",
  3:"\"finished early\" - nothing is late, so \"That's fine\" excuses a delay that does not exist."}),
 W("correction","accepting a later date","Sorry, I said Monday, but the jacket will be ready Wednesday.","That's fine, the wedding isn't until Saturday.","The ready date moved later, so saying the new date still works is the natural reply.",{
  0:"\"will be ready Wednesday\" is a date correction; no measurement is being asked for.",
  1:"\"the jacket will be ready\" - the alteration is happening, so a workaround for a refused job contradicts the line.",
  2:"\"will be ready Wednesday\" - it is not ready now, so there is nothing to try on in a fitting room."})])

item("cr14-b04","tire shop",[
 W("bad news","authorising a replacement","That tire has a nail in the sidewall, so it can't be patched.","Then go ahead and put on a new one.","The tire cannot be repaired, so approving a replacement is the natural reply.",{
  1:"\"it can't be patched\" - there is damage, so relief about a small bill contradicts the line.",
  2:"\"a nail in the sidewall\" is a repair finding, not a question about a pickup time.",
  3:"\"it can't be patched\" is bad news, not an offer; \"Sure\" accepts nothing."}),
 W("good news","reacting to a cheap fix","Your tires are fine, they just needed a bit more air.","That's a relief, I was expecting a big bill.","The tires only needed air, so relief at the small cost is the natural reply.",{
  0:"\"Your tires are fine\" - nothing needs replacing, so ordering a new one contradicts the line.",
  2:"\"Your tires are fine\" is a report, not a question about when the car is needed.",
  3:"\"just needed a bit more air\" makes no offer for \"Sure\" to accept."}),
 W("question","giving a deadline","What time do you need the car back by this afternoon?","By three, I have to collect my kids.","The mechanic asks for a time, so naming a deadline is the natural reply.",{
  0:"\"What time do you need\" asks for a time; nothing has been found that needs replacing.",
  1:"\"What time do you need\" - the work is not done, so relief about the bill has nothing to react to.",
  3:"\"What time do you need\" asks a when-question; \"Sure\" accepts an offer that was never made."}),
 W("offer","accepting a free check","We're doing free wheel alignment checks this week, if you'd like one.","Sure, it has been pulling to the left.","A free alignment check is offered, so accepting it with a reason is the natural reply.",{
  0:"\"free wheel alignment checks\" - an alignment check is not something you put on new.",
  1:"\"free wheel alignment checks\" - no work has been done or billed, so relief about the bill is premature.",
  2:"\"if you'd like one\" is an offer; a pickup time does not answer it."})])

item("cr14-b05","florist",[
 W("question","dictating a message","What would you like written on the card?","Happy anniversary, with love from Sam.","The florist asks what to write, so dictating the message is the natural reply.",{
  1:"\"written on the card\" - the order is going ahead now, so planning to come back tomorrow presupposes a refusal.",
  2:"\"What would you like written\" asks for words, not about a vase.",
  3:"\"What would you like written\" - nothing has been made yet, so telling the venue it is on its way contradicts the line."}),
 W("bad news","returning another day","Sorry, we're closing, so I can't make up a fresh bouquet tonight.","Okay, I'll come back first thing tomorrow, then.","The shop is closing, so planning to return tomorrow is the natural reply.",{
  0:"\"I can't make up\" - no bouquet is being made, so there is no card message to dictate.",
  2:"\"I can't make up\" - with no bouquet there is nothing to add a vase to, and none was offered.",
  3:"\"we're closing\" - nothing is being sent, so telling the venue flowers are coming contradicts the line."}),
 W("offer","accepting an add-on","We can add a small vase for five dollars, if you like.","Sure, a glass one would be lovely.","A vase is offered, so accepting and choosing one is the natural reply.",{
  0:"\"add a small vase\" is an offer; a card message answers a different question.",
  1:"\"We can add a small vase\" - the order is going ahead tonight, so coming back tomorrow contradicts it.",
  3:"\"if you like\" is an offer awaiting an answer; nothing has been dispatched for the venue to expect."}),
 W("good news","passing on news","Your wedding flowers came out beautifully, and the van's leaving with them now.","Great, I'll let the venue know they're coming.","The flowers are on their way, so alerting the venue is the natural reply.",{
  0:"\"the van's leaving with them\" - the order is finished, so dictating a card message now is too late.",
  1:"\"the van's leaving with them\" - the flowers are done and going out, so coming back tomorrow contradicts the line.",
  2:"\"came out beautifully\" is a report, not an offer; \"Sure\" accepts nothing."})])

item("cr14-b06","bakery cake-order counter",[
 W("question","choosing a flavor","What flavor would you like for the birthday cake?","Chocolate with a raspberry filling, please.","The baker asks which flavor, so choosing one is the natural reply.",{
  1:"\"What flavor would you like\" - nothing has been baked, so asking how long a second attempt takes contradicts it.",
  2:"\"What flavor would you like\" - the cake has not been made, so it cannot be carried out to the car.",
  3:"\"What flavor would you like\" asks for a flavor, not for a deposit; how to pay answers nothing asked."}),
 W("bad news","asking about a remake","Your cake fell over in the oven, so we're baking another.","Oh dear, how long will the second take?","The cake failed and a new one is being baked, so asking how long it will take is the natural reply.",{
  0:"\"so we're baking another\" - the order is already set, so choosing a flavor now answers nothing.",
  2:"\"Your cake fell over\" - there is no finished cake to carry out to the car.",
  3:"\"we're baking another\" - no payment is requested, so asking which payment method is accepted answers nothing."}),
 W("good news","collecting an order","The cake's paid for, decorated and boxed, so it's ready now.","Perfect, I parked right by the door.","The cake is ready and paid, so preparing to carry it out is the natural reply.",{
  0:"\"decorated and boxed\" - the cake is finished, so choosing a flavor is impossible.",
  1:"\"it's ready now\" - nothing went wrong, so asking about a second attempt contradicts the line.",
  3:"\"The cake's paid for\" - no payment is due, so asking whether cash is accepted contradicts it."}),
 W("request","arranging payment","We'll need a twenty-dollar deposit before we can start on it.","Is cash all right, or do you take cards?","A deposit is requested, so asking how to pay is the natural reply.",{
  0:"\"We'll need a twenty-dollar deposit\" asks for money, not a flavor choice.",
  1:"\"before we can start\" - nothing has been baked, so there is no failed first cake and no second one.",
  2:"\"before we can start on it\" - no cake exists yet, so there is nothing to carry to the car."})])

item("cr14-b07","passport photo studio",[
 W("bad news","apologising for a retake","Your eyes were closed in that one, so we'll need to reshoot.","Sorry about that, I'll try not to blink.","The photo failed because the eyes were shut, so apologising and promising not to blink is the natural reply.",{
  1:"\"we'll need to reshoot\" - the photo failed, so planning to file the application today contradicts the line.",
  2:"\"Your eyes were closed\" is a problem report, not a question about which country.",
  3:"\"Your eyes were closed\" - the problem is blinking, not hair, so fetching a hair tie fixes nothing raised."}),
 W("good news","moving ahead with a plan","These came out sharp, and they meet every passport rule.","Great, so the application can go in today.","The photos are acceptable, so planning to send the application is the natural reply.",{
  0:"\"These came out sharp\" - nothing went wrong, so apologising for blinking contradicts the line.",
  2:"\"they meet every passport rule\" is a verdict, not a question about the destination country.",
  3:"\"These came out sharp\" - the photos are done, so preparing hair for a shot contradicts the line."}),
 W("question","naming a destination","What country are these photos for, so I get the size right?","Japan, I'm applying for a work visa there.","The photographer asks which country, so naming it is the natural reply.",{
  0:"\"What country are these\" asks a which-question; no failed shot has been mentioned to apologise for.",
  1:"\"so I get the size right\" - the photos are not done, so saying the application can go today is premature.",
  3:"\"What country are these\" asks for a country; \"Sure\" agrees to a request that was never made."}),
 W("request","complying with an instruction","Please take off your glasses and pull your fringe off your face.","Sure, hold on while I find a hair tie.","The photographer asks for hair to be tucked back, so complying is the natural reply.",{
  0:"\"Please take off your glasses\" - no photo has been taken yet, so apologising for blinking in one is impossible.",
  1:"\"Please take off your glasses\" - the shot has not happened, so declaring the application ready contradicts it.",
  2:"\"Please take off your glasses\" is an instruction, not a question about a country."})])

item("cr14-b08","driver's license office",[
 W("bad news","fixing a missing document","That utility bill is from last year, so it won't count as proof.","I'll go home and print a newer one.","The document is too old, so fetching a newer one is the natural reply.",{
  1:"\"it won't count as\" - the application is blocked, so asking for a road-test slot contradicts the line.",
  2:"\"That utility bill is\" is a ruling on a document, not a question about a ticket number.",
  3:"\"it won't count as proof\" is a refusal, not an instruction to pose for a photo."}),
 W("good news","booking the next step","You passed the written test, so you can book your road test.","Brilliant, when's the earliest slot?","The written test is passed, so asking for the earliest road test is the natural reply.",{
  0:"\"You passed the written\" - nothing was rejected, so going home for a new document contradicts the line.",
  2:"\"You passed the written test\" is a result, not a question about a ticket number.",
  3:"\"so you can book\" invites booking; nobody is being photographed, so a hat question is nonsensical."}),
 W("question","giving a ticket number","What's your ticket number? I'll see if you're next.","It's eighty-seven, I've been here an hour.","The clerk asks for a number, so giving it is the natural reply.",{
  0:"\"What's your ticket number?\" - no document has been rejected, so going home to replace one is unprompted.",
  1:"\"I'll see if you're next\" - the applicant has not been served yet, so no test has been passed to book after.",
  3:"\"What's your ticket number?\" asks a which-question; a hat question answers nothing asked."}),
 W("request","checking an instruction","Please stand on the line and look straight at the camera.","Should I take my hat off first?","The clerk is about to take a photo, so asking about the hat is the natural reply.",{
  0:"\"look straight at the camera\" - the process is going ahead, so nothing was rejected and nothing must be fetched.",
  1:"\"Please stand on the line\" is an instruction for a photo; no test result has been given.",
  2:"\"Please stand on the line\" gives an instruction; nobody asked for a ticket number."})])

item("cr14-b09","hotel front desk",[
 W("good news","welcoming an upgrade","Your room's ready, and we've upgraded you to a suite for free.","How generous, we'll enjoy the extra space.","A free upgrade has been given, so appreciating it is the natural reply.",{
  1:"\"Your room's ready\" - the reservation was found, so suggesting another surname to search under contradicts it.",
  2:"\"Your room's ready\" is news, not a question about checkout time.",
  3:"\"upgraded you to a suite for free\" - nothing costs extra, so declining a paid meal answers an offer not made."}),
 W("bad news","helping a search","I'm sorry, we have no record of your reservation under that name.","Oh, try my husband's surname instead.","The booking cannot be found, so suggesting another name to search is the natural reply.",{
  0:"\"no record of your reservation\" - there is no room yet, let alone an upgraded one, to enjoy.",
  2:"\"no record of your reservation\" - with no booking found there is no stay to check out of, and no time was asked.",
  3:"\"no record of your reservation\" - nothing was offered, so declining a meal answers nothing."}),
 W("question","giving a checkout time","What time are you planning to check out on Sunday?","Around noon, if that isn't too late.","The clerk asks a time, so naming one is the natural reply.",{
  0:"\"What time are you planning\" asks a when-question; praising extra space answers nothing asked.",
  1:"\"What time are you planning\" - the booking is in hand, so searching under another surname contradicts it.",
  3:"\"What time are you planning\" is a question, not an offer of breakfast to decline."}),
 W("offer","declining an add-on","Breakfast is served until ten, and we can add it for fifteen dollars.","No, thanks, we'll eat at the café nearby.","Paid breakfast is offered, so declining it is a natural reply.",{
  0:"\"add it for fifteen dollars\" - this costs money; \"How generous\" thanks a free gift that was not given.",
  1:"\"we can add it\" - the stay is on record, so there is no missing reservation to search for.",
  2:"\"served until ten\" - noon falls after it, and no checkout time was asked."})])

item("cr14-b10","nail salon",[
 W("question","choosing a color","Which color would you like? The samples are on the wall.","That deep red in the corner, please.","The technician asks which color, so pointing one out is the natural reply.",{
  1:"\"Which color would you like?\" - the appointment is going ahead now, so asking to come tomorrow contradicts it.",
  2:"\"Which color would you like?\" asks a which-question; nothing was offered for \"Yes, please\" to accept.",
  3:"\"Which color would you like?\" - no payment has been mentioned, so there is no gift card for \"that\" to refer to."}),
 W("bad news","rebooking","Sorry, your technician called in sick, and we're fully booked today.","Could I come in tomorrow morning instead?","No one can see the client today, so asking for tomorrow is the natural reply.",{
  0:"\"we're fully booked today\" - there will be no manicure today, so choosing a color contradicts the line.",
  2:"\"fully booked today\" - no service is happening, so accepting a massage during drying is impossible.",
  3:"\"called in sick\" is bad news; there is no gift card for \"that\" to refer to."}),
 W("offer","accepting a free extra","Would you like a free hand massage while your polish dries?","Yes, please, my wrists are sore from typing.","A free massage is offered, so accepting with a reason is the natural reply.",{
  0:"\"while your polish dries\" - the polish is already on, so choosing a color is too late.",
  1:"\"while your polish dries\" - the service is under way, so rebooking for tomorrow contradicts the line.",
  3:"\"Would you like a free\" is an offer; saying who gave \"that\" refers to no gift card."}),
 W("good news","explaining a gift","Your gift card covers the whole visit, so there's nothing to pay.","Oh lovely, my sister gave me that for my birthday.","The gift card pays for everything, so saying who gave it is the natural reply.",{
  0:"\"covers the whole visit\" - the visit is over and being settled, so choosing a color is too late.",
  1:"\"covers the whole visit\" - the visit happened, so asking to come tomorrow instead contradicts the line.",
  2:"\"there's nothing to pay\" is a statement, not an offer for \"Yes, please\" to accept."})])

item("cr14-b11","electronics store returns desk",[
 W("bad news","protesting a refusal","This screen is cracked, so we can't take it back.","But it was already broken when I opened it.","The return is refused because of damage, so protesting that it arrived damaged is the natural reply.",{
  1:"\"we can't take it back\" - the return is refused, so being pleased at a fast refund contradicts the line.",
  2:"\"This screen is cracked\" is a refusal, not a question about the box and charger.",
  3:"\"we can't take it back\" - the clerk has refused, not asked for a receipt."}),
 W("good news","reacting to a refund","Your refund's gone through, and it'll show on your card tomorrow.","Great, that's quicker than I expected.","The refund is done, so being pleased at the speed is the natural reply.",{
  0:"\"Your refund's gone through\" - the return was accepted, so protesting damage contradicts the line.",
  2:"\"Your refund's gone through\" is done, not a question about packaging.",
  3:"\"Your refund's gone through\" - the return is complete, so nothing more is needed and no receipt was asked for."}),
 W("question","answering about packaging","Do you still have the original box and the charger?","Only the cable, the packaging's long gone.","The clerk asks about the box and accessories, so saying what is left is the natural reply.",{
  0:"\"Do you still have\" asks a question; no damage has been raised to protest.",
  1:"\"Do you still have\" - the return is still being checked, so reacting to a finished refund is premature.",
  3:"\"the original box and the charger\" - a receipt is neither, so handing one over does not answer."}),
 W("request","handing over proof","I'll need the receipt or the card you paid with.","Here's the slip, it's a bit crumpled.","The clerk asks for proof of purchase, so handing over the receipt is the natural reply.",{
  0:"\"I'll need the receipt\" - the return is going ahead, so protesting a refusal contradicts the line.",
  1:"\"I'll need the receipt\" - nothing has been refunded yet, so reacting to the speed of one is premature.",
  2:"\"I'll need the receipt\" asks for proof of purchase, not about the box or charger."})])

item("cr14-b12","ferry terminal ticket booth",[
 W("bad news","asking about the next option","The noon ferry's cancelled because of high winds, sorry.","Will the afternoon crossing still run?","The ferry is cancelled, so asking about a later one is the natural reply.",{
  1:"\"The noon ferry's cancelled\" - there is no crossing to book bikes onto, and no question about vehicles was asked.",
  2:"\"The noon ferry's cancelled\" - nothing is leaving, so heading straight to the gate contradicts the line.",
  3:"\"cancelled because of high winds\" - no money was returned, so reacting to extra change is nonsensical."}),
 W("question","describing the party","Are you taking a car across, or just foot passengers?","Only the two of us, with our bikes.","The clerk asks what is travelling, so describing the party is the natural reply.",{
  0:"\"Are you taking a car\" - nothing has been cancelled, so asking whether a later crossing \"still\" runs presupposes a cancellation.",
  2:"\"Are you taking a car\" asks a question; nothing about space or a departure has been said.",
  3:"\"Are you taking a car\" - no change has been handed back, so there is nothing to have noticed."}),
 W("good news","hurrying to board","There's still space on the next sailing, which leaves in ten minutes.","Perfect, we'll head to the gate right away.","A sailing is about to leave with room, so hurrying to board is the natural reply.",{
  0:"\"There's still space\" - nothing is cancelled, so asking whether a later crossing \"still\" runs presupposes a cancellation.",
  1:"\"There's still space\" is news, not a question about a car or foot passengers.",
  3:"\"There's still space\" - no money changed hands, so there is no wrong change to have noticed."}),
 W("correction","acknowledging an error","Sorry, I gave you the wrong change, you're owed five more.","Oh, I hadn't even noticed, thanks.","The clerk corrects a mistake in the change, so acknowledging it is the natural reply.",{
  0:"\"gave you the wrong change\" - the ticket is already sold; no cancellation was announced.",
  1:"\"you're owed five more\" is a correction about money, not a question about vehicles.",
  2:"\"gave you the wrong change\" - nothing about space or a departure was said, so rushing to the gate answers nothing."})])

item("cr14-b13","watch repair shop",[
 W("bad news","mourning a loss","The part for this model is discontinued, so it can't be fixed.","Oh no, it was my grandfather's, too.","The watch cannot be repaired, so expressing dismay at losing an heirloom is the natural reply.",{
  1:"\"it can't be fixed\" - it is still broken, so relief that the problem was small contradicts the line.",
  2:"\"it can't be fixed\" is a verdict, not a question about straps.",
  3:"\"it can't be fixed\" - there will be no repair, so making do \"till then\" presupposes a finish date that will never come."}),
 W("good news","reacting to a small fix","It only needed a new battery, so it's working again.","Oh, is that all? What a relief.","Only a battery was needed, so relief is the natural reply.",{
  0:"\"it's working again\" - nothing is lost, so mourning the watch contradicts the line.",
  2:"\"it's working again\" is news, not a question about straps.",
  3:"\"it's working again\" - there is no wait, so making do with an old one until a repair contradicts it."}),
 W("question","choosing a strap","Would you like the metal strap or the leather one?","Brown, please, it's softer on my wrist.","The jeweller asks which strap, so choosing one is the natural reply.",{
  0:"\"Would you like the metal\" - the work is going ahead, so mourning the watch as lost contradicts the line.",
  1:"\"Would you like the metal strap\" asks a which-question; \"Is that all?\" reacts to news never given.",
  3:"\"Would you like the metal strap\" asks for a choice; nothing about a wait was said."}),
 W("neutral info","accepting a wait","Repairs take three weeks here, and we need payment upfront.","Fine, I'll wear my old one till then.","The repair will take weeks, so making do with another watch until then is the natural reply.",{
  0:"\"Repairs take three weeks\" - it will be repaired, so mourning it as lost contradicts the line.",
  1:"\"Repairs take three weeks\" - this is a long job, so \"Is that all?\" relief at a small fix contradicts it.",
  2:"\"we need payment upfront\" gives terms, not a choice between straps."})])

item("cr14-b14","community recreation center registration desk",[
 W("bad news","joining a waiting list","The Saturday swim class is full, but there's a waiting list.","Please put my daughter's name down, then.","The class is full with a waiting list, so asking to be added is the natural reply.",{
  1:"\"swim class is full\" - no group is being assigned, so no age was asked for.",
  2:"\"class is full\" is bad news; \"That really helps\" welcomes something that does not help.",
  3:"\"class is full\" - she cannot join, so no form is being collected."}),
 W("question","giving an age","How old is your child? The groups go by age.","She turned seven just last month.","The clerk asks the child's age, so giving it is the natural reply.",{
  0:"\"The groups go by\" - a place is being assigned, so nothing is full and no waiting list exists.",
  2:"\"How old is your child?\" is a question; \"That really helps, thank you\" thanks a favor not given.",
  3:"\"How old is your child?\" asks for an age, not for a form to be fetched."}),
 W("good news","thanking for help","Your fee waiver was approved, so the classes are free this term.","That really helps, thank you so much.","A fee waiver was approved, so thanking the clerk is the natural reply.",{
  0:"\"the classes are free\" - nothing is full, so asking for the waiting list contradicts the line.",
  1:"\"Your fee waiver was approved\" is news, not a question about age.",
  3:"\"the classes are free\" asks for nothing, so fetching \"it\" from the car has no referent."}),
 W("request","fetching a document","Before she joins, I need a signed medical form from you.","I left it in the car, I'll grab it.","The clerk asks for a form, so going to fetch it is the natural reply.",{
  0:"\"Before she joins\" - she is joining, so the class is not full and no waiting list applies.",
  1:"\"I need a signed medical form\" asks for a document, not an age.",
  2:"\"I need a signed\" makes a demand; \"That really helps, thank you\" thanks a favor not given."})])

item("cr14-b15","moving truck rental",[
 W("bad news","voicing a concern","We're out of small trucks today, only the biggest size is left.","Hmm, I've never driven anything that large.","Only the largest truck is left, so worrying about driving it is the natural reply.",{
  1:"\"only the biggest size\" is news about stock; nobody asked for a distance.",
  2:"\"We're out of small\" offers nothing; there are no blankets for \"those\" to mean.",
  3:"\"only the biggest size\" - nothing has been charged yet, so there is no total to have looked high."}),
 W("question","estimating distance","How many miles do you expect to drive in total?","About forty, it's just across town.","The agent asks the distance, so estimating it is the natural reply.",{
  0:"\"How many miles do you\" - nothing is said about truck size, so worrying about a large one has no basis.",
  2:"\"How many miles do you\" asks for a number; nothing was offered for \"those\" to mean.",
  3:"\"How many miles do you\" asks a question; no charge has been corrected."}),
 W("offer","accepting free extras","We can throw in furniture blankets and a dolly for free.","Oh, perfect, those will save my couch.","Free moving supplies are offered, so welcoming them is the natural reply.",{
  0:"\"We can throw in\" is an offer of supplies; nothing about a larger truck was said.",
  1:"\"We can throw in\" is an offer, not a question about miles.",
  3:"\"for free\" - nothing is being charged, so suspecting a high total contradicts it."}),
 W("correction","noticing an overcharge","Sorry, I charged you for two days, but it's only one.","Ah, I wondered why the total looked high.","The clerk corrects an overcharge, so saying the total seemed high is the natural reply.",{
  0:"\"I charged you for\" - the rental is already arranged; no size problem was raised.",
  1:"\"I charged you for two days\" corrects a charge; nobody asked for a distance.",
  2:"\"I charged you for\" is a correction, not an offer; there is nothing for \"those\" to mean."})])

item("cr14-b16","furniture store delivery desk",[
 W("question","choosing a delivery day","Which day works for delivery, Tuesday or Thursday?","The second, I'm out of town until Wednesday.","The clerk offers two days, so choosing the one that fits is the natural reply.",{
  1:"\"Which day works for\" - delivery is going ahead, so cancelling over a delay contradicts it.",
  2:"\"Tuesday or Thursday?\" asks for a choice of day; \"Wonderful... then\" reacts to news never given.",
  3:"\"Which day works for delivery\" asks a which-question; \"Good idea\" agrees to a suggestion never made."}),
 W("bad news","cancelling an order","The sofa you ordered is back-ordered until next month, I'm afraid.","Then I'd rather cancel and get a refund.","The sofa is delayed a month, so cancelling is the natural reply.",{
  0:"\"back-ordered until next month\" - nothing can be delivered this week, so choosing between two days contradicts it.",
  2:"\"back-ordered until next month\" - nothing is coming soon, so heading home at lunch for it contradicts the line.",
  3:"\"back-ordered until next month\" is bad news, not a suggestion for \"Good idea\" to agree to."}),
 W("good news","rearranging a schedule","Your table arrived early, and we can deliver it this afternoon.","Wonderful, I'll head home at lunch, then.","Delivery can happen today, so arranging to be home is the natural reply.",{
  0:"\"deliver it this afternoon\" - the day is already set, so picking between later days contradicts it.",
  1:"\"Your table arrived early\" - nothing is delayed, so cancelling for a refund contradicts the line.",
  3:"\"we can deliver it\" is news, not a suggestion for \"Good idea\" to agree with."}),
 W("request","agreeing to a suggestion","Please measure your doorway before we send the wardrobe out.","Good idea, it's a pretty narrow hallway.","The clerk suggests measuring, so agreeing with a reason is the natural reply.",{
  0:"\"Please measure your doorway\" is a request; it does not offer a choice of days.",
  1:"\"before we send the\" - delivery is going ahead, so cancelling over a delay contradicts it.",
  2:"\"before we send the wardrobe\" - no delivery time is set, so heading home at lunch has nothing to meet."})])

item("cr14-b17","internet provider store",[
 W("bad news","working around an outage","There's an outage in your area, so your internet's down until tonight.","I'll work from the library today, then.","The connection is down for the day, so planning to work elsewhere is the natural reply.",{
  1:"\"There's an outage in\" is news, not a choice between speeds.",
  2:"\"There's an outage\" is bad news; nothing about the bill going down was said.",
  3:"\"your internet's down until tonight\" - nothing was refunded, so a low bank balance explains nothing."}),
 W("question","choosing a plan","Do you want our basic speed or the faster gaming plan?","The cheaper tier is plenty for me.","The clerk asks which plan, so choosing one is the natural reply.",{
  0:"\"Do you want our\" asks for a choice; there is no outage to work around.",
  2:"\"Do you want our\" asks a which-question; \"Nice, that adds up\" reacts to a saving never announced.",
  3:"\"Do you want our basic\" offers plans; nothing was refunded to explain a balance."}),
 W("good news","reacting to a saving","Good news, your bill's going down ten dollars from next month.","Nice, that adds up over a year.","A lower monthly bill is announced, so noting the yearly saving is the natural reply.",{
  0:"\"your bill's going down\" - nothing has stopped working, so moving to the library contradicts the line.",
  1:"\"your bill's going down\" is news, not a choice between speeds.",
  3:"\"from next month\" - the saving is in the future, so it cannot explain a balance that already looked low."}),
 W("correction","explaining a discrepancy","Actually, you were billed twice last month, so we'll refund one.","So that's why my bank balance looked low.","A past double charge is admitted, so connecting it to a low balance is the natural reply.",{
  0:"\"you were billed twice\" is about money; nothing has stopped working.",
  1:"\"you were billed twice\" is a correction, not a choice between plans.",
  2:"\"we'll refund one\" is a one-off refund, so a saving that adds up every month contradicts it."})])

item("cr14-b18","auto parts store",[
 W("question","identifying a car","What year and model is your car?","A 2015 Honda Civic, the hatchback.","The clerk asks which car, so identifying it is the natural reply.",{
  1:"\"What year and model\" asks a which-question; nothing has sent the customer elsewhere.",
  2:"\"What year and model\" asks for car details; no installation was offered.",
  3:"\"What year and model\" - no warranty or free replacement was mentioned for luck to apply to."}),
 W("bad news","going elsewhere","We don't stock that filter, but the dealer across town might.","Okay, I'll drive over there after lunch.","The store lacks the part and names a place that might have it, so planning to go is the natural reply.",{
  0:"\"We don't stock that\" - the part has already been identified, so giving the car details answers nothing.",
  2:"\"We don't stock that\" - nothing is being sold, so welcoming an installation offer contradicts it.",
  3:"\"We don't stock that\" - nothing is being replaced, let alone for free."}),
 W("offer","accepting help","If you'd like, I can install those wiper blades for you outside.","That'd be great, I always get them crooked.","An installation is offered, so accepting it is the natural reply.",{
  0:"\"I can install those\" is an offer; the car details are not being asked for.",
  1:"\"I can install those\" - the part is here, so driving elsewhere contradicts the line.",
  3:"\"those wiper blades\" are being bought; nothing about a warranty was said."}),
 W("good news","reacting to luck","That battery's still under warranty, so the replacement is free.","Lucky me, I almost threw the receipt away.","A free warranty replacement is granted, so remarking on luck is the natural reply.",{
  0:"\"That battery's still under\" - the part is identified, so no car details are being asked.",
  1:"\"the replacement is free\" - the store is handling it, so driving to a dealer contradicts it.",
  2:"\"the replacement is free\" is a ruling, not an offer to install anything."})])

item("cr14-b19","picture framing shop",[
 W("question","choosing glass","Do you want plain glass or the anti-glare kind for this?","The non-reflective type, it faces a window.","The framer asks which glass, so choosing one is the natural reply.",{
  1:"\"Do you want plain\" - the job is under way, so asking how long a reorder takes contradicts it.",
  2:"\"Do you want plain glass\" - the frame is not finished, so collecting it is premature.",
  3:"\"plain glass or the anti-glare\" offers glass choices; cream is not one of them."}),
 W("bad news","asking about a delay","The frame cracked while we were cutting it, so we've reordered one.","That's a shame, how long will that take?","A replacement has been ordered, so asking how long it will take is the natural reply.",{
  0:"\"The frame cracked\" - the work has stalled, so choosing glass answers nothing asked.",
  2:"\"The frame cracked\" - nothing is finished, so bringing the car to collect it contradicts the line.",
  3:"\"we've reordered one\" is bad news, not a request to choose a mat color."}),
 W("good news","arranging collection","Your painting's framed and wrapped, and it's ready for collection.","Wonderful, I'll bring the car round.","The framed painting is ready, so arranging to collect it is the natural reply.",{
  0:"\"framed and wrapped\" - the work is finished, so choosing glass is too late.",
  1:"\"it's ready for collection\" - nothing is delayed, so asking how long a reorder takes contradicts it.",
  3:"\"framed and wrapped\" - the frame is done, so choosing a mat color is too late."}),
 W("request","choosing a mat","Could you choose a mat color from these samples for me?","Let's go with the cream, it suits the print.","The framer asks for a mat color, so choosing one is the natural reply.",{
  0:"\"choose a mat color\" asks for a mat, not a type of glass.",
  1:"\"Could you choose a\" - the job is going ahead, so asking about a reorder contradicts it.",
  2:"\"choose a mat color\" - nothing is finished, so collecting it is premature."})])

item("cr14-b20","restaurant takeout counter",[
 W("bad news","switching an order","Sorry, the kitchen's out of noodles, so we can't make your pad thai.","Could I switch to the fried rice, then?","The dish is unavailable, so switching to another is the natural reply.",{
  1:"\"we can't make your\" is bad news, not a question about the order name.",
  2:"\"we can't make your\" - the order is not ready, so smelling the finished food contradicts it.",
  3:"\"we can't make your\" - no extras were offered, so choosing utensils answers nothing."}),
 W("question","giving a name","What name is the order under?","The surname's Park, spelled P-A-R-K.","The clerk asks for the name, so giving it is the natural reply.",{
  0:"\"What name is the\" asks for a name; nothing is unavailable to switch from.",
  2:"\"What name is the order\" - the order has not been found yet, so remarking on its smell is premature.",
  3:"\"What name is the\" asks for a name; nothing was offered for \"Just the sticks\" to choose from."}),
 W("good news","collecting food","Your order's bagged and paid for, so you're all set.","Thanks, it smells amazing already.","The order is ready, so reacting to the food is the natural reply.",{
  0:"\"Your order's bagged\" - the food is made, so switching dishes contradicts the line.",
  1:"\"Your order's bagged and\" - it is ready, so no name is being asked for.",
  3:"\"you're all set\" offers nothing; choosing extras answers no question."}),
 W("offer","choosing extras","Would you like chopsticks and extra chili sauce in the bag?","Just the sticks, please, I can't do spicy.","Utensils and sauce are offered, so taking one is the natural reply.",{
  0:"\"in the bag\" - the food is made, so switching dishes contradicts the line.",
  1:"\"Would you like chopsticks\" is an offer, not a name question.",
  2:"\"Would you like chopsticks\" asks a question; a remark on the smell does not answer it."})])

json.dump({"cohort":"cr-v14","stage":"crv7-method batch 10b (strict kills)","method":"four-world, seeded post-hoc selection (render-crv7.mjs)","items":Q},open('crv7-b10b-quads.json','w'),indent=1,ensure_ascii=False)
import re
STOP=set('i im ill a an the to of and or is it its for you your me my we our be can could would will do does did that this then so on in at by up out now please okay yes no oh great thanks thank sure fine just there here what where when how any all have has get go'.split())
cw=lambda s:{w.rstrip('s') for w in re.findall(r"[a-z]+",s.lower().replace("'","")) if w not in STOP}
echo=[(it['localId'],i,sorted(cw(w['reply'])&cw(w['line']))) for it in Q for i,w in enumerate(it['worlds']) if cw(w['reply'])&cw(w['line'])]
ratio=[(it['localId'],round(max(len(w['reply']) for w in it['worlds'])/min(len(w['reply']) for w in it['worlds']),2)) for it in Q]
print(len(Q),'items; echo hits',len(echo)); [print('  echo',e) for e in echo]
print('ratio>1.5',[r for r in ratio if r[1]>1.5])
nl=lambda s:re.sub(r'\s+',' ',s.replace('’',"'")).strip().lower()
ex={nl(l) for l in open('existing-cr-text.txt') if l.strip()}
dup=[t for it in Q for w in it['worlds'] for t in (w['line'],w['reply']) if nl(t) in ex]
print('dup with existing',dup)
used={nl(l) for l in open('used-settings.txt') if l.strip()}
print('used settings hit',[it['setting'] for it in Q if nl(it['setting']) in used])
wc=[(it['localId'],i,len(w['line'].split())) for it in Q for i,w in enumerate(it['worlds']) if not 5<=len(w['line'].split())<=14]
print('line length off',wc)
from collections import Counter
print(Counter(w['kind'] for it in Q for w in it['worlds']))
print('kinds per item <3',[it['localId'] for it in Q if len({w['kind'] for w in it['worlds']})<3])
