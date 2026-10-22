import json
A=[]
def a(i,s1,s2,rel,k1,k2,why,ds,d="medium"):
    A.append(dict(id=i,stem=(s1,s2),rel=rel,key=(k1,k2),why=why,ds=ds,d=d))
# ds: list of (w1,w2,relation,gloss)

# ---------------- easy ----------------
a("V6A01","cook","spatula","worker/tool","logger","chainsaw","a cook works with a spatula, as a logger works with a chainsaw",
 [("pancake","batter","product/material","a pancake is made from batter"),("menu","dishes","list/items","a menu lists dishes"),("stump","tree","remnant/whole","a stump is what is left of a tree"),("kitchen","cupboards","whole/part","a kitchen has cupboards")],"easy")
a("V6A02","hatchling","turtle","young/adult","colt","horse","a hatchling grows into a turtle, as a colt grows into a horse",
 [("pond","reeds","place/what grows there","reeds grow in a pond"),("kennel","puppies","shelter/animals","a kennel shelters puppies"),("carrot","rabbit","food/animal","a rabbit eats a carrot"),("mane","pony","feature/animal","a pony has a mane")],"easy")
a("V6A03","shy","outgoing","antonym","hollow","solid","shy is the opposite of outgoing, as hollow is the opposite of solid",
 [("weary","tired","synonym","weary means tired"),("crumble","biscuit","action/object","a biscuit can crumble"),("brittle","twig","quality/typical thing","a dry twig is brittle"),("bottle","milk","container/contents","a bottle holds milk")],"easy")
a("V6A04","library","books","place/what it houses","hangar","airplanes","a library houses books, as a hangar houses airplanes",
 [("paragraph","sentence","whole/part","a paragraph is made of sentences"),("poet","stanzas","writer/units written","a poet writes stanzas"),("shelf","pine","thing/material","a shelf may be made of pine"),("skim","read","degree","to skim is to read only lightly")],"easy")
a("V6A05","hammer","pound","tool/function","sieve","sift","a hammer is used to pound, as a sieve is used to sift",
 [("nail","board","fastener/thing fastened","a nail is driven into a board"),("carpenter","shop","worker/place","a carpenter works in a shop"),("lumber","fence","material/product","a fence is built from lumber"),("tap","smash","degree","a tap is a far lighter blow than a smash")],"easy")
a("V6A06","rapid","swift","synonym","choose","select","rapid means swift, as choose means select",
 [("race","ribbon","contest/prize","a ribbon is awarded in a race"),("cheetah","speed","animal/trait","a cheetah is known for speed"),("calendar","date","instrument/what it shows","a calendar shows the date"),("acorn","oak","seed/plant","an acorn grows into an oak")],"easy")
a("V6A07","blind","sight","lacking/what is lacked","arid","moisture","someone blind lacks sight, as something arid lacks moisture",
 [("cactus","desert","plant/habitat","a cactus grows in the desert"),("mist","downpour","degree","a mist is far lighter than a downpour"),("nest","branch","structure/location","a nest sits on a branch"),("oasis","palms","place/what grows there","palms grow at an oasis")],"easy")
a("V6A08","wallet","money","container/contents","holster","revolver","a wallet holds money, as a holster holds a revolver",
 [("teller","bank","worker/place","a teller works in a bank"),("penny","coin","instance/category","a penny is a kind of coin"),("purse","handbag","synonym","a purse is a handbag"),("pickpocket","steal","person/action","a pickpocket steals")],"easy")
a("V6A09","flock","pigeons","group/member","pack","wolves","a flock is a group of pigeons, as a pack is a group of wolves",
 [("barn","hay","place/what is stored","hay is stored in a barn"),("calf","cow","young/adult","a calf grows into a cow"),("shepherd","sheep","person/animals tended","a shepherd tends sheep"),("milk","cheese","material/product","cheese is made from milk")],"easy")
