/**
 * The native projects must declare the OS permissions the WebView needs.
 *
 * WHY THIS EXISTS. Speaking practice and the AI tutor's voice input call
 * `getUserMedia({audio:true})` inside a Capacitor WebView pointed at a REMOTE
 * origin (`capacitor.config.ts` sets `server.url`). That shipped without
 * either platform declaring a microphone permission, and nothing caught it,
 * because the web code is identical on all three targets — it works in the
 * browser preview and in `npm run dev`, and only fails on a real device.
 *
 * What the omission actually does, per platform:
 *
 *  - iOS: WebKit reaches AVFoundation, TCC finds no `NSMicrophoneUsageDescription`,
 *    and the OS TERMINATES the app. Not a denied prompt — a crash, mid-test.
 *  - Android: Capacitor's own `BridgeWebChromeClient.onPermissionRequest` maps
 *    `AUDIO_CAPTURE` to {MODIFY_AUDIO_SETTINGS, RECORD_AUDIO} and launches one
 *    multi-permission request. An UNDECLARED permission is auto-denied with no
 *    dialog, and that client's callback sets `granted` only if EVERY entry came
 *    back true. So declaring just RECORD_AUDIO still fails, and fails silently.
 *
 * Both are one-line manifest facts that no amount of TypeScript can assert, and
 * `npx cap add ios|android` regenerates these files from template — which is
 * exactly how this would come back. Hence a test, not a comment.
 */
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const INFO_PLIST = join(ROOT, 'ios/App/App/Info.plist')
const MANIFEST = join(ROOT, 'android/app/src/main/AndroidManifest.xml')

/** Every source file that asks the OS for a microphone. */
function audioCaptureCallSites(): string[] {
  const hits: string[] = []
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry)
      if (statSync(p).isDirectory()) {
        if (entry === '__tests__' || entry === 'node_modules') continue
        walk(p)
        continue
      }
      if (!/\.(ts|tsx)$/.test(entry)) continue
      const src = readFileSync(p, 'utf8')
      // The call itself, not a comment mentioning it.
      if (/mediaDevices\s*\.\s*getUserMedia\s*\(\s*\{[^}]*audio\s*:\s*true/.test(src)) {
        hits.push(p.slice(ROOT.length + 1))
      }
    }
  }
  walk(join(ROOT, 'src'))
  return hits
}

describe('native microphone permissions', () => {
  // The premise. If this ever goes to zero the app stopped recording audio and
  // the assertions below are asserting nothing — better to fail here and have
  // someone delete the file deliberately than to leave a vacuous green test.
  it('the app really does request audio capture from the WebView', () => {
    expect(audioCaptureCallSites().length).toBeGreaterThan(0)
  })

  it('iOS declares a non-empty NSMicrophoneUsageDescription', () => {
    const plist = readFileSync(INFO_PLIST, 'utf8')
    const m = plist.match(
      /<key>NSMicrophoneUsageDescription<\/key>\s*<string>([\s\S]*?)<\/string>/
    )
    expect(m).not.toBeNull()
    // App Review rejects a purpose string that does not say what it is for, and
    // an empty <string/> parses fine while still crashing the app at runtime.
    expect(m![1].trim().length).toBeGreaterThan(20)
  })

  it.each([
    'android.permission.RECORD_AUDIO',
    // Not optional: Capacitor requests it in the same batch, and its callback
    // ANDs the results. Dropping this one denies the microphone entirely.
    'android.permission.MODIFY_AUDIO_SETTINGS',
  ])('Android declares %s and does not strip it at merge', (perm) => {
    const xml = readFileSync(MANIFEST, 'utf8')
    const decl = xml.match(
      new RegExp(`<uses-permission[^>]*android:name="${perm.replace(/\./g, '\\.')}"[^>]*/?>`)
    )
    expect(decl).not.toBeNull()
    // The manifest already uses tools:node="remove" to strip storage
    // permissions a library pulled in. Declaring and then removing would read
    // as present to a grep but be absent in the merged manifest.
    expect(decl![0]).not.toContain('tools:node="remove"')
  })
})
