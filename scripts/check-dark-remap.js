#!/usr/bin/env node
/**
 * check-dark-remap — report light-scheme Tailwind utilities used under
 * src/app/mobile that have no `.dark .<class>` override in globals.css.
 *
 * The mobile dark theme is an unlayered utility remap in globals.css;
 * any NEW gray/white utility added to a mobile surface silently renders
 * with light-scheme colors in dark mode. This script diffs usage
 * against the remap so gaps show up in review instead of on devices.
 *
 * Report-only (exit 0): some utilities are intentionally unmapped
 * (white-alpha glass overlays on gradient cards, semantic colors).
 * Add those to ALLOWLIST as they're confirmed intentional.
 *
 * Usage: node scripts/check-dark-remap.js
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const GLOBALS = path.join(ROOT, 'src/app/globals.css')
const SCAN_DIR = path.join(ROOT, 'src/app/mobile')

// Utility families that render near-invisible or glaring when the
// dark remap misses them, optionally under a hover:/group-hover:/
// active: state prefix (a hover that isn't remapped flashes a
// light-scheme colour on hover in dark mode). Everything else
// (primary, semantic colors) is theme-safe by design.
const BASE = 'bg-white(\\/\\d+)?|bg-gray-\\d+(\\/\\d+)?|text-gray-\\d+|ring-gray-\\d+(\\/\\d+)?|border-gray-\\d+(\\/\\d+)?|divide-gray-\\d+(\\/\\d+)?|from-white(\\/\\d+)?|via-white(\\/\\d+)?|to-white(\\/\\d+)?|from-gray-\\d+|via-gray-\\d+|to-gray-\\d+|fill-gray-\\d+|stroke-gray-\\d+'
const WATCH = new RegExp(`^((hover|group-hover|active):)?(${BASE})$`)

// Confirmed-intentional gaps: white-alpha glass on gradient hero cards
// reads correctly on both themes (base + hover/group-hover forms).
const ALLOWLIST = new Set([
  'bg-white/10', 'bg-white/15', 'bg-white/20', 'bg-white/25', 'bg-white/30',
  'hover:bg-white/25', 'hover:bg-white/30', 'group-hover:bg-white/25',
  'group-hover:text-white',
  // League obsidian tier gradient — deliberately dark in both themes.
  'from-gray-700', 'via-gray-500', 'to-gray-900',
])

function cssEscapeToClass(sel) {
  // ".dark .hover\:bg-white\/85:hover" → "hover:bg-white/85"
  return sel.replace(/\\/g, '')
}

const css = fs.readFileSync(GLOBALS, 'utf8')
const remapped = new Set()
// Grab the full selector-tail (may include escaped `\:` / `\/` and a
// trailing state pseudo like `:hover`), strip the CSS backslashes,
// then drop the trailing pseudo so `.dark .hover\:bg-gray-50:hover`
// registers the Tailwind class `hover:bg-gray-50`.
for (const m of css.matchAll(/\.dark\s+\.([A-Za-z0-9\\/_.:-]+)/g)) {
  const cls = cssEscapeToClass(m[1]).replace(/:(hover|focus|active|focus-visible)$/, '')
  remapped.add(cls)
}

const used = new Map() // class → [files]
function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) { scan(p); continue }
    if (!/\.(tsx|ts)$/.test(entry.name)) continue
    const src = fs.readFileSync(p, 'utf8')
    // Tokenize anything class-like, including a state prefix.
    for (const m of src.matchAll(/(?:(?:hover|group-hover|active):)?[a-z][a-z0-9/-]+/g)) {
      const token = m[0]
      if (!WATCH.test(token)) continue
      if (ALLOWLIST.has(token) || remapped.has(token)) continue
      if (!used.has(token)) used.set(token, [])
      const files = used.get(token)
      const rel = path.relative(ROOT, p)
      if (!files.includes(rel) && files.length < 5) files.push(rel)
    }
  }
}
scan(SCAN_DIR)
// Shared mobile chrome (header, bottom nav, desktop sidebar) also
// renders under the dark /mobile surfaces.
scan(path.join(ROOT, 'src/components/ui/mobile'))

if (used.size === 0) {
  console.log('✓ dark remap covers every watched utility under src/app/mobile')
  process.exit(0)
}

console.log(`⚠ ${used.size} utilit${used.size === 1 ? 'y' : 'ies'} used in src/app/mobile with no .dark override in globals.css:\n`)
for (const [cls, files] of [...used.entries()].sort()) {
  console.log(`  ${cls}`)
  for (const f of files) console.log(`      ${f}`)
}
console.log('\nAdd a `.dark .<class>` rule to globals.css, or add to ALLOWLIST if intentional.')
process.exit(0)
