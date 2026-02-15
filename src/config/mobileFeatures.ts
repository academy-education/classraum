/**
 * Mobile feature flags
 * Centralized configuration for mobile-specific features
 */

export const MOBILE_FEATURES = {
  /**
   * Enable/disable custom pull-to-refresh functionality across all mobile pages
   * Set to false to disable the custom pull-to-refresh UI and handlers
   */
  ENABLE_PULL_TO_REFRESH: true,
} as const
