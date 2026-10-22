import json
A=[]
def a(i,s1,s2,rel,k1,k2,why,ds,d="medium"):
    A.append(dict(id=i,stem=(s1,s2),rel=rel,key=(k1,k2),why=why,ds=ds,d=d))
# ds: list of (w1,w2,relation,gloss)

# worker/tool
a("V4A01","scribe","quill","worker/tool","sculptor","mallet","a scribe works with a quill, as a sculptor works with a mallet",
 [("pottery","shard","whole/fragment","a shard is a broken piece of pottery"),("feather","bird","part/whole","a feather is part of a bird"),("library","scroll","place/kept item","a library keeps scrolls"),("parchment","sheepskin","product/material","parchment is made from sheepskin")])
a("V4A02","fencer","foil","worker/tool","batter","bat","a fencer competes with a foil, as a batter hits with a bat",
 [("mask","face","protector/protected","a mask protects the face"),("mitt","glove","type/category","a mitt is a kind of glove"),("lunge","thrust","similar actions","a lunge and a thrust are similar attacking moves"),("stadium","fans","place/occupants","fans fill a stadium")],"easy")
a("V4A03","knitter","needles","worker/tool","woodcarver","knife","a knitter works with needles, as a woodcarver works with a knife",
 [("yarn","scarf","material/product","a scarf is knitted from yarn"),("timber","forest","material/source","timber comes from a forest"),("whittle","carve","specific/general action","to whittle is a specific way to carve"),("cardigan","sweater","type/category","a cardigan is a kind of sweater")])
a("V4A04","glassblower","pipe","worker/tool","calligrapher","brush","a glassblower shapes glass with a pipe, as a calligrapher forms letters with a brush",
 [("goblet","glass","object/material","a goblet is made of glass"),("easel","canvas","support/thing supported","an easel holds a canvas"),("stroke","character","element/whole","a stroke is one element of a written character"),("vase","mantel","object/where displayed","a vase is displayed on a mantel")],"hard")
a("V4A05","geologist","hammer","worker/tool","biologist","microscope","a geologist works with a hammer, as a biologist works with a microscope",
 [("cell","organism","unit/whole","a cell is the basic unit of an organism"),("fossil","limestone","embedded/surrounding","a fossil may be embedded in limestone"),("magnify","enlarge","synonym","to magnify is to enlarge"),("lava","basalt","source/rock formed","basalt forms from cooled lava")])
a("V4A06","seamstress","needle","worker/tool","barber","scissors","a seamstress works with a needle, as a barber works with scissors",
 [("embroidery","thread","product/material","embroidery is stitched with thread"),("salon","haircut","place/service","a salon gives haircuts"),("bangs","fringe","synonym","bangs are also called a fringe"),("hem","skirt","edge/garment","a hem is the finished edge of a skirt")],"easy")

# worker/product
a("V4A07","milliner","hats","worker/product","luthier","guitars","a milliner makes hats, as a luthier makes guitars",
 [("felt","fedora","material/product","a fedora is made of felt"),("bridge","cello","part/whole","a bridge is part of a cello"),("audience","concert","spectators/event","an audience attends a concert"),("tailor","fabric","worker/material","a tailor works with fabric")],"hard")
a("V4A08","cartwright","carts","worker/product","fletcher","arrows","a cartwright builds carts, as a fletcher makes arrows",
 [("wagon","oxen","vehicle/draft animal","oxen pull a wagon"),("archer","target","person/aim","an archer aims at a target"),("fletching","shaft","part/part","the fletching and the shaft are both parts of an arrow"),("frame","picture","border/bordered","a frame borders a picture")],"hard")
a("V4A09","poet","sonnet","worker/product","tailor","suit","a poet writes a sonnet, as a tailor makes a suit",
 [("verse","stanza","unit/larger unit","verses make up a stanza"),("needle","thread","tool/material","a needle carries thread"),("critic","poem","judge/thing judged","a critic judges a poem"),("silk","cotton","coordinate fabrics","silk and cotton are both fabrics")],"easy")
