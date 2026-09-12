"""Structural pre-flight for the 27 Conventions items of an act-english-v5 file.

    python3 act-english-v5r.check-tells.py <batch.json> <expected item count>

A check that cannot name its input must not return a number. This refuses
(exit 1) on: a wrong item count, a wrong Conventions count, a `No Change`
span table that does not cover exactly the 27 ids, a span that does not
occur verbatim in its own passage, a wrong subject-verb count, or a verb
form it cannot map. It never falls back to a default input.

`No Change` is an OPAQUE TOKEN to an options-only solver, so it is never
itself counted as a tell - but its TEXT is needed to decide which options
are punctuation-variants of one another, so the table below supplies it and
is validated against the passage on every run.

None of this is the gate. Per CLAUDE.md the gate is the options-only attack.
"""
import json, sys, re, itertools

# ---- the text each item's `No Change` stands for. Validated below against
# ---- the item's own passage, so this table cannot silently drift.
NC_SPAN = {
 'ACT-EN5-P1-Q01': 'laugh, he simply',
 'ACT-EN5-P1-Q04': "childrens'",
 'ACT-EN5-P1-Q07': 'a bow; an adult',
 'ACT-EN5-P1-Q08': 'quits',
 'ACT-EN5-P1-Q09': 'Watching my bow arm in the studio mirror, my elbow dropped whenever I stopped paying attention',
 'ACT-EN5-P2-Q01': 'the hill, a white cylinder',
 'ACT-EN5-P2-Q03': 'three wells, sunk into a sand and gravel aquifer, east of the highway',
 'ACT-EN5-P2-Q04': 'and then they test it',
 'ACT-EN5-P2-Q07': 'demand are low',
 'ACT-EN5-P2-Q09': "is larger then the town's entire annual budget",
 'ACT-EN5-P3-Q01': 'nine seasons, and in that time',
 'ACT-EN5-P3-Q03': 'Its',
 'ACT-EN5-P3-Q05': 'early”, he explains.',
 'ACT-EN5-P3-Q07': 'and hundreds of small set screws are tightened',
 'ACT-EN5-P3-Q08': 'Work that takes two weeks and leaves no trace an audience could point to.',
 'ACT-EN5-P3-Q09': 'Not darkness, and not blandness, the audience should feel a room getting colder without deciding that a light dimmed',
 'ACT-EN5-P4-Q02': 'Whitefish steaks, small potatoes and onions',
 'ACT-EN5-P4-Q03': 'the work: it seasons',
 'ACT-EN5-P4-Q06': 'a garnish, however the show it produces is real',
 'ACT-EN5-P4-Q07': 'a crew — lumber camps, church suppers, a fleet coming in, cheaply and outdoors',
 'ACT-EN5-P4-Q08': 'had did',
 'ACT-EN5-P5-Q01': 'from sixty percent to fifty. Which the woman who answered the radio would not accept.',
 'ACT-EN5-P5-Q02': "its riders' commission",
 'ACT-EN5-P5-Q03': 'paid in a flat weekly fee',
 'ACT-EN5-P5-Q06': 'there was a written rota, a hardship fund, and a rule',
 'ACT-EN5-P5-Q07': 'rather than because it was comfortable to belong to',
 'ACT-EN5-P5-Q08': 'with money in the account, which its last members considered a decent result',
}

if len(sys.argv) != 3:
    sys.exit("usage: check-tells.py <path> <expected item count>")
path, expect_n = sys.argv[1], int(sys.argv[2])
items = json.load(open(path))
if len(items) != expect_n:
    sys.exit(f"REFUSE: {path} holds {len(items)} items, expected {expect_n}")
conv = [i for i in items if i['domain'] == 'Conventions of Standard English']
if len(conv) != 27:
    sys.exit(f"REFUSE: {len(conv)} Conventions items, expected 27")
if set(i['id'] for i in conv) != set(NC_SPAN):
    sys.exit(f"REFUSE: Conventions ids do not match the No Change table: "
             f"{sorted(set(i['id'] for i in conv) ^ set(NC_SPAN))}")
for it in conv:
    if NC_SPAN[it['id']] not in it['passage']:
        sys.exit(f"REFUSE: No Change span for {it['id']} does not occur in its "
                 f"passage: {NC_SPAN[it['id']]!r}")
print(f"input: {path}  items={len(items)}  scorable (Conventions) N={len(conv)}")


def resolved(it):
    """All four option strings with `No Change` resolved to its span text."""
    return [NC_SPAN[it['id']] if c == 'No Change' else c for c in it['choices']]


def named(it):
    return [c for c in it['choices'] if c != 'No Change']


