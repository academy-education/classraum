import json,re
L=set(json.load(open('live-words.json')))
A=[]
def a(i,s1,s2,rel,k1,k2,why,ds,d="medium"):
    A.append(dict(id=i,stem=(s1,s2),rel=rel,key=(k1,k2),why=why,ds=ds,d=d))
# ds: list of (w1,w2,relation,gloss)
a("A01","hermit","companionship","lack","pauper","wealth","a hermit lives without companionship, as a pauper lives without wealth",
 [("anchor","ship","part/whole","an anchor is part of a ship's gear"),("drought","famine","cause/effect","a drought can cause famine"),("sapling","oak","young/adult","a sapling grows into an oak"),("fable","story","instance/category","a fable is a kind of story")])
a("A02","cobbler","shoes","worker/thing repaired","upholsterer","sofas","a cobbler repairs shoes, as an upholsterer re-covers sofas",
 [("thimble","finger","protector/protected","a thimble protects a finger"),("orchard","fruit","place/product","an orchard yields fruit"),("drizzle","downpour","degree","a drizzle is a much lighter rain than a downpour"),("rudder","steering","tool/function","a rudder is used for steering")])
a("A03","whisper","shout","degree","nibble","devour","to whisper is a mild form of shouting's act of speaking, as to nibble is a mild form of devouring",
 [("ladle","soup","tool/object","a ladle serves soup"),("tadpole","frog","young/adult","a tadpole becomes a frog"),("glacier","ice","thing/material","a glacier is made of ice"),("referee","match","official/event","a referee officiates a match")])
a("A04","thermostat","temperature","instrument/what it regulates","metronome","tempo","a thermostat sets temperature, as a metronome sets tempo",
 [("vineyard","grapes","place/product","a vineyard produces grapes"),("timid","bold","antonym","timid is the opposite of bold"),("petal","blossom","part/whole","a petal is part of a blossom"),("famine","hunger","cause/effect","famine causes hunger")])
a("A05","quiver","arrows","container/contents","scabbard","sword","a quiver holds arrows, as a scabbard holds a sword",
 [("archer","bow","user/tool","an archer uses a bow"),("ember","blaze","degree","an ember is a dying remnant of a blaze"),("knight","armor","person/what they wear","a knight wears armor"),("siege","castle","action/target","a siege is laid against a castle")])
a("A06","famished","hungry","degree","parched","thirsty","famished is extremely hungry, as parched is extremely thirsty",
 [("generous","stingy","antonym","generous is the opposite of stingy"),("weary","rest","state/remedy","rest relieves the weary"),("oasis","desert","place/surroundings","an oasis lies within a desert"),("cheerful","mood","instance/category","cheerful is a kind of mood")])
a("A07","sculptor","chisel","worker/tool","surgeon","scalpel","a sculptor works with a chisel, as a surgeon works with a scalpel",
 [("marble","statue","material/product","a statue may be carved from marble"),("patient","hospital","person/place","a patient stays in a hospital"),("canvas","painter","material/worker","a painter works on canvas"),("bruise","injury","instance/category","a bruise is a kind of injury")])
a("A08","insomnia","sleep","condition/what is lacking","amnesia","memory","insomnia is a loss of sleep, as amnesia is a loss of memory",
 [("fever","illness","symptom/condition","a fever is a symptom of illness"),("pillow","bed","part/whole","a pillow is part of a bed's furnishings"),("yawn","fatigue","sign/state","a yawn signals fatigue"),("nurse","clinic","worker/place","a nurse works in a clinic")],"hard")
a("A09","pride","lions","group/member","pod","whales","a group of lions is a pride, as a group of whales is a pod",
 [("mane","lion","part/whole","a mane is part of a lion"),("savanna","zebra","habitat/animal","a zebra lives on the savanna"),("cub","bear","young/adult","a cub is a young bear"),("roar","growl","degree","a roar is louder than a growl")])
a("A10","prologue","novel","beginning/whole","overture","opera","a prologue opens a novel, as an overture opens an opera",
 [("author","manuscript","creator/work","an author writes a manuscript"),("chapter","verse","unit/unit","a chapter divides prose, a verse divides a poem"),("encore","applause","response/cause","applause can bring an encore"),("critic","review","person/product","a critic writes a review")],"hard")
