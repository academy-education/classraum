/**
 * What a student reads when submitting a full test fails.
 *
 * Until 2026-10-04 the banner showed the server's error verbatim — every
 * SSAT/ISEE essay submit put "bad payload — [{"received":"essay_choice",
 * "code":"invalid_enum_value",...}]" in front of a student. Server strings
 * are for logs. The student needs three things: that their answers are
 * safe, whether trying again can help, and what to do if it cannot.
 *
 * Answers live in localStorage until a submit SUCCEEDS, so every message
 * may truthfully say they are saved.
 */
export type SubmitFailureKind = 'auth' | 'rate_limit' | 'not_found' | 'rejected' | 'server' | 'network'

export interface SubmitFailure {
  kind: SubmitFailureKind
  /** Human, localised. Never contains server internals. */
  message: string
  /** Raw server detail for console / support — never rendered. */
  detail: string
}

export function classifySubmitStatus(status: number | null): SubmitFailureKind {
  if (status == null) return 'network'
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate_limit'
  if (status === 404) return 'not_found'
  if (status >= 500) return 'server'
  return 'rejected'
}

const COPY: Record<SubmitFailureKind, { en: string; ko: string }> = {
  network: {
    en: 'We couldn’t reach the server. Your answers are saved on this device — check your connection and tap Try again.',
    ko: '서버에 연결하지 못했어요. 답안은 이 기기에 저장되어 있어요. 인터넷 연결을 확인하고 다시 시도해 주세요.',
  },
  server: {
    en: 'The server couldn’t save your test just now. Your answers are saved on this device — tap Try again in a moment.',
    ko: '지금 서버가 시험을 저장하지 못했어요. 답안은 이 기기에 저장되어 있으니 잠시 후 다시 시도해 주세요.',
  },
  rate_limit: {
    en: 'Too many submit attempts in a row. Your answers are saved — wait a minute, then tap Try again.',
    ko: '제출 시도가 너무 많았어요. 답안은 저장되어 있으니 1분 후에 다시 시도해 주세요.',
  },
  auth: {
    en: 'Your sign-in has expired. Your answers are saved on this device — sign in again, reopen this test, and submit.',
    ko: '로그인이 만료됐어요. 답안은 이 기기에 저장되어 있어요. 다시 로그인한 뒤 이 시험을 열어 제출해 주세요.',
  },
  not_found: {
    en: 'We couldn’t find this test on your account. Your answers are saved on this device — please contact support.',
    ko: '계정에서 이 시험을 찾지 못했어요. 답안은 이 기기에 저장되어 있어요. 고객센터에 문의해 주세요.',
  },
  rejected: {
    en: 'Something on our side stopped this test from submitting. Your answers are saved on this device — tap Try again, and contact support if it keeps happening.',
    ko: '저희 쪽 문제로 시험을 제출하지 못했어요. 답안은 이 기기에 저장되어 있어요. 다시 시도해 보시고, 계속되면 고객센터에 문의해 주세요.',
  },
}

export function describeSubmitFailure(
  status: number | null,
  body: { error?: unknown; details?: unknown } | null,
  ko: boolean,
): SubmitFailure {
  const kind = classifySubmitStatus(status)
  const err = typeof body?.error === 'string' ? body.error : ''
  const det = typeof body?.details === 'string' ? body.details : ''
  const detail = [status == null ? 'no response' : `HTTP ${status}`, err, det].filter(Boolean).join(' — ')
  return { kind, message: ko ? COPY[kind].ko : COPY[kind].en, detail }
}
