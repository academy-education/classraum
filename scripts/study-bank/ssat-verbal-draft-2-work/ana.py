import json
A=[]
def a(i,s1,s2,rel,k1,k2,why,ds,d="medium"):
    A.append(dict(id=i,stem=(s1,s2),rel=rel,key=(k1,k2),why=why,ds=ds,d=d))
# ds: list of (w1,w2,relation,gloss)

# ---- worker/tool
a("V2A01","gardener","hoe","worker/tool","barber","clippers","a gardener works with a hoe, as a barber works with clippers",
 [("pebble","mountain","degree of size","a pebble is far smaller than a mountain"),("hive","bee","home/animal","a bee lives in a hive"),("petal","rose","part/whole","a petal is part of a rose"),("thaw","freeze","antonym","to thaw is the opposite of to freeze")],"easy")
a("V2A02","jeweler","loupe","worker/tool","mechanic","jack","a jeweler works with a loupe, as a mechanic works with a jack",
 [("diamond","carat","thing/unit of measure","a diamond is weighed in carats"),("ring","finger","item/where worn","a ring is worn on a finger"),("emerald","green","thing/color","an emerald is green"),("wire","copper","thing/material","a wire is often made of copper")])
a("V2A03","farrier","rasp","worker/tool","cobbler","awl","a farrier works with a rasp, as a cobbler works with an awl",
 [("horseshoe","hoof","covering/what it protects","a horseshoe protects a hoof"),("stirrup","saddle","part/whole","a stirrup hangs from a saddle"),("leather","hide","product/raw material","leather is made from hide"),("gallop","canter","degree","a gallop is faster than a canter")],"hard")
a("V2A04","chef","cleaver","worker/tool","miner","pickaxe","a chef works with a cleaver, as a miner works with a pickaxe",
 [("recipe","cookbook","part/whole","a recipe is part of a cookbook"),("famished","peckish","degree","famished is far hungrier than peckish"),("lantern","darkness","object/what it dispels","a lantern dispels darkness"),("ore","smelter","material/place processed","ore is processed in a smelter")])
a("V2A05","engraver","burin","worker/tool","surgeon","forceps","an engraver works with a burin, as a surgeon works with forceps",
 [("etching","print","instance/category","an etching is a kind of print"),("copper","plate","material/object","a plate may be made of copper"),("scar","incision","effect/cause","an incision can leave a scar"),("silverware","tarnish","thing/decay","silverware can tarnish")],"hard")
a("V2A06","angler","lure","worker/tool","jockey","crop","an angler works with a lure, as a jockey works with a riding crop",
 [("minnow","trout","degree of size","a minnow is far smaller than a trout"),("pond","shore","body/edge","a shore borders a pond"),("saddle","horse","equipment/animal","a saddle is placed on a horse"),("stall","stable","part/whole","a stall is part of a stable")])

# ---- worker/product
a("V2A07","brewer","ale","worker/product","potter","vase","a brewer makes ale, as a potter makes a vase",
 [("barrel","cask","synonym","a barrel is a cask"),("clay","kiln","material/place processed","clay is fired in a kiln"),("nibble","gorge","degree","to nibble is far more modest than to gorge"),("thirst","drink","need/remedy","a drink relieves thirst")],"easy")
a("V2A08","glassblower","goblet","worker/product","knitter","scarf","a glassblower makes a goblet, as a knitter makes a scarf",
 [("cup","saucer","pair","a cup sits on a saucer"),("fragile","sturdy","antonym","fragile is the opposite of sturdy"),("yarn","skein","material/bundle","yarn is sold in a skein"),("sand","glass","material/product","glass is made from sand")])
a("V2A09","composer","concerto","worker/product","playwright","comedy","a composer writes a concerto, as a playwright writes a comedy",
 [("melody","note","whole/unit","a melody is made of notes"),("skyscraper","hut","degree of size","a skyscraper is far larger than a hut"),("harmony","dissonance","antonym","harmony is the opposite of dissonance"),("baton","maestro","tool/user","a maestro uses a baton")])