# --- M3: strike-on-sight orthography ------------------------------------
BLACKLIST = [
    r"\bits'", r"\bher's", r"\bhers'", r"\btheirs'", r"\bleafs'?\b",
    r"\btheirselves\b", r"\bbeing that\b",
    r"\bchildrens\b",                              # no such plural
    r"\bhad been did\b", r"\bhad did\b",
    r"\bmore (larger|better|faster|greater)\b",    # doubled comparative
    r"\bit's \w+s'",                               # it's used as a possessive
    r"\bdemand were\b",                            # mass noun + plural past
    r"\bwhom built\b", r"\bthem who\b",
    r"\bthere (eggs|doors|face|not)\b",
]
# --- M4 support: eliminable in isolation without being a misspelling -----
# NOTE on the doubled-joiner pattern: `; and` is a doubled joiner ONLY when one
# semicolon joins two clauses. A SERIES punctuated with semicolons legitimately
# ends `; and` ("steaks; potatoes; and onions") and is standard edited English,
# so an option carrying two or more semicolons is exempted. This refinement was
# added for act-english-v5 and then break-tested (see the bottom of this file):
# a genuine one-semicolon doubled joiner must still fire.
SELFSTRIKE = [
    (r"^[^;]*;\s*(and|but|or)\b[^;]*$",
     "doubled joiner (semicolon + coordinating conjunction)"),
    (r",\s*(and|but|or),", "comma-wrapped coordinating conjunction"),
    (r"[,;:]\s*[”\"']\s*,", "doubled punctuation across a quotation mark"),
    (r"\w,\s*that\s", "comma before a restrictive 'that'"),
    (r"\bby someone\b|\bby them\b", "agentless-passive padding"),
]
STRONG = r"[;:—]"          # marks that can only stand between clause-sized units


def struck(c):
    return (any(re.search(b, c, re.I) for b in BLACKLIST)
            or any(re.search(p, c, re.I) for p, _ in SELFSTRIKE))


def orth_hits(c):
    return [b for b in BLACKLIST if re.search(b, c, re.I)]


def self_hits(c):
    return [lbl for p, lbl in SELFSTRIKE if re.search(p, c, re.I)]


def words(c):
    return tuple(w.lower() for w in re.findall(r"[\w'’]+", c))


def toks(c):
    return re.findall(r"[\w'’]+|[^\w\s]", c)


def minimal_pair(a, b):
    ta, tb = toks(a), toks(b)
    if len(ta) != len(tb) or ta == tb:
        return False
    return sum(1 for x, y in zip(ta, tb) if x != y) == 1


def axes(opts):
    """Group the options into ONE-TOKEN AXES: maximal sets of options whose
    token sequences agree everywhere except at a single position. Returns
    [(size, members)]. A size-2 axis names a binary rule (was/were,
    town's/towns') and leaves the rest of the field as its survivors - that
    is mechanism 1. A size-3+ axis is a CLOSED SET on that axis (three
    prepositions, three marks) and privileges nobody, which is the shape
    AUTHORING-BRIEF section 2b calls safe."""
    groups = {}
    for c in opts:
        t = toks(c)
        for p in range(len(t)):
            groups.setdefault((len(t), p, tuple(t[:p]), tuple(t[p + 1:])),
                              set()).add(c)
    seen, out = set(), []
    for members in sorted(groups.values(), key=len, reverse=True):
        if len(members) < 2:
            continue
        fm = frozenset(members)
        if fm in seen:
            continue
        seen.add(fm)
        out.append((len(members), members))
    return out


def weak_mark_eliminated(opts):
    """Within a family of options carrying the SAME words and differing only
    in punctuation, if any member uses a semicolon, colon or dash then the
    juncture is clause-sized, and the members that mark it with a comma or
    with nothing are eliminable without reading the sentence. Decidable."""
    out = set()
    fam = {}
    for c in opts:
        fam.setdefault(words(c), []).append(c)
    for members in fam.values():
        if len(members) < 2:
            continue
        if any(re.search(STRONG, m) for m in members):
            for m in members:
                if not re.search(STRONG, m) and '.' not in m[:-1]:
                    out.add(m)
    return out


rows = []
for it in conv:
    alts = named(it)
    allopts = resolved(it)
    key_txt = NC_SPAN[it['id']] if it['correct_answer'] == 'No Change' else it['correct_answer']

    n_orth = sum(1 for c in alts if orth_hits(c))
    n_self = sum(1 for c in alts if self_hits(c))
    ladder = max(len(c) for c in alts) / max(1, min(len(c) for c in alts))

    # M1: a BINARY axis among the NAMED alternates that does not contain the
    # key. Named only, because `No Change` shows the solver no text: a bracket
    # can only be read off strings the solver can actually see.
    ax = axes(alts)
    pair = any(sz == 2 and key_txt not in mem for sz, mem in ax)
    closed = sum(1 for sz, mem in ax if sz >= 3)

    # M2: how many options survive every mechanically decidable elimination.
    # `No Change` is opaque and therefore NEVER eliminable by a solver.
    weak = weak_mark_eliminated(allopts)
    survivors = [c for c in allopts
                 if c == NC_SPAN[it['id']] or (not struck(c) and c not in weak)]
    residue = len(survivors)

    rows.append({'id': it['id'], 'orth': n_orth, 'self': n_self,
                 'ladder': round(ladder, 2), 'bracket': pair, 'closed': closed,
                 'residue': residue,
                 'residue_is_key': residue == 1 and survivors[0] == key_txt})

