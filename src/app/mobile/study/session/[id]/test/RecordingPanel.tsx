"use client"

// Deliberately free of runtime imports. VoiceRecorder pulls in
// auth-headers -> supabase -> realtime-js, which jest cannot parse; a
// suite that reached this component through that module died at import,
// collected zero tests, and still let the run print the other suites'
// passes. Keeping the panel standalone is what makes it testable.

/**
 * The live recording view for hands-off Speaking.
 *
 * Pure and exported so its behaviour can be asserted without a
 * microphone: the browser pane blocks device capture, so a component
 * that only reveals this panel after a successful getUserMedia cannot
 * be exercised end-to-end here. Everything below is driven by props.
 */
export function RecordingPanel({ barsRef, barCount, totalSec, elapsedSec, silent, ko }: {
  barsRef?: React.RefObject<HTMLDivElement | null>
  barCount: number
  /** Auto-stop ceiling. Null means open-ended — no countdown shown. */
  totalSec: number | null
  elapsedSec: number
  silent: boolean
  ko: boolean
}) {
  // Counts DOWN, and the bar drains rather than fills: mid-answer, what
  // a student needs is how long they have left, not how long they have
  // been talking.
  const remaining = totalSec == null ? null : Math.max(0, totalSec - elapsedSec)
  const leftPct = totalSec ? Math.max(0, 100 * (remaining ?? 0) / totalSec) : 100
  const urgent = remaining != null && remaining <= 5

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={remaining == null
        ? (ko ? '녹음 중' : 'Recording')
        : (ko ? `녹음 중, ${remaining}초 남음` : `Recording, ${remaining} seconds left`)}
      className={`rounded-xl border px-3.5 py-3 transition-colors ${
        urgent ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`inline-flex items-center gap-2 text-[12.5px] font-semibold ${
          urgent ? 'text-rose-800' : 'text-emerald-800'
        }`}>
          <span className="relative inline-flex w-2.5 h-2.5">
            <span className={`absolute inset-0 rounded-full animate-ping ${
              urgent ? 'bg-rose-500' : 'bg-emerald-500'}`} />
            <span className={`relative inline-flex w-2.5 h-2.5 rounded-full ${
              urgent ? 'bg-rose-500' : 'bg-emerald-500'}`} />
          </span>
          {ko ? '녹음 중' : 'Recording'}
        </span>
        {remaining != null && (
          <span className={`text-[15px] font-bold tabular-nums tracking-tight ${
            urgent ? 'text-rose-700' : 'text-emerald-800'
          }`}>
            {ko ? `${remaining}초 남음` : `${remaining}s left`}
          </span>
        )}
      </div>

      {/* Live input level. Bar heights are written straight onto these
          elements from the animation frame — see startMeter. */}
      <div
        ref={barsRef}
        data-testid="mic-level"
        aria-hidden="true"
        className="mt-2.5 flex items-center justify-between gap-[2px] h-8"
      >
        {Array.from({ length: barCount }).map((_, i) => (
          <span
            key={i}
            className={`flex-1 h-full rounded-full origin-center ${
              urgent ? 'bg-rose-400' : 'bg-emerald-400'
            }`}
            style={{ transform: 'scaleY(0.08)' }}
          />
        ))}
      </div>

      {remaining != null && (
        <div className="mt-2 h-1 rounded-full bg-black/5 overflow-hidden">
          <div
            data-testid="time-left-bar"
            className={`h-full ${urgent ? 'bg-rose-500' : 'bg-emerald-500'}`}
            style={{ width: `${leftPct}%`, transition: 'width 250ms linear' }}
          />
        </div>
      )}

      <div className={`mt-2 text-[11px] leading-snug ${
        silent ? 'text-amber-700 font-semibold' : 'text-gray-500'
      }`}>
        {silent
          ? (ko
              ? '소리가 감지되지 않습니다 — 마이크를 확인하고 더 크게 말해 주세요.'
              : "We're not picking up any sound — check your mic and speak up.")
          : (ko
              ? '기기에 대고 또렷하게 말하세요. 시간이 끝나면 자동으로 정지됩니다.'
              : 'Speak clearly toward your device. Recording stops on its own.')}
      </div>
    </div>
  )
}