a("V2A10","perfumer","fragrance","worker/product","chandler","candles","a perfumer makes fragrances, as a chandler makes candles",
 [("vial","flask","similar containers","a vial and a flask are both small bottles"),("lavender","purple","thing/color","lavender is purple"),("flicker","blaze","degree","a flicker is far weaker than a blaze"),("nose","sniff","organ/action","the nose is used to sniff")],"hard")
a("V2A11","architect","skyscraper","designer/design","engineer","dam","an architect designs a skyscraper that others build, as an engineer designs a dam that others build",
 [("pedestal","statue","support/thing supported","a pedestal supports a statue"),("steeple","spire","synonym","a steeple is a spire"),("eloquent","speech","quality/thing","a speech can be eloquent"),("mystery","plot twist","story/turning point","a mystery often turns on a plot twist")])
a("V2A12","apiarist","honey","worker/product","wheelwright","wheels","an apiarist produces honey, as a wheelwright produces wheels",
 [("comb","hive","part/whole","a comb is part of a hive"),("drone","bee","instance/category","a drone is a kind of bee"),("sting","swelling","cause/effect","a sting causes swelling"),("spoke","hub","part/part it joins","a spoke joins the hub")],"hard")

# ---- degree
a("V2A13","warm","hot","degree","cool","icy","warm is a mild form of hot, as cool is a mild form of icy",
 [("scorching","frosty","antonym","scorching is the opposite of frosty"),("umbrella","rain","protector/what it blocks","an umbrella keeps off rain"),("sweat","heat","effect/cause","heat causes sweat"),("mug","cocoa","container/contents","a mug holds cocoa")],"easy")
a("V2A14","giggle","guffaw","degree","sprinkle","drench","a giggle is a mild form of a guffaw, as to sprinkle is a mild form of to drench",
 [("comedian","stage","person/place","a comedian performs on a stage"),("mallet","peg","tool/object","a mallet drives a peg"),("palm","hand","part/whole","a palm is part of a hand"),("jest","quip","synonym","a jest is a quip")])
a("V2A15","glad","elated","degree","nervous","panicked","glad is a mild form of elated, as nervous is a mild form of panicked",
 [("joy","sorrow","antonym","joy is the opposite of sorrow"),("smile","pleasure","expression/feeling","a smile shows pleasure"),("braggart","modesty","person/lack","a braggart lacks modesty"),("ghost","haunt","agent/action","a ghost haunts")])
a("V2A16","thrifty","stingy","degree","brave","reckless","stingy is thrifty carried to excess, as reckless is brave carried to excess",
 [("lavish","tightfisted","antonym","lavish is the opposite of tightfisted"),("humble","meek","synonym","humble means modest"),("boast","pride","action/feeling","a boast shows pride"),("insomniac","sleep","person/lack","an insomniac lacks sleep")],"hard")
a("V2A17","drizzle","deluge","degree","flurry","blizzard","a drizzle is a mild form of a deluge, as a flurry is a mild form of a blizzard",
 [("kite","wind","object/what moves it","wind lifts a kite"),("shovel","snow","tool/material moved","a shovel moves snow"),("frost","windowpane","coating/surface","frost coats a windowpane"),("mitten","hand","covering/body part","a mitten covers a hand")])
a("V2A18","tepid","scalding","degree","audible","deafening","tepid is a faint form of scalding, as audible is a faint form of deafening",
 [("silence","noise","antonym","silence is the opposite of noise"),("echo","sound","reflection/original","an echo is a reflected sound"),("kettle","steam","source/product","a kettle gives off steam"),("earplug","ear","protector/protected","an earplug protects an ear")],"hard")

# ---- lack
a("V2A19","bald","hair","lack","barefoot","shoes","someone bald has no hair, as someone barefoot has no shoes",
 [("wig","head","covering/body part","a wig covers a head"),("comb","tangle","tool/problem","a comb removes a tangle"),("moccasin","sneaker","similar footwear","a moccasin and a sneaker are both soft shoes"),("heel","foot","part/whole","a heel is part of a foot")],"easy")
a("V2A20","anonymous","name","lack","odorless","scent","something anonymous has no name, as something odorless has no scent",
 [("signature","letter","part/whole","a signature ends a letter"),("perfume","fragrant","thing/characteristic","perfume is fragrant"),("famous","obscure","antonym","famous is the opposite of obscure"),("nose","smell","organ/sense","the nose is the organ of smell")])
