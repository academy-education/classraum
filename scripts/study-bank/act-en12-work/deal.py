# Deal key positions flat across the batch: No Change stays choices[0] (and is the
# key slot when keyed), Point [A]-[D] placement items keep their order, every
# other key is dealt from a seeded deck so the batch reads ~30/30/30/30.
import json, random, sys, collections
src, dst = sys.argv[1], sys.argv[2]
b = json.load(open(src)); rng = random.Random(20261101)
fixed = collections.Counter(); free_nc, free_any = [], []
for i, it in enumerate(b):
    ch = it['choices']
    if ch[0] == 'No Change' and it['correct_answer'] == 'No Change': fixed[0] += 1
    elif all(c.startswith('Point [') for c in ch): fixed[ch.index(it['correct_answer'])] += 1
    elif ch[0] == 'No Change': free_nc.append(i)
    else: free_any.append(i)
n = len(b); want = {k: n // 4 for k in range(4)}
need = {k: want[k] - fixed[k] for k in range(4)}
assert need[0] <= len(free_any), need
zeros = set(rng.sample(free_any, need[0]))
deck = [k for k in (1, 2, 3) for _ in range(need[k])]
rng.shuffle(deck)
rest = [i for i in free_nc + free_any if i not in zeros]
assert len(deck) == len(rest), (len(deck), len(rest))
slot = dict(zip(rest, deck)); slot.update({i: 0 for i in zeros})
out = []
for i, it in enumerate(b):
    it = {k: v for k, v in it.items() if k != '_type'}
    if i in slot:
        ch = it['choices']; key = it['correct_answer']
        head = ['No Change'] if ch[0] == 'No Change' else []
        others = [c for c in ch if c != key and c != 'No Change']; rng.shuffle(others)
        body_slots = 4 - len(head); k = slot[i] - len(head)
        body = others[:k] + [key] + others[k:]
        it['choices'] = head + body
        assert len(it['choices']) == 4 and it['choices'].index(key) == slot[i]
    out.append(it)
json.dump(out, open(dst, 'w'), indent=1, ensure_ascii=False)
print('key index', dict(sorted(collections.Counter(x['choices'].index(x['correct_answer']) for x in out).items())))
types = {}
for x in b: types[x['passage_id']] = x['_type']
print('passage types', types)