a("V4A10","confectioner","candy","worker/product","shipwright","ships","a confectioner makes candy, as a shipwright builds ships",
 [("harbor","vessels","place/occupants","vessels anchor in a harbor"),("sugar","syrup","material/product","syrup is made from sugar"),("helm","steering","part/function","a helm is used for steering"),("sweet","bitter","antonym","sweet is the opposite of bitter")],"hard")
a("V4A11","journalist","articles","worker/product","goldsmith","rings","a journalist writes articles, as a goldsmith makes rings",
 [("newspaper","column","whole/part","a newspaper contains columns"),("gold","metal","instance/category","gold is a metal"),("reporter","newsroom","worker/place","a reporter works in a newsroom"),("nugget","prospector","find/finder","a prospector finds a nugget")])
a("V4A12","saddler","saddles","worker/product","potter","urns","a saddler makes saddles, as a potter makes urns",
 [("stirrup","foot","support/thing supported","a stirrup supports a rider's foot"),("clay","riverbank","material/source","clay is dug from a riverbank"),("glaze","pottery","coating/thing coated","glaze coats pottery"),("mare","stallion","female/male","a mare is a female horse; a stallion is a male")])

# degree
a("V4A13","damp","sodden","degree","warm","sweltering","sodden is extremely damp, as sweltering is extremely warm",
 [("puddle","rain","effect/cause","rain leaves a puddle"),("summer","season","instance/category","summer is a season"),("raincoat","drizzle","protection/weather","a raincoat protects against drizzle"),("fan","breeze","source/product","a fan makes a breeze")])
a("V4A14","scared","terrified","degree","pleased","overjoyed","terrified is extremely scared, as overjoyed is extremely pleased",
 [("brave","fearful","antonym","brave is the opposite of fearful"),("smile","delight","expression/feeling","a smile shows delight"),("shriek","fright","reaction/cause","fright can cause a shriek"),("cheerful","jolly","synonym","cheerful and jolly mean the same")],"easy")
a("V4A15","interested","obsessed","degree","worried","frantic","obsessed is extremely interested, as frantic is extremely worried",
 [("curious","indifferent","antonym","curious is the opposite of indifferent"),("hobby","pastime","synonym","a hobby is a pastime"),("anxiety","sweat","cause/symptom","anxiety can cause sweating"),("fan","celebrity","admirer/admired","a fan admires a celebrity")])
a("V4A16","dislike","abhor","degree","admire","revere","to abhor is to dislike intensely, as to revere is to admire intensely",
 [("despise","adore","antonym","to despise is the opposite of to adore"),("idol","worship","object/act","an idol is an object of worship"),("scorn","sneer","feeling/expression","a sneer expresses scorn"),("monument","hero","tribute/honoree","a monument honors a hero")],"hard")
a("V4A17","tug","yank","degree","push","shove","to yank is to tug hard, as to shove is to push hard",
 [("lift","lower","antonym","to lift is the opposite of to lower"),("drag","haul","synonym","to drag is to haul"),("cart","wheel","whole/part","a cart has wheels"),("elbow","nudge","body part/action","one nudges with an elbow")],"easy")
a("V4A18","thrifty","miserly","degree","courageous","foolhardy","miserly is thrift carried to excess, as foolhardy is courage carried to excess",
 [("lavish","sparing","antonym","lavish is the opposite of sparing"),("warrior","valor","person/quality","a warrior is expected to show valor"),("pennies","jar","contents/container","pennies are kept in a jar"),("budget","spending","plan/thing planned","a budget plans spending")],"hard")
a("V4A19","annoyed","infuriated","degree","sad","despondent","infuriated is extremely annoyed, as despondent is extremely sad",
 [("goosebumps","chill","reaction/cause","a chill raises goosebumps"),("winter","solstice","season/event","the winter solstice falls in winter"),("calm","agitated","antonym","calm is the opposite of agitated"),("scarf","neck","covering/covered","a scarf covers the neck")])