a("A11","miser","hoard","person/characteristic action","glutton","gorge","a miser hoards, as a glutton gorges",
 [("pirate","treasure","person/object sought","a pirate seeks treasure"),("thrifty","wasteful","antonym","thrifty is the opposite of wasteful"),("coin","purse","contents/container","a coin is kept in a purse"),("banquet","feast","synonym","a banquet is a feast")],"hard")
a("A12","pedal","bicycle","control/vehicle","oar","rowboat","a pedal drives a bicycle, as an oar drives a rowboat",
 [("helmet","cyclist","protector/user","a cyclist wears a helmet"),("harbor","ferry","place/vehicle","a ferry docks in a harbor"),("tire","wheel","part/part","a tire fits around a wheel"),("sprint","jog","degree","a sprint is faster than a jog")])
a("A13","novice","expert","beginner/master","apprentice","craftsman","a novice becomes an expert, as an apprentice becomes a craftsman",
 [("lesson","tutor","thing given/giver","a tutor gives a lesson"),("trophy","victory","reward/achievement","a trophy marks a victory"),("diploma","graduate","document/holder","a graduate receives a diploma"),("rookie","team","member/group","a rookie joins a team")],"hard")
a("A14","drought","rainfall","absence/what is absent","blackout","electricity","a drought is an absence of rainfall, as a blackout is an absence of electricity",
 [("lightning","thunder","cause/effect","lightning causes thunder"),("reservoir","water","container/contents","a reservoir stores water"),("candle","wick","whole/part","a candle has a wick"),("puddle","lake","degree of size","a puddle is far smaller than a lake")])
a("A15","stethoscope","heartbeat","instrument/what it detects","seismograph","tremor","a stethoscope detects a heartbeat, as a seismograph detects a tremor",
 [("physician","diagnosis","worker/product","a physician makes a diagnosis"),("pulse","wrist","sign/location","a pulse is taken at the wrist"),("bandage","wound","remedy/problem","a bandage covers a wound"),("volcano","lava","source/product","a volcano emits lava")],"hard")
a("A16","ravenous","appetite","degree of a feeling","furious","anger","ravenous is an extreme of appetite, as furious is an extreme of anger",
 [("joyful","sorrowful","antonym","joyful is the opposite of sorrowful"),("frown","displeasure","expression/feeling","a frown shows displeasure"),("tantrum","toddler","behavior/typical agent","a tantrum is typical of a toddler"),("fear","courage","emotion/what overcomes it","courage overcomes fear")],"hard")
a("A17","loom","weaver","tool/user","kiln","potter","a weaver works at a loom, as a potter fires clay in a kiln",
 [("yarn","sweater","material/product","a sweater is knitted from yarn"),("clay","brick","material/product","a brick is made of clay"),("shuttle","thread","tool/material","a shuttle carries thread"),("bakery","bread","place/product","a bakery produces bread")])
a("A18","famine","scarcity","extreme/milder state","deluge","shower","a famine is an extreme scarcity of food, as a deluge is an extreme shower of rain",
 [("harvest","crop","event/object","a crop is gathered at harvest"),("granary","grain","container/contents","a granary stores grain"),("feast","celebration","event/occasion","a feast marks a celebration"),("ration","portion","synonym","a ration is a fixed portion")],"hard")
a("A19","gavel","judge","tool/user","baton","conductor","a judge uses a gavel, as a conductor uses a baton",
 [("verdict","trial","outcome/process","a trial ends in a verdict"),("courtroom","lawyer","place/worker","a lawyer works in a courtroom"),("symphony","composer","work/creator","a composer writes a symphony"),("jury","juror","group/member","a juror belongs to a jury")])
a("A20","bashful","shy","synonym","jubilant","elated","bashful means shy, as jubilant means elated",
 [("brave","cowardly","antonym","brave is the opposite of cowardly"),("blush","embarrassment","sign/feeling","a blush shows embarrassment"),("canteen","water","container/contents","a canteen holds water"),("cheer","crowd","action/agent","a crowd cheers")],"medium")
a("A21","lighthouse","sailors","thing/those it warns","siren","motorists","a lighthouse warns sailors, as a siren warns motorists",
 [("keeper","lighthouse","worker/place","a keeper tends a lighthouse"),("reef","shipwreck","cause/effect","a reef can cause a shipwreck"),("horn","foghorn","category/instance","a foghorn is a kind of horn"),("harbor","coast","part/whole","a harbor lies along a coast")],"hard")
