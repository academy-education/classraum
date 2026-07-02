"use client"

/**
 * PathMascot — a friendly SVG character that sits next to the active
 * node on the StudyPath. The character has discrete emotional states
 * (Duolingo pattern) so we can grow expression from a small primitive:
 *
 *   'idle'       — default, gentle floating animation
 *   'thinking'   — user is mid-session, subtle head-tilt
 *   'celebrate'  — hop + arm raise on node completion
 *   'sad'        — brief on streak loss / wrong answer
 *
 * MVP: SVG-only, two states rendered. Real character illustration
 * comes next (Rive/Lottie or a designer illustration), but the API
 * lets us swap the visual without touching call sites.
 *
 * The mascot is deliberately abstract — a smiling teardrop/blob —
 * so it reads well in both English and Korean-market contexts without
 * committing to a specific animal/species mascot until we've user-
 * tested a few candidates.
 */

export type MascotState = 'idle' | 'thinking' | 'celebrate' | 'sad'

interface Props {
  state?: MascotState
  size?: number
  className?: string
}

export function PathMascot({ state = 'idle', size = 72, className = '' }: Props) {
  // Base body path is shared; expression + posture come from state.
  // Keep the SVG small and self-contained — this component gets
  // rendered next to every active node and inside XpToast eventually.
  const anim =
    state === 'celebrate' ? 'animate-mascot-hop' :
    state === 'sad' ? 'animate-mascot-sad' :
    'animate-mascot-idle'

  const mouth =
    state === 'celebrate' ? 'M 34 44 Q 40 52 46 44' :
    state === 'sad' ? 'M 34 48 Q 40 42 46 48' :
    state === 'thinking' ? 'M 34 46 L 46 46' :
    'M 34 46 Q 40 50 46 46'

  // Slight body tint per state so wrong-answer sad reads differently
  // from happy celebrate. Keep them in the same family — this isn't
  // supposed to feel loud.
  const bodyFill =
    state === 'celebrate' ? '#34D399' :
    state === 'sad' ? '#93C5FD' :
    '#60A5FA'

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      className={`${anim} ${className}`}
      aria-hidden
    >
      {/* Ground shadow — subtle, pulls the character to the surface */}
      <ellipse cx="40" cy="72" rx="18" ry="2.5" fill="#000" opacity="0.10" />

      {/* Body — friendly rounded shape */}
      <path
        d="M 40 12 C 22 12, 14 26, 14 42 C 14 58, 24 68, 40 68 C 56 68, 66 58, 66 42 C 66 26, 58 12, 40 12 Z"
        fill={bodyFill}
      />

      {/* Belly highlight */}
      <ellipse cx="40" cy="52" rx="15" ry="8" fill="#fff" opacity="0.20" />

      {/* Eyes — closed on celebrate for a squint of joy */}
      {state === 'celebrate' ? (
        <>
          <path d="M 30 36 Q 34 32 38 36" stroke="#0F172A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 42 36 Q 46 32 50 36" stroke="#0F172A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="33" cy="36" r="3" fill="#0F172A" />
          <circle cx="47" cy="36" r="3" fill="#0F172A" />
          {/* Eye shine */}
          <circle cx="34" cy="35" r="1" fill="#fff" />
          <circle cx="48" cy="35" r="1" fill="#fff" />
        </>
      )}

      {/* Mouth */}
      <path d={mouth} stroke="#0F172A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* Cheek blush — only in cheerful states */}
      {(state === 'idle' || state === 'celebrate') && (
        <>
          <circle cx="26" cy="44" r="2.5" fill="#F472B6" opacity="0.55" />
          <circle cx="54" cy="44" r="2.5" fill="#F472B6" opacity="0.55" />
        </>
      )}

      {/* Little raised arm on celebrate */}
      {state === 'celebrate' && (
        <path
          d="M 62 40 Q 68 30 66 22"
          stroke={bodyFill}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  )
}
