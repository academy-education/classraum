import json, sys, re, collections

# A check that cannot name its input must not return a number.
path = sys.argv[1]; expect_n = int(sys.argv[2])
items = json.load(open(path))
if len(items) != expect_n:
    sys.exit(f"REFUSE: {path} holds {len(items)} items, expected {expect_n}")
conv = [i for i in items if i['domain'] == 'Conventions of Standard English']
if len(conv) != 27:
    sys.exit(f"REFUSE: {len(conv)} Conventions items, expected 27")
print(f"input: {path}  items={len(items)}  scorable (Conventions) N={len(conv)}")

# M3: an option strikeable on sight as a non-word / known-wrong orthography
BLACKLIST = [r"\bits'", r"\bher's", r"\bhers'", r"\btheirs'", r"\bleafs'", r"\bleafs\b",
             r"\bit's\b", r"\bthere (eggs|doors|face)", r"\bbeing that\b", r"\btheirselves\b",
             r"\bwhom built\b", r"\bthem who\b", r"\bgrill's\b", r"\bgrills'\b", r"\btowns'? crop\b"]
# note: `towns' crop` is a legal spelling (plural possessive) - excluded below, listed to show it was considered
BLACKLIST = [b for b in BLACKLIST if b != r"\btowns'? crop\b"]

# M2/M4: doubled joiner, comma-wrapped conjunction, non-finite splice - eliminable in isolation
SELFSTRIKE = [r";\s*(and|but)\b", r",\s*and,\s", r"\b\w+ing\b(?!.*\b(is|are|was|were|has|have)\b)"]

def named(it):  # the three alternates, i.e. everything but the opaque "No Change" token
    return [c for c in it['choices'] if c != 'No Change']

rows = []
for it in conv:
    alts = named(it)
    hits = []
    for c in alts:
        for b in BLACKLIST:
            if re.search(b, c, re.I): hits.append((c, b)); break
    ladder = max(len(c) for c in alts) / max(1, min(len(c) for c in alts))
    dbl = [c for c in alts if re.search(r";\s*(and|but)\b", c) or re.search(r",\s*and,", c)]
    rows.append((it['id'], len(hits), round(ladder, 2), len(dbl)))

n_orth = sum(1 for r in rows if r[1] > 0)
n_ladder = sum(1 for r in rows if r[2] >= 2.0)
n_dbl = sum(1 for r in rows if r[3] > 0)
tot_orth = sum(r[1] for r in rows)
print(f"  items with >=1 strike-on-sight orthography option : {n_orth}/27   (total such options: {tot_orth})")
print(f"  items whose alternates ladder >=2.0x in length     : {n_ladder}/27")
print(f"  items with a doubled-joiner / comma-wrapped conj   : {n_dbl}/27")
for r in rows:
    if r[1] or r[2] >= 2.0 or r[3]:
        print("   ", r)

# --- subject-verb number balance: is the key the unique option of its number? ---
# Hand-coded because English number marking is not derivable from a regex.
NUM = {  # verb string fragment -> 'sg' | 'pl' | 'neutral'
 'was':'sg','is':'sg','has been':'sg','has stood':'sg','stands':'sg','has been standing':'sg',
 'exists':'sg','has existed':'sg','floats':'sg',
 'were':'pl','are':'pl','have been':'pl','have stood':'pl','stand':'pl','exist':'pl',
 'are existing':'pl','have existed':'pl',
}
def numof(opt, nc_text):
    t = nc_text if opt == 'No Change' else opt
    t = re.sub(r'\bnot\b', '', t)  # 'has not been' must match 'has been'
    t = re.sub(r'\s+', ' ', t)
    # longest matching fragment wins ("has been standing" before "has been")
    best = None
    for k in sorted(NUM, key=len, reverse=True):
        if re.search(r'\b' + re.escape(k) + r'\b', t):
            best = NUM[k]; break
    return best

NC = {'ACT-EN4-P1-Q05':'was not used to','ACT-EN4-P2-Q04':'was floated',
      'ACT-EN4-P3-Q02':'are simply','ACT-EN4-P4-Q01':'has stood',
      'ACT-EN4-P5-Q01':'exist in some form'}
sv = [i for i in conv if i['subskill'] == 'subject-verb agreement across an interrupter']
if len(sv) != 5:
    sys.exit(f"REFUSE: {len(sv)} subject-verb items, expected 5")
singleton = 0
print(f"  subject-verb items N={len(sv)}")
for it in sv:
    nums = [numof(c, NC[it['id']]) for c in it['choices']]
    if None in nums: sys.exit(f"REFUSE: unmapped verb form in {it['id']}: {it['choices']}")
    kn = numof(it['correct_answer'], NC[it['id']])
    uniq = nums.count(kn) == 1
    singleton += uniq
    print(f"    {it['id']}  sg={nums.count('sg')} pl={nums.count('pl')}  key={kn}  key-is-number-singleton={uniq}")
print(f"  items where the key is the ONLY option of its number: {singleton}/{len(sv)}")
