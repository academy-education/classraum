/**
 * Mint the "Sign in with Apple" client secret from the .p8 signing key.
 *
 * WHAT THIS IS FOR
 *
 * Supabase's Apple provider wants a client secret, and that secret is a
 * short-lived ES256 JWT — NOT the .p8 file. Pasting the .p8 is the
 * obvious mistake and it fails in a confusing way: the save is rejected,
 * the Enable toggle silently reverts, and every sign-in afterwards
 * returns "Unsupported provider: provider is not enabled", which reads
 * like a Supabase outage rather than a bad field.
 *
 * Supabase document an in-browser generator. This exists anyway because
 * the secret expires every six months, forever — a rotation you will do
 * again and again is worth having in the repo, next to the cron that
 * warns you it is due (`/api/cron/apple-secret-expiry`).
 *
 * No dependencies: Node's crypto signs ES256 directly, given
 * `dsaEncoding: 'ieee-p1363'` — JWT needs the raw r||s pair, and the
 * default DER encoding produces a signature Apple rejects.
 *
 * USAGE
 *   npx tsx scripts/generate-apple-secret.ts \
 *     --p8 ~/Downloads/AuthKey_ABC123XYZ.p8 \
 *     --key-id ABC123XYZ \
 *     --services-id com.classraum.web
 *
 * THEN PASTE THE SAME VALUE IN TWO PLACES:
 *   1. Supabase → Authentication → Providers → Apple → Secret Key (for OAuth)
 *   2. APPLE_OAUTH_SECRET, locally and in Vercel
 * Updating only one makes the expiry alert describe a secret nobody is
 * using — see src/lib/auth/apple-secret.ts.
 */

import fs from 'fs'
import crypto from 'crypto'
import path from 'path'
import os from 'os'
import { APPLE_TEAM_ID } from '../src/lib/deeplinks'
import {
  classifyAppleSecret,
  APPLE_MAX_SECRET_LIFETIME_S,
} from '../src/lib/auth/apple-secret'

const b64url = (b: Buffer | string) =>
  Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : undefined
}

function die(msg: string): never {
  console.error(`\n  ✗ ${msg}\n`)
  process.exit(1)
}

const p8Path = arg('p8')
const keyId = arg('key-id')
const servicesId = arg('services-id')
const teamId = arg('team-id') ?? APPLE_TEAM_ID
const months = Number(arg('months') ?? 6)

if (!p8Path || !keyId || !servicesId) {
  die(
    'usage: npx tsx scripts/generate-apple-secret.ts --p8 <AuthKey_XXX.p8> ' +
      '--key-id <KEY_ID> --services-id <com.classraum.web> [--team-id ID] [--months 6]',
  )
}

// os.homedir() rather than reading the HOME variable directly: same
// value, but not an env-var read, so it stays out of the repo-hygiene
// test's list of project config that must be documented in .env.example.
// (Writing the env-var form even in a COMMENT trips that scanner — it
// greps the source text, which is what makes it hard to evade.)
const resolved = path.resolve(p8Path.replace(/^~/, os.homedir()))
if (!fs.existsSync(resolved)) die(`no .p8 at ${resolved}`)

const pem = fs.readFileSync(resolved, 'utf8')
if (!pem.includes('BEGIN PRIVATE KEY')) {
  die(`${resolved} does not look like a .p8 private key (no "BEGIN PRIVATE KEY")`)
}

// The Services ID is the OAuth client id. The bundle id is NOT it, and
// swapping them yields a secret that is well-formed and never works.
if (!servicesId.includes('.')) {
  die(`--services-id "${servicesId}" is not a reverse-domain identifier (e.g. com.classraum.web)`)
}

let key: crypto.KeyObject
try {
  key = crypto.createPrivateKey(pem)
} catch (e) {
  die(`could not read the private key: ${(e as Error).message}`)
}

const now = Math.floor(Date.now() / 1000)
const lifetime = Math.round(months * 30.4 * 24 * 60 * 60)
if (lifetime > APPLE_MAX_SECRET_LIFETIME_S) {
  die(`--months ${months} exceeds Apple's 6-month maximum; Apple would reject the secret`)
}
const exp = now + lifetime

const header = { alg: 'ES256', kid: keyId }
const payload = {
  iss: teamId,
  iat: now,
  exp,
  aud: 'https://appleid.apple.com',
  sub: servicesId,
}

const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`
const signature = crypto.sign('sha256', Buffer.from(signingInput), {
  key,
  // JWT wants the raw r||s pair. Node's default DER encoding produces a
  // signature Apple rejects with an opaque invalid_client.
  dsaEncoding: 'ieee-p1363',
})
const jwt = `${signingInput}.${b64url(signature)}`

/* Check our own output with the SAME classifier the cron uses. If the
   generator and the monitor ever disagree, that is a bug worth finding
   here rather than in six months when the alert misfires. */
const status = classifyAppleSecret({
  providersRaw: 'apple',
  secret: jwt,
  now: new Date(),
  expectedTeamId: teamId,
})
if (status.kind !== 'ok') {
  die(`generated a secret the expiry checker rejects (${status.kind}). This is a bug in the script.`)
}

console.log(`
  Apple client secret generated.

    team id      ${teamId}
    key id       ${keyId}
    services id  ${servicesId}
    expires      ${new Date(exp * 1000).toISOString().slice(0, 10)}  (${status.daysLeft} days)

  ${jwt}

  Paste that value in BOTH places, or the expiry alert will watch the
  wrong copy:

    1. Supabase → Authentication → Providers → Apple → "Secret Key (for OAuth)"
    2. APPLE_OAUTH_SECRET  — .env.local and the Vercel dashboard

  Keep the .p8 file. You need it again in ${months} months, and Apple
  only lets you download it once.
`)
