/**
 * Human label for a test-scoped exam-pass credit pool. Shared by the
 * subscription page (credit chips + held-pass card) and the test
 * customization sheet (Pass/Regular credit toggle) so the wording stays
 * in lockstep. `test` is the pool key: 'sat' | 'toefl' | '*' (all-access)
 * | any other test family.
 */
export function passCreditLabel(test: string | null, ko: boolean): string {
  if (test === 'sat') return ko ? 'SAT 패스' : 'SAT Pass'
  if (test === 'toefl') return ko ? 'TOEFL 패스' : 'TOEFL Pass'
  if (test === '*') return ko ? '수능 패스' : 'All-Access Pass'
  if (!test) return ko ? '패스 크레딧' : 'Pass credit'
  return `${test.toUpperCase()} ${ko ? '패스' : 'Pass'}`
}
