import json, sys, re, argparse

# A check that cannot name its input must not return a number.
#
# Generalised from act-english-v4r.check-tells.py. v4's expectations (50 items,
# 27 Conventions, 5 subject-verb) were hardcoded; that guard REFUSED on v6,
# which is correct behaviour. The guard is kept -- it is now parameterised on
# the command line instead of deleted, so the checker still refuses on input it
# was not pointed at, and still refuses on a verb form it cannot map.
ap = argparse.ArgumentParser()
ap.add_argument('path')
ap.add_argument('--items', type=int, required=True)
ap.add_argument('--conventions', type=int, required=True)
ap.add_argument('--sv', type=int, required=True, help='expected subject-verb items')
ap.add_argument('--nc', required=True, help='JSON map id -> No Change text for the sv items')
a = ap.parse_args()

items = json.load(open(a.path))
if len(items) != a.items:
    sys.exit(f"REFUSE: {a.path} holds {len(items)} items, expected {a.items}")
conv = [i for i in items if i['domain'] == 'Conventions of Standard English']
if len(conv) != a.conventions:
    sys.exit(f"REFUSE: {len(conv)} Conventions items, expected {a.conventions}")
N = len(conv)
print(f"input: {a.path}  items={len(items)}  scorable (Conventions) N={N}")

# M3: an option strikeable on sight as a non-word / known-wrong orthography.
# BASE is act-english-v4r.check-tells.py's list verbatim (minus the entry it
# itself excluded), so the v4 numbers and the v6 numbers are the same measure.
BASE = [r"\bits'", r"\bher's", r"\bhers'", r"\btheirs'", r"\bleafs'", r"\bleafs\b",
        r"\bit's\b", r"\bthere (eggs|doors|face)", r"\bbeing that\b", r"\btheirselves\b",
        r"\bwhom built\b", r"\bthem who\b", r"\bgrill's\b", r"\bgrills'\b"]
# v6-specific strike-on-sight strings, found by reading this file's options.
EXTRA = [r"\bthey're \w+ content\b", r"\bthere salt\b", r"\bbeing it was\b",
         r"\bwhoever they\b", r"\bwhom (showed|opposed|had|wanted)\b",
         r"\bminded to be\b", r"\bis empty since\b", r"\(\s*a [^)]*$"]
EXT = BASE + EXTRA

def named(it):  # the three alternates; the opaque "No Change" token carries no orthography
    return [c for c in it['choices'] if c != 'No Change']

def hits(alts, pats):
    n = 0
    for c in alts:
        for b in pats:
            if re.search(b, c, re.I):
                n += 1; break
    return n

rows = []
for it in conv:
    alts = named(it)
    if len(alts) != 3:
        sys.exit(f"REFUSE: {it['id']} has {len(alts)} named alternates, expected 3")
    ladder = max(len(c) for c in alts) / max(1, min(len(c) for c in alts))
    dbl = [c for c in alts if re.search(r";\s*(and|but)\b", c) or re.search(r",\s*and,", c)]
    # A serial semicolon list ("a; b; and c") is legal punctuation, not a doubled
    # joiner, and is NOT strikeable on sight. Counted separately so the v4r metric
    # stays comparable and the false positive is visible rather than tuned away.
    dbl_strict = [c for c in dbl if c.count(';') < 2]
    rows.append((it['id'], hits(alts, BASE), round(ladder, 2), len(dbl), hits(alts, EXT), len(dbl_strict)))

def rate(k): return sum(1 for r in rows if r[k] > 0)
print(f"  items with >=1 strike-on-sight option (v4r blacklist) : {rate(1)}/{N}   (total such options: {sum(r[1] for r in rows)})")
print(f"  items with >=1 strike-on-sight option (extended)      : {rate(4)}/{N}   (total such options: {sum(r[4] for r in rows)})")
print(f"  items whose alternates ladder >=2.0x in length        : {sum(1 for r in rows if r[2] >= 2.0)}/{N}")
print(f"  items with a doubled-joiner / comma-wrapped conj      : {rate(3)}/{N}   (v4r metric, verbatim)")
print(f"    of which not a legal serial-semicolon list           : {rate(5)}/{N}")
for r in rows:
    if r[1] or r[2] >= 2.0 or r[3] or r[4]:
        print("    id=%s base=%d ladder=%.2f dbl=%d ext=%d dbl_strict=%d" % r)

# --- subject-verb number balance: is the key the unique option of its number? ---
# Hand-coded because English number marking is not derivable from a regex.
NUM = {
 'was':'sg','is':'sg','has been':'sg','has stood':'sg','stands':'sg','has been standing':'sg',
 'exists':'sg','has existed':'sg','floats':'sg','stays':'sg',
 'were':'pl','are':'pl','have been':'pl','have stood':'pl','stand':'pl','exist':'pl',
 'are existing':'pl','have existed':'pl','stay':'pl',
 'stayed':'neutral','remained':'neutral',
}
def numof(opt, nc_text):
    t = nc_text if opt == 'No Change' else opt
    t = re.sub(r'\bnot\b', '', t)
    t = re.sub(r'\s+', ' ', t)
    for k in sorted(NUM, key=len, reverse=True):
        if re.search(r'\b' + re.escape(k) + r'\b', t):
            return NUM[k]
    return None

NC = json.loads(a.nc)
sv = [i for i in conv if i['subskill'].startswith('subject-verb agreement')]
if len(sv) != a.sv:
    sys.exit(f"REFUSE: {len(sv)} subject-verb items, expected {a.sv}")
missing = [i['id'] for i in sv if i['id'] not in NC]
if missing:
    sys.exit(f"REFUSE: no No-Change text supplied for {missing}")
singleton = 0
print(f"  subject-verb items N={len(sv)}")
for it in sv:
    nums = [numof(c, NC[it['id']]) for c in it['choices']]
    if None in nums:
        sys.exit(f"REFUSE: unmapped verb form in {it['id']}: {it['choices']}")
    kn = numof(it['correct_answer'], NC[it['id']])
    uniq = nums.count(kn) == 1
    singleton += uniq
    print(f"    {it['id']}  sg={nums.count('sg')} pl={nums.count('pl')} neutral={nums.count('neutral')}  key={kn}  key-is-number-singleton={uniq}")
print(f"  items where the key is the ONLY option of its number: {singleton}/{len(sv)}")