a("A22","fledgling","sparrow","young/adult","calf","giraffe","a fledgling grows into a sparrow, as a calf grows into a giraffe",
 [("nest","twig","whole/material","a nest is built of twigs"),("feather","wing","part/whole","a feather is part of a wing"),("chirp","song","degree","a chirp is shorter than a song"),("flock","bird","group/member","a bird belongs to a flock")])
a("A23","antidote","poison","remedy/harm","sunscreen","sunburn","an antidote counters poison, as sunscreen prevents sunburn",
 [("venom","serpent","substance/source","a serpent produces venom"),("pharmacy","medicine","place/product","a pharmacy sells medicine"),("rash","allergy","symptom/condition","a rash can be a symptom of allergy"),("tablet","dose","form/amount","a dose may come as a tablet")],"hard")
a("A24","sentry","guard","synonym","pinnacle","summit","a sentry is a guard, as a pinnacle is a summit",
 [("fortress","wall","whole/part","a fortress has a wall"),("valley","peak","antonym in landform","a valley is low where a peak is high"),("hike","trail","activity/place","a hike follows a trail"),("patrol","night","activity/time","a patrol may happen at night")])
a("A25","inaudible","sound","not perceivable/what is not perceived","invisible","sight","something inaudible cannot be heard, as something invisible cannot be seen",
 [("deafening","noise","degree","deafening describes extreme noise"),("echo","canyon","effect/place","an echo sounds in a canyon"),("telescope","star","instrument/object","a telescope shows a star"),("murmur","brook","sound/source","a brook makes a murmur")],"hard")
a("A26","carpenter","sawdust","worker/byproduct","blacksmith","sparks","a carpenter's work throws off sawdust, as a blacksmith's work throws off sparks",
 [("hammer","nail","tool/object","a hammer drives a nail"),("lumber","cabinet","material/product","a cabinet is built from lumber"),("forge","iron","place/material","iron is heated in a forge"),("workshop","bench","whole/part","a workshop holds a bench")],"hard")
a("A27","stanza","poem","section/whole","act","play","a stanza is a section of a poem, as an act is a section of a play",
 [("poet","rhyme","creator/device","a poet uses rhyme"),("stage","theater","part/whole","a stage is part of a theater"),("script","actor","document/user","an actor learns a script"),("ballad","song","instance/category","a ballad is a kind of song")])
a("A28","meander","stream","characteristic motion/thing","flicker","flame","a stream meanders, as a flame flickers",
 [("current","river","flow/thing","a river has a current"),("candle","wax","thing/material","a candle is made of wax"),("blaze","spark","degree","a blaze is far larger than a spark"),("bank","stream","border/thing","a bank borders a stream")],"hard")
a("A29","archive","documents","place/kept items","aquarium","fish","an archive keeps documents, as an aquarium keeps fish",
 [("librarian","catalog","worker/tool","a librarian keeps a catalog"),("scroll","parchment","object/material","a scroll is made of parchment"),("gill","fish","part/whole","a gill is part of a fish"),("historian","past","specialist/subject","a historian studies the past")])
a("A30","benevolent","kindness","quality/what it shows","candid","honesty","a benevolent person shows kindness, as a candid person shows honesty",
 [("cruel","gentle","antonym","cruel is the opposite of gentle"),("charity","donor","act/agent","a donor gives to charity"),("liar","deceit","person/practice","a liar practices deceit"),("pledge","promise","synonym","a pledge is a promise")],"hard")
a("A31","trowel","mason","tool/user","spatula","chef","a mason spreads mortar with a trowel, as a chef turns food with a spatula",
 [("cement","bricklayer","material/worker","a bricklayer uses cement"),("kitchen","oven","whole/part","a kitchen holds an oven"),("recipe","dish","plan/product","a recipe produces a dish"),("apron","cook","garment/wearer","a cook wears an apron")])
a("A32","caterpillar","butterfly","larva/adult","maggot","fly","a caterpillar becomes a butterfly, as a maggot becomes a fly",
 [("cocoon","silk","object/material","a cocoon is made of silk"),("antenna","insect","part/whole","an antenna is part of an insect"),("flutter","soar","degree","to soar is a stronger flight than to flutter"),("meadow","bee","habitat/animal","a bee lives in a meadow")])