a("V6A10","sundial","time","instrument/what it shows","weathervane","wind","a sundial shows the time, as a weathervane shows the wind's direction",
 [("ounce","pound","unit/larger unit","sixteen ounces make a pound"),("straight","crooked","antonym","straight is the opposite of crooked"),("engine","car","part/whole","an engine is part of a car"),("motorist","license","person/document held","a motorist holds a license")],"easy")
a("V6A11","lukewarm","boiling","degree","pleased","delighted","lukewarm is a mild degree of boiling heat, as pleased is a mild degree of delighted",
 [("toaster","bread","appliance/what it toasts","a toaster toasts bread"),("winter","season","instance/category","winter is a season"),("ashes","firewood","remains/source","ashes are what remain of burned firewood"),("fireplace","chimney","whole/part","a fireplace vents through a chimney")],"easy")
a("V6A12","triumph","failure","antonym","arrive","depart","triumph is the opposite of failure, as arrive is the opposite of depart",
 [("medal","champion","award/recipient","a champion receives a medal"),("battle","war","part/whole","a battle is part of a war"),("applause","audience","action/agent","an audience gives applause"),("sailor","navy","member/group","a sailor belongs to a navy")],"easy")
a("V6A13","wren","bird","instance/category","python","snake","a wren is a kind of bird, as a python is a kind of snake",
 [("nest","straw","thing/material","a nest may be built of straw"),("hawk","mouse","predator/prey","a hawk hunts a mouse"),("fur","mink","covering/animal","fur covers a mink"),("migrate","south","action/direction","birds migrate south")],"easy")
a("V6A14","teacher","classroom","worker/place","curator","museum","a teacher works in a classroom, as a curator works in a museum",
 [("student","pupil","synonym","a student is a pupil"),("chalk","board","tool/surface","chalk is used on a board"),("passenger","ticket","person/document","a passenger holds a ticket"),("runway","airport","part/whole","a runway is part of an airport")],"easy")
a("V6A15","gloomy","dismal","synonym","tidy","neat","gloomy means dismal, as tidy means neat",
 [("cloud","rain","source/product","a cloud produces rain"),("messy","orderly","antonym","messy is the opposite of orderly"),("mop","wipe","tool/function","a mop is used to wipe"),("cobweb","corner","thing/place it gathers","a cobweb gathers in a corner")],"easy")
a("V6A16","helmet","head","protector/what it protects","earmuffs","ears","a helmet protects the head, as earmuffs protect the ears",
 [("bicycle","spokes","whole/part","a bicycle wheel has spokes"),("pillow","sleep","aid/activity","a pillow aids sleep"),("cyclist","race","competitor/event","a cyclist competes in a race"),("wool","scarf","material/product","a scarf is knitted from wool")],"easy")
a("V6A17","frog","croak","animal/sound","owl","hoot","a frog croaks, as an owl hoots",
 [("pond","tadpoles","place/residents","tadpoles live in a pond"),("lamb","ewe","young/mother","a lamb is the young of a ewe"),("pelican","pouch","bird/feature","a pelican has a pouch"),("hutch","rabbits","shelter/animals","a hutch shelters rabbits")],"easy")
a("V6A18","limb","tree","part/whole","wing","airplane","a limb is a large part extending from a tree, as a wing is a large part extending from an airplane",
 [("lumber","sawmill","product/place made","lumber is cut at a sawmill"),("dam","reservoir","barrier/what it holds back","a dam holds back a reservoir"),("canoe","paddle","vehicle/tool","a canoe is moved with a paddle"),("leaf","compost","material/product","leaves rot into compost")],"easy")
a("V6A19","weaver","cloth","worker/product","cartographer","maps","a weaver makes cloth, as a cartographer makes maps",
 [("loom","yarn","tool/material","a loom weaves yarn"),("compass","north","instrument/what it indicates","a compass indicates north"),("fleece","lamb","product/source","fleece comes from a lamb"),("globe","sphere","thing/shape","a globe is a sphere")],"easy")
a("V6A20","carton","eggs","container/contents","sheath","sword","a carton holds eggs, as a sheath holds a sword",
 [("stamp","envelope","item/where it is fixed","a stamp is stuck on an envelope"),("author","memoir","creator/work","an author writes a memoir"),("rancher","lasso","worker/tool","a rancher uses a lasso"),("cardboard","pulp","product/material","cardboard is made from pulp")],"easy")

