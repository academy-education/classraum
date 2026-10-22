import json,re
S="""The small bakery on the corner sells fresh bread early every morning.
Remember to water the plants on the kitchen window.
My bike needs new brakes before the long ride.
The museum is free for students on Sundays.
Our kind neighbor lent us a tall ladder to fix the roof.
Please turn off the lights when you leave the room.
The bus was crowded, so I stood near the door.
She keeps her running shoes by the front door.
We bought warm jackets because the winter here is cold.
The pharmacy closes early on holidays, so go before noon.
I left my umbrella on the train this afternoon.
The soup tastes better with a little more salt.
He fixed the broken kitchen chair with some strong glue and tape.
Our class will visit the science center next month.
The library has a quiet room upstairs for studying.
Please write your name on every page of the test.
The park gets busy when the weather turns warm.
I usually walk to work in the morning unless it is raining.
The new phone has a much better camera than mine.
We need to buy eggs, milk, and bread for breakfast.
The doctor said I should drink a lot more water each day.
My sister painted her bedroom a light shade of green.
The concert starts at eight, so we should leave soon.
He forgot his keys and had to wait outside.
Our team practices on the field behind the school.
The furniture store will deliver the new blue sofa on Friday afternoon.
She learned to play the guitar by watching online videos.
The bridge is closed for repairs until the end of summer.
I put the leftover rice in the fridge.
The cat likes to sleep in the sunny spot by the window.
Please check the oven before you go to bed tonight.
Our room had a small balcony with a view of the sea.
We planted tomatoes, beans, and carrots in the back garden this spring.
The office printer is out of paper again.
He always brings a good book to read on very long flights.
The river near our town floods after heavy rain.
My grandmother makes the best apple pie in the family.
The meeting was moved to the large room downstairs.
Please put the dirty dishes in the sink after dinner.
The road to the lake is quiet early in the morning.
I need to return these books to the library tomorrow.
She wrote a short letter to thank her favorite teacher from school.
The farmers market opens on Saturday mornings in the square.
We heard thunder in the distance as the sky grew dark.
The elevator is broken, so please use the stairs today.
His new apartment is close to a large green park."""
L=[s.strip() for s in S.split("\n") if s.strip()]
live=json.load(open('/private/tmp/claude-501/-Users-andylee-Downloads-saas-classraum/93d95221-6d94-4948-9914-9bd6bbc5b2a4/scratchpad/repeat-live.json'))
tok=lambda s:set(re.findall(r"[a-z']+",s.lower()))
def jac(a,b): A,B=tok(a),tok(b); return len(A&B)/len(A|B)
band=lambda n:'easy' if n in(8,9) else 'medium' if n in(10,11) else 'hard' if n==12 else None
NUM=set("one two three four five six seven eight nine ten eleven twelve twenty thirty hundred first second third".split())
rows=[];bad=[]
for i,s in enumerate(L):
    n=len(s.split()); b=band(n)
    mj=max(jac(s,x) for x in live); wj=max([jac(s,x) for x in L if x!=s] or [0])
    nums=[w for w in tok(s) if w in NUM]
    probs=[]
    if not b: probs.append(f"{n} words")
    if mj>=0.6: probs.append(f"live jaccard {mj:.2f}")
    if wj>=0.6: probs.append(f"batch jaccard {wj:.2f}")
    if len(nums)>1: probs.append(f"numbers {nums}")
    if not s.endswith('.') or s.count('.')!=1: probs.append("punct")
    if probs: bad.append((s,probs)); continue
    rows.append({"type":"speaking_repeat","blanks":None,"graphic":None,"prompt":"[Listen and Repeat] Repeat the sentence you hear.","choices":[],"passage":s,"section":"speaking","difficulty":b,"explanation":"Repeat the sentence exactly as spoken.","correct_answer":s,"passageGroupId":None,"correct_answers":None,"acceptable_answers":None,"distractor_rationales":[]})
for s,p in bad: print("BAD",p,"|",s)
from collections import Counter
print(len(L),"written;",len(rows),"pass;",Counter(r['difficulty'] for r in rows), "max live jaccard",max(max(jac(r['passage'],x) for x in live) for r in rows))
json.dump(rows,open('repeat-v4.rows.json','w'),indent=1)