# lack
a("V4A20","amorphous","shape","lack","apathetic","interest","something amorphous lacks shape, as someone apathetic lacks interest",
 [("circular","round","synonym","circular means round"),("curious","question","trait/typical act","a curious person asks questions"),("boredom","doodle","feeling/sign","doodling can be a sign of boredom"),("sphere","cube","coordinate shapes","a sphere and a cube are both solid shapes")],"hard")
a("V4A21","destitute","money","lack","naive","experience","someone destitute lacks money, as someone naive lacks experience",
 [("wealthy","poor","antonym","wealthy is the opposite of poor"),("bank","vault","whole/part","a bank has a vault"),("veteran","war","person/event","a veteran served in a war"),("lesson","teacher","thing given/giver","a teacher gives a lesson")])
a("V4A22","vacant","occupants","lack","barren","vegetation","a vacant building lacks occupants, as barren land lacks vegetation",
 [("crowded","empty","antonym","crowded is the opposite of empty"),("tenant","lease","person/document","a tenant signs a lease"),("vineyard","harvest","place/event","a vineyard has a harvest"),("hotel","guests","place/visitors","a hotel houses guests")])
a("V4A23","callous","sympathy","lack","heedless","caution","a callous person lacks sympathy, as a heedless person lacks caution",
 [("cruel","kind","antonym","cruel is the opposite of kind"),("nurse","compassion","worker/needed trait","a nurse needs compassion"),("warning","danger","signal/threat","a warning signals danger"),("careful","prudent","synonym","careful and prudent mean the same")])
a("V4A24","flawless","defects","lack","sterile","germs","something flawless has no defects, as something sterile has no germs",
 [("jewel","appraiser","item/evaluator","an appraiser values a jewel"),("perfect","ideal","synonym","perfect means ideal"),("clinic","checkup","place/service","a clinic gives checkups"),("microbe","bacterium","category/instance","a bacterium is a kind of microbe")])
a("V4A25","timid","courage","lack","modest","vanity","a timid person lacks courage, as a modest person lacks vanity",
 [("ant","diligence","animal/symbolized trait","an ant is a symbol of diligence"),("mouse","squeak","animal/sound","a mouse squeaks"),("boast","brag","synonym","to boast is to brag"),("hero","coward","antonym","a hero is the opposite of a coward")])

# part/whole
a("V4A26","stamen","flower","part/whole","pane","window","a stamen is a part of a flower, as a pane is a part of a window",
 [("nectar","hummingbird","food/feeder","a hummingbird feeds on nectar"),("adobe","mud","product/material","adobe is made from mud"),("bouquet","vase","contents/container","a vase holds a bouquet"),("seed","sapling","stage/later stage","a seed grows into a sapling")])
a("V4A27","bead","necklace","part/whole","link","chain","a bead is one of the units strung into a necklace, as a link is one of the units joined into a chain",
 [("amber","resin","product/source","amber is fossilized resin"),("anklet","ankle","ornament/where worn","an anklet is worn on the ankle"),("padlock","gate","fastener/thing fastened","a padlock fastens a gate"),("gold","silver","coordinate metals","gold and silver are both precious metals")],"easy")
a("V4A28","tread","tire","part/whole","husk","coconut","the tread is the tough outer layer of a tire, as the husk is the tough outer layer of a coconut",
 [("rubber","eraser","material/product","an eraser is made of rubber"),("palm","dates","plant/fruit","a palm tree bears dates"),("spare","trunk","item/where stored","a spare tire is stored in the trunk"),("pothole","road","flaw/surface","a pothole is a flaw in a road")])
a("V4A29","cockpit","airplane","part/whole","cab","truck","the cockpit is the operator's compartment of an airplane, as the cab is the operator's compartment of a truck",
 [("driver","license","person/document","a driver holds a license"),("diesel","fuel","instance/category","diesel is a fuel"),("hangar","glider","shelter/vehicle","a glider is stored in a hangar"),("horn","warning","device/function","a horn sounds a warning")])
