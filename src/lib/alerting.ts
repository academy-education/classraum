/**
 * Alerting System
 *
 * Send alerts via email, Slack, or other channels for critical errors
 */

import { LogContext } from './error-monitoring';
import { raiseAlert, type AlertSeverity as OpsSeverity } from './ops/alert';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Alert {
  severity: AlertSeverity;
  title: string;
  message: string;
  context?: LogContext;
  error?: Error;
  timestamp: string;
}

/**
 * Alert manager to send notifications through various channels
 */
/**
 * Severity bridge. This module predates src/lib/ops/alert.ts and had its
 * own 4-level scale, its own DB write, and an email path that was never
 * implemented — `sendEmailAlert` only console.logged "Would send to:",
 * so PortOne payout failures have never actually reached anyone.
 *
 * Rather than keep two half-working alert systems, AlertManager now
 * delegates to raiseAlert(), which is the single path to the alerts
 * table, Sentry, and email. The public API here is unchanged so the
 * existing webhook call sites keep working.
 */
const SEVERITY_MAP: Record<AlertSeverity, OpsSeverity> = {
  low: 'info',
  medium: 'warning',
  // Settlement/webhook failures are money and security events — they
  // page. Dedupe keeps one ongoing incident to a single email.
  high: 'critical',
  critical: 'critical',
}

export class AlertManager {
  /** Send an alert through the shared ops pipeline. */
  static async sendAlert(alert: Alert): Promise<void> {
    const ctx = (alert.context ?? {}) as Record<string, unknown>
    await raiseAlert({
      severity: SEVERITY_MAP[alert.severity],
      title: alert.title,
      message: alert.message,
      // Stable per title + primary id so a repeating failure updates one
      // row instead of flooding the dashboard.
      dedupeKey: `legacy:${alert.title}:${
        ctx.settlementId ?? ctx.payoutId ?? ctx.webhookType ?? 'general'
      }`,
      error: alert.error,
      context: { ...ctx, legacySeverity: alert.severity },
    })
  }
}

export const alerts = {
  /**
   * Settlement failure alert
   */
  settlementFailed: (settlementId: string, partnerId: string, error?: Error) => {
    return AlertManager.sendAlert({
      severity: 'high',
      title: 'Settlement Creation Failed',
      message: `Failed to create settlement for partner ${partnerId}`,
      context: {
        settlementId,
        partnerId,
      },
      error,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Payout failure alert
   */
  payoutFailed: (payoutId: string, partnerId: string, amount: number, currency: string, failureReason?: string) => {
    return AlertManager.sendAlert({
      severity: 'critical',
      title: 'Payout Failed',
      message: `Payout of ${amount} ${currency} to partner ${partnerId} failed. Reason: ${failureReason || 'Unknown'}`,
      context: {
        payoutId,
        partnerId,
        amount,
        currency,
        failureReason,
      },
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Webhook verification failure alert
   */
  webhookVerificationFailed: (webhookType: string, error: Error) => {
    return AlertManager.sendAlert({
      severity: 'high',
      title: 'Webhook Verification Failed',
      message: `Failed to verify ${webhookType} webhook signature. Possible security issue.`,
      context: {
        webhookType,
      },
      error,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Partner setup failure alert
   */
  partnerSetupFailed: (academyId: string, academyName: string, error?: Error) => {
    return AlertManager.sendAlert({
      severity: 'medium',
      title: 'Partner Setup Failed',
      message: `Failed to create PortOne partner for academy "${academyName}"`,
      context: {
        academyId,
        academyName,
      },
      error,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Payment processing error alert
   */
  paymentProcessingError: (paymentId: string, error: Error) => {
    return AlertManager.sendAlert({
      severity: 'critical',
      title: 'Payment Processing Error',
      message: 'Critical error during payment processing',
      context: {
        paymentId,
      },
      error,
      timestamp: new Date().toISOString(),
    });
  },

  /**
   * Database connection error alert
   */
  databaseError: (operation: string, error: Error) => {
    return AlertManager.sendAlert({
      severity: 'critical',
      title: 'Database Error',
      message: `Database error during ${operation}`,
      context: {
        operation,
      },
      error,
      timestamp: new Date().toISOString(),
    });
  },
};
