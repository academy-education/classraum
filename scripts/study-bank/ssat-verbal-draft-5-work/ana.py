import json
A=[]
def a(i,s1,s2,rel,k1,k2,why,ds,d="medium"):
    A.append(dict(id=i,stem=(s1,s2),rel=rel,key=(k1,k2),why=why,ds=ds,d=d))
# ds: list of (w1,w2,relation,gloss)

a("V8A01","shallow","deep","antonym","narrow","wide","shallow is the opposite of deep, as narrow is the opposite of wide",
 [("puddle","pond","degree of size","a puddle is a much smaller pool of water than a pond"),("gutter","rainwater","channel/what it carries","a gutter carries rainwater"),("ravine","stream","landform/what carved it","a stream carves a ravine"),("bridge","river","structure/what it spans","a bridge spans a river")],"easy")
a("V8A02","ally","foe","antonym","vacant","occupied","an ally is the opposite of a foe, as vacant is the opposite of occupied",
 [("tenant","apartment","occupant/dwelling","a tenant lives in an apartment"),("quartet","violinist","group/member","a violinist may be one member of a quartet"),("helmet","visor","whole/part","a visor is part of a helmet"),("envoy","embassy","official/workplace","an envoy works from an embassy")],"easy")
a("V8A03","ephemeral","permanent","antonym","gregarious","reclusive","ephemeral is the opposite of permanent, as gregarious is the opposite of reclusive",
 [("mayfly","insect","instance/category","a mayfly is a kind of insect"),("hermit","seclusion","person/condition sought","a hermit seeks seclusion"),("goblet","crystal","thing/material","a goblet may be made of crystal"),("posse","deputies","group/members","a posse is a group of deputies")],"hard")
a("V8A04","arid","humid","antonym","lethargic","energetic","arid is the opposite of humid, as lethargic is the opposite of energetic",
 [("perspiration","heat","effect/cause","heat causes perspiration"),("siesta","afternoon","rest/time of day","a siesta is taken in the afternoon"),("hammock","nap","furniture/activity","a hammock is used for a nap"),("sloth","mammal","instance/category","a sloth is a kind of mammal")])
a("V8A05","dislike","loathe","degree","glad","jubilant","to loathe is to dislike intensely, as to be jubilant is to be glad intensely",
 [("grin","delight","expression/feeling","a grin shows delight"),("taunt","anger","provocation/response","a taunt provokes anger"),("riddle","solution","puzzle/answer","a riddle has a solution"),("trophy","mantel","item/where displayed","a trophy is displayed on a mantel")])
a("V8A06","pond","lake","degree of size","spark","inferno","a pond is a much smaller body of water than a lake, as a spark is a much smaller fire than an inferno",
 [("hydrant","water","outlet/what it supplies","a hydrant supplies water"),("shore","ocean","edge/body of water","a shore is the edge of an ocean"),("log","fireplace","fuel/where burned","a log is burned in a fireplace"),("driftwood","beach","debris/where it washes up","driftwood washes up on a beach")],"easy")
a("V8A07","brave","foolhardy","virtue/its excess","frugal","stingy","foolhardy is bravery carried too far, as stingy is frugality carried too far",
 [("lion","courage","animal/trait it symbolizes","a lion symbolizes courage"),("hoarder","junk","person/what is hoarded","a hoarder piles up junk"),("pension","retiree","payment/recipient","a retiree receives a pension"),("knight","lance","warrior/weapon","a knight fights with a lance")],"hard")
a("V8A08","laud","praise","synonym","ponder","consider","to laud is to praise, as to ponder is to consider",
 [("clue","mystery","hint/puzzle","a clue helps solve a mystery"),("scholar","dissertation","writer/work","a scholar writes a dissertation"),("laurel","wreath","plant/thing made from it","a wreath may be woven from laurel"),("medal","victory","reward/achievement","a medal rewards a victory")],"easy")
a("V8A09","banal","trite","synonym","terse","concise","banal means trite, as terse means concise",
 [("cliche","phrase","instance/category","a cliche is a kind of phrase"),("editor","proof","worker/what is checked","an editor checks a proof"),("telegram","brevity","thing/characteristic","a telegram is marked by brevity"),("sermon","pulpit","speech/place delivered","a sermon is delivered from a pulpit")],"hard")
