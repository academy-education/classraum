"use client"

import { useEffect } from "react"
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
