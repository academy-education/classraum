P = {
'pa.py': [
 ("Yes, because it explains why rival publishers began launching cheap series of their own.", "Yes, because it explains why rivals copied Penguin."),
 ("Yes, because it offers a third explanation for how the octopus senses what is around it.", "Yes, because it offers a third way the octopus senses things."),
 ("Yes, because it shows how the octopus's eyes detect the colors that its skin then reproduces.", "Yes, because it shows how the octopus's eyes detect color."),
],
'pb.py': [
 ("Deleted, because paragraph 3 shows that the narrator often needed several tries to cut one key.", "Deleted, because paragraph 3 shows that many keys took several tries."),
 ("No, because it focuses on Mr. Delgado's habit of handing back failed keys without speaking.", "No, because it focuses on Mr. Delgado's silent teaching."),
 ('"performed only one marvel"', '"did one wonder"'),
],
'pc.py': [
 ('"acquitted"], key="released"', '"saved"], key="released"'),
],
'pd.py': [
 ("No, because it suggests that adults cannot learn to swim as well as children can.", "No, because it says adults learn more slowly than children."),
 ('"impatience", "authority"', '"impatience", "haste"'),
],
'pe.py': [
 ('"Meanwhile,"], key="Thus,"', '"Next,"], key="Thus,"'),
],
}
for f, pairs in P.items():
    s = open(f).read()
    for a, b in pairs:
        assert s.count(a) >= 1, (f, a); s = s.replace(a, b)
    open(f, 'w').write(s)
print('patched')