a("V2A21","recluse","companions","lack","vagrant","home","a recluse lives without companions, as a vagrant lives without a home",
 [("nursery","infant","place/occupant","an infant sleeps in a nursery"),("guardian","ward","protector/protected","a guardian protects a ward"),("wedding","ring","event/symbol","a ring is a symbol of a wedding"),("sibling","family","member/group","a sibling belongs to a family")])
a("V2A22","insipid","flavor","lack","monotonous","variety","something insipid lacks flavor, as something monotonous lacks variety",
 [("chef","seasoning","worker/material","a chef uses seasoning"),("tedious","boring","synonym","tedious means boring"),("banquet","snack","degree","a banquet is far larger than a snack"),("menu","entree","list/item","an entree is listed on a menu")],"hard")
a("V2A23","listless","energy","lack","aimless","purpose","someone listless lacks energy, as someone aimless lacks purpose",
 [("lethargy","fatigue","synonym","lethargy is fatigue"),("athlete","stamina","person/quality possessed","an athlete has stamina"),("nap","drowsiness","remedy/condition","a nap relieves drowsiness"),("target","arrow","goal/projectile","an arrow is aimed at a target")],"hard")
a("V2A24","unarmed","weapon","lack","penniless","money","someone unarmed has no weapon, as someone penniless has no money",
 [("soldier","rifle","user/tool","a soldier uses a rifle"),("vault","gold","container/contents","a vault holds gold"),("ceasefire","battle","pause/conflict","a ceasefire pauses a battle"),("pauper","tycoon","antonym","a pauper is the opposite of a tycoon")])

# ---- part/whole
a("V2A25","lens","camera","part/whole","shelf","bookcase","a lens is part of a camera, as a shelf is part of a bookcase",
 [("photographer","portrait","worker/product","a photographer makes a portrait"),("attic","trunk","place/stored item","a trunk is kept in an attic"),("snapshot","photograph","synonym","a snapshot is a photograph"),("blurry","focused","antonym","blurry is the opposite of focused")],"easy")
a("V2A26","latch","gate","part/whole","zipper","jacket","a latch is part of a gate, as a zipper is part of a jacket",
 [("carpenter","cabinet","maker/product","a carpenter builds a cabinet"),("leather","wallet","material/product","a wallet may be made of leather"),("squeak","rust","effect/cause","rust can cause a squeak"),("lock","combination","thing/what opens it","a combination opens a lock")])
a("V2A27","mast","sailboat","part/whole","chimney","cottage","a mast is part of a sailboat, as a chimney is part of a cottage",
 [("soot","flame","residue/source","a flame leaves soot"),("pilgrim","journey","person/undertaking","a pilgrim makes a journey"),("brick","mortar","companion materials","bricks are laid with mortar"),("cabin","castle","degree of size","a cabin is far smaller than a castle")])
a("V2A28","nave","cathedral","part/whole","foyer","mansion","a nave is the main hall within a cathedral, as a foyer is the entrance hall within a mansion",
 [("bishop","diocese","leader/district","a bishop leads a diocese"),("pew","bench","instance/category","a pew is a kind of bench"),("choir","chorister","group/member","a chorister belongs to a choir"),("chant","monk","song/singer","a monk sings a chant")],"hard")
a("V2A29","pit","cherry","part/whole","kernel","walnut","a pit is the inner part of a cherry, as a kernel is the inner part of a walnut",
 [("squirrel","acorn","animal/food","a squirrel eats an acorn"),("ripe","unripe","antonym","ripe is the opposite of unripe"),("jam","preserves","synonym","jam is preserves"),("blossom","fruit","precursor/later stage","a blossom comes before the fruit")])
a("V2A30","filament","bulb","part/whole","nib","pen","a filament is part of a bulb, as a nib is part of a pen",
 [("socket","plug","receptacle/what fits in","a plug fits into a socket"),("ink","blot","substance/mark","spilled ink leaves a blot"),("dim","radiant","degree","dim is far less bright than radiant"),("scribe","ledger","worker/product","a scribe writes a ledger")],"hard")

