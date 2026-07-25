/**
 * TOEFL score reporting after the January 21 2026 format change.
 *
 * ETS retired the 0–30 per-section / 0–120 total scale in favour of
 * BANDS 1–6 in 0.5 increments per section, with the overall score being
 * the mean of the four section bands rounded to the nearest half band.
 *
 * The only officially published mapping is ETS's CEFR concordance from
 * the LEGACY 0–30 section scale to the new bands. It is reproduced
 * verbatim below for Speaking. There is NO published table converting a
 * raw 0–55 (or any raw item count) to a band, so nothing here invents
 * one — anything derived from raw counts must be labelled an estimate.
 */

export type ToeflBand = 1 | 1.5 | 2 | 2.5 | 3 | 3.5 | 4 | 4.5 | 5 | 5.5 | 6

/** Verified ETS concordance: legacy Speaking 0–30 → new 1–6 band. */
const SPEAKING_CONCORDANCE: Array<{ min: number; max: number; band: ToeflBand }> = [
  { min: 27, max: 30, band: 6 },
  { min: 25, max: 26, band: 5 },
  { min: 23, max: 24, band: 4.5 },
  { min: 20, max: 22, band: 4 },
  { min: 18, max: 19, band: 3.5 },
  { min: 16, max: 17, band: 3 },
  { min: 13, max: 15, band: 2.5 },
  { min: 10, max: 12, band: 2 },
  { min: 5, max: 9, band: 1.5 },
  { min: 0, max: 4, band: 1 },
]

/** Legacy 0–30 Speaking score → new 1–6 band (official concordance). */
export function speakingLegacyScoreToBand(scaled0to30: number): ToeflBand {
  const s = Math.max(0, Math.min(30, Math.round(scaled0to30)))
  for (const row of SPEAKING_CONCORDANCE) {
    if (s >= row.min && s <= row.max) return row.band
  }
  return 1
}

/** Round any band-like number to the nearest half band inside 1–6. */
export function roundToHalfBand(value: number): ToeflBand {
  const clamped = Math.max(1, Math.min(6, value))
  return (Math.round(clamped * 2) / 2) as ToeflBand
}

/**
 * Overall TOEFL score = mean of the four section bands, rounded to the
 * nearest half band. Returns null until all provided sections are
 * present — a partial mean is not an overall score.
 */
export function overallBandFromSections(sectionBands: number[]): ToeflBand | null {
  if (sectionBands.length === 0) return null
  const mean = sectionBands.reduce((a, b) => a + b, 0) / sectionBands.length
  return roundToHalfBand(mean)
}