a("A33","compass","direction","instrument/what it shows","barometer","pressure","a compass shows direction, as a barometer shows pressure",
 [("navigator","voyage","person/undertaking","a navigator plans a voyage"),("needle","magnet","part/force","a magnet moves the needle"),("storm","gale","category/instance","a gale is a kind of storm"),("latitude","longitude","pair","latitude and longitude are paired coordinates")],"medium")
a("A34","slander","reputation","act/what it damages","erosion","shoreline","slander wears away a reputation, as erosion wears away a shoreline",
 [("rumor","gossip","synonym","a rumor is a piece of gossip"),("apology","insult","remedy/offense","an apology answers an insult"),("wave","ocean","part/whole","a wave is part of the ocean"),("cliff","pebble","degree of size","a cliff is vastly larger than a pebble")],"hard")
a("A35","cartographer","maps","maker/product","lexicographer","dictionaries","a cartographer makes maps, as a lexicographer compiles dictionaries",
 [("atlas","globe","similar objects","an atlas and a globe both show the world"),("reader","novel","user/object","a reader reads a novel"),("editor","newspaper","worker/publication","an editor works on a newspaper"),("ink","quill","material/tool","a quill holds ink")],"hard")
a("A36","prudent","rash","antonym","frugal","lavish","prudent is the opposite of rash, as frugal is the opposite of lavish",
 [("careful","cautious","synonym","careful and cautious mean the same"),("savings","bank","thing/place","savings are kept in a bank"),("gamble","risk","act/quality","a gamble involves risk"),("miser","coin","person/object","a miser hoards coins")],"hard")
a("A37","fang","serpent","part/animal","tusk","walrus","a fang is part of a serpent, as a tusk is part of a walrus",
 [("hiss","snake","sound/animal","a snake hisses"),("burrow","rabbit","home/animal","a rabbit lives in a burrow"),("venom","bite","substance/act","venom is delivered by a bite"),("ivory","tusk","material/object","a tusk is made of ivory")])
a("A38","eulogy","praise","form/content","lament","grief","a eulogy is speech full of praise, as a lament is speech full of grief",
 [("funeral","mourner","event/participant","a mourner attends a funeral"),("tribute","monument","act/object","a monument is a tribute"),("sob","weep","synonym","to sob is to weep"),("speaker","podium","person/place","a speaker stands at a podium")],"hard")
a("A39","sieve","flour","tool/what it sifts","colander","pasta","flour is sifted through a sieve, as pasta is drained in a colander",
 [("baker","dough","worker/material","a baker shapes dough"),("pantry","jar","place/container","a jar is kept in a pantry"),("whisk","egg","tool/object","a whisk beats an egg"),("crumb","loaf","part/whole","a crumb is part of a loaf")])
a("A40","mutiny","ship","revolt/place","strike","factory","a mutiny is a revolt aboard a ship, as a strike is a stoppage at a factory",
 [("captain","crew","leader/group","a captain leads a crew"),("anchor","harbor","object/place","an anchor is dropped in a harbor"),("worker","wage","person/payment","a worker earns a wage"),("treaty","war","agreement/conflict","a treaty ends a war")],"hard")
a("A41","garrulous","talk","tendency/act","gregarious","socialize","a garrulous person tends to talk, as a gregarious person tends to socialize",
 [("silent","quiet","synonym","silent means quiet"),("lecture","audience","event/participant","an audience hears a lecture"),("whisper","rumor","act/content","a rumor is whispered"),("orator","speech","person/product","an orator delivers a speech")],"hard")
a("A42","pebble","boulder","degree of size","twig","log","a pebble is a small boulder, as a twig is a small log",
 [("quarry","stone","place/product","stone is cut from a quarry"),("bark","tree","part/whole","bark is part of a tree"),("mason","granite","worker/material","a mason works granite"),("forest","lumberjack","place/worker","a lumberjack works in a forest")])
a("A43","ointment","rash","remedy/ailment","splint","fracture","an ointment treats a rash, as a splint treats a fracture",
 [("itch","scratch","stimulus/response","an itch prompts a scratch"),("crutch","limp","aid/condition","a crutch helps with a limp"),("skin","bone","layer/structure","skin covers bone"),("doctor","prescription","worker/product","a doctor writes a prescription")],"hard")
a("A44","dormant","volcano","inactive state/thing","fallow","field","a dormant volcano is inactive for now, as a fallow field is unplanted for now",
 [("eruption","ash","event/product","an eruption produces ash"),("crater","summit","part/whole","a crater sits at a summit"),("harvest","farmer","event/worker","a farmer gathers the harvest"),("plow","furrow","tool/product","a plow cuts a furrow")],"hard")