a("V8A10","ardent","passionate","synonym","nimble","agile","ardent means passionate, as nimble means agile",
 [("gymnast","balance","performer/skill needed","a gymnast needs balance"),("juggler","pins","performer/props","a juggler tosses pins"),("athlete","trophy","winner/prize","an athlete wins a trophy"),("squirrel","hazelnut","animal/food","a squirrel eats hazelnuts")])
a("V8A11","lucid","clear","synonym","ample","plentiful","lucid means clear, as ample means plentiful",
 [("lens","magnify","tool/function","a lens is used to magnify"),("granary","barley","place/stored grain","barley is stored in a granary"),("drought","scarcity","cause/effect","a drought causes scarcity"),("prism","light","tool/what it splits","a prism splits light")])
a("V8A12","track","album","part/whole","scene","play","a track is one part of an album, as a scene is one part of a play",
 [("singer","microphone","worker/tool","a singer uses a microphone"),("ticket","concert","pass/event","a ticket admits one to a concert"),("melody","composer","product/maker","a melody is written by a composer"),("actor","costume","wearer/garment","an actor wears a costume")],"easy")
a("V8A13","petal","tulip","part/whole","plank","raft","a petal is one part of a tulip, as a plank is one part of a raft",
 [("acrobat","trapeze","performer/apparatus","an acrobat performs on a trapeze"),("lifeguard","swimmer","protector/protected","a lifeguard protects a swimmer"),("dancer","leotard","performer/garment","a dancer wears a leotard"),("seamstress","thimble","worker/tool","a seamstress uses a thimble")],"easy")
a("V8A14","badminton","shuttlecock","sport/object struck","hockey","puck","in badminton players strike a shuttlecock, as in hockey players strike a puck",
 [("skater","rink","athlete/venue","a skater performs on a rink"),("goalie","net","guard/thing guarded","a goalie guards a net"),("medal","podium","award/where received","a medal is received on a podium"),("chick","emu","young/adult","a chick grows into an emu")],"easy")
a("V8A15","kangaroo","hop","animal/characteristic motion","crab","scuttle","a kangaroo moves by hopping, as a crab moves by scuttling",
 [("shell","tortoise","covering/animal","a shell covers a tortoise"),("claw","lobster","part/animal","a claw is part of a lobster"),("oriole","nest","bird/home","an oriole lives in a nest"),("hay","horse","food/animal","hay is eaten by a horse")],"easy")
a("V8A16","lungs","breathe","organ/function","stomach","digest","the lungs let us breathe, as the stomach lets us digest",
 [("skeleton","bone","whole/part","a skeleton is made up of bones"),("physician","infirmary","worker/workplace","a physician works in an infirmary"),("meal","hunger","food/need it satisfies","a meal satisfies hunger"),("blanket","chill","covering/what it prevents","a blanket keeps off a chill")],"easy")
a("V8A17","chef","kitchen","worker/workplace","ranger","forest","a chef works in a kitchen, as a ranger works in a forest",
 [("spatula","pancake","tool/what it flips","a spatula flips a pancake"),("campfire","smoke","source/byproduct","a campfire gives off smoke"),("coal","furnace","fuel/burner","coal is burned in a furnace"),("hose","nozzle","whole/part","a nozzle is part of a hose")],"easy")
a("V8A18","salmon","fish","instance/category","falcon","bird","a salmon is a kind of fish, as a falcon is a kind of bird",
 [("talon","grip","part/function","a talon is used to grip"),("hatchery","trout","place/what is raised","trout are raised in a hatchery"),("glacier","moraine","source/deposit","a glacier leaves a moraine"),("wattle","turkey","part/animal","a wattle is part of a turkey")],"easy")
a("V8A19","salve","burn","remedy/ailment","lozenge","cough","a salve soothes a burn, as a lozenge soothes a cough",
 [("thermometer","fever","instrument/what it detects","a thermometer detects a fever"),("nurse","hospital","worker/workplace","a nurse works in a hospital"),("savings","interest","principal/earnings","savings earn interest"),("sieve","pebbles","tool/what it separates","a sieve separates out pebbles")],"easy")
