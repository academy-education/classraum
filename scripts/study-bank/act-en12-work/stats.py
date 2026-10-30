import json, sys, collections
b = json.load(open(sys.argv[1]))
dom = collections.Counter(i['domain'] for i in b)
print('items', len(b), dict(dom), {k: f"{100*v/len(b):.1f}%" for k, v in dom.items()})
el = [i for i in b if i['choices'][0] == 'No Change']
nc = [i for i in el if i['correct_answer'] == 'No Change']
print(f'NC keyed {len(nc)} of {len(el)} eligible = {100*len(nc)/len(el):.1f}%')
print('NC by domain', collections.Counter(i['domain'] for i in nc), 'eligible by domain', collections.Counter(i['domain'] for i in el))
L = S = 0
for i in b:
    if i['correct_answer'] == 'No Change': continue
    lens = [len(c) for c in i['choices'] if c != 'No Change']
    k = len(i['correct_answer'])
    if k == max(lens) and lens.count(k) == 1: L += 1
    if k == min(lens) and lens.count(k) == 1: S += 1
print('key uniquely longest (non-NC options)', L, ' uniquely shortest', S, 'of', sum(1 for i in b if i['correct_answer'] != 'No Change'))
semi = [i['id'] for i in b if ';' in i['correct_answer'] or (i['correct_answer']=='No Change' and 'semicolon' in i['subskill'])]
print('semicolon keyed', len(semi), semi)
pos = collections.Counter(b_.get('correct_answer') == b_['choices'][0] for b_ in b)
print('key index', collections.Counter(i['choices'].index(i['correct_answer']) for i in b))
pw = [i for i in b if i['domain'] == 'Production of Writing']
print('PoW subskills', collections.Counter(i['subskill'] for i in pw))
print('PoW key openings', collections.Counter(i['correct_answer'].split(',')[0].split(' ')[0] for i in pw if i['choices'][0] != 'No Change' and not i['correct_answer'].startswith('Point')))
cs = collections.Counter(i['subskill'] for i in b if 'splice' in i['subskill'] or 'fused' in i['subskill'])
print('boundary casts:')
for i in b:
    if 'splice' in i['subskill'] or 'fused' in i['subskill']:
        print('  ', i['id'], '| key:', i['correct_answer'], '| opts:', [c for c in i['choices'] if c != i['correct_answer']])