# ---------------- medium ----------------
a("V6A21","beekeeper","smoker","worker/tool","chemist","pipette","a beekeeper works with a smoker, as a chemist works with a pipette",
 [("hornet","nest","animal/home","a hornet lives in a nest"),("jar","preserves","container/contents","a jar holds preserves"),("lens","glass","thing/material","a lens is made of glass"),("dusk","twilight","synonym","dusk is twilight")])
a("V6A22","whelp","wolf","young/adult","cub","panda","a whelp grows into a wolf, as a cub grows into a panda",
 [("coop","hens","shelter/animals","a coop shelters hens"),("plumage","parrot","feature/animal","a parrot is known for its plumage"),("fang","tooth","instance/category","a fang is a kind of tooth"),("paw","print","thing/mark it leaves","a paw leaves a print")])
a("V6A23","sincere","deceitful","antonym","thrifty","extravagant","sincere is the opposite of deceitful, as thrifty is the opposite of extravagant",
 [("genuine","authentic","synonym","genuine means authentic"),("liar","deceive","person/action","a liar deceives"),("miser","gold","person/thing hoarded","a miser hoards gold"),("budget","expense","plan/item","an expense is an item in a budget")])
a("V6A24","obstinate","headstrong","synonym","lethargic","sluggish","obstinate means headstrong, as lethargic means sluggish",
 [("mule","stubbornness","animal/trait","a mule is known for stubbornness"),("comply","defy","antonym","to comply is the opposite of to defy"),("nap","fatigue","remedy/condition","a nap relieves fatigue"),("tortoise","carapace","animal/covering","a tortoise is covered by a carapace")])
a("V6A25","arsenal","weapons","place/what it stores","archive","records","an arsenal stores weapons, as an archive stores records",
 [("soldier","musket","user/tool","a soldier uses a musket"),("museum","docent","place/worker","a docent guides visitors in a museum"),("vellum","manuscript","material/product","a manuscript may be written on vellum"),("truce","battle","agreement/what it halts","a truce halts a battle")])
a("V6A26","spade","dig","tool/function","awl","punch","a spade is used to dig, as an awl is used to punch holes",
 [("farmer","field","worker/place","a farmer works in a field"),("seed","harvest","beginning/result","a seed leads to a harvest"),("leather","saddle","material/product","a saddle is made of leather"),("scarecrow","crows","deterrent/what it deters","a scarecrow scares off crows")])
a("V6A27","rudder","boat","part/whole","reed","clarinet","a rudder is part of a boat, as a reed is part of a clarinet",
 [("sail","wind","thing/what drives it","wind drives a sail"),("compass","sailor","tool/user","a sailor uses a compass"),("fable","fiction","instance/category","a fable is a kind of fiction"),("oar","row","tool/action","an oar is used to row")])
a("V6A28","glimpse","gaze","degree","sip","swig","a glimpse is a brief look and a gaze a long one, as a sip is a small drink and a swig a large one",
 [("joke","laughter","cause/effect","a joke causes laughter"),("clown","circus","performer/place","a clown performs in a circus"),("smirk","frown","contrasting expressions","a smirk and a frown are contrasting expressions"),("wink","eye","action/body part","one winks with an eye")])
a("V6A29","archipelago","isles","group/member","grove","trees","an archipelago is a group of isles, as a grove is a group of trees",
 [("harbor","boats","place/what it shelters","a harbor shelters boats"),("atoll","coral","landform/material","an atoll is built of coral"),("castaway","island","person/place stranded","a castaway is stranded on an island"),("map","sailor","tool/user","a sailor uses a map")])
a("V6A30","darkness","light","absence/what is absent","anarchy","government","darkness is the absence of light, as anarchy is the absence of government",
 [("echo","cliff","sound/what reflects it","a cliff reflects an echo"),("lung","breath","organ/function","a lung draws breath"),("static","transmission","noise/what it disrupts","static disrupts a transmission"),("whisper","yell","degree","a whisper is far quieter than a yell")])