a("V8A20","garage","cars","place/what is kept","marina","yachts","cars are kept in a garage, as yachts are kept in a marina",
 [("gangplank","ship","part/whole","a gangplank is part of a ship's gear"),("lighthouse","shore","structure/location","a lighthouse stands on a shore"),("tarp","woodpile","covering/thing covered","a tarp covers a woodpile"),("jockey","silks","rider/garment","a jockey wears silks")],"easy")
a("V8A21","flour","bread","material/product","cream","butter","bread is made from flour, as butter is made from cream",
 [("chef","ladle","worker/tool","a chef uses a ladle"),("slice","loaf","part/whole","a slice is part of a loaf"),("tin","cookies","container/contents","a tin holds cookies"),("joke","chuckle","cause/effect","a joke causes a chuckle")],"easy")
a("V8A22","baldness","hair","lack","blindness","sight","baldness is a lack of hair, as blindness is a lack of sight",
 [("ribbon","braid","decoration/thing decorated","a ribbon decorates a braid"),("barber","comb","worker/tool","a barber uses a comb"),("lens","eyeglasses","part/whole","a lens is part of eyeglasses"),("dust","sneeze","cause/effect","dust can cause a sneeze")],"easy")
a("V8A23","famine","food","lack","illiteracy","reading","famine is a lack of food, as illiteracy is a lack of the ability to read",
 [("harvest","grain","event/product","a harvest brings in grain"),("archive","letters","place/what is kept","letters are kept in an archive"),("tutor","student","teacher/learner","a tutor teaches a student"),("ration","supply","portion/whole","a ration is a portion of a supply")])
a("V8A24","vacuum","matter","lack","pauper","money","a vacuum is a space without matter, as a pauper is a person without money",
 [("teller","counter","worker/workplace","a teller works at a counter"),("astronaut","spacesuit","person/protective gear","an astronaut wears a spacesuit"),("comet","tail","body/part","a tail is part of a comet"),("charity","donation","organization/what it receives","a charity receives donations")])
a("V8A25","joey","koala","young/adult","cria","alpaca","a joey is a young koala, as a cria is a young alpaca",
 [("denim","jeans","material/product","jeans are made of denim"),("burrow","wombat","home/animal","a wombat lives in a burrow"),("spinner","yarn","worker/product","a spinner makes yarn"),("tusk","narwhal","part/animal","a tusk is part of a narwhal")],"hard")
a("V8A26","covey","quail","group/member","troop","monkeys","a covey is a group of quail, as a troop is a group of monkeys",
 [("swallow","nest","bird/home","a swallow lives in a nest"),("adobe","farmhouse","material/structure","a farmhouse may be built of adobe"),("beak","toucan","part/animal","a beak is part of a toucan"),("peel","banana","covering/fruit","a peel covers a banana")])
a("V8A27","flotilla","canoes","group/member","shoal","herring","a flotilla is a group of canoes, as a shoal is a group of herring",
 [("kennel","beagle","shelter/animal","a beagle is housed in a kennel"),("carton","milk","container/contents","a carton holds milk"),("gills","minnow","part/animal","gills are part of a minnow"),("cedar","chest","material/product","a chest may be made of cedar")])
a("V8A28","miner","pick","worker/tool","gardener","shears","a miner works with a pick, as a gardener works with shears",
 [("cellar","potatoes","place/what is stored","potatoes are stored in a cellar"),("rose","thorn","plant/part","a thorn is part of a rose"),("termites","decay","cause/effect","termites cause decay"),("carafe","wine","container/contents","a carafe holds wine")],"easy")
a("V8A29","blueprint","building","plan/thing made from it","pattern","dress","a building is made from a blueprint, as a dress is sewn from a pattern",
 [("zipper","parka","part/whole","a zipper is part of a parka"),("jeweler","tweezers","worker/tool","a jeweler uses tweezers"),("pewter","mug","material/product","a mug may be made of pewter"),("crane","lift","machine/function","a crane is used to lift")])