a("V4A30","word","sentence","part/whole","stitch","seam","words are joined one after another to form a sentence, as stitches are joined one after another to form a seam",
 [("tear","patch","damage/repair","a patch repairs a tear"),("comma","pause","symbol/meaning","a comma signals a pause"),("fabric","cotton","category/instance","cotton is a kind of fabric"),("seamstress","pattern","worker/guide","a seamstress follows a pattern")])
a("V4A31","sleeve","shirt","part/whole","heel","shoe","a sleeve is part of a shirt, as a heel is part of a shoe",
 [("glove","hand","covering/covered","a glove covers a hand"),("button","fasten","thing/function","a button is used to fasten"),("hamper","socks","container/contents","a hamper holds dirty socks"),("boot","sandal","coordinate footwear","a boot and a sandal are both footwear")],"easy")

# group/member
a("V4A32","gaggle","geese","group/member","school","fish","a group of geese is a gaggle, as a group of fish is a school",
 [("nest","eggs","container/contents","a nest holds eggs"),("scales","trout","covering/animal","scales cover a trout"),("pond","duck","habitat/animal","a duck lives on a pond"),("gill","breathe","organ/function","a gill is used to breathe")])
a("V4A33","murder","crows","group/member","parliament","owls","a group of crows is a murder, as a group of owls is a parliament",
 [("scarecrow","field","guardian/place","a scarecrow guards a field"),("talon","hawk","part/whole","a talon is part of a hawk"),("beak","peck","part/function","a beak is used to peck"),("wise","foolish","antonym","wise is the opposite of foolish")],"hard")
a("V4A34","deck","card","group/member","alphabet","letter","a deck is a complete set made up of cards, as an alphabet is a complete set made up of letters",
 [("croupier","casino","worker/place","a croupier works in a casino"),("ace","king","rank/rank","an ace and a king are both card ranks"),("shuffle","mix","synonym","to shuffle is to mix"),("chalk","slate","tool/surface","chalk writes on a slate")],"easy")
a("V4A35","battalion","soldier","group/member","armada","warship","a battalion is a military group made up of soldiers, as an armada is a fleet made up of warships",
 [("general","army","leader/group","a general commands an army"),("barracks","troops","building/occupants","troops live in barracks"),("periscope","submarine","part/whole","a periscope is part of a submarine"),("salute","respect","gesture/meaning","a salute shows respect")],"hard")
a("V4A36","congregation","worshiper","group/member","audience","spectator","a worshiper is one member of a congregation, as a spectator is one member of an audience",
 [("pew","church","seat/place","a pew is a seat in a church"),("pastor","sermon","speaker/speech","a pastor gives a sermon"),("ticket","admission","document/right","a ticket grants admission"),("applause","approval","act/meaning","applause shows approval")])

# young/adult
a("V4A37","kit","fox","young/adult","cub","tiger","a kit is a young fox, as a cub is a young tiger",
 [("hedgehog","spines","animal/covering","a hedgehog is covered in spines"),("paw","claw","whole/part","a paw has claws"),("trap","snare","synonym","a trap is a snare"),("lair","beast","home/occupant","a beast lives in a lair")])
a("V4A38","larva","beetle","young/adult","caterpillar","moth","a larva grows into a beetle, as a caterpillar grows into a moth",
 [("wing","flight","part/function","a wing is used for flight"),("insect","ant","category/instance","an ant is a kind of insect"),("antenna","feeler","synonym","an antenna is also called a feeler"),("hive","wasp","home/occupant","a wasp lives in a hive")])
a("V4A39","fry","salmon","young/adult","squab","pigeon","a fry is a young salmon, as a squab is a young pigeon",
 [("trout","fish","instance/category","a trout is a fish"),("bait","hook","lure/device","bait is placed on a hook"),("plaza","statue","place/fixture","a statue stands in a plaza"),("roe","caviar","source/delicacy","caviar is made from roe")],"hard")
a("V4A40","calf","moose","young/adult","foal","zebra","a calf is a young moose, as a foal is a young zebra",
 [("antler","elk","part/animal","an elk has antlers"),("savanna","lion","habitat/animal","a lion lives on the savanna"),("graze","grass","action/object","animals graze on grass"),("saddle","pony","equipment/animal","a saddle is put on a pony")],"easy")

