/**
 * Error Monitoring and Logging System
 *
 * Centralized error handling, logging, and alerting for the application
 */

import { supabaseServer } from './supabase-server';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  paymentId?: string;
  settlementId?: string;
  payoutId?: string;
  partnerId?: string;
  academyId?: string;
  [key: string]: any;
}

export interface ErrorLog {
  level: LogLevel;
  message: string;
  error?: Error;
  context?: LogContext;
  timestamp: string;
  stackTrace?: string;
}

/**
 * Structured logger with different log levels
 */
export class Logger {
  private serviceName: string;
  private defaultContext: LogContext;

  constructor(serviceName: string, defaultContext: LogContext = {}) {
    this.serviceName = serviceName;
    this.defaultContext = defaultContext;
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: LogContext) {
    this.log('debug', message, undefined, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: LogContext) {
    this.log('info', message, undefined, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: LogContext) {
    this.log('warn', message, undefined, context);
  }

  /**
   * Log error message
   */
  error(message: string, error?: Error, context?: LogContext) {
    this.log('error', message, error, context);
  }

  /**
   * Log critical error (requires immediate attention)
   */
  critical(message: string, error?: Error, context?: LogContext) {
    this.log('critical', message, error, context);
    // Critical errors should trigger alerts
    this.triggerAlert(message, error, context);
  }

  /**
   * Internal log method
   */
  private log(level: LogLevel, message: string, error?: Error, context?: LogContext) {
    const mergedContext = { ...this.defaultContext, ...context };
    const timestamp = new Date().toISOString();

    const logEntry: ErrorLog = {
      level,
      message: `[${this.serviceName}] ${message}`,
      error,
      context: mergedContext,
      timestamp,
      stackTrace: error?.stack,
    };

    // Console log with appropriate level
    const consoleMethod = level === 'critical' || level === 'error' ? 'error' :
                         level === 'warn' ? 'warn' : 'log';

    console[consoleMethod](this.formatLogEntry(logEntry));

    // Store in database for audit (async, don't await)
    this.storeLog(logEntry).catch(err => {
      console.error('Failed to store log:', err);
    });

    // Send to external monitoring service if configured
    if (level === 'error' || level === 'critical') {
      this.sendToMonitoring(logEntry).catch(err => {
        console.error('Failed to send to monitoring service:', err);
      });
    }
  }

  /**
   * Format log entry for console output
   */
  private formatLogEntry(log: ErrorLog): string {
    const parts = [
      `[${log.timestamp}]`,
      `[${log.level.toUpperCase()}]`,
      log.message,
    ];

    if (log.context && Object.keys(log.context).length > 0) {
      parts.push(`Context: ${JSON.stringify(log.context)}`);
    }

    if (log.error) {
      parts.push(`Error: ${log.error.message}`);
      if (log.stackTrace && process.env.NODE_ENV !== 'production') {
        parts.push(`\nStack: ${log.stackTrace}`);
      }
    }

    return parts.join(' ');
  }

  /**
   * Store log in database for audit trail
   */
  private async storeLog(log: ErrorLog): Promise<void> {
    try {
      const { error } = await supabaseServer.from('error_logs').insert({
        service_name: this.serviceName,
        level: log.level,
        message: log.message,
        error_message: log.error?.message || null,
        error_stack: log.stackTrace || null,
        context: log.context || {},
        user_id: log.context?.userId || null,
        request_id: log.context?.requestId || null,
        created_at: log.timestamp,
      });

      if (error) {
        console.error('Failed to store error log in database:', error);
      }
    } catch (error) {
      console.error('Exception storing error log:', error);
    }
  }

  /**
   * Send error to external monitoring service (e.g., Sentry)
   */
  private async sendToMonitoring(log: ErrorLog): Promise<void> {
    // TODO: Integrate with error monitoring service
    // Example with Sentry:
    // if (process.env.SENTRY_DSN) {
    //   Sentry.captureException(log.error || new Error(log.message), {
    //     level: log.level === 'critical' ? 'fatal' : 'error',
    //     tags: {
    //       service: this.serviceName,
    //     },
    //     extra: log.context,
    //   });
    // }
  }

  /**
   * Trigger alert for critical errors
   */
  private async triggerAlert(message: string, error?: Error, context?: LogContext) {
    // TODO: Implement alerting mechanism
    // This could send emails, Slack messages, PagerDuty alerts, etc.
    console.error('🚨 CRITICAL ALERT:', {
      service: this.serviceName,
      message,
      error: error?.message,
      context,
    });

    // Example: Send email alert
    // await sendEmailAlert({
    //   subject: `CRITICAL: ${this.serviceName} - ${message}`,
    //   body: `
    //     Service: ${this.serviceName}
    //     Message: ${message}
    //     Error: ${error?.message || 'N/A'}
    //     Context: ${JSON.stringify(context, null, 2)}
    //     Stack Trace: ${error?.stack || 'N/A'}
    //   `,
    //   recipients: process.env.ALERT_EMAILS?.split(',') || [],
    // });
  }
}

/**
 * Predefined loggers for different services
 */
export const loggers = {
  settlement: new Logger('Settlement'),
  payout: new Logger('Payout'),
  partner: new Logger('Partner'),
  webhook: new Logger('Webhook'),
  payment: new Logger('Payment'),
  subscription: new Logger('Subscription'),
  auth: new Logger('Auth'),
};

/**
 * Track metrics and performance
 */
export class MetricsTracker {
  private static metrics: Map<string, number[]> = new Map();

  /**
   * Record a metric value
   */
  static record(metricName: string, value: number) {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }
    this.metrics.get(metricName)!.push(value);

    // Keep only last 1000 values to prevent memory issues
    const values = this.metrics.get(metricName)!;
    if (values.length > 1000) {
      values.shift();
    }
  }

  /**
   * Get average of a metric
   */
  static getAverage(metricName: string): number | null {
    const values = this.metrics.get(metricName);
    if (!values || values.length === 0) return null;

    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * Get percentile of a metric
   */
  static getPercentile(metricName: string, percentile: number): number | null {
    const values = this.metrics.get(metricName);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  /**
   * Clear all metrics
   */
  static clear() {
    this.metrics.clear();
  }
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private startTime: number;
  private checkpoints: Map<string, number>;
  private operationName: string;

  constructor(operationName: string) {
    this.operationName = operationName;
    this.startTime = Date.now();
    this.checkpoints = new Map();
  }

  /**
   * Mark a checkpoint
   */
  checkpoint(name: string) {
    const elapsed = Date.now() - this.startTime;
    this.checkpoints.set(name, elapsed);
    return elapsed;
  }

  /**
   * End monitoring and log results
   */
  end() {
    const totalTime = Date.now() - this.startTime;

    console.log(`[Performance] ${this.operationName}: ${totalTime}ms`, {
      checkpoints: Object.fromEntries(this.checkpoints),
    });

    // Record metric
    MetricsTracker.record(`operation.${this.operationName}`, totalTime);

    // Alert if operation took too long
    if (totalTime > 5000) {
      loggers.webhook.warn(`Slow operation detected: ${this.operationName}`, {
        duration: totalTime,
        checkpoints: Object.fromEntries(this.checkpoints),
      });
    }

    return totalTime;
  }
}