a("V8A30","itinerary","journey","plan/thing planned","agenda","meeting","an itinerary plans out a journey, as an agenda plans out a meeting",
 [("passport","traveler","document/holder","a traveler carries a passport"),("souvenir","vacation","memento/event","a souvenir is a reminder of a vacation"),("suitcase","clothes","container/contents","a suitcase holds clothes"),("gavel","chairperson","tool/user","a gavel is used by a chairperson")])
a("V8A31","storyboard","film","plan/thing planned","outline","essay","a storyboard lays out the plan of a film, as an outline lays out the plan of an essay",
 [("editor","typo","worker/what is corrected","an editor corrects a typo"),("ticket","theater","pass/venue","a ticket admits one to a theater"),("word","dictionary","entry/reference work","a word is an entry in a dictionary"),("ink","printer","supply/machine","a printer uses ink")])
a("V8A32","moderator","debate","official/event presided over","officiant","wedding","a moderator presides over a debate, as an officiant presides over a wedding",
 [("bride","groom","partner/partner","a bride marries a groom"),("rebuttal","argument","response/claim","a rebuttal answers an argument"),("bouquet","roses","bunch/members","a bouquet may be made of roses"),("podium","lecturer","stand/user","a lecturer stands at a podium")])
a("V8A33","proctor","exam","official/event supervised","umpire","game","a proctor supervises an exam, as an umpire oversees a game",
 [("clerk","office","worker/workplace","a clerk works in an office"),("pitcher","mound","player/position","a pitcher throws from the mound"),("nurse","scrubs","worker/garment","a nurse wears scrubs"),("eraser","mistake","tool/what it removes","an eraser removes a mistake")])
a("V8A34","stagger","walk","action/done unsteadily","stammer","speak","to stagger is to walk unsteadily, as to stammer is to speak haltingly",
 [("orator","rhetoric","person/skill","an orator is skilled in rhetoric"),("sprain","swelling","cause/effect","a sprain causes swelling"),("epigram","wit","form/quality","an epigram is marked by wit"),("crutch","injury","aid/condition","a crutch helps with an injury")],"hard")
a("V8A35","scrawl","write","action/done carelessly","daub","paint","to scrawl is to write carelessly, as to daub is to paint crudely",
 [("painter","roller","worker/tool","a painter uses a roller"),("glaze","pot","coating/thing coated","a glaze coats a pot"),("forger","signature","person/what is faked","a forger fakes a signature"),("novelist","chapter","writer/part of work","a novelist writes a chapter")],"hard")
a("V8A36","gobble","eat","action/done greedily","gulp","drink","to gobble is to eat greedily, as to gulp is to drink greedily",
 [("fork","utensil","instance/category","a fork is a kind of utensil"),("thirst","water","need/what satisfies it","water satisfies thirst"),("chef","menu","worker/creation","a chef creates a menu"),("tureen","stew","container/contents","a tureen holds stew")])
a("V8A37","drumstick","drum","implement/instrument played","bow","violin","a drumstick is used to play a drum, as a bow is used to play a violin",
 [("soloist","aria","performer/piece","a soloist sings an aria"),("note","scale","member/series","a note is one step of a scale"),("ballerina","tutu","dancer/costume","a ballerina wears a tutu"),("stage","auditorium","part/whole","a stage is part of an auditorium")])
a("V8A38","pick","guitar","implement/instrument played","mallet","xylophone","a pick is used to play a guitar, as a mallet is used to play a xylophone",
 [("lyrics","songwriter","product/maker","lyrics are written by a songwriter"),("amplifier","sound","device/what it increases","an amplifier increases sound"),("murmur","roar","degree","a murmur is much quieter than a roar"),("encore","concert","addition/event","an encore is added to a concert")])
a("V8A39","teetotaler","alcohol","abstainer/what is avoided","vegetarian","meat","a teetotaler avoids alcohol, as a vegetarian avoids meat",
 [("bartender","cocktail","worker/product","a bartender mixes a cocktail"),("decanter","brandy","container/contents","a decanter holds brandy"),("crocus","flower","instance/category","a crocus is a kind of flower"),("sailor","deck","worker/workplace","a sailor works on a deck")])
a("V8A40","glutton","overeat","person/characteristic action","coward","flee","a glutton characteristically overeats, as a coward characteristically flees",
 [("mane","stallion","part/animal","a mane is part of a stallion"),("menu","restaurant","list/place","a menu lists a restaurant's dishes"),("lock","diary","fastener/what it secures","a lock secures a diary"),("fork","knife","companion utensils","a fork is set beside a knife")])