# ---- group/member
a("V2A31","orchestra","violinist","group/member","squadron","pilot","a violinist belongs to an orchestra, as a pilot belongs to a squadron",
 [("maestro","podium","person/place","a maestro stands on a podium"),("cockpit","plane","part/whole","a cockpit is part of a plane"),("rehearsal","recital","preparation/event","a rehearsal prepares for a recital"),("parachute","fall","protector/danger","a parachute protects against a fall")],"easy")
a("V2A32","litter","puppies","group/member","brood","chicks","a litter is a group of puppies, as a brood is a group of chicks",
 [("kennel","dog","shelter/animal","a dog lives in a kennel"),("hen","rooster","female/male","a hen is a female, a rooster a male"),("collar","leash","companion items","a leash clips to a collar"),("yelp","whimper","degree","a yelp is louder than a whimper")])
a("V2A33","council","councilor","group/member","faculty","professor","a councilor belongs to a council, as a professor belongs to a faculty",
 [("capitol","dome","whole/part","a capitol has a dome"),("ballot","vote","means/act","a ballot records a vote"),("lecture","seminar","similar events","a lecture and a seminar are both classes"),("tuition","student","fee/payer","a student pays tuition")])
a("V2A34","anthology","story","group/member","menagerie","animal","an anthology is a collection of stories, as a menagerie is a collection of animals",
 [("publisher","edition","producer/product","a publisher issues an edition"),("cage","parrot","enclosure/occupant","a parrot is kept in a cage"),("wolf","howl","animal/sound","a wolf howls"),("poet","muse","person/inspiration","a muse inspires a poet")],"hard")
a("V2A35","pantheon","god","group/member","regiment","soldier","a god is one member of a pantheon, as a soldier is one member of a regiment",
 [("temple","worship","place/activity","worship happens in a temple"),("myth","legend","synonym","a myth is a legend"),("throne","monarch","seat/occupant","a monarch sits on a throne"),("oracle","prophecy","speaker/utterance","an oracle utters a prophecy")],"hard")

# ---- young/adult
a("V2A36","owlet","owl","young/adult","piglet","pig","an owlet grows into an owl, as a piglet grows into a pig",
 [("talon","claw","synonym","a talon is a claw"),("barn","silo","neighboring buildings","a silo stands beside a barn"),("hoot","oink","sound/sound","an owl hoots and a pig oinks"),("mud","puddle","material/feature","a puddle is muddy water")],"easy")
a("V2A37","calf","elephant","young/adult","tadpole","toad","a calf grows into an elephant, as a tadpole grows into a toad",
 [("hump","camel","part/whole","a hump is part of a camel"),("pond","water lily","habitat/plant","a water lily grows in a pond"),("croak","bray","sound/sound","a toad croaks and a donkey brays"),("trot","sprint","degree","a trot is slower than a sprint")])
a("V2A38","joey","wallaby","young/adult","leveret","hare","a joey grows into a wallaby, as a leveret grows into a hare",
 [("pouch","marsupial","feature/animal","a marsupial has a pouch"),("warren","rabbit","home/animal","a rabbit lives in a warren"),("hop","bound","degree","a bound is a longer leap than a hop"),("outback","kangaroo","habitat/animal","a kangaroo lives in the outback")],"hard")
a("V2A39","chick","ostrich","young/adult","pup","wolf","a chick grows into an ostrich, as a pup grows into a wolf",
 [("egg","shell","whole/covering","an egg has a shell"),("pack","hunt","group/activity","a pack hunts together"),("tundra","caribou","habitat/animal","a caribou lives on the tundra"),("savanna","plain","synonym","a savanna is a grassy plain")])
a("V2A40","kit","beaver","young/adult","elver","eel","a kit grows into a beaver, as an elver grows into an eel",
 [("dam","stream","barrier/what it blocks","a dam blocks a stream"),("lodge","beaver","home/animal","a beaver lives in a lodge"),("slippery","slimy","synonym","slippery and slimy are similar"),("gnaw","nibble","degree","to gnaw is harder than to nibble")],"hard")

