"use client"

import { useEffect } from "react"
import Link from "next/link"
import "@/app/home.css"

// Shared design system for the marketing pages — extracted from the v4
// homepage so every page speaks the same visual language: hairline cards,
// navy headings, a single primary accent, quiet reveal-on-scroll.

export const CARD =
  "bg-white rounded-2xl ring-1 ring-gray-100/80 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_4px_12px_-4px_rgba(16,24,40,0.06)]"
export const CARD_HOVER =
  "transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_1px_2px_rgba(16,24,40,0.04),0_16px_32px_-12px_rgba(22,62,100,0.18)]"
export const UI_CARD = `${CARD} overflow-hidden`

export const NAVY = "#163e64"
export const WRAP = "max-w-[1080px] mx-auto px-6 sm:px-8"

export type TFunc = (key: string) => string | string[] | Record<string, unknown>

export function ts(t: TFunc, key: string): string {
  return String(t(key))
}

// For locale keys that are legitimately empty in one language: t() falls back
// to returning the key path itself for empty values, which must not render.
export function tOpt(t: TFunc, key: string): string {
  const value = ts(t, key)
  return value === key ? "" : value
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

// Reveal-on-scroll for elements tagged .hv4-fade
export function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll(".hv4-fade:not(.hv4-in)"))
    if (els.length === 0) return
    if (prefersReducedMotion()) {
      els.forEach((el) => el.classList.add("hv4-in"))
      return
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("hv4-in")
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.12 }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/* ── The teal accent ──────────────────────────────────────────────────
 *
 * Teal marks Classraum Study everywhere it appears. It used to be set as
 * flat #00D0AE text — an eyebrow, a highlighted headline, a bare link —
 * which on the navy night band reads as unstyled coloured text rather
 * than a decision, and on white grounds fails contrast outright.
 *
 * Three primitives replace every ad-hoc use:
 *   NightBadge  — labels/eyebrows: a lit dot in a tinted pill
 *   TEAL_TEXT   — headline highlight: mint→teal gradient, richer at size
 *   NightLink   — CTAs: a ringed pill that fills on hover
 *
 * On light grounds teal is only ever TEAL_INK (#00806c); the raw brand
 * teal is reserved for dark grounds and for fills, never for small text
 * on white. */
export const TEAL = "#00D0AE"
export const TEAL_INK = "#00806c"

export const TEAL_TEXT =
  "bg-[linear-gradient(96deg,#7BF5DF_0%,#22E0C0_42%,#00D0AE_100%)] bg-clip-text text-transparent"

export function NightBadge({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-[#00D0AE]/[0.10] ring-1 ring-[#00D0AE]/25 pl-2.5 pr-3 py-1 text-[11.5px] font-semibold tracking-[0.06em] text-[#5FE9D0] ${className}`}
    >
      <s className="w-1.5 h-1.5 rounded-full bg-[#00D0AE] no-underline shadow-[0_0_0_3px_rgba(0,208,174,0.18)]" />
      {children}
    </span>
  )
}

/* Rail marker for the timestamped sections. The time keeps its mono
 * tabular setting; the dot and hairline are what make it read as a point
 * on a timeline instead of teal text hanging in space. */
export function NightRailMark({ time, when }: { time: string; when: string }) {
  return (
    <div className="md:text-right hv4-fade">
      <span className="inline-flex items-center gap-2 md:flex-row-reverse">
        <s className="w-[7px] h-[7px] rounded-full bg-[#00D0AE] no-underline shrink-0 shadow-[0_0_0_4px_rgba(0,208,174,0.15)]" />
        <b className="font-mono text-[15px] font-semibold text-[#5FE9D0] tabular-nums">{time}</b>
      </span>
      <span className="block text-xs text-[#7e97b2] mt-1">{when}</span>
      <span className="hidden md:block h-px w-10 ml-auto mt-3 bg-gradient-to-l from-[#00D0AE]/45 to-transparent" />
    </div>
  )
}

export function NightLink({
  href,
  children,
  className = "",
}: {
  href: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center gap-2 rounded-full bg-[#00D0AE]/[0.09] ring-1 ring-[#00D0AE]/30 px-4 py-2 text-[13.5px] font-semibold text-[#5FE9D0] transition-colors duration-200 hover:bg-[#00D0AE] hover:text-[#06283f] hover:ring-[#00D0AE] ${className}`}
    >
      {children}
      <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-0.5">
        <path d="M2 7h9M7.5 3.5 11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  )
}

export function SectionHead({
  eyebrow,
  title1,
  title2,
  sub,
  align = "center",
}: {
  eyebrow?: string
  title1: string
  title2?: string
  sub?: string
  align?: "center" | "left"
}) {
  const alignCls = align === "center" ? "text-center mx-auto" : "text-left"
  return (
    <div className={`max-w-[640px] ${alignCls}`}>
      {eyebrow && <span className="text-[12.5px] font-semibold tracking-[0.08em] text-primary">{eyebrow}</span>}
      <h2 className={`hv4-fade text-[clamp(26px,3.2vw,36px)] font-bold text-[#163e64] leading-[1.16] tracking-tight ${eyebrow ? "mt-3" : ""} mb-3`}>
        {title1}
        {title2 && (
          <>
            <br />
            {title2}
          </>
        )}
      </h2>
      {sub && <p className="hv4-fade text-gray-500 leading-[1.75]">{sub}</p>}
    </div>
  )
}
