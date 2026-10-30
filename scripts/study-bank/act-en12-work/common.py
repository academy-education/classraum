# ACT English v12 builder helpers (copied from act-en11-work/common.py) (the v10 builder's mk(), plus guards v10 lacked:
# word count, one item per quoted sentence, X/Y mix per passage).
import re
NC = "No Change"
CSE, PoW, KoL = "Conventions of Standard English", "Production of Writing", "Knowledge of Language"
OUT = []
MIX = {'X': {CSE: 5, PoW: 3, KoL: 2}, 'Y': {CSE: 6, PoW: 3, KoL: 1}}

def para_of(passage, sent):
    for m in re.finditer(r'\[(\d+)\] ([^\[]*(?:\[[A-D]\][^\[]*)*)', passage):
        if sent in m.group(2): return int(m.group(1))
    raise SystemExit(f"sentence not found: {sent!r}")

def words(passage):
    t = re.sub(r'\[(\d+|[A-D])\]', ' ', passage)
    return len(t.split())

def mk(P, title, typ, passage, items):
    w = words(passage)
    assert 300 <= w <= 380, (P, w)
    assert len(items) == 10, (P, len(items))
    seen = set()
    for n, it in enumerate(items, 1):
        kind = it['kind']
        if kind == 'edit':
            sent, span = it['sent'], it['span']
            assert passage.count(sent) == 1, (P, n, sent)
            assert sent.count(span) == 1, (P, n, span, sent)
            assert sent not in seen, (P, n, 'sentence reused', sent)
            seen.add(sent)
            pn = para_of(passage, sent)
            prompt = f'In paragraph {pn}, in the sentence "{sent}" {it["ask"]} in place of "{span}"?'
            choices = [NC] + it['opts'] if it.get('nc', True) else it['opts']
        else:
            prompt = it['prompt']; choices = it['opts']
            for q in it.get('must', []): assert q in passage, (P, n, q)
        key = it['key']
        assert key in choices, (P, n, key, choices)
        assert len(set(choices)) == 4, (P, n, choices)
        OUT.append(dict(id=f"ACT-EN12-P{P}-Q{n:02d}", passage_id=f"P{P}", passage_title=title, passage=passage,
                        prompt=prompt, choices=choices, correct_answer=key, explanation=it['exp'],
                        domain=it['domain'], subskill=it['sub'], difficulty=it['diff'], _type=typ))
    got = {}
    for it in OUT[-10:]: got[it['domain']] = got.get(it['domain'], 0) + 1
    assert got == MIX[typ], (P, typ, got)
