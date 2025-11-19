/**
 * Alerting System
 *
 * Send alerts via email, Slack, or other channels for critical errors
 */

import { LogContext } from './error-monitoring';
import { supabaseServer } from './supabase-server';

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
export class AlertManager {
  /**
   * Send alert through all configured channels
   */
  static async sendAlert(alert: Alert): Promise<void> {
    console.log('🚨 ALERT:', {
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      context: alert.context,
    });

    // Send email alert
    if (process.env.ALERT_EMAIL_ENABLED === 'true') {
      await this.sendEmailAlert(alert).catch(err => {
        console.error('Failed to send email alert:', err);
      });
    }

    // Send Slack alert (if configured)
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackAlert(alert).catch(err => {
        console.error('Failed to send Slack alert:', err);
      });
    }

    // Store alert in database
    await this.storeAlert(alert).catch(err => {
      console.error('Failed to store alert:', err);
    });
  }

  /**
   * Send email alert
   */
  private static async sendEmailAlert(alert: Alert): Promise<void> {
    const recipients = process.env.ALERT_EMAIL_RECIPIENTS?.split(',') || [];

    if (recipients.length === 0) {
      console.warn('No alert email recipients configured');
      return;
    }

    const emailBody = this.formatEmailBody(alert);

    // TODO: Integrate with email service (e.g., SendGrid, AWS SES, Resend)
    // Example with a generic email service:
    // await emailService.send({
    //   to: recipients,
    //   from: process.env.ALERT_EMAIL_FROM || 'alerts@classraum.com',
    //   subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
    //   html: emailBody,
    // });

    console.log('[Email Alert] Would send to:', recipients);
    console.log('[Email Alert] Subject:', `[${alert.severity.toUpperCase()}] ${alert.title}`);
  }

  /**
   * Send Slack alert
   */
  private static async sendSlackAlert(alert: Alert): Promise<void> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      return;
    }

    const color = this.getSeverityColor(alert.severity);
    const slackMessage = {
      attachments: [
        {
          color,
          title: `🚨 ${alert.severity.toUpperCase()}: ${alert.title}`,
          text: alert.message,
          fields: [
            {
              title: 'Timestamp',
              value: alert.timestamp,
              short: true,
            },
            {
              title: 'Severity',
              value: alert.severity,
              short: true,
            },
            ...(alert.error ? [{
              title: 'Error',
              value: alert.error.message,
              short: false,
            }] : []),
            ...(alert.context ? [{
              title: 'Context',
              value: '```' + JSON.stringify(alert.context, null, 2) + '```',
              short: false,
            }] : []),
          ],
          footer: 'Classraum Alert System',
          ts: Math.floor(new Date(alert.timestamp).getTime() / 1000),
        },
      ],
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage),
    });
  }

  /**
   * Store alert in database
   */
  private static async storeAlert(alert: Alert): Promise<void> {
    try {
      const { error } = await supabaseServer.from('alerts').insert({
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        error_message: alert.error?.message || null,
        error_stack: alert.error?.stack || null,
        context: alert.context || {},
        created_at: alert.timestamp,
        acknowledged: false,
        resolved: false,
      });

      if (error) {
        console.error('Failed to store alert in database:', error);
      }
    } catch (error) {
      console.error('Exception storing alert:', error);
    }
  }

  /**
   * Format email body
   */
  private static formatEmailBody(alert: Alert): string {
    const contextHtml = alert.context
      ? `
        <h3>Context:</h3>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${JSON.stringify(alert.context, null, 2)}</pre>
      `
      : '';

    const errorHtml = alert.error
      ? `
        <h3>Error Details:</h3>
        <p><strong>Message:</strong> ${alert.error.message}</p>
        <pre style="background: #f5f5f5; padding: 10px; border-radius: 4px;">${alert.error.stack || 'No stack trace available'}</pre>
      `
      : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              color: #333;
            }
            .alert-header {
              background: ${this.getSeverityColor(alert.severity)};
              color: white;
              padding: 20px;
              border-radius: 4px 4px 0 0;
            }
            .alert-body {
              padding: 20px;
              background: #fff;
              border: 1px solid #ddd;
              border-top: none;
              border-radius: 0 0 4px 4px;
            }
            .severity-badge {
              display: inline-block;
              padding: 4px 12px;
              background: rgba(255, 255, 255, 0.3);
              border-radius: 12px;
              font-size: 12px;
              font-weight: bold;
              text-transform: uppercase;
            }
          </style>
        </head>
        <body>
          <div class="alert-header">
            <h1>🚨 Alert: ${alert.title}</h1>
            <span class="severity-badge">${alert.severity}</span>
          </div>
          <div class="alert-body">
            <p><strong>Timestamp:</strong> ${alert.timestamp}</p>
            <h3>Message:</h3>
            <p>${alert.message}</p>
            ${contextHtml}
            ${errorHtml}
            <hr />
            <p style="font-size: 12px; color: #666;">
              This is an automated alert from the Classraum monitoring system.
            </p>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get color for severity level
   */
  private static getSeverityColor(severity: AlertSeverity): string {
    const colors = {
      low: '#3498db',
      medium: '#f39c12',
      high: '#e67e22',
      critical: '#e74c3c',
    };
    return colors[severity];
  }
}

/**
 * Predefined alert types for common scenarios
 */
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
