// Subscription types and interfaces

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';
export type BillingCycle = 'monthly' | 'yearly';
export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface SubscriptionPlan {
  tier: SubscriptionTier;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  features: SubscriptionFeatures;
  limits: SubscriptionLimits;
}

export interface SubscriptionFeatures {
  customBranding: boolean;
  advancedReports: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  smsNotifications: boolean;
  emailMarketing: boolean;
  dataExport: boolean;
  multipleLocations: boolean;
  customIntegrations: boolean;
}

export interface SubscriptionLimits {
  totalUserLimit: number; // Total users (students + teachers + parents)
  classroomLimit: number;
  storageGb: number;
  apiCallsPerMonth: number;
  smsPerMonth: number;
  emailsPerMonth: number;
}

export interface AcademySubscription {
  id: string;
  academyId: string;
  planTier: SubscriptionTier;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
  kgSubscriptionId?: string;
  kgCustomerId?: string;
  lastPaymentDate?: Date;
  nextBillingDate?: Date;
  totalUserLimit: number;
  storageLimitGb: number;
  featuresEnabled: Record<string, boolean>;
  monthlyAmount: number;
  billingCycle: BillingCycle;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionUsage {
  id: string;
  academyId: string;
  currentStudentCount: number;
  currentTeacherCount: number;
  currentStorageGb: number;
  currentClassroomCount: number;
  apiCallsMonth: number;
  smsSentMonth: number;
  emailsSentMonth: number;
  peakStudentCount: number;
  peakTeacherCount: number;
  calculatedAt: Date;
}

export interface SubscriptionInvoice {
  id: string;
  academyId: string;
  subscriptionId?: string;
  kgTransactionId?: string;
  kgPaymentKey?: string;
  kgReceiptUrl?: string;
  kgOrderId?: string;
  kgAuthDate?: Date;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  paidAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  planTier: SubscriptionTier;
  billingCycle: BillingCycle;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// KG Payment specific types
export interface KGPaymentRequest {
  P_STATUS: string;
  P_AUTH_DT: string;
  P_AUTH_NO: string;
  P_TID: string;
  P_MID: string;
  P_AMT: string;
  P_OID: string;
  P_FN_NM: string;
  P_CARD_NUM?: string;
  P_CARD_MEMBER_NUM?: string;
  P_CARD_ISSUER?: string;
  P_CARD_PURCHASE?: string;
  P_RMESG1?: string;
  P_RMESG2?: string;
  P_TYPE: string;
  P_NOTI?: string;
  P_HASH?: string;
}

export interface KGPaymentResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  receiptUrl?: string;
}

// Subscription plan definitions
export const SUBSCRIPTION_PLANS: Record<SubscriptionTier, SubscriptionPlan> = {
  free: {
    tier: 'free',
    name: '무료 플랜',
    monthlyPrice: 0,
    yearlyPrice: 0,
    features: {
      customBranding: false,
      advancedReports: false,
      apiAccess: false,
      prioritySupport: false,
      smsNotifications: false,
      emailMarketing: false,
      dataExport: false,
      multipleLocations: false,
      customIntegrations: false,
    },
    limits: {
      totalUserLimit: 22, // 20 students + 2 teachers
      classroomLimit: 3,
      storageGb: 1,
      apiCallsPerMonth: 1000,
      smsPerMonth: 0,
      emailsPerMonth: 100,
    },
  },
  basic: {
    tier: 'basic',
    name: '소규모 학원',
    monthlyPrice: 249000,
    yearlyPrice: 2490000,
    features: {
      customBranding: false,
      advancedReports: true,
      apiAccess: false,
      prioritySupport: false,
      smsNotifications: true,
      emailMarketing: true,
      dataExport: true,
      multipleLocations: false,
      customIntegrations: false,
    },
    limits: {
      totalUserLimit: 150,
      classroomLimit: 15,
      storageGb: 25,
      apiCallsPerMonth: 10000,
      smsPerMonth: 500,
      emailsPerMonth: 2000,
    },
  },
  pro: {
    tier: 'pro',
    name: '중형 학원',
    monthlyPrice: 399000,
    yearlyPrice: 3990000,
    features: {
      customBranding: true,
      advancedReports: true,
      apiAccess: true,
      prioritySupport: true,
      smsNotifications: true,
      emailMarketing: true,
      dataExport: true,
      multipleLocations: true,
      customIntegrations: false,
    },
    limits: {
      totalUserLimit: 320,
      classroomLimit: 50,
      storageGb: 100,
      apiCallsPerMonth: 100000,
      smsPerMonth: 2000,
      emailsPerMonth: 10000,
    },
  },
  enterprise: {
    tier: 'enterprise',
    name: '대형 학원',
    monthlyPrice: 699000,
    yearlyPrice: 6990000,
    features: {
      customBranding: true,
      advancedReports: true,
      apiAccess: true,
      prioritySupport: true,
      smsNotifications: true,
      emailMarketing: true,
      dataExport: true,
      multipleLocations: true,
      customIntegrations: true,
    },
    limits: {
      totalUserLimit: 650,
      classroomLimit: 100,
      storageGb: 300,
      apiCallsPerMonth: 1000000,
      smsPerMonth: 10000,
      emailsPerMonth: 50000,
    },
  },
};