a("A45","plumage","peacock","covering/animal","fleece","sheep","a peacock is covered in plumage, as a sheep is covered in fleece",
 [("shepherd","flock","worker/group","a shepherd tends a flock"),("strut","march","similar motion","to strut is a proud kind of march"),("wool","sweater","material/product","a sweater is made of wool"),("barn","stable","similar place","a barn and a stable both house animals")])
a("A46","archipelago","island","group/member","constellation","star","an archipelago is a group of islands, as a constellation is a group of stars",
 [("peninsula","coast","landform/edge","a peninsula juts from a coast"),("astronomer","telescope","worker/tool","an astronomer uses a telescope"),("lagoon","sea","degree of size","a lagoon is far smaller than a sea"),("orbit","planet","path/body","a planet travels in an orbit")],"hard")
a("A47","feeble","strength","lacking/quality","ignorant","knowledge","a feeble person lacks strength, as an ignorant person lacks knowledge",
 [("muscle","athlete","feature/person","an athlete has muscle"),("scholar","library","person/place","a scholar works in a library"),("lift","heave","degree","to heave is a harder lift"),("lesson","pupil","thing given/receiver","a pupil receives a lesson")],"medium")
a("A48","conductor","orchestra","leader/group","foreman","crew","a conductor directs an orchestra, as a foreman directs a crew",
 [("violin","bow","instrument/accessory","a violin is played with a bow"),("rehearsal","concert","preparation/event","a rehearsal prepares a concert"),("melody","harmony","companion elements","melody and harmony combine in music"),("hardhat","worker","gear/wearer","a worker wears a hardhat")])
def words(s): return set(re.findall(r"[a-z]+",s.lower()))
bad={}
for x in A:
    w=words(" ".join(x["stem"]+x["key"]))
    hit=sorted(w&L)
    if hit: bad[x["id"]]=hit
print(len(A),"drafted;",len(bad),"collide on stem/key")
for k,v in bad.items(): print(" ",k,v)

BY={x["id"]:x for x in A}
def S(i,stem=None,key=None,why=None,d=None,rel=None):
    x=BY[i]
    if stem: x["stem"]=stem
    if key: x["key"]=key
    if why: x["why"]=why
    if rel: x["rel"]=rel
    for k,v in (d or {}).items(): x["ds"][k]=v