# ---- container/contents
a("V2A41","pitcher","lemonade","container/contents","backpack","books","a pitcher holds lemonade, as a backpack holds books",
 [("lemon","sour","thing/characteristic","a lemon is sour"),("straw","sip","tool/action","a straw is used to sip"),("bookmark","paperback","marker/thing marked","a bookmark marks a place in a paperback"),("textbook","chapter","whole/part","a textbook has chapters")],"easy")
a("V2A42","tureen","soup","container/contents","vial","perfume","a tureen holds soup, as a vial holds perfume",
 [("cap","bottle","cover/what it seals","a cap seals a bottle"),("grape","raisin","fresh/dried form","a raisin is a dried grape"),("repast","meal","synonym","a repast is a meal"),("candle","vigil","object/event","a candle is lit at a vigil")])
a("V2A43","carafe","water","container/contents","censer","incense","a carafe holds water, as a censer holds incense",
 [("goblet","chalice","synonym","a goblet is a chalice"),("drought","rain","absence/what is absent","a drought is an absence of rain"),("priest","sermon","speaker/speech","a priest gives a sermon"),("pungent","odor","quality/thing","an odor can be pungent")],"hard")
a("V2A44","toolbox","wrench","container/contents","cupboard","plates","a toolbox holds a wrench, as a cupboard holds plates",
 [("mechanic","garage","worker/place","a mechanic works in a garage"),("bolt","nut","companion parts","a nut fastens onto a bolt"),("chip","plate","damage/object","a plate can have a chip"),("sponge","porous","thing/characteristic","a sponge is porous")])
a("V2A45","syringe","vaccine","container/contents","thermos","soup","a syringe holds a vaccine, as a thermos holds soup",
 [("immunity","disease","protection/threat","immunity protects against disease"),("spoon","ladle","degree of size","a spoon is smaller than a ladle"),("steam","boiling","effect/cause","boiling produces steam"),("saucepan","lid","whole/cover","a saucepan has a lid")])

# ---- cause/effect
a("V2A46","pollen","sneeze","cause/effect","onion","tears","pollen makes a person sneeze, as an onion makes a person shed tears",
 [("salt","shaker","contents/container","a shaker holds salt"),("chef","toque","worker/hat","a chef wears a toque"),("garlic","clove","whole/part","garlic is made of cloves"),("bland","spicy","antonym","bland is the opposite of spicy")],"easy")
a("V2A47","lightning","wildfire","cause/effect","downpour","flood","lightning can set off a wildfire, as a downpour can set off a flood",
 [("rivulet","torrent","degree","a rivulet is far smaller than a torrent"),("firefighter","helmet","worker/gear","a firefighter wears a helmet"),("hut","straw","structure/material","a hut may be built of straw"),("beach","shore","synonym","a beach is a shore")])
a("V2A48","practice","proficiency","cause/effect","nourishment","growth","practice leads to proficiency, as nourishment leads to growth",
 [("coach","athlete","trainer/trainee","a coach trains an athlete"),("meal","snack","degree","a meal is larger than a snack"),("veteran","rookie","antonym","a veteran is the opposite of a rookie"),("protein","nutrient","instance/category","protein is a kind of nutrient")])
a("V2A49","neglect","dilapidation","cause/effect","overgrazing","desertification","neglect leads to dilapidation, as overgrazing leads to desertification",
 [("sawmill","floorboards","place/product","a sawmill produces floorboards"),("rainforest","thicket","degree of size","a rainforest is far larger than a thicket"),("toolbox","screwdriver","container/contents","a toolbox holds a screwdriver"),("abandonment","desertion","synonym","abandonment is desertion")],"hard")
a("V2A50","friction","sparks","cause/effect","vibration","sound","friction produces sparks, as vibration produces sound",
 [("rough","smooth","antonym","rough is the opposite of smooth"),("sandpaper","wood","tool/material","sandpaper smooths wood"),("drum","percussion","instance/category","a drum is a percussion instrument"),("decibel","loudness","unit/quantity","loudness is measured in decibels")])

