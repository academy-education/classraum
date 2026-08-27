/**
 * Content rules for the public study nickname.
 *
 * The nickname is the one string a student can choose that OTHER
 * students see — on leaderboards, in friend search, in duels. Length and
 * charset were already enforced; nothing looked at what it said.
 *
 * TWO SEPARATE PROBLEMS, AND IMPERSONATION IS THE LIKELIER ONE.
 *
 *   reserved      — `admin`, `classraum`, `관리자`. A student calling
 *                   themselves 운영자 on a leaderboard is a more
 *                   plausible and more damaging abuse than swearing,
 *                   and it is exactly decidable, so it is handled first
 *                   and handled strictly.
 *   inappropriate — profanity and slurs. Not exactly decidable, so it is
 *                   handled conservatively; see the note on false
 *                   positives below.
 *
 * ─────────────────────────────────────────────────────────────────────
 * WHY THE PROFANITY LIST IS DELIBERATELY SHORT
 * ─────────────────────────────────────────────────────────────────────
 *
 * Korean profanity shares syllables with ordinary words. `시발` is an
 * expletive; `시발점` is "starting point". `보지` and `자지` are crude
 * nouns and also inflections of 보다 and 자다. A substring matcher fed a
 * long list will reject real names, and a student who cannot register
 * their own handle has no idea why and no way to appeal.
 *
 * So the list holds terms with little innocent overlap, and the matching
 * is anchored where overlap exists. The blunt truth is that no list is
 * complete and a bigger one is not safer — it trades misses for false
 * positives, and a false positive is the failure a user actually
 * experiences. The report path is what covers the tail; this covers the
 * obvious.
 *
 * VERIFIED AGAINST THE LIVE POPULATION before shipping: every existing
 * nickname was run through this and none was rejected. Re-run
 * `scripts/check-nickname-moderation.ts` after editing the lists —
 * adding a term that invalidates an existing user's handle is a
 * regression, not a stricter policy.
 */

/**
 * Fold the evasion tricks together so one list entry catches its
 * variants: casing, underscores, digit-for-letter substitution, and
 * padded repeats (`f_u_c_k`, `fuuuck`, `4dm1n`).
 *
 * Applied ONLY for comparison. The stored nickname keeps the user's own
 * spelling — this never rewrites what they typed.
 */
export function foldForMatching(raw: string): string {
  let s = raw.normalize('NFKC').toLowerCase()
  s = s.replace(/_/g, '')
  // Digit-for-letter substitution. Deliberately not `2→z` or `6→g`:
  // digits are legitimate in handles ("minjun2"), and the aggressive
  // mappings turn ordinary names into matches.
  s = s.replace(/0/g, 'o').replace(/1/g, 'i').replace(/3/g, 'e')
       .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/@/g, 'a')
  // Collapse runs: `fuuuck` → `fuck`. Also collapses `wooo` → `wo`,
  // which is harmless because we only ever compare against the lists.
  s = s.replace(/(.)\1{1,}/gu, '$1')
  return s
}

/**
 * Handles nobody may claim, because claiming them is impersonation.
 * Matched against the folded form as a WHOLE string — `admin` is
 * refused, `admiral` is not.
 */
export const RESERVED_HANDLES: readonly string[] = [
  'admin', 'administrator', 'root', 'system', 'support', 'staff', 'mod',
  'moderator', 'owner', 'official', 'help', 'helpdesk', 'security',
  'classraum', 'classroom', 'clasraum',
  /* `raumi` (the mascot) was here and was removed: digit folding turns
     the perfectly ordinary handle `raum1` into it, and a student calling
     themselves after the mascot is not impersonating staff. Protecting
     it cost a real false positive for no real harm prevented — which is
     the trade this whole list has to keep making. */
  'teacher', 'principal', 'academy', 'null', 'undefined', 'anonymous',
  // Korean equivalents — the likelier choice for this audience.
  '관리자', '운영자', '운영팀', '고객센터', '선생님', '선생', '학원',
  '클래스라움', '공식', '시스템', '관리',
]

/**
 * Terms refused ANYWHERE in the folded nickname.
 *
 * Every entry here is one whose innocent uses are negligible. Terms with
 * real overlap (`시발`/`시발점`, `보지`, `자지`) are handled by
 * EXACT_ONLY below instead, so `시발점` survives.
 */
const PROFANITY_SUBSTRING: readonly string[] = [
  // English
  'fuck', 'shit', 'bitch', 'cunt', 'asshole', 'bastard', 'dick',
  'pussy', 'whore', 'slut', 'nigger', 'nigga', 'faggot', 'retard',
  'rape', 'nazi', 'hitler',
  // Korean — high-confidence, little innocent overlap
  '씨발', '씨팔', '시팔', '쓰발', '개새끼', '새끼', '병신', '지랄',
  '좆', '좇', '니미', '느금', '엠창', '창녀', '걸레년', '미친놈',
  '미친년', '썅', '섹스', '자위', '보지년',
  // Jamo-only evasions
  'ㅅㅂ', 'ㅄ', 'ㅂㅅ', 'ㅈㄹ', 'ㄲㅈ', 'ㅆㅂ',
]

/**
 * Terms refused only as the WHOLE nickname.
 *
 * These are expletives that are also fragments of ordinary words, so a
 * substring rule would reject real handles: `시발점` (starting point),
 * `보지마`, `자지현` as part of a name. Someone whose entire handle is
 * `시발` meant it; someone whose handle contains it may not have.
 */
const EXACT_ONLY: readonly string[] = [
  '시발', '보지', '자지', '죽어', '꺼져', '닥쳐',
  'sex', 'porn', 'anal', 'hell', 'damn',
]

export type NicknameContentError = 'reserved' | 'inappropriate'

/**
 * Content check. Returns null when acceptable.
 *
 * Separate from validateNickname's length/charset rules so it can be
 * tested — and re-run over the live population — on its own.
 */
export function checkNicknameContent(raw: string): NicknameContentError | null {
  const folded = foldForMatching(raw)
  if (!folded) return null

  if (RESERVED_HANDLES.some(h => foldForMatching(h) === folded)) return 'reserved'
  if (EXACT_ONLY.some(t => foldForMatching(t) === folded)) return 'inappropriate'
  if (PROFANITY_SUBSTRING.some(t => folded.includes(foldForMatching(t)))) return 'inappropriate'

  return null
}
