/**
 * Day enumeration for the PortOne settlement filter.
 *
 * Lives in its own module because portone-platform-api.ts constructs a
 * client at module scope that throws when PortOne credentials are
 * absent — importing it just to reach a pure date helper would drag
 * that requirement into every caller and every test.
 */

/**
 * Every yyyy-MM-dd day in [from, to], in UTC.
 *
 * PlatformPartnerSettlementFilterInput selects by explicit days rather
 * than a range, so a "sync the last N days" call has to spell them out.
 * Capped at 60 days so a bad `since` cannot build an unbounded query
 * string.
 */
export function enumerateDays(from: Date, to: Date): string[] {
  const MAX_DAYS = 60;
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const out: string[] = [];
  const cursor = new Date(`${day(from)}T00:00:00.000Z`);
  const last = day(to);
  while (out.length < MAX_DAYS) {
    const d = day(cursor);
    out.push(d);
    if (d >= last) break;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}