# ---- instrument/measured
a("V2A51","protractor","degrees","instrument/measured thing","stopwatch","time","a protractor measures degrees, as a stopwatch measures time",
 [("compass","circle","tool/product","a compass draws a circle"),("geometry","triangle","subject/topic","a triangle is studied in geometry"),("runner","finish line","person/goal","a runner races to the finish line"),("acute","obtuse","antonym","acute is the opposite of obtuse")],"easy")
a("V2A52","rain gauge","rainfall","instrument/measured thing","barometer","air pressure","a rain gauge measures rainfall, as a barometer measures air pressure",
 [("umbrella","drizzle","protector/what it blocks","an umbrella keeps off drizzle"),("snowflake","snowdrift","unit/mass","a snowdrift is a heap of snowflakes"),("cloud","thunderstorm","sign/event","a dark cloud can signal a thunderstorm"),("puddle","reservoir","degree of size","a puddle is far smaller than a reservoir")])
a("V2A53","anemometer","wind speed","instrument/measured thing","hygrometer","humidity","an anemometer measures wind speed, as a hygrometer measures humidity",
 [("weather vane","rooftop","object/where mounted","a weather vane is mounted on a rooftop"),("clammy","damp","synonym","clammy means damp"),("hurricane","breeze","degree","a hurricane is far stronger than a breeze"),("cyclone","eye","whole/center","a cyclone has an eye")],"hard")
a("V2A54","speedometer","speed","instrument/measured thing","light meter","brightness","a speedometer measures speed, as a light meter measures brightness",
 [("dashboard","car","part/whole","a dashboard is part of a car"),("motorist","highway","traveler/route","a motorist drives on a highway"),("glare","sunlight","effect/cause","sunlight causes glare"),("radiant","luminous","synonym","radiant means luminous")])
a("V2A55","caliper","thickness","instrument/measured thing","ammeter","current","a caliper measures thickness, as an ammeter measures electric current",
 [("battery","flashlight","power source/device","a battery powers a flashlight"),("wire","insulation","core/covering","insulation covers a wire"),("welder","mask","worker/gear","a welder wears a mask"),("shock","jolt","synonym","a shock is a jolt")],"hard")

# ---- synonym
a("V2A56","shout","yell","synonym","error","mistake","to shout is to yell, as an error is a mistake",
 [("bellow","bull","sound/animal","a bull bellows"),("correct","wrong","antonym","correct is the opposite of wrong"),("megaphone","voice","tool/what it amplifies","a megaphone amplifies a voice"),("pencil","eraser","companion tools","a pencil has an eraser")],"easy")
a("V2A57","obstinate","stubborn","synonym","feeble","weak","obstinate means stubborn, as feeble means weak",
 [("mule","plodding","animal/characteristic","a mule is plodding"),("snack","feast","degree","a snack is far smaller than a feast"),("invalid","bed","person/place","an invalid stays in bed"),("yield","resist","antonym","to yield is the opposite of to resist")])
a("V2A58","jovial","merry","synonym","sullen","gloomy","jovial means merry, as sullen means gloomy",
 [("grumpy","cheerful","antonym","grumpy is the opposite of cheerful"),("jester","court","entertainer/place","a jester entertains at court"),("cloud","drizzle","source/product","a cloud releases drizzle"),("scowl","anger","expression/feeling","a scowl shows anger")])
a("V2A59","laconic","succinct","synonym","verbose","wordy","laconic means succinct, as verbose means wordy",
 [("loquacious","taciturn","antonym","loquacious is the opposite of taciturn"),("oration","orator","product/maker","an orator delivers an oration"),("whisper","bellow","degree","a whisper is far quieter than a bellow"),("silence","library","condition/place","silence is kept in a library")],"hard")
a("V2A60","ominous","menacing","synonym","fortunate","lucky","ominous means menacing, as fortunate means lucky",
 [("thunder","storm","herald/event","thunder heralds a storm"),("lucky","unfortunate","antonym","lucky is the opposite of unfortunate"),("horseshoe","luck","symbol/meaning","a horseshoe is a symbol of luck"),("dread","terror","degree","dread is milder than terror")],"hard")

# ---- antonym
a("V2A61","sturdy","flimsy","antonym","tidy","messy","sturdy is the opposite of flimsy, as tidy is the opposite of messy",
 [("strong","mighty","synonym","strong means mighty"),("broom","dust","tool/what it removes","a broom sweeps away dust"),("sail","canvas","object/material","a sail is made of canvas"),("crack","shatter","degree","to crack is milder than to shatter")],"easy")
