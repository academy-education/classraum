"""Structural pre-flight for the 27 Conventions items of an act-english-v5 file.

    python3 act-english-v5r.check-tells.py <batch.json> <expected item count>

A check that cannot name its input must not return a number: this refuses
(exit 1) on a wrong item count, a wrong Conventions count, a wrong
subject-verb count, or a verb form it cannot map. It never falls back to a
default input.

It reports one number per mechanism from the v4r repair, PLUS an explicit
statement of what each detector cannot see. None of this is the gate; per
CLAUDE.md the gate is the options-only attack.
"""
import json, sys, re, itertools

if len(sys.argv) != 3:
    sys.exit("usage: check-tells.py <path> <expected item count>")
path = sys.argv[1]
expect_n = int(sys.argv[2])
items = json.load(open(path))
if len(items) != expect_n:
    sys.exit(f"REFUSE: {path} holds {len(items)} items, expected {expect_n}")
conv = [i for i in items if i['domain'] == 'Conventions of Standard English']
if len(conv) != 27:
    sys.exit(f"REFUSE: {len(conv)} Conventions items, expected 27")
print(f"input: {path}  items={len(items)}  scorable (Conventions) N={len(conv)}")


def named(it):
    """The three alternates. `No Change` is an opaque token: it carries no
    orthography to an options-only solver, so it is never counted as a tell."""
    return [c for c in it['choices'] if c != 'No Change']


# --- M3: strike-on-sight orthography ------------------------------------
# Non-words and known-wrong forms a reader strikes without the sentence.
# Each entry is here because it occurs in act-english-v5.batch.json or in v4.
BLACKLIST = [
    r"\bits'", r"\bher's", r"\bhers'", r"\btheirs'", r"\bleafs'?\b",
    r"\btheirselves\b", r"\bbeing that\b",
    r"\bchildrens\b",            # 'childrens' / "childrens's" - no such plural
    r"\bhad been did\b", r"\bhad did\b",
    r"\bmore (larger|better|faster|greater)\b",   # doubled comparative
    r"\bit's \w+s'",             # "it's riders' commission" - it's as possessive
    r"\bdemand were\b",          # mass-noun subject with a plural past verb
    r"\bwhom built\b", r"\bthem who\b",
    r"\bthere (eggs|doors|face|not)\b",
]

# --- M2/M4: eliminable in isolation without being a misspelling ---------
SELFSTRIKE = [
    (r";\s*(and|but|or)\b", "doubled joiner (semicolon + coordinating conjunction)"),
    (r",\s*(and|but|or),", "comma-wrapped coordinating conjunction"),
    (r"[,;:]\s*[”\"']\s*,", "doubled punctuation across a quotation mark"),
    (r"\w,\s*that\s", "comma before a restrictive 'that'"),
    (r"\bby someone\b|\bby them\b", "agentless-passive padding"),
]


def strikes(c):
    return [b for b in BLACKLIST if re.search(b, c, re.I)]


def selfstrikes(c):
    return [lbl for pat, lbl in SELFSTRIKE if re.search(pat, c, re.I)]


def toks(c):
    return re.findall(r"[\w'’]+|[^\w\s]", c)


def minimal_pair(a, b):
    """Two options that differ at exactly one token position NAME the axis
    they differ on: that is mechanism 1 (the alternates bracket the error).
    Decidable; it does NOT see brackets carried by rephrasings of unequal
    length, which is stated in the output."""
    ta, tb = toks(a), toks(b)
    if len(ta) != len(tb) or ta == tb:
        return False
    return sum(1 for x, y in zip(ta, tb) if x != y) == 1


