/**
 * The alerts table's CHECK allows only low/medium/high/critical, while the
 * code has always raised 'warning' (43 call sites) and 'info'. Every such
 * insert was rejected and only console-logged — found 2026-09-28 when an
 * auth-email failure alert never appeared; the table held 8 rows in ten
 * months, all critical/high. Mapped here rather than widening the CHECK:
 * the admin dashboard already ranks by critical/high/medium. Pure module so
 * it can be tested without the admin client's env requirements.
 */
export type DbSeverity = 'low' | 'medium' | 'high' | 'critical'

export const DB_SEVERITY: Record<string, DbSeverity> = {
  critical: 'critical', high: 'high', major: 'high', warning: 'medium', medium: 'medium', info: 'low', low: 'low', nit: 'low',
}

export function toDbSeverity(severity: string): DbSeverity {
  return DB_SEVERITY[severity] ?? 'medium'
}
