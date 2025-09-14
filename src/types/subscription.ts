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
  studentLimit: number;
  teacherLimit: number;
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
  studentLimit: number;
  teacherLimit: number;
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
      studentLimit: 20,
      teacherLimit: 2,
      classroomLimit: 3,
      storageGb: 1,
      apiCallsPerMonth: 1000,
      smsPerMonth: 0,
      emailsPerMonth: 100,
    },
  },
  basic: {
    tier: 'basic',
    name: '베이직',
    monthlyPrice: 50000,
    yearlyPrice: 500000,
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
      studentLimit: 100,
      teacherLimit: 10,
      classroomLimit: 15,
      storageGb: 10,
      apiCallsPerMonth: 10000,
      smsPerMonth: 500,
      emailsPerMonth: 2000,
    },
  },
  pro: {
    tier: 'pro',
    name: '프로',
    monthlyPrice: 150000,
    yearlyPrice: 1500000,
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
      studentLimit: 500,
      teacherLimit: 50,
      classroomLimit: 50,
      storageGb: 50,
      apiCallsPerMonth: 100000,
      smsPerMonth: 2000,
      emailsPerMonth: 10000,
    },
  },
  enterprise: {
    tier: 'enterprise',
    name: '엔터프라이즈',
    monthlyPrice: 0, // Custom pricing
    yearlyPrice: 0, // Custom pricing
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
      studentLimit: -1, // Unlimited
      teacherLimit: -1, // Unlimited
      classroomLimit: -1, // Unlimited
      storageGb: -1, // Unlimited
      apiCallsPerMonth: -1, // Unlimited
      smsPerMonth: -1, // Unlimited
      emailsPerMonth: -1, // Unlimited
    },
  },
};