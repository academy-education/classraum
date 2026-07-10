# Raumi — Rive character spec

This is the brief for the commissioned **Raumi** mascot. The app is
already wired to consume it; delivering a `.riv` that meets this
contract makes it appear everywhere with **zero code changes**.

## What the app expects

| Thing | Value |
|---|---|
| File | `public/raumi.riv` |
| Artboard | `Raumi` |
| State machine | `State` |
| Input | a **Number** input named `state` |

The app sets `state` to one of these values; the state machine must
route to the matching animation:

| `state` | Meaning | Motion |
|---|---|---|
| `0` | **idle** (default) | calm breathing/float, occasional blink, soft eye-glow pulse |
| `1` | **thinking** | mid-session; head tilt, "processing" cue (scan / thought dots), looks engaged |
| `2` | **celebrate** | node/goal completed; a joyful hop or arm-raise, sparkle, bright eyes |
| `3` | **sad** | streak loss / wrong answer; brief, gentle — droop + dimmer, **not** distressing |

Transitions between states should be smooth (blend), and `idle` is the
resting loop everything returns to.

## Character direction

Match the existing **Raumi** reference sheet:

- Friendly bipedal-ish robot; **off-white matte shell**, **charcoal
  joints**, **cyan glowing eyes** on a **glossy dark visor**, a **"C"
  chest mark**, side **ear/audio discs**.
- Warm, calm, trustworthy — a study companion, not hyperactive.
- Reads clearly at small sizes (renders as small as ~28 px) — keep the
  silhouette bold and the face legible; avoid fine detail that muddies
  when scaled down.
- Palette anchor: shell `#EEEBE5`, charcoal `#191C22`, eyes `#8FE3FF`,
  chest steel `#4A6785`, accent `#7FBFE0`. App primary is `#2885E8`.

## Rendering / sizing

- The runtime scales the artboard to a square box (`size × size`),
  default 72 px. Design the artboard **square**, character centered,
  with a little headroom so the celebrate hop isn't clipped.
- Keep it lightweight (target well under ~300 KB) — it loads on the
  study landing and in toasts.
- Transparent background.

## How it's wired (for reference)

`src/app/mobile/study/_shared/PathMascot.tsx`:
- Renders `RaumiSvg` (inline-SVG fallback) while `RAUMI_RIVE_SRC` is
  `null`.
- Set `RAUMI_RIVE_SRC = '/raumi.riv'` to switch to the Rive character.
- Runtime: `@rive-app/react-canvas`, driving `State` → number input
  `state` via `STATE_INDEX` (`idle:0, thinking:1, celebrate:2, sad:3`).
- If the file fails to load, it falls back to the SVG automatically.

## Producing the file

Options to actually create it:
- A motion designer builds + rigs it in the **Rive editor**
  (rive.app) and exports the `.riv`.
- Or commission via Rive's community / a freelancer, handing them this
  page as the spec.

Deliverable: `raumi.riv` implementing the artboard / state machine /
input above.