a("V6A31","baker","loaves","worker/product","mason","walls","a baker makes loaves, as a mason builds walls",
 [("cellar","barrels","place/what is stored","barrels are stored in a cellar"),("flour","dough","material/product","dough is made from flour"),("yeast","rise","agent/what it causes","yeast makes dough rise"),("trowel","mortar","tool/material","a trowel spreads mortar")])
a("V6A32","cynic","distrustful","person/defining trait","optimist","hopeful","a cynic is by nature distrustful, as an optimist is by nature hopeful",
 [("modest","humble","synonym","modest means humble"),("reporter","article","person/product","a reporter writes an article"),("miser","philanthropist","antonym","a miser is the opposite of a philanthropist"),("mirror","vanity","object/associated trait","a mirror is associated with vanity")])
a("V6A33","thermostat","heat","device/what it regulates","dimmer","brightness","a thermostat regulates heat, as a dimmer regulates brightness",
 [("furnace","basement","appliance/location","a furnace sits in a basement"),("lamp","shade","whole/part","a lamp has a shade"),("chill","shiver","cause/response","a chill causes a shiver"),("lightbulb","fixture","thing/where it is fitted","a lightbulb screws into a fixture")])
a("V6A34","flax","linen","fiber/fabric","cotton","denim","flax is the fiber linen is woven from, as cotton is the fiber denim is woven from",
 [("needle","yarn","tool/material","a needle carries yarn"),("tablecloth","table","covering/thing covered","a tablecloth covers a table"),("seam","garment","part/whole","a seam is part of a garment"),("spindle","thread","tool/what it winds","a spindle winds thread")])
a("V6A35","earthquake","landslide","cause/effect","downpour","mudslide","an earthquake can set off a landslide, as a downpour can set off a mudslide",
 [("tremor","quake","degree","a tremor is a slight quake"),("geologist","fossils","scientist/subject","a geologist studies fossils"),("crater","moon","feature/body","a crater marks the moon"),("match","matchbox","item/container","a match is kept in a matchbox")])
a("V6A36","haiku","poem","instance/category","polka","dance","a haiku is a kind of poem, as a polka is a kind of dance",
 [("rhyme","couplet","feature/form","a couplet is built on rhyme"),("poet","quill","worker/tool","a poet writes with a quill"),("stanza","line","whole/part","a stanza is made of lines"),("ballroom","dancers","place/people","dancers gather in a ballroom")])
a("V6A37","cough","cold","symptom/condition","wheeze","asthma","a cough is a symptom of a cold, as a wheeze is a symptom of asthma",
 [("thermometer","degrees","instrument/unit","a thermometer reads in degrees"),("crutch","walking","aid/activity","a crutch aids walking"),("physician","clinic","worker/place","a physician works in a clinic"),("kneecap","leg","part/whole","a kneecap is part of a leg")])
a("V6A38","astronomer","observatory","worker/place","blacksmith","forge","an astronomer works in an observatory, as a blacksmith works at a forge",
 [("telescope","tripod","instrument/support","a telescope rests on a tripod"),("star","twinkle","thing/action","a star twinkles"),("anvil","tongs","tool/companion tool","an anvil and tongs are used together"),("iron","horseshoe","material/product","a horseshoe is made of iron")])
a("V6A39","moat","castle","protector/what it protects","levee","town","a moat protects a castle, as a levee protects a town",
 [("drawbridge","moat","structure/what it spans","a drawbridge spans a moat"),("knight","squire","master/attendant","a squire attends a knight"),("river","delta","source/end","a river ends in a delta"),("stone","rampart","material/structure","a rampart is built of stone")])
a("V6A40","cast","fracture","remedy/ailment","ointment","burn","a cast treats a fracture, as an ointment treats a burn",
 [("bone","skeleton","part/whole","a bone is part of a skeleton"),("nurse","ward","worker/place","a nurse works on a ward"),("gauze","cotton","thing/material","gauze is woven from cotton"),("scalpel","incision","tool/what it makes","a scalpel makes an incision")])
