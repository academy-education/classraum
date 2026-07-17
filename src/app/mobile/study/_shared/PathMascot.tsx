"use client"

import { memo, useEffect, useId } from 'react'
import { useRive, useStateMachineInput } from '@rive-app/react-canvas'

/**
 * PathMascot — "Raumi", the Classraum learning companion.
 *
 * Renders the professional, commissioned Rive character when its asset
 * is present, and falls back to the inline-SVG Raumi (RaumiSvg) until
 * then. Discrete emotional states drive expression + motion in both:
 *
 *   'idle'       — gentle float, periodic blink, soft eye-glow pulse
 *   'thinking'   — head tilt + a faint scan sweep, rising idea dots
 *   'celebrate'  — spring hop, raised arm, sparkle burst
 *   'sad'        — slow droop, dimmed visor, downturned eyes
 *   'loading'    — grabs his head, spins it, catches it; glitchy visor,
 *                  puzzled recovery. Meant for LONG waits (~90s test
 *                  generation) — short waits should use 'thinking'.
 *   'locked'     — polite gatekeeper: raised hand wags "no-no" while the
 *                  head shakes, narrowed eyes; long calm hold between
 *                  beats so it stays friendly, not scolding.
 *
 * RaumiSvg style: "soft-flat" — flat colour blocking with a controlled
 * two-tone soft shadow (not blur-mush, not a cartoon outline) and a
 * hairline tonal ring, so it reads as designed and sits native inside
 * the app's soft, rounded, borderless cards.
 *
 * ── To ship the commissioned Rive character ────────────────────────
 * 1. Drop the animator's file at `public/raumi.riv` (contract in
 *    docs/RAUMI_RIVE_SPEC.md — artboard "Raumi", state machine "State",
 *    number input "state": 0 idle · 1 thinking · 2 celebrate · 3 sad).
 * 2. Set RAUMI_RIVE_SRC below to '/raumi.riv'.
 */

/** Set to '/raumi.riv' once the commissioned file is added to /public. */
const RAUMI_RIVE_SRC: string | null = null

export type MascotState = 'idle' | 'thinking' | 'celebrate' | 'sad' | 'loading' | 'locked'

interface Props {
  state?: MascotState
  size?: number
  className?: string
}

/** state → Rive state-machine number input value. */
const STATE_INDEX: Record<MascotState, number> = { idle: 0, thinking: 1, celebrate: 2, sad: 3, loading: 4, locked: 5 }

/**
 * Memoized: hosts like TestSession re-render every second on timer
 * ticks, and the SVG tree is ~100 nodes — props are three primitives,
 * so memo skips all of that for free.
 */
export const PathMascot = memo(function PathMascot(props: Props) {
  if (!RAUMI_RIVE_SRC) return <RaumiSvg {...props} />
  return <RaumiRive src={RAUMI_RIVE_SRC} {...props} />
})

/**
 * Rive-backed Raumi. Drives the "state" state-machine input and falls
 * back to the SVG if the file fails to load. Only mounted when
 * RAUMI_RIVE_SRC is set, so its hooks never run in the SVG-only path.
 */
function RaumiRive({ src, state = 'idle', size = 72, className = '' }: Props & { src: string }) {
  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: 'State',
    artboard: 'Raumi',
    autoplay: true,
  })
  const stateInput = useStateMachineInput(rive, 'State', 'state')

  useEffect(() => {
    if (stateInput) stateInput.value = STATE_INDEX[state]
  }, [stateInput, state])

  if (rive === null) {
    return (
      <div className={className} style={{ width: size, height: size, position: 'relative' }}>
        <RiveComponent style={{ position: 'absolute', inset: 0, opacity: 0 }} />
        <RaumiSvg state={state} size={size} />
      </div>
    )
  }
  return <RiveComponent className={className} style={{ width: size, height: size }} aria-label="Raumi" role="img" />
}