a("V8A41","bully","intimidate","person/characteristic action","thief","steal","a bully characteristically intimidates, as a thief characteristically steals",
 [("alarm","intruder","device/what it warns of","an alarm warns of an intruder"),("prison","inmate","place/occupant","an inmate is held in a prison"),("wrapper","candy","covering/covered","a wrapper covers a candy"),("armory","rifles","place/what is stored","rifles are stored in an armory")],"easy")
a("V8A42","bee","honeycomb","animal/structure it builds","wasp","nest","a bee builds a honeycomb, as a wasp builds a nest",
 [("cub","wolf","young/adult","a cub grows into a wolf"),("beeswax","candle","material/product","a candle may be made of beeswax"),("cobalt","metal","instance/category","cobalt is a kind of metal"),("wattle","rooster","part/animal","a wattle is part of a rooster")])
a("V8A43","koala","eucalyptus","animal/main food","panda","bamboo","a koala feeds mainly on eucalyptus, as a panda feeds mainly on bamboo",
 [("bark","trunk","covering/thing covered","bark covers a trunk"),("stripe","tiger","marking/animal","stripes mark a tiger"),("bat","cave","animal/home","a bat lives in a cave"),("kitten","lynx","young/adult","a kitten grows into a lynx")])
a("V8A44","anteater","ants","animal/main food","giraffe","acacia","an anteater feeds mainly on ants, as a giraffe feeds mainly on acacia leaves",
 [("mole","tunnel","animal/home","a mole lives in a tunnel"),("talon","eagle","part/animal","a talon is part of an eagle"),("bark","birch","covering/tree","bark covers a birch"),("aviary","finches","place/what is kept","finches are kept in an aviary")])
a("V8A45","vulture","carrion","animal/main food","silkworm","mulberry","a vulture feeds on carrion, as a silkworm feeds on mulberry leaves",
 [("hyena","scavenger","instance/category","a hyena is a kind of scavenger"),("weaver","rug","maker/product","a weaver makes a rug"),("turret","castle","part/whole","a turret is part of a castle"),("glimmer","glare","degree","a glimmer is much fainter than a glare")],"hard")
a("V8A46","entomologist","insects","specialist/subject studied","ornithologist","birds","an entomologist studies insects, as an ornithologist studies birds",
 [("spectrum","colors","range/members","a spectrum is a range of colors"),("diver","wetsuit","person/gear","a diver wears a wetsuit"),("aviary","parrots","enclosure/occupants","parrots are kept in an aviary"),("antenna","moth","part/animal","an antenna is part of a moth")])
a("V8A47","numismatist","coins","specialist/subject studied","philatelist","stamps","a numismatist studies and collects coins, as a philatelist studies and collects stamps",
 [("satchel","homework","container/contents","a satchel holds homework"),("banker","vault","worker/workplace","a banker works with a vault"),("courier","parcel","deliverer/item","a courier delivers a parcel"),("auction","bidder","event/participant","a bidder takes part in an auction")],"hard")
a("V8A48","dermatologist","skin","specialist/what is treated","cardiologist","heart","a dermatologist treats the skin, as a cardiologist treats the heart",
 [("surgeon","gown","worker/garment","a surgeon wears a gown"),("icing","cake","covering/thing covered","icing covers a cake"),("tabby","cat","instance/category","a tabby is a kind of cat"),("burn","blister","cause/effect","a burn can cause a blister")])
a("V8A49","vulcanologist","volcanoes","specialist/subject studied","glaciologist","glaciers","a vulcanologist studies volcanoes, as a glaciologist studies glaciers",
 [("knitter","mittens","maker/product","a knitter makes mittens"),("tsunami","coastline","force/thing struck","a tsunami strikes a coastline"),("avalanche","snow","event/material","an avalanche is a mass of falling snow"),("geyser","steam","source/emission","a geyser emits steam")],"hard")