a("V6A41","camel","desert","animal/habitat","toucan","rainforest","a camel lives in the desert, as a toucan lives in the rainforest",
 [("palm","frond","whole/part","a palm has fronds"),("caravan","merchants","group/members","a caravan is made up of merchants"),("nomad","roam","person/action","a nomad roams"),("mirage","illusion","instance/category","a mirage is a kind of illusion")])
a("V6A42","rake","gather","tool/function","tongs","grasp","a rake is used to gather, as tongs are used to grasp",
 [("leaf","autumn","thing/season it falls","leaves fall in autumn"),("gardener","hedge","worker/thing tended","a gardener trims a hedge"),("hoe","handle","whole/part","a hoe has a handle"),("compost","soil","additive/thing enriched","compost enriches soil")])
a("V6A43","meager","abundant","antonym","opaque","clear","meager is the opposite of abundant, as opaque is the opposite of clear",
 [("wordy","talkative","synonym","wordy means talkative"),("editor","draft","worker/thing revised","an editor revises a draft"),("page","notebook","part/whole","a page is part of a notebook"),("glass","pane","material/product","a pane is made of glass")])
a("V6A44","placid","serene","synonym","rigid","stiff","placid means serene, as rigid means stiff",
 [("lake","ripple","surface/disturbance","a ripple disturbs a lake"),("storm","turbulent","event/quality","a storm is turbulent"),("soothe","agitate","antonym","to soothe is the opposite of to agitate"),("yoga","relaxation","activity/purpose","yoga is done for relaxation")])
a("V6A45","desolate","inhabitants","lacking/what is lacked","fallow","crops","a desolate place lacks inhabitants, as a fallow field lacks crops",
 [("author","pseudonym","person/false name","an author may write under a pseudonym"),("signature","check","mark/document","a signature validates a check"),("famous","celebrity","quality/person","a celebrity is famous"),("quiz","student","test/one tested","a quiz tests a student")])
a("V6A46","coffer","coins","container/contents","canister","flour","a coffer holds coins, as a canister holds flour",
 [("farmer","tractor","worker/vehicle","a farmer drives a tractor"),("kernel","corn","part/whole","a kernel is part of an ear of corn"),("baker","apron","worker/garment","a baker wears an apron"),("mint","currency","place/product","a mint produces currency")])
a("V6A47","crack","chasm","degree","sting","agony","a crack is a small gap and a chasm a vast one, as a sting is a small pain and agony an overwhelming one",
 [("bridge","gorge","structure/what it spans","a bridge spans a gorge"),("weatherman","forecast","worker/product","a weatherman issues a forecast"),("cloud","vapor","thing/material","a cloud is made of vapor"),("thunder","rumble","thing/sound","thunder rumbles")])
a("V6A48","procrastinator","delay","person/defining action","plagiarist","copy","a procrastinator by definition delays, as a plagiarist by definition copies",
 [("hurry","dawdle","antonym","to hurry is the opposite of to dawdle"),("errand","chore","synonym","an errand is a chore"),("sloth","branch","animal/where it hangs","a sloth hangs from a branch"),("alarm","wake","device/purpose","an alarm is used to wake someone")])
a("V6A49","tadpole","bullfrog","young/adult","larva","moth","a tadpole grows into a bullfrog, as a larva grows into a moth",
 [("antenna","beetle","part/whole","an antenna is part of a beetle"),("termite","mound","insect/home","a termite lives in a mound"),("ladybug","insect","instance/category","a ladybug is a kind of insect"),("croak","toad","sound/animal","a toad croaks")])
a("V6A50","fisherman","reel","worker/tool","locksmith","pick","a fisherman works with a reel, as a locksmith works with a pick",
 [("bait","trout","lure/target","bait lures a trout"),("lake","pier","place/structure","a pier juts into a lake"),("net","mesh","thing/structure","a net is made of mesh"),("trowel","brick","tool/material laid","a trowel is used to lay brick")])
