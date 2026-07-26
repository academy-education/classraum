/**
 * Error Monitoring and Logging System
 *
 * Centralized error handling, logging, and alerting for the application
 */

import * as Sentry from '@sentry/nextjs';
import { supabaseServer } from './supabase-server';
import { raiseAlert } from './ops/alert';

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
    // Critical errors should trigger alerts. triggerAlert never throws,
    // but it IS async and un-awaited here — the .catch keeps a future
    // regression from becoming an unhandled rejection that kills the
    // serverless invocation mid-request.
    this.triggerAlert(message, error, context).catch(err => {
      console.error('Failed to trigger alert:', err);
    });
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
   * Send error to Sentry.
   *
   * This was an empty function whose whole body was a commented-out
   * example, so every `error` and `critical` log in the codebase — payout
   * failures, webhook failures, settlement failures — reached nothing but
   * a serverless console line. The SDK is initialised by
   * sentry.server.config.ts / sentry.client.config.ts; when the DSN env
   * var is unset these calls are no-ops, which is why there is no
   * `if (SENTRY_DSN)` guard.
   *
   * Never throws: an error reporter that can throw turns one failure into
   * two, and the caller only .catch()es as a backstop.
   */
  private async sendToMonitoring(log: ErrorLog): Promise<void> {
    try {
      // Prefer captureException — it carries the real stack and lets
      // Sentry group by fingerprint. Only synthesise an Error when the
      // call site logged a message with no error object.
      const captured = log.error ?? new Error(log.message);
      Sentry.captureException(captured, {
        level: log.level === 'critical' ? 'fatal' : 'error',
        tags: {
          service: this.serviceName,
          logLevel: log.level,
          synthetic: log.error ? 'false' : 'true',
        },
        extra: {
          ...(log.context ?? {}),
          logMessage: log.message,
          loggedAt: log.timestamp,
        },
      });
    } catch (e) {
      console.error('[error-monitoring] Sentry capture failed:', e);
    }
  }

  /**
   * Trigger alert for critical errors.
   *
   * Delegates to raiseAlert() — the single alerting path (alerts table +
   * Sentry + email for critical). This used to be a console.error with a
   * TODO, which meant `loggers.payout.critical('Payout failed')` produced
   * exactly one unread log line and no page.
   *
   * dedupeKey is derived from service + message, deliberately NOT from
   * the context (which carries payoutId/paymentId and would defeat
   * deduping by minting a fresh key per occurrence). One open alert per
   * distinct failure mode per service is what the dashboard wants.
   */
  private async triggerAlert(message: string, error?: Error, context?: LogContext) {
    try {
      await raiseAlert({
        severity: 'critical',
        title: `${this.serviceName}: ${message}`,
        message: error?.message
          ? `${message} — ${error.message}`
          : message,
        dedupeKey: `logger:${this.serviceName}:${message}`,
        error,
        context: { ...(context ?? {}), service: this.serviceName },
      });
    } catch (e) {
      // raiseAlert already swallows its own failures; this is belt-and-
      // braces so a critical log can never take down the caller.
      console.error('[error-monitoring] raiseAlert failed:', e, {
        service: this.serviceName,
        message,
      });
    }
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