S("A01",stem=("skeptic","faith"),why="a skeptic is marked by a lack of faith, as a pauper is marked by a lack of wealth",d={1:("spark","wildfire","cause/effect","a spark can start a wildfire"),3:("sonnet","poem","instance/category","a sonnet is a kind of poem")})
S("A02",stem=("tailor","trousers"),why="a tailor alters and mends trousers, as an upholsterer re-covers sofas",d={1:("apiary","honey","place/product","an apiary produces honey"),2:("trickle","torrent","degree","a trickle is a far smaller flow than a torrent")})
S("A03",key=("sip","gulp"),why="to whisper is a mild form of what a shout does loudly, as to sip is a mild form of what a gulp does greedily",d={1:("kitten","cat","young/adult","a kitten grows into a cat"),2:("igloo","snow","thing/material","an igloo is built of snow")})
S("A04",key=("dimmer","brightness"),why="a thermostat adjusts temperature, as a dimmer adjusts brightness",d={0:("dairy","cheese","place/product","a dairy produces cheese"),2:("stem","tulip","part/whole","a stem is part of a tulip"),3:("blizzard","snowdrift","cause/effect","a blizzard leaves snowdrifts")})
S("A05",stem=("holster","pistol"),key=("sheath","dagger"),why="a holster holds a pistol, as a sheath holds a dagger",d={0:("marksman","rifle","user/tool","a marksman uses a rifle")})
S("A06",stem=("exhausted","tired"),key=("freezing","chilly"),why="exhausted is extremely tired, as freezing is extremely chilly",d={0:("lavish","miserly","antonym","lavish is the opposite of miserly"),2:("blanket","warmth","object/what it gives","a blanket gives warmth")})
S("A07",key=("barber","razor"),why="a sculptor works with a chisel, as a barber works with a razor",d={0:("granite","monument","material/product","a monument may be cut from granite")})
S("A10",key=("preamble","constitution"),why="a prologue opens a novel, as a preamble opens a constitution")
S("A14",key=("vacuum","air"),why="a drought is an absence of rainfall, as a vacuum is an absence of air",d={0:("flood","levee","problem/barrier","a levee holds back a flood"),1:("cistern","rainwater","container/contents","a cistern stores rainwater"),2:("lamp","bulb","whole/part","a lamp has a bulb"),3:("pond","ocean","degree of size","a pond is vastly smaller than an ocean")})
S("A15",key=("radar","aircraft"),why="a stethoscope detects a heartbeat, as radar detects aircraft",d={0:("pharmacist","prescription","worker/thing filled","a pharmacist fills a prescription"),2:("gauze","cut","covering/injury","gauze covers a cut")})
S("A17",stem=("anvil","blacksmith"),key=("easel","painter"),why="a blacksmith works at an anvil, as a painter works at an easel",d={1:("flour","pastry","material/product","pastry is made from flour")})
S("A19",key=("whistle","referee"),why="a judge uses a gavel to keep order, as a referee uses a whistle",d={0:("score","game","outcome/process","a game ends with a score"),2:("novel","author","work/creator","an author writes a novel"),3:("choir","singer","group/member","a singer belongs to a choir")})
S("A27",stem=("movement","symphony"),why="a movement is a section of a symphony, as an act is a section of a play",d={3:("lullaby","song","instance/category","a lullaby is a kind of song")})
S("A31",stem=("trowel","bricklayer"),key=("whisk","baker"),why="a bricklayer spreads mortar with a trowel, as a baker beats batter with a whisk",d={0:("scaffold","building","support/structure","a scaffold supports work on a building"),2:("recipe","dish","plan/product","a recipe produces a dish")})
S("A32",stem=("nymph","dragonfly"),key=("grub","beetle"),why="a nymph becomes a dragonfly, as a grub becomes a beetle")
S("A33",stem=("odometer","distance"),why="an odometer shows distance, as a barometer shows pressure")
S("A35",stem=("lexicographer","dictionaries"),key=("choreographer","dances"),why="a lexicographer compiles dictionaries, as a choreographer creates dances")
S("A37",key=("antler","moose"),why="a fang is part of a serpent, as an antler is part of a moose",d={0:("slither","snake","motion/animal","a snake slithers")})
S("A42",stem=("hut","mansion"),why="a hut is a small mansion's humble counterpart in size, as a twig is to a log",d={0:("mine","coal","place/product","coal is dug from a mine")})
S("A46",stem=("convoy","truck"),key=("flotilla","boat"),why="a convoy is a group of trucks, as a flotilla is a group of boats",d={1:("captain","compass","user/tool","a captain uses a compass")})
S("A08",d={0:("rash","measles","symptom/condition","a rash is a symptom of measles")})
S("A09",d={2:("pup","seal","young/adult","a pup is a young seal")})
S("A12",d={0:("kneepad","skater","protector/user","a skater wears a kneepad"),3:("dash","stroll","degree","a dash is far faster than a stroll")})
S("A18",d={1:("silo","corn","container/contents","a silo stores corn")})
S("A20",d={1:("shiver","cold","sign/feeling","a shiver shows cold")})
S("A22",d={0:("hive","wax","whole/material","a hive is built of wax"),1:("beak","bird","part/whole","a beak is part of a bird")})
S("A23",d={0:("ink","squid","substance/source","a squid releases ink"),1:("dispensary","medicine","place/product","a dispensary gives out medicine")})
S("A25",d={2:("microscope","cell","instrument/object","a microscope shows a cell")})
S("A26",d={3:("shed","rake","place/item stored","a rake is kept in a shed")})
S("A28",d={1:("crayon","wax","thing/material","a crayon is made of wax")})
S("A30",d={3:("vow","oath","synonym","a vow is an oath")})
S("A34",d={0:("hearsay","rumor","synonym","hearsay is rumor"),1:("amends","wrong","remedy/offense","amends make up for a wrong"),2:("ripple","pond","part/whole","a ripple moves across a pond")})
S("A36",d={0:("wary","guarded","synonym","wary and guarded mean the same"),1:("jewels","vault","thing/place","jewels are kept in a vault")})
S("A39",d={0:("potter","clay","worker/material","a potter shapes clay"),3:("slice","pie","part/whole","a slice is part of a pie")})
S("A44",d={3:("shovel","trench","tool/product","a shovel digs a trench")})
S("A45",d={0:("drover","herd","worker/group","a drover moves a herd"),2:("linen","tablecloth","material/product","a tablecloth may be made of linen")})