a("V6A51","sculptor","statues","worker/product","composer","operas","a sculptor creates statues, as a composer creates operas",
 [("building","foundation","whole/part","a building rests on a foundation"),("pencil","lead","tool/material","a pencil contains lead"),("glaze","shine","coating/effect","a glaze gives a shine"),("marble","quarry","material/source","marble is cut from a quarry")])
a("V6A52","stethoscope","murmurs","instrument/what it detects","sonar","submarines","a stethoscope detects heart murmurs, as sonar detects submarines",
 [("hourglass","sand","container/contents","an hourglass holds sand"),("minute","hour","part/whole","a minute is part of an hour"),("meteor","sky","thing/place seen","a meteor is seen in the sky"),("torpedo","battleship","weapon/target","a torpedo is fired at a battleship")])
a("V6A53","ore","metal","raw material/refined product","crude","gasoline","ore is refined into metal, as crude oil is refined into gasoline",
 [("miner","lamp","worker/equipment","a miner wears a lamp"),("pine","forest","member/group","a pine is part of a forest"),("pancake","breakfast","food/meal","a pancake is eaten at breakfast"),("nugget","gold","lump/substance","a nugget is a lump of gold")])
a("V6A54","neglect","ruin","cause/effect","exercise","fitness","neglect brings about ruin, as exercise brings about fitness",
 [("janitor","broom","worker/tool","a janitor uses a broom"),("orphan","guardian","person/caretaker","a guardian cares for an orphan"),("garden","weeds","place/what grows","weeds grow in a garden"),("cobweb","spider","product/maker","a spider spins a cobweb")])
a("V6A55","granite","rock","instance/category","sapphire","gem","granite is a kind of rock, as a sapphire is a kind of gem",
 [("chisel","stone","tool/material","a chisel cuts stone"),("boulder","gravel","degree of size","a boulder is far larger than gravel"),("jeweler","necklace","worker/product","a jeweler makes a necklace"),("ruby","crimson","thing/color","a ruby is crimson")])
a("V6A56","blush","shame","reaction/feeling","tremble","fear","one blushes from shame, as one trembles from fear",
 [("wince","flinch","synonym","to wince is to flinch"),("dentist","filling","worker/product","a dentist places a filling"),("wound","stitches","injury/treatment","a wound is closed with stitches"),("bruise","knee","injury/location","a bruise may appear on a knee")])
a("V6A57","miner","tunnel","worker/place","lumberjack","woods","a miner works in a tunnel, as a lumberjack works in the woods",
 [("coal","fuel","instance/category","coal is a kind of fuel"),("axe","handle","whole/part","an axe has a handle"),("timber","cabin","material/product","a cabin is built of timber"),("lantern","blackness","tool/what it dispels","a lantern dispels blackness")])
a("V6A58","snake","hiss","animal/sound","crow","caw","a snake hisses, as a crow caws",
 [("fang","venom","part/what it delivers","a fang delivers venom"),("scales","iguana","covering/animal","scales cover an iguana"),("barn","loft","whole/part","a barn has a loft"),("foal","mare","young/mother","a foal is the young of a mare")])
a("V6A59","irked","enraged","degree","content","ecstatic","irked is a mild form of enraged, as content is a mild form of ecstatic",
 [("insult","offense","cause/effect","an insult causes offense"),("fury","serenity","antonym","fury is the opposite of serenity"),("jealous","envious","synonym","jealous means envious"),("pout","disappointment","expression/feeling","a pout shows disappointment")])
a("V6A60","regiment","troops","group/member","colony","ants","a regiment is a group of troops, as a colony is a group of ants",
 [("general","battalion","leader/unit led","a general commands a battalion"),("medal","courage","award/quality honored","a medal honors courage"),("uniform","badge","whole/part","a uniform bears a badge"),("pew","chapel","furniture/place","a pew stands in a chapel")])

# ---------------- hard ----------------
a("V6A61","cooper","casks","worker/product","thatcher","roofs","a cooper makes casks, as a thatcher makes roofs",
 [("plum","prune","fresh/dried form","a prune is a dried plum"),("cork","bark","material/source","cork is the bark of the cork oak"),("barrel","stave","whole/part","a barrel is built of staves"),("sommelier","cellar","worker/place","a sommelier tends a wine cellar")],"hard")
