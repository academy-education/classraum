import {
  OPEN_RESPONSE_TYPES, RESPONSE_SKILL_BY_TYPE,
} from '@/lib/study/openResponse'
import { getRubric, inferSpeakingTaskType } from '@/lib/study/responseRubrics'

/**
 * OPEN_RESPONSE_TYPES is derived from RESPONSE_SKILL_BY_TYPE, so the two
 * cannot disagree and asserting that they agree would prove nothing. What
 * is still falsifiable is the other end: whether each mapped type actually
 * resolves to a rubric. A skill/taskType pair with no rubric throws inside
 * gradeAndPersistResponse, and the batch reports it as a generic per-item
 * failure — the student sees "grading failed" for a configuration typo.
 *
 * Verified by mutation, not assumed. Note that "a rubric came back" is a
 * weaker claim than it reads: deleting the `toefl_writing_email` VARIANT
 * leaves the per-type checks green, because getRubric falls back to the
 * `toefl_writing` base and the email task is then graded on the discussion
 * criteria in silence. Only the total absence of a rubric turns those red.
 * The last case is what actually pins the variant, so keep it.
 */
describe('open-response rubric resolution', () => {
  it('covers every gradeable type', () => {
    // Guards the derivation itself: an empty map would satisfy every
    // per-type assertion below by vacuous truth.
    expect([...OPEN_RESPONSE_TYPES].sort())
      .toEqual(['speaking_interview', 'writing_discussion', 'writing_email'])
  })

  it.each(Object.entries(RESPONSE_SKILL_BY_TYPE))(
    'resolves a scored rubric for %s',
    (type, skill) => {
      const taskType = skill === 'speaking'
        ? inferSpeakingTaskType(type)
        : type === 'writing_email' ? 'email' : 'academic_discussion'
      const rubric = getRubric('toefl', skill, taskType)
      expect(rubric.criteria.length).toBeGreaterThan(0)
      expect(rubric.scaleMax).toBeGreaterThan(0)
    },
  )

  it('grades the email task on its own criteria, not the discussion rubric', () => {
    // Closes the gap named above. If the email variant is ever removed,
    // getRubric falls through to the shared writing base and this is the
    // only assertion that notices.
    const email = getRubric('toefl', 'writing', 'email')
    const discussion = getRubric('toefl', 'writing', 'academic_discussion')
    expect(email.criteria.map(c => c.key)).not.toEqual(discussion.criteria.map(c => c.key))
  })
})