rows = []
for it in conv:
    alts = named(it)
    n_orth = sum(1 for c in alts if strikes(c))
    n_self = sum(1 for c in alts if selfstrikes(c))
    ladder = max(len(c) for c in alts) / max(1, min(len(c) for c in alts))
    # M1: a minimal pair anywhere among the three named alternates
    pair = any(minimal_pair(a, b) for a, b in itertools.combinations(alts, 2))
    # M2: key is the opaque token and >=2 alternates fall on their own
    elim = (it['correct_answer'] == 'No Change'
            and sum(1 for c in alts if strikes(c) or selfstrikes(c)) >= 2)
    rows.append({'id': it['id'], 'orth': n_orth, 'self': n_self,
                 'ladder': round(ladder, 2), 'pair': pair, 'elim': elim})

m1 = sum(1 for r in rows if r['pair'])
m2 = sum(1 for r in rows if r['elim'])
m3 = sum(1 for r in rows if r['orth'])
m3_total = sum(r['orth'] for r in rows)
m4 = sum(1 for r in rows if r['ladder'] >= 2.0)
n_self_items = sum(1 for r in rows if r['self'])

print(" M1 bracket    items with a MINIMAL PAIR among the named alternates : "
      f"{m1}/27")
print(" M2 residue    key is `No Change` AND >=2 alternates fall on their own: "
      f"{m2}/27")
print(" M3 orthography items with >=1 strike-on-sight option                : "
      f"{m3}/27   (total such options: {m3_total})")
print(" M4 ladder     items whose alternates ladder >=2.0x in length        : "
      f"{m4}/27")
print("    (support)  items with a doubled joiner / comma-wrapped conj etc. : "
      f"{n_self_items}/27")
for r in rows:
    if r['orth'] or r['self'] or r['ladder'] >= 2.0 or r['pair'] or r['elim']:
        print("    ", r)

# --- M5: number balance on the subject-verb items ------------------------
# Hand-coded because English number marking is not derivable from a regex.
NUM = {
    'was': 'sg', 'is': 'sg', 'has been': 'sg', 'has': 'sg',
    'were': 'pl', 'are': 'pl', 'have been': 'pl', 'have': 'pl',
}
# text of the underlined span each item's `No Change` stands for
NC = {
    'ACT-EN5-P2-Q07': 'demand are low',
    'ACT-EN5-P5-Q06': 'there was a written rota, a hardship fund, and a rule',
}


def numof(opt, nc_text):
    t = nc_text if opt == 'No Change' else opt
    t = re.sub(r'\bnot\b', '', t)
    t = re.sub(r'\s+', ' ', t)
    for k in sorted(NUM, key=len, reverse=True):
        if re.search(r'\b' + re.escape(k) + r'\b', t):
            return NUM[k]
    return None


sv = [i for i in conv if i['subskill'] == 'subject-verb agreement']
if len(sv) != 2:
    sys.exit(f"REFUSE: {len(sv)} subject-verb items, expected 2")
if set(i['id'] for i in sv) != set(NC):
    sys.exit(f"REFUSE: subject-verb ids {sorted(i['id'] for i in sv)} "
             f"do not match the No Change table {sorted(NC)}")
singleton = 0
print(f" M5 singleton  subject-verb items N={len(sv)}")
for it in sv:
    nums = [numof(c, NC[it['id']]) for c in it['choices']]
    if None in nums:
        sys.exit(f"REFUSE: unmapped verb form in {it['id']}: {it['choices']}")
    kn = numof(it['correct_answer'], NC[it['id']])
    uniq = nums.count(kn) == 1
    singleton += uniq
    print(f"     {it['id']}  sg={nums.count('sg')} pl={nums.count('pl')}  "
          f"key={kn}  key-is-number-singleton={uniq}")
print(f"    items where the key is the ONLY option of its number: "
      f"{singleton}/{len(sv)}")

print()
print("WHAT THIS CANNOT SEE, stated so the numbers are not over-read:")
print("  - whether an alternate is FLAWLESS IN ISOLATION. That is semantic and")
print("    is settled only by the options-only attack.")
print("  - a bracket carried by two rephrasings of unequal token length (M1")
print("    sees minimal pairs only).")
print("  - a run-on or splice whose option string reads as ordinary English.")
print("  - cross-item tells (key-value distribution across the 27).")