S("A01",d={3:("limerick","verse","instance/category","a limerick is a kind of verse")})
S("A02",stem=("tinker","pots"),why="a tinker mends pots, as an upholsterer re-covers sofas",d={2:("seep","gush","degree","to seep is a far slower flow than to gush")})
S("A03",key=("peck","gobble"),why="to whisper is a mild form of what a shout does loudly, as to peck is a mild form of what gobbling does greedily",d={1:("foal","stallion","young/adult","a foal grows into a stallion"),2:("cabin","logs","thing/material","a cabin is built of logs")})
S("A05",stem=("hamper","laundry"),key=("canister","tea"),why="a hamper holds laundry, as a canister holds tea")
S("A06",stem=("drenched","damp"),why="drenched is extremely damp, as freezing is extremely chilly")
S("A07",key=("dentist","drill"),why="a sculptor works with a chisel, as a dentist works with a drill",d={0:("bronze","bell","material/product","a bell may be cast from bronze")})
S("A09",d={2:("joey","kangaroo","young/adult","a joey is a young kangaroo")})
S("A12",d={3:("gallop","trot","degree","a gallop is faster than a trot")})
S("A14",d={3:("hill","mountain","degree of size","a hill is far smaller than a mountain")})
S("A17",stem=("ladder","roofer"),key=("wrench","plumber"),why="a roofer works with a ladder, as a plumber works with a wrench")
S("A19",key=("megaphone","cheerleader"),why="a judge uses a gavel to command a room, as a cheerleader uses a megaphone to lead a crowd",d={2:("sculpture","artist","work/creator","an artist makes a sculpture"),3:("crew","sailor","group/member","a sailor belongs to a crew")})
S("A20",d={2:("thermos","cocoa","container/contents","a thermos holds cocoa")})
S("A27",stem=("episode","series"),why="an episode is a section of a series, as an act is a section of a play",d={3:("anthem","song","instance/category","an anthem is a kind of song")})
S("A28",d={1:("statue","bronze","thing/material","a statue may be made of bronze")})
S("A33",stem=("pedometer","steps"),why="a pedometer counts steps, as a barometer measures pressure")
S("A34",d={2:("eddy","river","part/whole","an eddy is a swirl within a river")})
S("A37",key=("quill","porcupine"),why="a fang is part of a serpent, as a quill is part of a porcupine")

S("A03",d={2:("raft","timber","thing/material","a raft is built of timber")})
S("A05",stem=("crate","oranges"),why="a crate holds oranges, as a canister holds tea")
S("A07",key=("welder","torch"),why="a sculptor works with a chisel, as a welder works with a torch")
S("A09",d={2:("piglet","hog","young/adult","a piglet grows into a hog")})
S("A12",d={3:("canter","walk","degree","a canter is faster than a walk")})
S("A17",key=("harpoon","whaler"),why="a roofer works from a ladder, as a whaler works with a harpoon")
S("A19",d={3:("troupe","actor","group/member","an actor belongs to a troupe")})
S("A20",d={2:("flask","broth","container/contents","a flask holds broth")})
S("A27",stem=("inning","game"),why="an inning is a section of a game, as an act is a section of a play")
S("A28",d={1:("figurine","porcelain","thing/material","a figurine may be made of porcelain")})
S("A33",stem=("altimeter","height"),why="an altimeter shows height, as a barometer shows pressure")
S("A37",key=("bill","pelican"),why="a fang is part of a serpent, as a bill is part of a pelican")

S("A05",stem=("hamper","picnic food"),why="a hamper holds picnic food, as a canister holds tea")
S("A07",key=("glassblower","pipe"),why="a sculptor works with a chisel, as a glassblower works with a blowpipe")
S("A09",d={2:("gosling","goose","young/adult","a gosling grows into a goose")})

S("A09",d={2:("eaglet","eagle","young/adult","an eaglet grows into an eagle")})

S("A09",d={2:("mane","zebra","part/whole","a mane is part of a zebra")})