a("V6A62","affable","genial","synonym","ebullient","exuberant","affable means genial, as ebullient means exuberant",
 [("orator","lectern","person/place","an orator speaks from a lectern"),("mute","voice","lacking/what is lacked","someone mute lacks a voice"),("comedian","punchlines","person/product","a comedian delivers punchlines"),("babble","brook","sound/source","a brook babbles")],"hard")
a("V6A63","ephemeral","lasting","antonym","magnanimous","petty","ephemeral is the opposite of lasting, as magnanimous is the opposite of petty",
 [("fleeting","transient","synonym","fleeting means transient"),("donor","charity","person/what is given","a donor gives to charity"),("dew","morning","thing/time it appears","dew appears in the morning"),("obelisk","stone","monument/material","an obelisk is carved from stone")],"hard")
a("V6A64","callow","experience","lacking/what is lacked","impassive","emotion","someone callow lacks experience, as someone impassive shows no emotion",
 [("fledgling","flight","learner/skill learned","a fledgling learns flight"),("sage","wisdom","person/quality possessed","a sage possesses wisdom"),("salt","season","substance/use","salt is used to season"),("bland","tasteless","synonym","bland means tasteless")],"hard")
a("V6A65","ascetic","austerity","person/defining trait","hypocrite","duplicity","an ascetic is marked by austerity, as a hypocrite is marked by duplicity",
 [("crusade","cause","campaign/goal","a crusade is waged for a cause"),("sermon","congregation","speech/audience","a sermon is delivered to a congregation"),("ardent","lukewarm","antonym","ardent is the opposite of lukewarm"),("flame","passion","symbol/feeling","a flame symbolizes passion")],"hard")
a("V6A66","determined","obstinate","virtue/its excess","generous","prodigal","determined becomes obstinate when carried to excess, as generous becomes prodigal when carried to excess",
 [("anchor","steadiness","symbol/quality","an anchor symbolizes steadiness"),("wallet","coins","container/contents","a wallet holds coins"),("spendthrift","squander","person/action","a spendthrift squanders"),("modest","boastful","antonym","modest is the opposite of boastful")],"hard")
a("V6A67","pestle","grind","tool/function","auger","bore","a pestle is used to grind, as an auger is used to bore",
 [("herb","garden","plant/place","an herb grows in a garden"),("chemist","beaker","worker/tool","a chemist uses a beaker"),("powder","dust","synonym","powder is a fine dust"),("mortar","bowl","instance/category","a mortar is a kind of bowl")],"hard")
a("V6A68","sarcophagus","mummy","container/contents","reliquary","relics","a sarcophagus holds a mummy, as a reliquary holds relics",
 [("archaeologist","trowel","worker/tool","an archaeologist digs with a trowel"),("papyrus","scroll","material/product","a scroll is made of papyrus"),("hieroglyph","symbol","instance/category","a hieroglyph is a kind of symbol"),("embalm","preserve","action/purpose","one embalms to preserve")],"hard")
a("V6A69","famine","emaciation","cause/effect","monotony","boredom","famine causes emaciation, as monotony causes boredom",
 [("gaunt","thin","degree","gaunt is extremely thin"),("harvest","sickle","task/tool","a sickle is used in the harvest"),("ration","soldier","allotment/recipient","a soldier receives a ration"),("cornucopia","plenty","symbol/idea","a cornucopia symbolizes plenty")],"hard")
a("V6A70","ornithology","birds","study/subject","herpetology","reptiles","ornithology is the study of birds, as herpetology is the study of reptiles",
 [("aviary","sparrows","place/residents","sparrows may live in an aviary"),("feather","plume","synonym","a plume is a feather"),("binoculars","birdwatcher","tool/user","a birdwatcher uses binoculars"),("migration","geese","behavior/animal","geese undertake migration")],"hard")