# container/contents
a("V4A41","sheath","knife","container/contents","case","violin","a sheath holds a knife, as a case holds a violin",
 [("blade","handle","part/part","a blade and a handle are both parts of a knife"),("string","pluck","object/action","one plucks a string"),("beekeeper","veil","worker/garment","a beekeeper wears a veil"),("orchestra","stage","group/place","an orchestra performs on a stage")],"easy")
a("V4A42","inkwell","ink","container/contents","cruet","vinegar","an inkwell holds ink, as a cruet holds vinegar",
 [("quill","writing","tool/function","a quill is used for writing"),("vinaigrette","salad","dressing/dish","vinaigrette dresses a salad"),("pickle","cucumber","product/source","a pickle is made from a cucumber"),("sour","acidic","synonym","sour and acidic describe the same taste")],"hard")
a("V4A43","satchel","books","container/contents","wallet","bills","a satchel holds books, as a wallet holds bills",
 [("student","school","person/place","a student attends school"),("cash","check","payment/payment","cash and a check are both forms of payment"),("page","chapter","part/whole","a page is part of a chapter"),("coin","mint","product/source","a coin is made at a mint")],"easy")
a("V4A44","bookcase","books","container/contents","wardrobe","clothes","a bookcase holds books, as a wardrobe holds clothes",
 [("reader","index","user/tool","a reader uses an index"),("lapel","jacket","part/whole","a lapel is part of a jacket"),("author","sequel","writer/work","an author writes a sequel"),("blanket","fleece","product/material","a blanket can be made of fleece")],"easy")

# cause/effect
a("V4A45","tickling","laughter","cause/effect","insult","indignation","tickling provokes laughter, as an insult provokes indignation",
 [("joke","punchline","whole/ending","a joke ends with a punchline"),("feather","pillow","filler/item","feathers fill a pillow"),("compliment","rebuke","antonym","a compliment is the opposite of a rebuke"),("slander","libel","spoken/written","slander is spoken; libel is written")])
a("V4A46","collision","dent","cause/effect","storm","outage","a collision can cause a dent, as a storm can cause an outage",
 [("bumper","car","part/whole","a bumper is part of a car"),("chauffeur","limousine","driver/vehicle","a chauffeur drives a limousine"),("forecast","weather","prediction/subject","a forecast predicts the weather"),("hail","sleet","coordinate precipitation","hail and sleet are both frozen precipitation")])
a("V4A47","caffeine","alertness","cause/effect","sedative","drowsiness","caffeine produces alertness, as a sedative produces drowsiness",
 [("espresso","beverage","type/category","espresso is a kind of beverage"),("pharmacist","pills","worker/item dispensed","a pharmacist dispenses pills"),("handshake","greeting","gesture/purpose","a handshake serves as a greeting"),("alarm","clock","feature/device","an alarm is a feature of a clock")])
a("V4A48","practice","skill","cause/effect","study","knowledge","practice builds skill, as study builds knowledge",
 [("teacher","pupil","instructor/learner","a teacher instructs a pupil"),("piano","keys","whole/part","a piano has keys"),("coach","team","leader/group","a coach leads a team"),("bookshelf","atlas","holder/item held","a bookshelf holds an atlas")],"easy")
a("V4A49","infection","fever","cause/effect","allergy","hives","an infection can cause a fever, as an allergy can cause hives",
 [("pill","bottle","contents/container","pills are kept in a bottle"),("patient","stretcher","person/conveyance","a patient is carried on a stretcher"),("tonic","elixir","synonym","a tonic is an elixir"),("pollen","flower","product/source","pollen is produced by a flower")])

# instrument/measured
a("V4A50","anemometer","wind","instrument/measured","hourglass","time","an anemometer measures wind, as an hourglass measures time",
 [("sandbags","flood","barrier/threat","sandbags hold back a flood"),("kite","breeze","object/moving force","a breeze lifts a kite"),("second","minute","unit/larger unit","seconds make up a minute"),("cyclone","storm","type/category","a cyclone is a kind of storm")],"hard")
