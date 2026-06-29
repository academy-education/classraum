import { supabaseAdmin } from '@/lib/supabase-admin'

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

export async function sendPushToStudent(
  studentId: string,
  payload: PushPayload,
): Promise<PushSendResult> {
  if (!process.env.FCM_SERVICE_ACCOUNT_JSON || !process.env.FCM_PROJECT_ID) {
    return { sent: 0, failed: 0, skipped: true, reason: 'fcm_not_configured' }
  }

  const { data: tokens } = await supabaseAdmin
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
          await supabaseAdmin
            .from('device_tokens')
            .update({ is_active: false })
            .eq('token', t.token)
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
