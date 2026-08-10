import { dbAdmin } from '@/lib/supabase-admin'
import { pushCategoryAllowed, type PushCategory, type PushPrefsRow } from '@/lib/study/push-categories'

/**
 * Push notification dispatcher for study reminders.
 *
 * Reads active device_tokens for the user and sends via Firebase
 * Cloud Messaging (FCM) HTTP v1. Gracefully no-ops when
 * FCM_SERVICE_ACCOUNT_JSON is not configured — useful for local
 * development and incremental rollout (the cron can run without
 * crashing while the Firebase service account is being provisioned).
 *
 * Setup:
 *   1. Create a Firebase project, enable Cloud Messaging.
 *   2. Generate a service account key (Settings → Service accounts).
 *   3. Set FCM_SERVICE_ACCOUNT_JSON to the entire JSON blob, and
 *      FCM_PROJECT_ID to the project ID.
 *
 * Client side:
 *   - iOS (Capacitor): @capacitor/push-notifications registers the
 *     APNs token; convert via Firebase and upsert into device_tokens.
 *   - Android (Capacitor): same plugin, FCM token directly.
 *   - Web: this skeleton does not include web push yet.
 */

export interface PushPayload {
  title: string
  body: string
  /** Deep-link path to open when the notification is tapped. */
  url?: string
  /** Additional data delivered to the client. */
  data?: Record<string, string>
}

interface PushSendResult {
  sent: number
  failed: number
  skipped: boolean
  reason?: string
}

/**
 * THE PREFERENCE GATE LIVES HERE, NOT AT THE CALL SITES.
 *
 * Before 2026-08-11 there was no gate at all: this function selected
 * device_tokens and sent. `user_preferences.push_notifications` was
 * written by the profile toggle and read by nobody, so a student who
 * switched notifications off kept receiving them.
 *
 * One gate in the single function every push goes through cannot be
 * forgotten by the next caller — which is exactly how it went missing.
 *
 * FAILS OPEN. A read error returns undefined, pushCategoryAllowed treats
 * that as "send", and the push goes out. Suppressing on error would mean
 * one bad query silently mutes the whole product, and nobody reports a
 * notification they did not receive.
 */
async function readPushPrefs(studentId: string): Promise<PushPrefsRow | undefined> {
  const { data, error } = await dbAdmin
    .from('user_preferences')
    .select('push_notifications, push_categories')
    .eq('user_id', studentId)
    .maybeSingle()
  if (error) {
    console.warn('[push] preference read failed, sending anyway', error.message)
    return undefined
  }
  return (data as PushPrefsRow | null) ?? undefined
}

export async function sendPushToStudent(
  studentId: string,
  payload: PushPayload,
  opts?: {
    /**
     * Which switch on the settings screen governs this push.
     *
     * Omit only when genuinely uncategorised — an omitted category is
     * treated as "send" and so escapes every per-category switch. Prefer
     * passing one; `categoryForKind` maps a StudyNotificationKind, and
     * callers outside that union (the reminder cron) pass theirs directly.
     */
    category?: PushCategory | null
  },
): Promise<PushSendResult> {
  if (!process.env.FCM_SERVICE_ACCOUNT_JSON || !process.env.FCM_PROJECT_ID) {
    return { sent: 0, failed: 0, skipped: true, reason: 'fcm_not_configured' }
  }

  // Checked BEFORE the token query: an opted-out student should cost us
  // neither a lookup nor an FCM call.
  const prefs = await readPushPrefs(studentId)
  if (!pushCategoryAllowed(opts?.category ?? null, prefs)) {
    return { sent: 0, failed: 0, skipped: true, reason: 'opted_out' }
  }

  const { data: tokens } = await dbAdmin
    .from('device_tokens')
    .select('token, platform')
    .eq('user_id', studentId)
    .eq('is_active', true)

  if (!tokens || tokens.length === 0) {
    return { sent: 0, failed: 0, skipped: true, reason: 'no_tokens' }
  }

  let accessToken: string
  try {
    accessToken = await getFcmAccessToken()
  } catch (err) {
    console.error('[push] oauth failed', err)
    return { sent: 0, failed: tokens.length, skipped: true, reason: 'oauth_failed' }
  }

  let sent = 0
  let failed = 0
  for (const t of tokens) {
    const message = {
      message: {
        token: t.token as string,
        notification: { title: payload.title, body: payload.body },
        data: {
          ...(payload.data ?? {}),
          ...(payload.url ? { url: payload.url } : {}),
        },
        // Route to the Android channel that matches the settings switch.
        //
        // Without this the channels created in the native shell exist but
        // nothing reaches them: every push falls to the manifest default
        // and lands in one bucket, so a student who wanted to silence
        // streak nudges could only silence billing along with them.
        //
        // Only sent when we know the category. An unset channel_id falls
        // back to the manifest default ('general'), which is a real
        // channel with a real name — better than inventing an id here
        // that the shell has never created, since Android drops
        // notifications for unknown channels on API 26+.
        ...(opts?.category
          ? { android: { notification: { channel_id: opts.category } } }
          : {}),
        apns: {
          payload: { aps: { sound: 'default' } },
        },
      },
    }
    try {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${process.env.FCM_PROJECT_ID}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(message),
        },
      )
      if (res.ok) sent++
      else {
        failed++
        // 404/410 means the token is dead — deactivate.
        if (res.status === 404 || res.status === 410) {
          // If the deactivation is lost we keep pushing to a dead token on
          // every future notification, permanently inflating `failed`.
          const { error } = await dbAdmin
            .from('device_tokens')
            .update({ is_active: false })
            .eq('token', t.token)
          if (error) console.error('[push] dead-token deactivation failed', error)
        }
      }
    } catch (err) {
      console.error('[push] send failed', err)
      failed++
    }
  }

  return { sent, failed, skipped: false }
}

/** Mint a short-lived OAuth access token from the service-account JWT.
 *  Cached for 50 minutes per process (tokens last 60 min). */
let cachedToken: { token: string; expiresAt: number } | null = null
async function getFcmAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.token
  }
  const sa = JSON.parse(process.env.FCM_SERVICE_ACCOUNT_JSON!) as {
    client_email: string
    private_key: string
    token_uri?: string
  }
  const tokenUri = sa.token_uri ?? 'https://oauth2.googleapis.com/token'
  const iat = Math.floor(Date.now() / 1000)
  const claims = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: tokenUri,
    iat,
    exp: iat + 3600,
  }
  const jwt = await signRs256Jwt(claims, sa.private_key)
  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!res.ok) throw new Error(`oauth ${res.status}`)
  const json = await res.json() as { access_token: string; expires_in: number }
  cachedToken = {
    token: json.access_token,
    expiresAt: Date.now() + (json.expires_in - 300) * 1000,
  }
  return json.access_token
}

/** Pure-Node JWT signer (RS256) so we don't pull in `jose` for one call. */
async function signRs256Jwt(claims: Record<string, unknown>, privateKeyPem: string): Promise<string> {
  const crypto = await import('crypto')
  const header = { alg: 'RS256', typ: 'JWT' }
  const base64url = (buf: Buffer) => buf.toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  const enc = (obj: unknown) => base64url(Buffer.from(JSON.stringify(obj)))
  const signingInput = `${enc(header)}.${enc(claims)}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(signingInput)
  const sig = signer.sign(privateKeyPem)
  return `${signingInput}.${base64url(sig)}`
}
