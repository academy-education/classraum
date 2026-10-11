/**
 * The [full-test-v1] payload the assemble route cached for a REAL SSAT
 * Writing session on 2026-10-11 (study_messages, session 3b4024f8), copied
 * field-for-field except a shortened `explanation`. It carries the keys the
 * submit schema does NOT declare (domain, subskill, topic_tag, word_count,
 * listeningTask, readingTask) and the empty-string key and empty arrays a
 * hand-written fixture tends to tidy away — which is the point: the essay
 * submit has to survive the shape production actually serves, not the
 * shape a test author imagines.
 */
export const SSAT_WRITING_SERVED_2026_10_11 = {
  "title": "SSAT — Writing",
  "timeLimitMinutes": 25,
  "section": "Writing",
  "family": "ssat",
  "questions": [
    {
      "passage": "[Essay]\nWhen a school team or club has more people who want to join than it has places, some believe places should go to those with the most ability, so the group can do its best work. Others believe anyone willing to work hard should be allowed to take part, even if the group's results suffer. Which approach should a school choose? Support your position with specific examples from your own experience, your reading, or your observation.\n\n[Story Starter]\nWrite a story that begins with the following sentence: \"The vending machine gave back more money than I had put in, and the next day it did it again.\"",
      "passageGroupId": null,
      "prompt": "Choose ONE of the two prompts below and write your response. You have 25 minutes.",
      "type": "essay_choice",
      "choices": [],
      "correct_answer": "",
      "correct_answers": null,
      "acceptable_answers": null,
      "difficulty": "medium",
      "explanation": "A strong response engages with the cost of its own position.",
      "distractor_rationales": [],
      "blanks": null,
      "graphic": null,
      "domain": null,
      "subskill": null,
      "topic_tag": null,
      "word_count": null,
      "listeningTask": null,
      "readingTask": null,
      "scored": null,
      "bankItemId": "1c891f4a-d678-4da3-9573-8231c6b00fd6"
    }
  ],
  "composition": {
    "Writing": 1
  }
}
