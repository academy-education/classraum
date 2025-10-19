/**
 * PortOne Configuration
 * Centralizes PortOne credentials and channel keys
 */

export interface PortOneConfig {
  storeId: string
  apiSecret: string
  apiKey: string
  paymentChannelKey: string
  billingChannelKey: string
}

/**
 * Get PortOne configuration
 * Uses live channel keys for production payments
 */
export function getPortOneConfig(): PortOneConfig {
  return {
    // Store and API credentials (same for test and live)
    storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
    apiSecret: process.env.PORTONE_API_SECRET!,
    apiKey: process.env.PORTONE_API_KEY!,

    // Live channel keys
    // Payment channel: For single invoice payments (student/parent paying)
    paymentChannelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_PAYMENT_LIVE!,

    // Billing channel: For recurring subscription payments (academy subscription)
    billingChannelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_BILLING_LIVE!,
  }
}

/**
 * Validate that all required PortOne environment variables are set
 */
export function validatePortOneConfig(): { valid: boolean; missing: string[] } {
  const missing: string[] = []

  if (!process.env.NEXT_PUBLIC_PORTONE_STORE_ID) {
    missing.push('NEXT_PUBLIC_PORTONE_STORE_ID')
  }
  if (!process.env.PORTONE_API_SECRET) {
    missing.push('PORTONE_API_SECRET')
  }
  if (!process.env.PORTONE_API_KEY) {
    missing.push('PORTONE_API_KEY')
  }
  if (!process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_PAYMENT_LIVE) {
    missing.push('NEXT_PUBLIC_PORTONE_CHANNEL_KEY_PAYMENT_LIVE')
  }
  if (!process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY_BILLING_LIVE) {
    missing.push('NEXT_PUBLIC_PORTONE_CHANNEL_KEY_BILLING_LIVE')
  }

  return {
    valid: missing.length === 0,
    missing
  }
}