// Soft-flat palette — flat shell values, cyan display, charcoal joints.
const BASE = '#EDE9E2'   // shell base (light)
const SH = '#D4CBBC'     // shell shadow (one soft step)
const HI = '#F6F3ED'     // shell highlight
const RING = '#DAD3C7'   // hairline tonal edge (like app card rings)
const NECK = '#252932'   // charcoal neck joint
const BEZEL = '#E0DACF'  // visor bezel
const STEEL = '#4E6E8E'  // chest "C"
const ACCENT = '#7FBFE0'
const EYE = '#83DAF5'
const EYE_DIM = '#6FAAC0'

/** Inline-SVG Raumi — soft-flat, the fallback until the Rive lands. */
function RaumiSvg({ state = 'idle', size = 72, className = '' }: Props) {
  const eye = state === 'sad' ? EYE_DIM : EYE
  // Unique per-instance ids so two mascots on one screen never
  // cross-wire each other's clips / filters.
  const uid = useId().replace(/:/g, '')
  const id = (k: string) => `raumi-${uid}-${k}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={`raumi raumi--${state} ${className}`}
      role="img"
      aria-label="Raumi"
    >
      <style>{CSS}</style>
      <defs>
        <clipPath id={id('h')}><rect x="25" y="6" width="50" height="47" rx="24" /></clipPath>
        <clipPath id={id('b')}><rect x="22" y="57" width="56" height="30" rx="16" /></clipPath>
        <clipPath id={id('v')}><rect x="29.5" y="16.5" width="41" height="30" rx="14.5" /></clipPath>
        {/* soft (not mushy) shading blur + a wider blur for the ground shadow */}
        <filter id={id('sf')} x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.4" /></filter>
        <filter id={id('s2')} x="-90%" y="-90%" width="280%" height="280%"><feGaussianBlur stdDeviation="3.2" /></filter>
      </defs>

      {/* Ground contact shadow */}
      <ellipse className="r-shadow" cx="50" cy="93" rx="20" ry="3.4" fill="#0b1220" opacity="0.14" filter={`url(#${id('s2')})`} />

      <g className="r-body">
        {/* Raised cheer arms (celebrate only) — behind the body so they
            emerge from the shoulders. Charcoal joint + outlined shell
            capsule + mitten hand. */}
        <g className="r-armL">
          <path d="M 33 62 Q 25 53 22 43" stroke={RING} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M 33 62 Q 25 53 22 43" stroke={BASE} strokeWidth="5.2" fill="none" strokeLinecap="round" />
          <circle cx="21.5" cy="41" r="4.3" fill={BASE} stroke={RING} strokeWidth="0.9" />
          <circle cx="33" cy="62" r="2.4" fill="#2A2E36" />
        </g>
        <g className="r-armR">
          <path d="M 67 62 Q 75 53 78 43" stroke={RING} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M 67 62 Q 75 53 78 43" stroke={BASE} strokeWidth="5.2" fill="none" strokeLinecap="round" />
          <circle cx="78.5" cy="41" r="4.3" fill={BASE} stroke={RING} strokeWidth="0.9" />
          <circle cx="67" cy="62" r="2.4" fill="#2A2E36" />
        </g>

        {/* ---- Body / shoulders ---- */}
        <rect x="22" y="57" width="56" height="30" rx="16" fill={BASE} stroke={RING} strokeWidth="0.9" />
        <g clipPath={`url(#${id('b')})`}>
          <ellipse cx="59" cy="85" rx="28" ry="17" fill={SH} filter={`url(#${id('sf')})`} />
          <ellipse cx="39" cy="62" rx="15" ry="6.5" fill={HI} filter={`url(#${id('sf')})`} />
          {/* soft cast shadow of the head/neck onto the chest (2.5D layering) */}
          <ellipse cx="50" cy="59" rx="16" ry="4.8" fill="#8C8578" opacity="0.30" filter={`url(#${id('sf')})`} />
          {/* faint cool reflected light along the bottom edge */}
          <ellipse cx="50" cy="88" rx="22" ry="4" fill="#EAEFF3" opacity="0.5" filter={`url(#${id('sf')})`} />
        </g>
        {/* Chest "C" */}
        <path d="M 53 68 A 6 6 0 1 0 53 80" fill="none" stroke={STEEL} strokeWidth="3" strokeLinecap="round" />
        <circle className="r-chip" cx="55.3" cy="65.8" r="1.7" fill={ACCENT} />

        {/* ---- Neck joint (charcoal, mechanical) ---- */}
        <rect x="41" y="49" width="18" height="13" rx="6" fill={NECK} />
        <rect x="41.6" y="49.6" width="16.8" height="4" rx="2" fill="#31363F" />
        <rect x="44.2" y="51" width="2.3" height="9" rx="1.1" fill="#3B414B" />
        <rect x="53.5" y="51" width="2.3" height="9" rx="1.1" fill="#3B414B" />

        {/* ---- Head (r-head, tilts on thinking) ---- */}
        <g className="r-head">
          {/* Ear pods — seated, subtle recessed detail (no holes) */}
          <circle cx="23" cy="32" r="5.6" fill={BASE} stroke={RING} strokeWidth="0.9" />
          <circle cx="21.8" cy="32" r="2.2" fill={SH} />
          <circle cx="77" cy="32" r="5.6" fill={BASE} stroke={RING} strokeWidth="0.9" />
          <circle className="r-earlight" cx="78.2" cy="32" r="2" fill={ACCENT} />

          {/* Head shell — flat base + soft 2-tone shading */}
          <rect x="25" y="6" width="50" height="47" rx="24" fill={BASE} stroke={RING} strokeWidth="0.9" />
          <g clipPath={`url(#${id('h')})`}>
            <ellipse cx="64" cy="50" rx="24" ry="19" fill={SH} filter={`url(#${id('sf')})`} />
            <ellipse cx="37" cy="16" rx="16" ry="10" fill={HI} filter={`url(#${id('sf')})`} />
            {/* premium top-edge sheen */}
            <ellipse cx="49" cy="9" rx="17" ry="3.4" fill="#FDFBF7" opacity="0.7" filter={`url(#${id('sf')})`} />
            {/* faint cool reflected light hugging the lower edge (2.5D form) */}
            <ellipse cx="50" cy="52" rx="20" ry="5" fill="#E8EEF3" opacity="0.42" filter={`url(#${id('sf')})`} />
          </g>

          {/* Recessed bezel + flat visor */}
          <rect x="27.6" y="14.6" width="44.8" height="33.8" rx="16" fill={BEZEL} stroke={RING} strokeWidth="0.9" />
          <rect x="29.5" y="16.5" width="41" height="30" rx="14.5" fill="#1A1E26" />
          {/* Recess + flat screen reflections + eye underglow */}
          <g clipPath={`url(#${id('v')})`}>
            {/* inner top shadow — makes the display read as recessed glass */}
            <ellipse cx="50" cy="15.5" rx="23" ry="6" fill="#000" opacity="0.32" filter={`url(#${id('sf')})`} />
            {/* the eyes softly light the lower screen */}
            <ellipse cx="50" cy="43" rx="15" ry="4.5" fill={eye} opacity="0.13" filter={`url(#${id('sf')})`} />
            <path d="M 36.5 17.5 L 43 17.5 L 36 33.5 L 29.5 33.5 Z" fill="#2C323D" />
            <path d="M 47 17.5 L 50.5 17.5 L 44 32 L 40.5 32 Z" fill="#242A34" />
          </g>

          {/* Scan sweep (thinking) — soft + faint */}
          <g clipPath={`url(#${id('v')})`}>
            <rect className="r-scan" x="28" y="17" width="6" height="29" fill={eye} opacity="0.0" filter={`url(#${id('sf')})`} />
          </g>

          {/* Subtle eye glow */}
          <ellipse className="r-glow" cx="50" cy="31" rx="15" ry="8" fill={eye} opacity="0.16" filter={`url(#${id('sf')})`} />

          {/* Eyes — expression per state, wrapped for blink */}
          <g className="r-eyes">
            {state === 'celebrate' ? (
              // big joyful smile-arc eyes
              <>
                <path d="M 38 33 Q 43 26 48 33" stroke={eye} strokeWidth="3.7" fill="none" strokeLinecap="round" />
                <path d="M 52 33 Q 57 26 62 33" stroke={eye} strokeWidth="3.7" fill="none" strokeLinecap="round" />
              </>
            ) : state === 'sad' ? (
              // downturned eyes + a small tear
              <>
                <path d="M 39 30 Q 43 36.5 47 30" stroke={eye} strokeWidth="3.6" fill="none" strokeLinecap="round" />
                <path d="M 53 30 Q 57 36.5 61 30" stroke={eye} strokeWidth="3.6" fill="none" strokeLinecap="round" />
                <circle cx="44" cy="40.5" r="1.35" fill={eye} opacity="0.8" />
              </>
            ) : state === 'thinking' ? (
              <>
                <rect x="39.5" y="29.5" width="7" height="4" rx="2" fill={eye} />
                <rect x="53.5" y="29.5" width="7" height="4" rx="2" fill={eye} />
              </>
            ) : state === 'locked' ? (
              // narrowed, composed eyes — firm but friendly gatekeeper
              <>
                <rect x="39.5" y="27" width="7" height="9" rx="3.5" fill={eye} />
                <rect x="53.5" y="27" width="7" height="9" rx="3.5" fill={eye} />
                <circle cx="41.6" cy="29.6" r="1.5" fill="#EEFCFF" />
                <circle cx="55.6" cy="29.6" r="1.5" fill="#EEFCFF" />
              </>
            ) : state === 'loading' ? (
              // calm eyes at the start; dizzy swirls during + after the spin
              <>
                <g className="r-eyeN">
                  <rect x="39.5" y="25" width="7" height="13" rx="3.5" fill={eye} />
                  <rect x="53.5" y="25" width="7" height="13" rx="3.5" fill={eye} />
                  <circle cx="41.6" cy="28.4" r="1.7" fill="#EEFCFF" />
                  <circle cx="55.6" cy="28.4" r="1.7" fill="#EEFCFF" />
                </g>
                <g className="r-eyeD">
                  <path d="M 45.4 30 C 45.8 32.2 42.4 32.6 41.8 30.6 C 41.4 29.2 43.2 28.6 44.2 29.8 C 44.7 30.4 44.2 31.4 43.4 31" stroke={eye} strokeWidth="1.7" fill="none" strokeLinecap="round" />
                  <path d="M 59.4 30 C 59.8 32.2 56.4 32.6 55.8 30.6 C 55.4 29.2 57.2 28.6 58.2 29.8 C 58.7 30.4 58.2 31.4 57.4 31" stroke={eye} strokeWidth="1.7" fill="none" strokeLinecap="round" />
                </g>
                <g className="r-eyeP">
                  {/* puzzled: one big shocked eye + one tiny squint — comically confused */}
                  <circle cx="42.6" cy="28" r="5.1" fill={eye} />
                  <circle cx="44.3" cy="26.2" r="2.1" fill="#EEFCFF" />
                  <rect x="53.4" y="33.2" width="7.2" height="2.5" rx="1.25" fill={eye} />
                </g>
              </>
            ) : (
              // idle — big, round, cute eyes with a glossy catch
              <>
                <rect x="39.5" y="25" width="7" height="13" rx="3.5" fill={eye} />
                <rect x="53.5" y="25" width="7" height="13" rx="3.5" fill={eye} />
                <circle cx="41.6" cy="28.4" r="1.7" fill="#EEFCFF" />
                <circle cx="55.6" cy="28.4" r="1.7" fill="#EEFCFF" />
                <circle cx="41" cy="35" r="0.9" fill="#EEFCFF" opacity="0.6" />
                <circle cx="55" cy="35" r="0.9" fill="#EEFCFF" opacity="0.6" />
              </>
            )}
          </g>

          {/* Idea dots (thinking) */}
          <g className="r-think">
            <circle cx="76" cy="14" r="2" fill={ACCENT} />
            <circle cx="82" cy="8" r="1.3" fill={ACCENT} />
          </g>

          {/* Loading: screen distortion — glitch bars tear across the
              visor after he gets shaken. */}
          {state === 'loading' && (
            <g clipPath={`url(#${id('v')})`}>
              <g className="r-glitch">
                <rect x="25" y="19" width="50" height="2.6" fill={eye} />
                <rect x="23" y="27" width="50" height="3.6" fill="#F26BD6" opacity="0.6" />
                <rect x="25" y="27" width="50" height="3.6" fill={eye} />
                <rect x="25" y="35" width="50" height="2" fill={eye} />
                <rect x="25" y="41" width="50" height="2.8" fill={eye} />
              </g>
              <g className="r-glitch2">
                <rect x="25" y="23" width="50" height="2.4" fill={eye} />
                <rect x="25" y="38" width="50" height="3" fill={eye} />
                <rect x="31" y="16" width="22" height="4.5" fill={eye} opacity="0.6" />
              </g>
            </g>
          )}
        </g>

        {/* Loading gag: LEFT hand grabs his head and spins it fast, the
            RIGHT hand grabs it to stop it, then he looks puzzled ("?") and
            dizzy. Arms rest DOWN at the sides; each comes up only for its
            beat, so it never reads as him crying. */}
        <g className="r-grab">
          <path d="M 34 62 Q 25 55 28 46" stroke={RING} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M 34 62 Q 25 55 28 46" stroke={BASE} strokeWidth="5.2" fill="none" strokeLinecap="round" />
          <circle cx="28" cy="45" r="4" fill={BASE} stroke={RING} strokeWidth="0.9" />
          <circle cx="34" cy="62" r="2.4" fill="#2A2E36" />
        </g>
        <g className="r-catch">
          <path d="M 66 62 Q 75 55 72 46" stroke={RING} strokeWidth="7" fill="none" strokeLinecap="round" />
          <path d="M 66 62 Q 75 55 72 46" stroke={BASE} strokeWidth="5.2" fill="none" strokeLinecap="round" />
          <circle cx="72" cy="45" r="4" fill={BASE} stroke={RING} strokeWidth="0.9" />
          <circle cx="66" cy="62" r="2.4" fill="#2A2E36" />
        </g>
        {/* aria-hidden: this decorative "?" is opacity-0 outside the
            loading gag, but screen readers still announce SVG text —
            without this, every idle mascot reads as "Raumi ?". */}
        <text aria-hidden="true" className="r-quest" x="80" y="16" fontFamily="system-ui, sans-serif" fontSize="18" fontWeight="800" fill={ACCENT} textAnchor="middle" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>?</text>

        {/* Sparkle burst (celebrate) */}
        <g className="r-sparkles" fill={ACCENT}>
          <path className="r-spark r-spark1" d="M 84 20 l 1.6 3.4 3.4 1.6 -3.4 1.6 -1.6 3.4 -1.6 -3.4 -3.4 -1.6 3.4 -1.6 z" />
          <path className="r-spark r-spark2" d="M 17 17 l 1.1 2.4 2.4 1.1 -2.4 1.1 -1.1 2.4 -1.1 -2.4 -2.4 -1.1 2.4 -1.1 z" />
          <path className="r-spark r-spark3" d="M 14 46 l 0.9 2 2 0.9 -2 0.9 -0.9 2 -0.9 -2 -2 -0.9 2 -0.9 z" />
        </g>
      </g>
    </svg>
  )
}