a("V6A71","frond","fern","part/whole","tendril","vine","a frond is part of a fern, as a tendril is part of a vine",
 [("moss","boulder","plant/surface it grows on","moss grows on a boulder"),("sharpen","knife","action/object","one sharpens a knife"),("jungle","humid","place/quality","a jungle is humid"),("silverware","cutlery","synonym","silverware is cutlery")],"hard")
a("V6A72","laconic","loquacious","antonym","diffident","assertive","laconic is the opposite of loquacious, as diffident is the opposite of assertive",
 [("terse","brusque","synonym","terse means brusque"),("chatter","magpie","sound/animal","a magpie chatters"),("editor","revision","worker/task","an editor makes a revision"),("pause","sentence","break/what it interrupts","a pause interrupts a sentence")],"hard")
a("V6A73","insolvent","funds","lacking/what is lacked","apathetic","concern","someone insolvent lacks funds, as someone apathetic lacks concern",
 [("banker","loan","person/what is granted","a banker grants a loan"),("ledger","transactions","book/records","a ledger records transactions"),("debt","creditor","thing owed/person owed","a debt is owed to a creditor"),("pauper","alms","person/what is received","a pauper receives alms")],"hard")
a("V6A74","admiration","reverence","degree","unease","panic","reverence is admiration at its most intense, as panic is unease at its most intense",
 [("shrine","pilgrim","place/visitor","a pilgrim visits a shrine"),("respect","disdain","antonym","respect is the opposite of disdain"),("nightmare","sleep","event/state during","a nightmare occurs during sleep"),("relic","saint","object/person venerated","a relic is kept in memory of a saint")],"hard")
a("V6A75","farrier","anvil","worker/tool","goldsmith","crucible","a farrier works with an anvil, as a goldsmith works with a crucible",
 [("nail","horseshoe","fastener/thing fastened","a nail fastens a horseshoe"),("stable","stablehands","place/worker","stablehands work in a stable"),("saddle","pommel","whole/part","a saddle has a pommel"),("canter","gait","instance/category","a canter is a kind of gait")],"hard")
a("V6A76","pantheon","gods","group/member","coterie","friends","a pantheon is a group of gods, as a coterie is a group of friends",
 [("oracle","riddle","person/utterance","an oracle speaks in riddles"),("fable","parable","synonym","a fable is a parable"),("temple","column","whole/part","a temple has columns"),("muse","inspiration","figure/what it provides","a muse provides inspiration")],"hard")
a("V6A77","sycophant","flattery","person/characteristic behavior","charlatan","deception","a sycophant trades in flattery, as a charlatan trades in deception",
 [("courtier","palace","person/place","a courtier attends at a palace"),("monarch","scepter","ruler/symbol","a scepter symbolizes a monarch"),("applause","ovation","degree","an ovation is applause at its most enthusiastic"),("candor","forthrightness","synonym","candor is forthrightness")],"hard")
a("V6A78","pallor","illness","sign/cause","callus","toil","pallor is a sign of illness, as a callus is a sign of toil",
 [("fever","thermometer","condition/instrument","a thermometer detects a fever"),("nurse","patient","caregiver/receiver","a nurse cares for a patient"),("farmer","scythe","worker/tool","a farmer uses a scythe"),("rest","recovery","means/result","rest leads to recovery")],"hard")
a("V6A79","mahogany","hardwood","instance/category","saffron","spice","mahogany is a kind of hardwood, as saffron is a kind of spice",
 [("lumber","timber","synonym","lumber is timber"),("walnut","shell","nut/covering","a walnut has a shell"),("carpenter","dresser","worker/product","a carpenter builds a dresser"),("saw","sawdust","tool/byproduct","a saw produces sawdust")],"hard")
a("V6A80","salve","abrasion","remedy/ailment","tourniquet","hemorrhage","a salve treats an abrasion, as a tourniquet stops a hemorrhage",
 [("physician","stethoscope","worker/tool","a physician uses a stethoscope"),("scar","laceration","mark/cause","a laceration leaves a scar"),("medic","battlefield","worker/place","a medic works on a battlefield"),("capillary","vessel","instance/category","a capillary is a kind of blood vessel")],"hard")

json.dump(A,open('ana-draft.json','w'),indent=1)