a("V8A50","mycologist","fungi","specialist/subject studied","herpetologist","reptiles","a mycologist studies fungi, as a herpetologist studies reptiles",
 [("terrarium","iguana","enclosure/occupant","an iguana is kept in a terrarium"),("antidote","venom","remedy/poison","an antidote counters venom"),("camouflage","chameleon","adaptation/animal","a chameleon relies on camouflage"),("parasol","sunlight","shade/what it blocks","a parasol blocks sunlight")],"hard")
a("V8A51","claustrophobia","confinement","phobia/what is feared","acrophobia","heights","claustrophobia is a fear of confinement, as acrophobia is a fear of heights",
 [("elevator","shaft","car/passage","an elevator runs in a shaft"),("steeple","chapel","part/whole","a steeple is part of a chapel"),("parachute","descent","device/what it slows","a parachute slows a descent"),("mountaineer","summit","climber/goal","a mountaineer aims for a summit")],"hard")
a("V8A52","regicide","king","killing/victim","fratricide","brother","regicide is the killing of a king, as fratricide is the killing of a brother",
 [("sibling","twin","category/instance","a twin is a kind of sibling"),("assassin","dagger","person/weapon","an assassin may use a dagger"),("crown","coronation","object/ceremony","a crown is placed at a coronation"),("squire","knight","attendant/master","a squire serves a knight")],"hard")
a("V8A53","herbicide","weeds","killer/what it kills","fungicide","mold","a herbicide kills weeds, as a fungicide kills mold",
 [("shed","mower","place/what is stored","a mower is stored in a shed"),("sprinkler","lawn","device/what it waters","a sprinkler waters a lawn"),("shears","trim","tool/function","shears are used to trim"),("drizzle","puddle","cause/effect","a drizzle leaves a puddle")])
a("V8A54","plutocracy","wealthy","government/who rules","theocracy","clergy","a plutocracy is rule by the wealthy, as a theocracy is rule by the clergy",
 [("tycoon","fortune","person/possession","a tycoon owns a fortune"),("monk","abbey","member/religious house","a monk lives in an abbey"),("gable","cottage","part/whole","a gable is part of a cottage"),("squabble","vendetta","degree","a squabble is much milder than a vendetta")],"hard")
a("V8A55","calorie","energy","unit/what it measures","hertz","frequency","a calorie is a unit of energy, as a hertz is a unit of frequency",
 [("antenna","signal","receiver/what it receives","an antenna receives a signal"),("pendulum","swing","object/motion","a pendulum swings"),("glucose","sugar","instance/category","glucose is a kind of sugar"),("dial","thermostat","control/device","a dial sets a thermostat")],"hard")
a("V8A56","hectare","area","unit/what it measures","watt","power","a hectare is a unit of area, as a watt is a unit of power",
 [("bezel","watch","part/whole","a bezel is part of a watch"),("mop","swab","tool/function","a mop is used to swab"),("fence","pasture","boundary/area enclosed","a fence encloses a pasture"),("gloomy","somber","synonym","gloomy means somber")])
a("V8A57","wince","pain","expression/feeling shown","smirk","smugness","a wince shows pain, as a smirk shows smugness",
 [("bruise","impact","injury/cause","an impact causes a bruise"),("ventriloquist","dummy","performer/prop","a ventriloquist performs with a dummy"),("cuff","trousers","part/whole","a cuff is part of a pair of trousers"),("sling","forearm","support/limb","a sling supports a forearm")])
a("V8A58","nod","assent","gesture/what it signals","wave","greeting","a nod signals assent, as a wave signals a greeting",
 [("eyelet","boot","part/whole","an eyelet is part of a boot"),("envoy","message","carrier/what is carried","an envoy carries a message"),("flask","tea","container/contents","a flask holds tea"),("hurl","fling","synonym","to hurl is to fling")])
a("V8A59","halo","holiness","symbol/what it represents","scales","justice","a halo represents holiness, as scales represent justice",
 [("judge","robe","wearer/garment","a judge wears a robe"),("cashier","register","worker/machine","a cashier works a register"),("vast","immense","synonym","vast means immense"),("awning","storefront","part/whole","an awning is part of a storefront")])