a("V4A51","yardstick","length","instrument/measured","balance","mass","a yardstick measures length, as a balance measures mass",
 [("inch","foot","unit/larger unit","inches make up a foot"),("grocer","produce","seller/goods","a grocer sells produce"),("heavy","light","antonym","heavy is the opposite of light"),("carpenter","lumber","worker/material","a carpenter works with lumber")],"easy")
a("V4A52","theodolite","angles","instrument/measured","photometer","light","a theodolite measures angles, as a photometer measures light",
 [("surveyor","boundary","worker/subject","a surveyor marks a boundary"),("lamp","bulb","whole/part","a lamp holds a bulb"),("triangle","polygon","instance/category","a triangle is a polygon"),("eclipse","sun","event/body","an eclipse darkens the sun")],"hard")

# synonym
a("V4A53","candid","frank","synonym","wary","cautious","candid means frank, as wary means cautious",
 [("honest","deceitful","antonym","honest is the opposite of deceitful"),("trap","bait","device/lure","a trap holds bait"),("sentinel","post","guard/station","a sentinel stands at a post"),("alarm","danger","signal/threat","an alarm signals danger")],"easy")
a("V4A54","brusque","curt","synonym","docile","tame","brusque means curt, as docile means tame",
 [("rude","polite","antonym","rude is the opposite of polite"),("trainer","circus","worker/place","a trainer works in a circus"),("leash","dog","restraint/restrained","a leash restrains a dog"),("sentence","phrase","whole/part","a sentence contains phrases")])
a("V4A55","garrulous","talkative","synonym","opulent","luxurious","garrulous means talkative, as opulent means luxurious",
 [("sumptuous","spartan","antonym","sumptuous is the opposite of spartan"),("palace","monarch","residence/resident","a monarch lives in a palace"),("velvet","fabric","instance/category","velvet is a fabric"),("debater","rebuttal","person/product","a debater offers a rebuttal")],"hard")
a("V4A56","squander","waste","synonym","elude","evade","to squander is to waste, as to elude is to evade",
 [("save","spend","antonym","to save is the opposite of to spend"),("budget","money","plan/resource","a budget plans the use of money"),("trap","prey","device/target","a trap catches prey"),("miser","wealth","person/thing hoarded","a miser hoards wealth")])
a("V4A57","tenacious","persistent","synonym","haughty","arrogant","tenacious means persistent, as haughty means arrogant",
 [("stubborn","flexible","antonym","stubborn is the opposite of flexible"),("crown","queen","symbol/holder","a queen wears a crown"),("climber","summit","person/goal","a climber aims for the summit"),("sneer","contempt","expression/feeling","a sneer expresses contempt")])
a("V4A58","enigma","mystery","synonym","zeal","enthusiasm","an enigma is a mystery, as zeal is enthusiasm",
 [("puzzle","solution","problem/answer","a puzzle has a solution"),("detective","clue","worker/thing sought","a detective looks for clues"),("apathy","passion","antonym","apathy is the opposite of passion"),("fan","stadium","person/place","a fan goes to a stadium")])

# antonym
a("V4A59","verbose","terse","antonym","lenient","strict","verbose is the opposite of terse, as lenient is the opposite of strict",
 [("wordy","lengthy","synonym","wordy means lengthy"),("umpire","ruling","official/decision","an umpire makes a ruling"),("essay","paragraph","whole/part","an essay contains paragraphs"),("proofreader","typos","worker/object","a proofreader finds typos")])
a("V4A60","ally","enemy","antonym","novice","veteran","an ally is the opposite of an enemy, as a novice is the opposite of a veteran",
 [("soldier","army","member/group","a soldier belongs to an army"),("buddy","pal","synonym","a buddy is a pal"),("accord","parties","agreement/parties","parties sign an accord"),("medal","bravery","reward/quality","a medal rewards bravery")],"easy")
