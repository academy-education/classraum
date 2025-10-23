/**
 * Add-on configuration for subscription plans
 * Defines pricing and increments for additional users and storage
 */

import { SubscriptionTier } from '@/types/subscription';

export interface AddonPricing {
  // User add-ons
  userIncrement: number;        // Number of users per increment (e.g., 5 or 10)
  userIncrementPrice: number;   // Price per user increment in KRW

  // Teacher add-ons (if different from general users)
  teacherIncrement?: number;
  teacherIncrementPrice?: number;

  // Storage add-ons
  storageIncrementGb: number;   // GB per increment
  storageIncrementPrice: number; // Price per storage increment in KRW

  // AI Cards (enterprise only)
  aiCardIncrement?: number;
  aiCardIncrementPrice?: number;
}

export const ADDON_CONFIG: Record<SubscriptionTier, AddonPricing | null> = {
  // Individual tier
  individual: {
    userIncrement: 5,
    userIncrementPrice: 10000,
    storageIncrementGb: 1,
    storageIncrementPrice: 5000,
  },

  // Small tier
  basic: {
    userIncrement: 10,
    userIncrementPrice: 25000,
    storageIncrementGb: 5,
    storageIncrementPrice: 12000,
  },

  // Mid tier
  pro: {
    userIncrement: 10,
    userIncrementPrice: 25000,
    storageIncrementGb: 10,
    storageIncrementPrice: 15000,
  },

  // Large tier
  enterprise: {
    userIncrement: 10,
    userIncrementPrice: 25000,
    storageIncrementGb: 20,
    storageIncrementPrice: 20000,
    aiCardIncrement: 100,
    aiCardIncrementPrice: 100000,
  },
};

/**
 * Calculate the monthly cost for add-ons
 * @param tier - The subscription tier
 * @param additionalStudents - Number of additional students (actual count, e.g., 10)
 * @param additionalTeachers - Number of additional teachers (actual count, e.g., 10)
 * @param additionalStorageGb - GB of additional storage (actual GB, e.g., 5)
 * @returns Total monthly cost for add-ons in KRW
 */
export function calculateAddonCost(
  tier: SubscriptionTier,
  additionalStudents: number,
  additionalTeachers: number,
  additionalStorageGb: number
): number {
  const config = ADDON_CONFIG[tier];
  if (!config) return 0;

  // Calculate number of user increments purchased
  const totalAdditionalUsers = additionalStudents + additionalTeachers;
  const userIncrements = totalAdditionalUsers / config.userIncrement;
  const userCost = userIncrements * config.userIncrementPrice;

  // Calculate number of storage increments purchased
  const storageIncrements = additionalStorageGb / config.storageIncrementGb;
  const storageCost = storageIncrements * config.storageIncrementPrice;

  return userCost + storageCost;
}

/**
 * Format add-on pricing for display
 * @param tier - The subscription tier
 * @param language - Language code ('en' or 'ko')
 * @returns Formatted pricing strings
 */
export function formatAddonPricing(
  tier: SubscriptionTier,
  language: 'en' | 'ko' = 'ko'
): {
  users: string;
  storage: string;
  aiCards?: string;
} | null {
  const config = ADDON_CONFIG[tier];
  if (!config) return null;

  const currency = language === 'ko' ? '₩' : '₩';

  const result = {
    users: language === 'ko'
      ? `+${currency}${config.userIncrementPrice.toLocaleString('ko-KR')} (${config.userIncrement}명당)`
      : `+${currency}${config.userIncrementPrice.toLocaleString('en-US')} per ${config.userIncrement} users`,
    storage: language === 'ko'
      ? `+${currency}${config.storageIncrementPrice.toLocaleString('ko-KR')} (${config.storageIncrementGb}GB당)`
      : `+${currency}${config.storageIncrementPrice.toLocaleString('en-US')} per ${config.storageIncrementGb}GB`,
  };

  if (config.aiCardIncrement && config.aiCardIncrementPrice) {
    return {
      ...result,
      aiCards: language === 'ko'
        ? `+${currency}${config.aiCardIncrementPrice.toLocaleString('ko-KR')} (${config.aiCardIncrement}개 AI 카드당)`
        : `+${currency}${config.aiCardIncrementPrice.toLocaleString('en-US')} per ${config.aiCardIncrement} AI cards`,
    };
  }

  return result;
}

/**
 * Get the increment size for a specific add-on type
 * @param tier - The subscription tier
 * @param addonType - Type of add-on ('users' | 'storage')
 * @returns The increment size, or 1 if not configured
 */
export function getAddonIncrement(
  tier: SubscriptionTier,
  addonType: 'users' | 'storage'
): number {
  const config = ADDON_CONFIG[tier];
  if (!config) return 1;

  if (addonType === 'users') {
    return config.userIncrement;
  }
  return config.storageIncrementGb;
}

/**
 * Validate add-on quantities (must be in proper increments)
 * @param tier - The subscription tier
 * @param students - Number of additional students
 * @param teachers - Number of additional teachers
 * @param storageGb - GB of additional storage
 * @returns true if all quantities are valid multiples of their increments
 */
export function validateAddonQuantities(
  tier: SubscriptionTier,
  students: number,
  teachers: number,
  storageGb: number
): { valid: boolean; error?: string } {
  const config = ADDON_CONFIG[tier];
  if (!config) {
    return { valid: false, error: 'Add-ons not available for this tier' };
  }

  // Validate students
  if (students % config.userIncrement !== 0) {
    return {
      valid: false,
      error: `Students must be in multiples of ${config.userIncrement}`,
    };
  }

  // Validate teachers
  if (teachers % config.userIncrement !== 0) {
    return {
      valid: false,
      error: `Teachers must be in multiples of ${config.userIncrement}`,
    };
  }

  // Validate storage
  if (storageGb % config.storageIncrementGb !== 0) {
    return {
      valid: false,
      error: `Storage must be in multiples of ${config.storageIncrementGb}GB`,
    };
  }

  // Validate all are non-negative
  if (students < 0 || teachers < 0 || storageGb < 0) {
    return {
      valid: false,
      error: 'Add-on quantities cannot be negative',
    };
  }

  return { valid: true };
}
