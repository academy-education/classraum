/**
 * Proration utility functions for subscription tier changes
 * Handles calculating prorated amounts for mid-cycle upgrades
 */

/**
 * Calculate the number of days remaining in the current billing period
 * @param currentPeriodEnd - End date of current billing period
 * @returns Number of days remaining (including today)
 */
export function getDaysRemaining(currentPeriodEnd: string | Date): number {
  const now = new Date();
  const endDate = new Date(currentPeriodEnd);

  // Reset time to start of day for accurate day counting
  now.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

/**
 * Calculate the total number of days in a billing period
 * @param startDate - Start date of billing period
 * @param endDate - End date of billing period
 * @returns Total number of days in the period
 */
export function getTotalDaysInPeriod(
  startDate: string | Date,
  endDate: string | Date
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Reset time to start of day for accurate day counting
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return Math.max(1, diffDays); // Minimum 1 day to avoid division by zero
}

/**
 * Calculate prorated amount for mid-cycle subscription upgrade
 *
 * Formula: (newPrice - currentPrice) × (daysRemaining / totalDays)
 *
 * Example:
 * - Current plan: ₩249,000/month
 * - New plan: ₩399,000/month
 * - Days remaining: 15 out of 30
 * - Prorated charge: (399,000 - 249,000) × (15/30) = ₩75,000
 *
 * @param currentPrice - Current monthly subscription price
 * @param newPrice - New monthly subscription price
 * @param daysRemaining - Days remaining in current billing period
 * @param totalDaysInPeriod - Total days in the billing period
 * @returns Prorated amount to charge (rounded to nearest won)
 */
export function calculateProratedAmount(
  currentPrice: number,
  newPrice: number,
  daysRemaining: number,
  totalDaysInPeriod: number
): number {
  // If no days remaining or moving to same/lower price, no charge
  if (daysRemaining <= 0 || newPrice <= currentPrice) {
    return 0;
  }

  // Calculate the price difference
  const priceDifference = newPrice - currentPrice;

  // Calculate prorated amount
  const proratedAmount = (priceDifference * daysRemaining) / totalDaysInPeriod;

  // Round to nearest won
  return Math.round(proratedAmount);
}

/**
 * Calculate prorated upgrade details including all necessary information
 * @param currentPrice - Current monthly subscription price
 * @param newPrice - New monthly subscription price
 * @param currentPeriodStart - Start of current billing period
 * @param currentPeriodEnd - End of current billing period
 * @returns Object with proration details
 */
export function calculateUpgradeProration(
  currentPrice: number,
  newPrice: number,
  currentPeriodStart: string | Date,
  currentPeriodEnd: string | Date
): {
  proratedAmount: number;
  daysRemaining: number;
  totalDays: number;
  priceDifference: number;
  isUpgrade: boolean;
} {
  const daysRemaining = getDaysRemaining(currentPeriodEnd);
  const totalDays = getTotalDaysInPeriod(currentPeriodStart, currentPeriodEnd);
  const priceDifference = newPrice - currentPrice;
  const isUpgrade = priceDifference > 0;

  const proratedAmount = isUpgrade
    ? calculateProratedAmount(currentPrice, newPrice, daysRemaining, totalDays)
    : 0;

  return {
    proratedAmount,
    daysRemaining,
    totalDays,
    priceDifference,
    isUpgrade,
  };
}

/**
 * Format currency amount in Korean Won
 * @param amount - Amount in KRW
 * @returns Formatted string (e.g., "₩75,000")
 */
export function formatKRW(amount: number): string {
  return `₩${amount.toLocaleString('ko-KR')}`;
}

/**
 * Determine if a tier change is an upgrade or downgrade
 * @param currentTier - Current subscription tier
 * @param newTier - Target subscription tier
 * @returns 'upgrade' | 'downgrade' | 'same'
 */
export function getTierChangeType(
  currentTier: string,
  newTier: string
): 'upgrade' | 'downgrade' | 'same' {
  const tierOrder = ['individual', 'basic', 'pro', 'enterprise'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const newIndex = tierOrder.indexOf(newTier);

  if (currentIndex === -1 || newIndex === -1) {
    throw new Error(`Invalid tier: ${currentTier} or ${newTier}`);
  }

  if (newIndex > currentIndex) return 'upgrade';
  if (newIndex < currentIndex) return 'downgrade';
  return 'same';
}
