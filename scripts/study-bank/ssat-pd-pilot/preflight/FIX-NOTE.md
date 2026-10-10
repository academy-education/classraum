# How the mechanical checker matches words (read before fixing)

- Two words count as the SAME word when they share their first 5 letters (or all of the shorter word,
  if it has 4 letters): "nearly" = "near", "contemptuous" = "contents", "apprehensive" = "appreciative",
  "suggests" = "suggest", "founded" = "found". Words of 3 letters or fewer are ignored.
- **Stem rule:** a content word of a stem (4+ letters) must not appear in EXACTLY ONE choice of a
  different question about the same passage. Fix by rewording the choice (or the stem, if the stem is
  not a fixed template), so the word appears in none of that question's choices, or in two or more.
  The vocabulary stem template "As it is used in ..., the word "X" most nearly means" stays as it is;
  change the other question's choice instead.
- **Attitude words:** only these exact words count (the brief's remark about noun forms covers ONLY the
  nouns listed here): warm: admiring admiration approving approval appreciative appreciation proud pride
  respectful respect grateful gratitude sympathetic sympathy fond fondness affectionate affection
  enthusiastic enthusiasm reverent reverence tender | critical: critical disapproving disapproval scornful
  scorn contemptuous contempt indignant indignation irritated irritation resentful resentment exasperated
  exasperation disdainful disdain annoyed annoyance angry | troubled: uneasy unease worried worry
  apprehensive apprehension anxious anxiety wary wariness fearful alarmed regretful regret sad sadness
  wistful nostalgic nostalgia mournful melancholy rueful doubtful doubt skeptical skepticism uncertain
  sorrowful sorrow grief troubled | indifferent: indifferent indifference detached detachment neutral
  unconcerned impassive dispassionate uninterested | amused: amused amusement wry playful ironic bemused
  humorous mocking whimsical.
  An attitude word is "in the passage" if any passage word shares its first 5 letters (see above).
- **A1 ABSENT:** the choice is about something the passage never discusses; replace it with a lure
  built from what the passage really says (brief, lure table).