a("V2A62","humble","haughty","antonym","candid","guarded","humble is the opposite of haughty, as candid is the opposite of guarded",
 [("informant","tip","person/what they give","an informant gives a tip"),("honest","truthful","synonym","honest means truthful"),("question","answer","prompt/response","a question prompts an answer"),("fib","falsehood","degree","a fib is a minor falsehood")])
a("V2A63","lucid","murky","antonym","flexible","rigid","lucid is the opposite of murky, as flexible is the opposite of rigid",
 [("window","glass","object/material","a window is made of glass"),("gymnast","limber","person/characteristic","a gymnast is limber"),("bend","snap","lesser/greater force","to bend is milder than to snap"),("clear","plain","synonym","clear means plain")])
a("V2A64","ephemeral","enduring","antonym","tranquil","turbulent","ephemeral is the opposite of enduring, as tranquil is the opposite of turbulent",
 [("mayfly","brief","animal/characteristic","a mayfly's life is brief"),("serene","calm","synonym","serene means calm"),("ripple","wave","degree","a ripple is far smaller than a wave"),("monument","memory","object/what it preserves","a monument preserves a memory")],"hard")
a("V2A65","benevolent","malicious","antonym","zealous","apathetic","benevolent is the opposite of malicious, as zealous is the opposite of apathetic",
 [("benefactor","grant","person/characteristic gift","a benefactor gives a grant"),("eager","keen","synonym","eager means keen"),("yawn","boredom","sign/feeling","a yawn shows boredom"),("fervor","interest","degree","fervor is far stronger than interest")],"hard")

# ---- characteristic
a("V2A66","cotton","fluffy","thing/characteristic","boulder","heavy","cotton is fluffy, as a boulder is heavy",
 [("quarry","granite","place/product","granite is cut from a quarry"),("silk","silkworm","material/animal source","silk comes from a silkworm"),("lift","hoist","synonym","to lift is to hoist"),("cliff","climber","obstacle/person","a climber scales a cliff")],"easy")
a("V2A67","owl","nocturnal","thing/characteristic","cactus","prickly","an owl is nocturnal, as a cactus is prickly",
 [("burrow","mole","home/animal","a mole lives in a burrow"),("tumbleweed","desert","plant/habitat","a tumbleweed rolls across a desert"),("canoe","birchbark","object/material","a canoe may be made of birchbark"),("midnight","noon","antonym","midnight is the opposite of noon")])
a("V2A68","diamond","hard","thing/characteristic","velvet","soft","a diamond is hard, as velvet is soft",
 [("jeweler","gem","worker/object","a jeweler sets a gem"),("cocoon","moth","casing/occupant","a cocoon encloses a moth"),("carat","weight","unit/quantity","a carat is a unit of weight"),("rough","coarse","synonym","rough means coarse")])
a("V2A69","sloth","sluggish","thing/characteristic","chameleon","changeable","a sloth is sluggish, as a chameleon is changeable in color",
 [("canopy","rainforest","layer/whole","a canopy is the top layer of a rainforest"),("disguise","spy","means/user","a spy wears a disguise"),("gecko","reptile","instance/category","a gecko is a kind of reptile"),("scurry","creep","antonym","to scurry is the opposite of to creep")],"hard")
a("V2A70","granite","durable","thing/characteristic","porcelain","fragile","granite is durable, as porcelain is fragile",
 [("vase","shard","whole/piece","a vase breaks into shards"),("sturdy","robust","synonym","sturdy means robust"),("foundry","iron","place/material","iron is cast in a foundry"),("mason","limestone","worker/material","a mason works limestone")],"hard")

# ---- function
a("V2A71","oven","roast","tool/function","kettle","boil","an oven is used to roast, as a kettle is used to boil",
 [("baker","muffin","worker/product","a baker makes a muffin"),("kitchen","stove","room/appliance","a kitchen has a stove"),("thaw","melt","synonym","to thaw is to melt"),("cookie","crumb","whole/piece","a cookie breaks into crumbs")],"easy")