m1 = sum(1 for r in rows if r['bracket'])
m1c = sum(1 for r in rows if r['closed'])
m2 = sum(1 for r in rows if r['residue'] == 1)
m2k = sum(1 for r in rows if r['residue_is_key'])
m3 = sum(1 for r in rows if r['orth'])
m3_total = sum(r['orth'] for r in rows)
m4 = sum(1 for r in rows if r['ladder'] >= 2.0)
n_self_items = sum(1 for r in rows if r['self'])

print(f" M1 bracket      BINARY axis (2 options) that EXCLUDES the key   : {m1}/27")
print(f"    (contrast)   items carrying a CLOSED 3+-way axis (safe shape): {m1c}/27")
print(f" M2 residue      mechanically reduced to ONE surviving option    : {m2}/27"
      f"   (and that survivor is the key: {m2k})")
print(f" M3 orthography  items with >=1 strike-on-sight option           : {m3}/27"
      f"   (total such options: {m3_total})")
print(f" M4 ladder       alternates ladder >=2.0x in length              : {m4}/27")
print(f"    (support)    doubled joiner / comma-wrapped conjunction etc. : {n_self_items}/27")
for r in rows:
    if r['orth'] or r['self'] or r['ladder'] >= 2.0 or r['residue'] == 1:
        print("     ", r)

# --- M5: number balance on the subject-verb items ------------------------
NUM = {
    'was': 'sg', 'is': 'sg', 'has been': 'sg', 'has': 'sg',
    'were': 'pl', 'are': 'pl', 'have been': 'pl', 'have': 'pl',
    'had been': 'unmarked', 'had': 'unmarked',   # past perfect marks no number
}


def numof(t):
    t = re.sub(r'\bnot\b', '', t)
    t = re.sub(r'\s+', ' ', t)
    for k in sorted(NUM, key=len, reverse=True):
        if re.search(r'\b' + re.escape(k) + r'\b', t):
            return NUM[k]
    return None


sv = [i for i in conv if i['subskill'] == 'subject-verb agreement']
if len(sv) != 2:
    sys.exit(f"REFUSE: {len(sv)} subject-verb items, expected 2")
singleton = 0
print(f" M5 singleton    subject-verb items N={len(sv)}")
for it in sv:
    opts = resolved(it)
    nums = [numof(c) for c in opts]
    if None in nums:
        sys.exit(f"REFUSE: unmapped verb form in {it['id']}: {opts}")
    key_txt = NC_SPAN[it['id']] if it['correct_answer'] == 'No Change' else it['correct_answer']
    kn = numof(key_txt)
    uniq = nums.count(kn) == 1
    singleton += uniq
    print(f"     {it['id']}  sg={nums.count('sg')} pl={nums.count('pl')} "
          f"unmarked={nums.count('unmarked')}  key={kn}  "
          f"key-is-number-singleton={uniq}")
print(f"    items where the key is the ONLY option of its number: {singleton}/{len(sv)}")

print()
print("WHAT THIS CANNOT SEE - stated so the numbers are not over-read:")
print("  - whether an alternate is FLAWLESS IN ISOLATION. Semantic; only the")
print("    options-only attack settles it.")
print("  - M2 is a LOWER BOUND. It eliminates misspellings, doubled joiners and")
print("    weak marks inside a punctuation-variant family. It cannot see a")
print("    fragment after a semicolon, or a splice whose string reads as")
print("    ordinary English, so a real solver eliminates at least as much.")
print("  - M1 is necessary, not sufficient. A closed symmetric set of same-shape")
print("    options (three prepositions, four marks) is FULL of minimal pairs and")
print("    is the SAFE shape; the harm needs a general rule that picks the")
print("    survivor, and no script decides that.")
print("  - cross-item tells: the distribution of key VALUES across the 27.")

# --- self-test of the refined doubled-joiner pattern ---------------------
# A detector that has been loosened must be shown still to fire.
_pat = SELFSTRIKE[0][0]
assert re.search(_pat, "laugh; and he simply", re.I), "doubled joiner no longer fires"
assert re.search(_pat, "ice; but within a decade", re.I), "doubled joiner no longer fires"
assert not re.search(_pat, "Whitefish steaks; small potatoes; and onions", re.I), \
    "semicolon series must be exempt"