a("V4A61","acquit","convict","antonym","hinder","assist","to acquit is the opposite of to convict, as to hinder is the opposite of to assist",
 [("jury","verdict","group/decision","a jury reaches a verdict"),("bailiff","courtroom","worker/place","a bailiff works in a courtroom"),("block","obstruct","synonym","to block is to obstruct"),("crime","penalty","offense/consequence","a crime brings a penalty")],"easy")
a("V4A62","frail","robust","antonym","tardy","punctual","frail is the opposite of robust, as tardy is the opposite of punctual",
 [("late","overdue","synonym","late means overdue"),("alarm","waking","device/function","an alarm is used for waking"),("muscle","strength","source/quality","muscle provides strength"),("marathoner","endurance","person/quality needed","a marathoner needs endurance")])
a("V4A63","implicit","explicit","antonym","concave","convex","implicit is the opposite of explicit, as concave is the opposite of convex",
 [("mirror","reflection","object/product","a mirror produces a reflection"),("implied","suggested","synonym","implied means suggested"),("arch","bridge","part/whole","an arch may be part of a bridge"),("bowl","soup","container/contents","a bowl holds soup")],"hard")
a("V4A64","dwindle","swell","antonym","clarify","obscure","to dwindle is the opposite of to swell, as to clarify is the opposite of to obscure",
 [("shrink","decrease","synonym","to shrink is to decrease"),("teacher","explain","worker/action","a teacher explains"),("fog","visibility","obstruction/thing reduced","fog reduces visibility"),("lens","focus","tool/function","a lens is used to focus")],"hard")

# characteristic
a("V4A65","glass","brittle","characteristic","rubber","elastic","glass is characteristically brittle, as rubber is characteristically elastic",
 [("shatter","break","specific/general action","to shatter is a specific way to break"),("tile","mosaic","piece/whole","tiles make up a mosaic"),("flimsy","solid","antonym","flimsy is the opposite of solid"),("jar","lid","container/stopper","a lid closes a jar")])
a("V4A66","desert","arid","characteristic","marsh","soggy","a desert is characteristically arid, as a marsh is characteristically soggy",
 [("cactus","spine","plant/feature","a cactus has spines"),("dune","sand","landform/material","a dune is made of sand"),("damp","parched","antonym","damp is the opposite of parched"),("reed","plant","instance/category","a reed is a plant")],"easy")
a("V4A67","braggart","boastful","characteristic","skeptic","doubtful","a braggart is by definition boastful, as a skeptic is by definition doubtful",
 [("trophy","winner","reward/recipient","a winner receives a trophy"),("liar","truthful","person/trait lacked","a liar is not truthful"),("query","reply","prompt/response","a query calls for a reply"),("archivist","records","worker/thing kept","an archivist keeps records")])
a("V4A68","zealot","fanatical","characteristic","recluse","solitary","a zealot is by definition fanatical, as a recluse is by definition solitary",
 [("cavern","bat","home/occupant","a bat lives in a cavern"),("devotee","follower","synonym","a devotee is a follower"),("solitude","crowd","antonym","solitude is the opposite of a crowd"),("homily","priest","speech/speaker","a priest delivers a homily")],"hard")
a("V4A69","cheetah","swift","characteristic","tortoise","slow","a cheetah is known for being swift, as a tortoise is known for being slow",
 [("giraffe","neck","animal/feature","a giraffe has a long neck"),("hare","rabbit","similar animals","a hare resembles a rabbit"),("savanna","grassland","synonym","a savanna is a grassland"),("claw","scratch","part/function","a claw is used to scratch")],"easy")
a("V4A70","charlatan","fraudulent","characteristic","martyr","selfless","a charlatan is by definition fraudulent, as a martyr is by definition selfless",
 [("victim","scam","target/act","a scam targets a victim"),("hoax","deception","instance/category","a hoax is a kind of deception"),("saint","shrine","honoree/place","a shrine honors a saint"),("forgery","painting","fake/genuine article","a forgery imitates a genuine painting")],"hard")