S("A09",d={2:("kid","goat","young/adult","a kid is a young goat")})
S("A42",why="a hut is a far smaller dwelling than a mansion, as a twig is a far smaller piece of wood than a log")
S("A03",why="to whisper is a far milder version of a shout, as to peck at food is a far milder version of gobbling it")
S("A31",d={3:("loaf","bread","unit/substance","a loaf is a unit of bread")})

S("A07",key=("glassblower","blowpipe"),why="a sculptor shapes stone with a chisel, as a glassblower shapes glass with a blowpipe")
S("A09",d={2:("hoofprint","zebra","trace/animal","a zebra leaves a hoofprint")})
S("A09",d={2:("den","fox","home/animal","a fox lives in a den")})
S("A09",d={2:("aerie","eagle","home/animal","an eagle nests in an aerie")})

def D(i,old,new):
    x=BY[i]; j=[k for k,d in enumerate(x["ds"]) if (d[0],d[1])==old]; assert j,(i,old); x["ds"][j[0]]=new
D("A02",("rudder","steering"),("rudder","navigation","tool/function","a rudder is used in navigation"))
D("A06",("lavish","miserly"),("extravagant","miserly","antonym","extravagant is the opposite of miserly"))
D("A08",("nurse","clinic"),("nurse","infirmary","worker/place","a nurse works in an infirmary"))
D("A20",("brave","cowardly"),("courageous","cowardly","antonym","courageous is the opposite of cowardly"))
D("A22",("flock","bird"),("flock","starling","group/member","a starling flies in a flock"))
D("A24",("fortress","wall"),("fortress","rampart","whole/part","a fortress has a rampart"))
D("A30",("charity","donor"),("charity","benefactor","act/agent","a benefactor gives to charity"))
D("A36",("wary","guarded"),("watchful","guarded","synonym","watchful and guarded mean the same"))
D("A39",("potter","clay"),("sculptor","marble","worker/material","a sculptor carves marble"))
D("A40",("anchor","harbor"),("lighthouse","harbor","object/place","a lighthouse stands at a harbor"))

D("A22",("flock","starling"),("colony","penguin","group/member","a penguin lives in a colony"))
D("A39",("sculptor","marble"),("woodcarver","oak","worker/material","a woodcarver carves oak"))
D("A14",("lamp","bulb"),("lantern","wick","whole/part","a lantern has a wick"))
D("A16",("fear","courage"),("terror","courage","emotion/what overcomes it","courage overcomes terror"))
D("A29",("gill","fish"),("gill","swordfish","part/whole","a gill is part of a swordfish"))
D("A38",("sob","weep"),("sobbing","weeping","synonym","sobbing is weeping"))
D("A48",("violin","bow"),("violinist","bow","user/tool","a violinist plays with a bow"))
D("A48",("violinist","bow"),("cellist","bow","user/tool","a cellist plays with a bow"))

D("A28",("current","river"),("source","river","origin/thing","a river begins at its source"))
D("A12",("tire","wheel"),("toll","highway","fee/route","a toll is paid to use a highway"))
D("A43",("crutch","limp"),("scar","wound","aftermath/injury","a wound can leave a scar"))
D("A30",("liar","deceit"),("judge","verdict","person/product","a judge delivers a verdict"))
D("A27",("stage","theater"),("usher","theater","worker/place","an usher works in a theater"))
D("A35",("editor","newspaper"),("librarian","shelf","worker/object tended","a librarian tends a shelf"))
D("A39",("whisk","egg"),("oven","kitchen","appliance/room","an oven is found in a kitchen"))
D("A43",("scar","wound"),("waiting room","patient","place/person","a patient sits in a waiting room"))
LP=json.load(open('live-pairs.json'))
def pk(a,b):
    n=lambda w:w.lower().strip().rstrip('s') if not w.lower().endswith('ss') else w.lower()
    return '|'.join(sorted([a.lower().strip().removesuffix('s'),b.lower().strip().removesuffix('s')]))
coll=[]
for x in A:
    for lab,pr in [("stem",x["stem"]),("key",x["key"])]+[("d%d"%i,(d[0],d[1])) for i,d in enumerate(x["ds"])]:
        h=LP.get(pk(*pr))
        if h: coll.append((x["id"],lab,pr,h))
ids={c[0] for c in coll if c[1] in("stem","key")}
print("pair collisions",len(coll),"items with stem/key collisions",len(ids))
for c in coll: print(" ",c[0],c[1],":".join(c[2]),"->",c[3])






json.dump(A,open('ana-draft.json','w'),indent=1)