a("V2A72","whisk","beat","tool/function","colander","drain","a whisk is used to beat, as a colander is used to drain",
 [("chef","apron","worker/garment","a chef wears an apron"),("spoon","teaspoon","category/instance","a teaspoon is a kind of spoon"),("pinch","handful","degree","a pinch is far less than a handful"),("pantry","spice","place/stored item","a spice is kept in a pantry")])
a("V2A73","lock","secure","tool/function","fence","enclose","a lock is used to secure, as a fence is used to enclose",
 [("key","padlock","opener/thing opened","a key opens a padlock"),("thief","burglary","person/act","a thief commits burglary"),("hedge","shrub","whole/member","a hedge is a row of shrubs"),("vulnerable","guarded","antonym","vulnerable is the opposite of guarded")])
a("V2A74","tourniquet","constrict","tool/function","splint","immobilize","a tourniquet is used to constrict, as a splint is used to immobilize",
 [("bandage","gauze","object/material","a bandage is made of gauze"),("fracture","bone","injury/body part","a fracture is a break in a bone"),("paramedic","ambulance","worker/vehicle","a paramedic rides in an ambulance"),("bleed","hemorrhage","degree","a hemorrhage is far heavier bleeding")],"hard")
a("V2A75","rudder","guide","tool/function","brake","slow","a rudder is used to guide a vessel, as a brake is used to slow a vehicle",
 [("captain","vessel","leader/thing commanded","a captain commands a vessel"),("forward","reverse","antonym","forward is the opposite of reverse"),("gasoline","engine","fuel/machine","gasoline fuels an engine"),("keel","boat","part/whole","a keel is part of a boat")])

# ---- place/activity
a("V2A76","rink","skating","place/activity","track","running","a rink is a place for skating, as a track is a place for running",
 [("puck","stick","object/tool","a puck is struck with a stick"),("skate","blade","whole/part","a skate has a blade"),("referee","penalty","official/call","a referee calls a penalty"),("ice","slippery","thing/characteristic","ice is slippery")],"easy")
a("V2A77","laboratory","experiment","place/activity","courtroom","trial","a laboratory is where an experiment is done, as a courtroom is where a trial is held",
 [("scientist","hypothesis","person/product","a scientist forms a hypothesis"),("beaker","flask","similar containers","a beaker and a flask are both glassware"),("attorney","client","professional/person served","an attorney serves a client"),("guilty","innocent","antonym","guilty is the opposite of innocent")])
a("V2A78","observatory","stargazing","place/activity","pulpit","preaching","an observatory is a place for stargazing, as a pulpit is a place for preaching",
 [("telescope","lens","whole/part","a telescope has a lens"),("astronomer","planet","scientist/subject","an astronomer studies a planet"),("sermon","homily","synonym","a sermon is a homily"),("galaxy","star","group/member","a galaxy is made of stars")])
a("V2A79","forge","smithing","place/activity","scriptorium","copying","a forge is the place for smithing, as a scriptorium is the place for copying manuscripts",
 [("anvil","hammer","companion tools","a hammer strikes an anvil"),("quill","feather","tool/source material","a quill is made from a feather"),("metal","corrosion","thing/decay","metal suffers corrosion"),("ornate","plain","antonym","ornate is the opposite of plain")],"hard")
a("V2A80","apiary","beekeeping","place/activity","vineyard","viticulture","an apiary is the place for beekeeping, as a vineyard is the place for viticulture",
 [("honey","nectar","product/raw material","honey is made from nectar"),("press","juice","tool/product","a press extracts juice"),("bee","pollinate","agent/characteristic act","a bee pollinates"),("trellis","vine","support/plant","a trellis supports a vine")],"hard")

# difficulty retags after review
_D={"V2A18":"medium","V2A23":"medium","V2A30":"medium","V2A69":"medium","V2A70":"medium","V2A49":"medium","V2A74":"medium",
    "V2A26":"easy","V2A37":"easy","V2A44":"easy","V2A47":"easy","V2A72":"easy"}
for x in A: x["d"]=_D.get(x["id"],x["d"])
json.dump(A,open('ana-draft.json','w'),indent=1)