# function
a("V4A71","whetstone","sharpen","function","sponge","absorb","a whetstone is used to sharpen, as a sponge is used to absorb",
 [("knife","blade","whole/part","a knife has a blade"),("dull","keen","antonym","dull is the opposite of keen"),("soap","suds","source/product","soap makes suds"),("cistern","water","container/contents","a cistern stores water")])
a("V4A72","sander","smooth","function","lantern","illuminate","a sander is used to smooth, as a lantern is used to illuminate",
 [("wood","grain","material/feature","wood has a grain"),("moth","flame","creature/attraction","a moth is drawn to a flame"),("bristly","prickly","synonym","bristly means prickly"),("dusk","daybreak","antonym","dusk is the opposite of daybreak")])
a("V4A73","corkscrew","uncork","function","lever","pry","a corkscrew is used to uncork, as a lever is used to pry",
 [("bottle","wine","container/contents","a bottle holds wine"),("cork","stopper","type/category","a cork is a kind of stopper"),("fulcrum","seesaw","part/whole","a fulcrum is part of a seesaw"),("toast","celebration","act/occasion","a toast is made at a celebration")])
a("V4A74","siphon","drain","function","jack","lift","a siphon is used to drain, as a jack is used to lift",
 [("tank","fuel","container/contents","a tank holds fuel"),("tow truck","wreck","vehicle/thing hauled","a tow truck hauls a wreck"),("hose","pipe","similar objects","a hose and a pipe both carry liquid"),("puncture","tire","damage/object","a puncture damages a tire")])
a("V4A75","vise","grip","function","wedge","split","a vise is used to grip, as a wedge is used to split",
 [("log","firewood","source/product","a log is cut into firewood"),("splinter","plank","fragment/source","a splinter breaks off a plank"),("tight","loose","antonym","tight is the opposite of loose"),("anvil","smithy","fixture/room","an anvil stands in a smithy")])
a("V4A76","pestle","crush","function","awl","pierce","a pestle is used to crush, as an awl is used to pierce",
 [("leather","belt","material/product","a belt is made of leather"),("onion","layer","whole/part","an onion is made of layers"),("pharmacist","remedy","worker/product","a pharmacist prepares a remedy"),("mint","herb","instance/category","mint is an herb")],"hard")

# place/activity
a("V4A77","gymnasium","exercise","place/activity","kitchen","cooking","a gymnasium is a place for exercise, as a kitchen is a place for cooking",
 [("sneaker","shoelace","whole/part","a sneaker has a shoelace"),("trainer","boxer","trainer/trainee","a trainer prepares a boxer"),("oven","stove","similar appliances","an oven and a stove are both kitchen appliances"),("sweat","exertion","effect/cause","exertion causes sweat")],"easy")
a("V4A78","dojo","karate","place/activity","pool","diving","a dojo is a place for karate, as a pool is a place for diving",
 [("belt","rank","symbol/meaning","a belt's color shows a rank"),("goggles","eyes","protector/protected","goggles protect the eyes"),("kick","punch","coordinate strikes","a kick and a punch are both strikes"),("lifeguard","beach","worker/place","a lifeguard works at a beach")])
a("V4A79","velodrome","cycling","place/activity","ring","boxing","a velodrome is the arena for cycling, as a ring is the arena for boxing",
 [("helmet","rider","gear/wearer","a rider wears a helmet"),("referee","bout","official/event","a referee officiates a bout"),("knockout","victory","means/result","a knockout brings victory"),("champion","title","holder/thing held","a champion holds a title")],"hard")
a("V4A80","auditorium","lecture","place/activity","ballroom","dancing","an auditorium is a place for a lecture, as a ballroom is a place for dancing",
 [("lectern","professor","platform/user","a professor speaks at a lectern"),("gown","tuxedo","coordinate formalwear","a gown and a tuxedo are both formal wear"),("minuet","dance","instance/category","a minuet is a kind of dance"),("notes","speech","aid/product","notes help a speaker give a speech")])

json.dump(A,open('ana-draft.json','w'),indent=1)