a("V8A60","skull","mortality","symbol/what it represents","lily","purity","a skull represents mortality, as a lily represents purity",
 [("florist","corsage","maker/product","a florist makes a corsage"),("gravestone","cemetery","marker/place","a gravestone stands in a cemetery"),("beagle","hound","instance/category","a beagle is a kind of hound"),("marrow","bone","inner tissue/bone","marrow fills a bone")],"hard")
a("V8A61","vase","roses","container/contents","thermos","coffee","a vase holds roses, as a thermos holds coffee",
 [("barista","espresso","worker/product","a barista makes espresso"),("thorn","bramble","part/plant","a thorn is part of a bramble"),("sunlight","bloom","cause/effect","sunlight makes a flower bloom"),("picnic","park","event/place","a picnic is held in a park")],"easy")
a("V8A62","maestro","orchestra","leader/group","chieftain","clan","a maestro leads an orchestra, as a chieftain leads a clan",
 [("tartan","pattern","instance/category","a tartan is a kind of pattern"),("anthem","nation","song/country","an anthem is a nation's song"),("castle","moat","building/defense","a moat defends a castle"),("trunk","blankets","container/contents","a trunk holds blankets")])
a("V8A63","skipper","crew","leader/group","coach","squad","a skipper leads a crew, as a coach leads a squad",
 [("sail","sloop","part/whole","a sail is part of a sloop"),("swift","sluggish","antonym","swift is the opposite of sluggish"),("locker","uniform","container/contents","a locker holds a uniform"),("scoreboard","points","display/what it shows","a scoreboard shows points")],"easy")
a("V8A64","prologue","play","beginning/whole","appetizer","meal","a prologue opens a play, as an appetizer opens a meal",
 [("waiter","tip","worker/payment","a waiter receives a tip"),("stable","mares","place/what is kept","mares are kept in a stable"),("eager","reluctant","antonym","eager is the opposite of reluctant"),("tote","groceries","container/contents","a tote holds groceries")])
a("V8A65","crowbar","pry","tool/function","whetstone","hone","a crowbar is used to pry, as a whetstone is used to hone",
 [("carpenter","level","worker/tool","a carpenter uses a level"),("scabbard","saber","sheath/weapon","a scabbard holds a saber"),("blade","dagger","part/whole","a blade is part of a dagger"),("rust","neglect","result/cause","rust results from neglect")])
a("V8A66","vise","clamp","tool/function","iron","press","a vise is used to clamp, as an iron is used to press",
 [("knot","pine","feature/wood","a knot is a feature of pine wood"),("glee","joy","synonym","glee means joy"),("sundial","shadow","device/what it relies on","a sundial tells time by a shadow"),("bear","den","animal/home","a bear lives in a den")])
a("V8A67","friction","blister","cause/effect","nettle","rash","friction causes a blister, as a nettle causes a rash",
 [("hiker","trail","person/path","a hiker follows a trail"),("callus","palm","growth/location","a callus forms on a palm"),("kindling","campfire","fuel/fire","kindling starts a campfire"),("inhaler","asthma","remedy/ailment","an inhaler treats asthma")])
a("V8A68","peacock","vanity","animal/trait it stands for","lamb","meekness","a peacock stands for vanity, as a lamb stands for meekness",
 [("barn","hayloft","building/part","a hayloft is part of a barn"),("pasture","grazing","place/activity","grazing happens in a pasture"),("eerie","spooky","synonym","eerie means spooky"),("fleece","sweater","material/product","a sweater is made from fleece")])
a("V8A69","epitaph","tomb","text/what it is written on","caption","photograph","an epitaph is written on a tomb, as a caption is written under a photograph",
 [("mason","chisel","worker/tool","a mason uses a chisel"),("album","snapshots","holder/contents","an album holds snapshots"),("ruby","gemstone","instance/category","a ruby is a kind of gemstone"),("shutter","camera","part/whole","a shutter is part of a camera")])
a("V8A70","eulogy","deceased","speech/person honored","toast","honoree","a eulogy is a speech honoring the deceased, as a toast is a speech honoring an honoree",
 [("hearse","coffin","vehicle/cargo","a hearse carries a coffin"),("champagne","grapes","product/material","champagne is made from grapes"),("obituary","newspaper","article/publication","an obituary appears in a newspaper"),("host","party","person/event","a host gives a party")],"hard")
