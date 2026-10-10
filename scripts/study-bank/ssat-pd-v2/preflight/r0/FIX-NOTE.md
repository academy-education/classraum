# How the mechanical checker matches words (read before fixing)

- Two words count as the SAME word when they share their first 5 letters (or all of the shorter word,
  if it has 4 letters): "nearly" = "near", "suggests" = "suggest", "troubles" = "troubled",
  "authority" = "author". Words of 3 letters or fewer are ignored.
- **Stem rule:** a content word of a stem (4+ letters) must not appear in EXACTLY ONE choice of a
  different question about the same passage. Fix by rewording that choice (or the stem, if the stem is
  not a fixed template), so the word appears in none of that question's choices, or in two or more.
  The vocabulary stem template "As it is used in ..., the word "X" most nearly means" stays as it is;
  change the other question's choice instead. Either question named in a stem-rule PROBLEM line may be
  changed; no other question may.
- **Attitude words (v2 polarity lexicon):** only these exact words count:
  warm: admiring admiration approving approval appreciative appreciation proud pride respectful respect grateful gratitude sympathetic sympathy fond fondness affectionate affection enthusiastic enthusiasm reverent reverence tender tenderness amused amusement playful humorous whimsical delighted delight hopeful hope compassionate compassion warm warmth
  cool: critical disapproving disapproval scornful scorn contemptuous contempt indignant indignation irritated irritation resentful resentment exasperated exasperation disdainful disdain annoyed annoyance angry anger mocking uneasy unease worried worry apprehensive apprehension anxious anxiety wary wariness fearful fear alarmed alarm regretful regret sad sadness mournful melancholy rueful doubtful doubt skeptical skepticism sorrowful sorrow grief troubled bitter bitterness dismayed dismay suspicious suspicion disappointed disappointment
  A lexicon word anywhere in an attitude choice (not only the attitude word itself) is "in the passage"
  if any passage word shares its first 5 letters. Fix by rewording the choice so that no lexicon word in
  it shares 5 letters with a passage word, keeping the item's polarity balance (the key's polarity shared
  by at least one other choice; at least two choices of the opposite polarity; no neutral words).
- When you change a choice, keep: the length ratio (longest <= 1.5 x shortest), a verbatim kill quote
  for every wrong choice, the lure label rules, option parity, and the key's correctness. Do not move
  the key unless the PROBLEM requires it.