/* Scoped animation. Keyframe names namespaced (rk*); identical <style>
   across instances is deduped by the UA. Motion respects reduced-motion. */
const CSS = `
.raumi{overflow:visible}
.raumi *{transform-box:fill-box}
.r-body{transform-origin:50% 90%}
.r-head{transform-origin:50% 62%}
.r-eyes{transform-origin:center}
.r-armL,.r-armR,.r-sparkles,.r-think,.r-grab,.r-catch,.r-eyeN,.r-eyeD,.r-eyeP,.r-quest,.r-glitch,.r-glitch2{opacity:0}
.r-armL{transform-origin:100% 100%}
.r-armR{transform-origin:0% 100%}
.r-grab{transform-box:view-box;transform-origin:34px 62px}
.r-catch{transform-box:view-box;transform-origin:66px 62px}

@media (prefers-reduced-motion: no-preference){
  .raumi--idle .r-body{animation:rkFloat 3.6s ease-in-out infinite}
  .raumi--idle .r-shadow{animation:rkShadow 3.6s ease-in-out infinite}
  .raumi--idle .r-eyes{animation:rkBlink 4.8s ease-in-out infinite}
  .raumi--idle .r-glow,.raumi--thinking .r-glow{animation:rkGlow 3s ease-in-out infinite}
  .raumi--idle .r-earlight{animation:rkEar 2.4s ease-in-out infinite}
  .raumi--idle .r-chip{animation:rkEar 2.4s ease-in-out infinite .6s}

  .raumi--thinking .r-head{animation:rkTilt 3.2s ease-in-out infinite}
  .raumi--thinking .r-scan{animation:rkScan 1.9s cubic-bezier(.5,0,.5,1) infinite}
  .raumi--thinking .r-think{animation:rkIdea 2.6s ease-in-out infinite}
  .raumi--thinking .r-eyes{animation:rkLookT 3.2s ease-in-out infinite}

  .raumi--celebrate .r-body{animation:rkHop 1.15s cubic-bezier(.28,.9,.35,1) infinite}
  .raumi--celebrate .r-armL{opacity:1;animation:rkWaveL 1.15s ease-in-out infinite}
  .raumi--celebrate .r-armR{opacity:1;animation:rkWaveR 1.15s ease-in-out infinite}
  .raumi--celebrate .r-sparkles{opacity:1}
  .raumi--celebrate .r-spark1{animation:rkSpark 1.15s ease-in-out infinite}
  .raumi--celebrate .r-spark2{animation:rkSpark 1.15s ease-in-out infinite .18s}
  .raumi--celebrate .r-spark3{animation:rkSpark 1.15s ease-in-out infinite .34s}
  .raumi--celebrate .r-earlight,.raumi--celebrate .r-chip{animation:rkEar .6s ease-in-out infinite}
  .raumi--celebrate .r-glow{animation:rkGlow 1.15s ease-in-out infinite}

  .raumi--sad .r-body{animation:rkDroop 3.4s ease-in-out infinite}
  .raumi--sad .r-glow{animation:rkDim 3.4s ease-in-out infinite}
  .raumi--sad .r-head{animation:rkHang 3.4s ease-in-out infinite}

  /* locked: polite gatekeeper — floats like idle, then one "no-no" beat
     per loop: the raised hand wags while the head shakes, long calm
     hold after so it reads friendly, not scolding. */
  .raumi--locked .r-body{animation:rkFloat 3.6s ease-in-out infinite}
  .raumi--locked .r-shadow{animation:rkShadow 3.6s ease-in-out infinite}
  .raumi--locked .r-eyes{animation:rkBlink 4.8s ease-in-out infinite}
  .raumi--locked .r-glow{animation:rkDim 3.4s ease-in-out infinite}
  .raumi--locked .r-head{animation:rkNoNo 3.4s ease-in-out infinite}
  .raumi--locked .r-armR{opacity:1;animation:rkWagNo 3.4s ease-in-out infinite}
  .raumi--locked .r-earlight,.raumi--locked .r-chip{animation:rkEar 2.4s ease-in-out infinite}

  /* loading: grab → spin → catch on one shared 2.8s timeline. */
  .raumi--loading .r-head{transform-box:view-box;transform-origin:50px 30px;animation:rkHead 2.7s linear infinite}
  .raumi--loading .r-grab{opacity:1;animation:rkGrab 2.7s ease-in-out infinite}
  .raumi--loading .r-catch{opacity:1;animation:rkCatch 2.7s ease-in-out infinite}
  .raumi--loading .r-eyeN{animation:rkEyeN 2.7s ease-in-out infinite}
  .raumi--loading .r-eyeD{animation:rkEyeD 2.7s ease-in-out infinite}
  .raumi--loading .r-eyeP{animation:rkEyeP 2.7s ease-in-out infinite}
  .raumi--loading .r-quest{animation:rkQuest 2.7s ease-in-out infinite}
  .raumi--loading .r-glitch{animation:rkGlitch 2.7s ease-in-out infinite}
  .raumi--loading .r-glitch2{animation:rkGlitch2 2.7s ease-in-out infinite}
  .raumi--loading .r-body{animation:rkWob 2.7s ease-in-out infinite}
  .raumi--loading .r-earlight,.raumi--loading .r-chip{animation:rkEar 1.1s ease-in-out infinite}
}

@keyframes rkFloat{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-2.6px) scale(1.015)}}
@keyframes rkShadow{0%,100%{transform:scaleX(1);opacity:.14}50%{transform:scaleX(.82);opacity:.09}}
@keyframes rkBlink{0%,90%,100%{transform:scaleY(1)}94%{transform:scaleY(.08)}}
@keyframes rkGlow{0%,100%{opacity:.14}50%{opacity:.30}}
@keyframes rkEar{0%,100%{opacity:.5}50%{opacity:1}}
@keyframes rkTilt{0%,100%{transform:rotate(0deg)}30%{transform:rotate(-6deg)}70%{transform:rotate(-3deg)}}
@keyframes rkScan{0%{transform:translateX(0);opacity:0}25%{opacity:.42}75%{opacity:.42}100%{transform:translateX(30px);opacity:0}}
@keyframes rkIdea{0%,100%{opacity:0;transform:translateY(3px)}40%,70%{opacity:1;transform:translateY(0)}}
@keyframes rkHop{0%,100%{transform:translateY(0)}18%{transform:translateY(0) scaleY(.94)}45%{transform:translateY(-8px) scaleY(1.03)}70%{transform:translateY(0)}}
@keyframes rkWaveL{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(6deg)}}
@keyframes rkWaveR{0%,100%{transform:rotate(8deg)}50%{transform:rotate(-6deg)}}
@keyframes rkSpark{0%{opacity:0;transform:scale(.2)}45%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.4)}}
@keyframes rkDroop{0%,100%{transform:translateY(0)}50%{transform:translateY(2px)}}
@keyframes rkDim{0%,100%{opacity:.14}50%{opacity:.26}}
/* thinking: eyes drift side to side, like scanning a problem. */
@keyframes rkLookT{0%,100%{transform:translateX(0)}30%{transform:translateX(2.2px)}70%{transform:translateX(-2.2px)}}
/* sad: head hangs a little, in phase with the body droop. */
@keyframes rkHang{0%,100%{transform:rotate(0deg)}50%{transform:rotate(-3.5deg) translateY(1px)}}
/* locked: one head-shake "no" beat per loop, still the rest of the time. */
@keyframes rkNoNo{
  0%,40%{transform:rotate(0deg)}
  48%{transform:rotate(-6deg)}
  56%{transform:rotate(5deg)}
  64%{transform:rotate(-3.5deg)}
  72%,100%{transform:rotate(0deg)}
}
/* locked: raised hand wags in counter-phase with the head shake, easing
   back to a gentle resting tilt during the calm hold. */
@keyframes rkWagNo{
  0%,40%{transform:rotate(9deg)}
  48%{transform:rotate(-13deg)}
  56%{transform:rotate(11deg)}
  64%{transform:rotate(-9deg)}
  72%{transform:rotate(5deg)}
  100%{transform:rotate(9deg)}
}
/* grab → spin → catch. HORIZONTAL spin: scaleX through 0 (edge-on) to -1
   (mirror) = a half turn about the vertical axis. Keyframe gaps widen over
   time so the spin DECELERATES like it has real angular momentum, then
   snaps to front (scaleX 1) as the other arm catches it. Head also lifts
   off the neck while it whirls. */
/* head: still until gripped (~14%) → fast horizontal spin → snaps to a
   stop when the right hand grabs it (61%) → woozy dizzy sway (puzzled). */
@keyframes rkHead{
  /* dead still through the grip + wind-up; kicks into the spin only on
     the flick STRIKE (~18%), so the arm visibly starts it. */
  0%,18%{transform:translateY(0) scaleX(1) rotate(0deg)}
  21%{transform:translateY(-3px) scaleX(-1) rotate(0deg)}
  25%{transform:translateY(-4px) scaleX(1) rotate(0deg)}
  29%{transform:translateY(-4px) scaleX(-1) rotate(0deg)}
  33%{transform:translateY(-4px) scaleX(1) rotate(0deg)}
  38%{transform:translateY(-4px) scaleX(-1) rotate(0deg)}
  43%{transform:translateY(-4px) scaleX(1) rotate(0deg)}
  49%{transform:translateY(-4px) scaleX(-1) rotate(0deg)}
  54%{transform:translateY(-3px) scaleX(1) rotate(0deg)}
  58%{transform:translateY(-2px) scaleX(-0.6) rotate(0deg)}
  61%{transform:translateY(0) scaleX(1) rotate(0deg)}
  67%{transform:translateY(0) scaleX(1) rotate(7deg)}
  75%{transform:translateY(0) scaleX(1) rotate(-4.5deg)}
  83%{transform:translateY(0) scaleX(1) rotate(2.8deg)}
  91%{transform:translateY(0) scaleX(1) rotate(-1.4deg)}
  100%{transform:translateY(0) scaleX(1) rotate(0deg)}
}
/* LEFT arm: rests down → swings up, grips, winds back, then a sharp FLICK
   strike at ~17% that kicks the head into its spin → back down. */
@keyframes rkGrab{
  0%{transform:rotate(118deg)}
  6%{transform:rotate(14deg)}
  10%{transform:rotate(-4deg)}
  13%{transform:rotate(8deg)}
  16%{transform:rotate(-30deg)}
  20%{transform:rotate(0deg)}
  27%,100%{transform:rotate(118deg)}
}
/* RIGHT arm: rests down → swings up to grab + STOP the spinning head → back down. */
@keyframes rkCatch{
  0%,52%{transform:rotate(-118deg)}
  58%{transform:rotate(-20deg)}
  61%{transform:rotate(-2deg)}
  66%{transform:rotate(-7deg)}
  74%,100%{transform:rotate(-118deg)}
}
/* eyes: calm → dizzy swirls during the spin → PUZZLED (one open, one
   squinting) once he is stopped. */
@keyframes rkEyeN{0%,13%{opacity:1}17%{opacity:0}95%{opacity:0}99%,100%{opacity:1}}
@keyframes rkEyeD{0%,16%{opacity:0}20%{opacity:1}59%{opacity:1}64%{opacity:0}100%{opacity:0}}
@keyframes rkEyeP{0%,61%{opacity:0}66%{opacity:1}93%{opacity:1}97%{opacity:0}100%{opacity:0}}
/* screen distortion after the shake: bars tear sideways. Pulses are kept
   to ~3 per loop with soft fades (no hard on/off cuts) so the flicker
   stays under the WCAG 2.3.1 three-flashes-per-second threshold. */
@keyframes rkGlitch{
  0%,60%{opacity:0;transform:translateX(0)}
  64%{opacity:.8;transform:translateX(-4px)}
  68%{opacity:.15;transform:translateX(3px)}
  73%{opacity:.65;transform:translateX(3.5px)}
  79%{opacity:.1;transform:translateX(-2px)}
  85%{opacity:.35;transform:translateX(1.5px)}
  91%,100%{opacity:0;transform:translateX(0)}
}
/* second glitch layer drifts VERTICALLY, out of phase → tearing feel. */
@keyframes rkGlitch2{
  0%,61%{opacity:0;transform:translateY(0)}
  65%{opacity:.7;transform:translateY(-5px)}
  70%{opacity:.1;transform:translateY(4px)}
  76%{opacity:.5;transform:translateY(-3px)}
  82%{opacity:.08;transform:translateY(2px)}
  88%,100%{opacity:0;transform:translateY(0)}
}
/* a "?" pops in once he is stopped and puzzled; body wobbles woozily. */
@keyframes rkQuest{
  0%,60%{opacity:0;transform:translateY(3px) rotate(0deg) scale(.6)}
  66%{opacity:1;transform:translateY(-1px) rotate(-12deg) scale(1.05)}
  74%{transform:translateY(0) rotate(9deg) scale(1)}
  82%{transform:translateY(-1px) rotate(-6deg) scale(1)}
  90%{opacity:1;transform:translateY(0) rotate(3deg) scale(1)}
  96%,100%{opacity:0;transform:translateY(3px) rotate(0deg) scale(.6)}
}
@keyframes rkWob{0%,60%{transform:rotate(0deg)}72%{transform:rotate(-1.6deg)}84%{transform:rotate(1.2deg)}100%{transform:rotate(0deg)}}
`