a("V8A71","atlas","maps","book/what it collects","hymnal","hymns","an atlas is a book of maps, as a hymnal is a book of hymns",
 [("compass","needle","whole/part","a needle is part of a compass"),("choir","loft","group/place","a choir sings from a loft"),("platoon","sergeant","unit/leader","a sergeant helps lead a platoon"),("pilgrim","shrine","traveler/destination","a pilgrim travels to a shrine")])
a("V8A72","frame","portrait","holder/what it displays","setting","diamond","a frame holds and displays a portrait, as a setting holds and displays a diamond",
 [("jeweler","pendant","maker/product","a jeweler makes a pendant"),("tenant","landlord","renter/owner","a tenant rents from a landlord"),("sitter","painter","subject/artist","a sitter poses for a painter"),("polish","luster","process/result","polish produces luster")],"hard")
a("V8A73","handlebars","motorcycle","control/vehicle steered","tiller","sailboat","handlebars steer a motorcycle, as a tiller steers a sailboat",
 [("crest","wave","part/whole","a crest is the top part of a wave"),("insult","altercation","cause/effect","an insult can start an altercation"),("pup","otter","young/adult","a pup grows into an otter"),("wake","boat","trail/maker","a boat leaves a wake")])
a("V8A74","levee","river","barrier/what it holds back","breakwater","waves","a levee holds back a river, as a breakwater holds back waves",
 [("cliff","erosion","landform/shaping force","erosion shapes a cliff"),("tide","moon","effect/cause","the moon causes the tide"),("dredge","channel","machine/what it deepens","a dredge deepens a channel"),("sandbag","burlap","thing/material","a sandbag is made of burlap")],"hard")
a("V8A75","taste","tongue","sense/organ","hearing","ear","we taste with the tongue, as we hear with the ear",
 [("horn","rhinoceros","part/animal","a horn is part of a rhinoceros"),("dentist","teeth","worker/what is treated","a dentist treats teeth"),("magnet","attract","object/function","a magnet is used to attract"),("keg","cider","container/contents","a keg holds cider")],"easy")
a("V8A76","bibliophile","books","lover/what is loved","cinephile","films","a bibliophile loves books, as a cinephile loves films",
 [("library","shelves","building/part","shelves are part of a library"),("projector","screen","device/surface","a projector shines on a screen"),("cobbler","boots","maker/product","a cobbler makes boots"),("miner","shaft","worker/workplace","a miner works in a shaft")],"hard")
a("V8A77","embargo","trade","ban/what is restricted","censorship","information","an embargo restricts trade, as censorship restricts information",
 [("treaty","negotiation","agreement/process","a treaty comes from negotiation"),("smuggler","contraband","person/goods","a smuggler moves contraband"),("dictator","decree","ruler/edict","a dictator issues a decree"),("diplomat","summit","delegate/meeting","a diplomat attends a summit")],"hard")
a("V8A78","micrometer","thickness","instrument/what it measures","altimeter","elevation","a micrometer measures thickness, as an altimeter measures elevation",
 [("parachute","skydiver","gear/user","a skydiver uses a parachute"),("porthole","submarine","part/whole","a porthole is part of a submarine"),("shell","snail","covering/animal","a shell covers a snail"),("ladder","firetruck","equipment/vehicle","a ladder is carried on a firetruck")])
a("V8A79","sentry","fort","protector/protected","bodyguard","celebrity","a sentry guards a fort, as a bodyguard guards a celebrity",
 [("cannon","artillery","instance/category","a cannon is a kind of artillery"),("embassy","diplomat","building/occupant","a diplomat works in an embassy"),("shield","crest","object/emblem","a crest is displayed on a shield"),("bugle","reveille","instrument/call played","reveille is played on a bugle")])
a("V8A80","virus","fever","cause/effect","mosquito","itch","a virus can cause a fever, as a mosquito can cause an itch",
 [("screen","insects","barrier/what it keeps out","a screen keeps out insects"),("doctor","diagnosis","worker/product","a doctor makes a diagnosis"),("cell","nucleus","whole/part","a nucleus is part of a cell"),("swamp","reeds","habitat/plant","reeds grow in a swamp")])

json.dump(A,open('ana-draft.json','w'),indent=1)
