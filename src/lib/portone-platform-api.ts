/**
 * PortOne Platform API Client
 *
 * Handles API calls to PortOne Platform API for settlements and payouts
 */

const PORTONE_API_BASE_URL = 'https://api.portone.io';
const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;
const PORTONE_STORE_ID = process.env.PORTONE_STORE_ID;

if (!PORTONE_API_SECRET) {
  console.warn('PORTONE_API_SECRET not configured');
}

if (!PORTONE_STORE_ID) {
  console.warn('PORTONE_STORE_ID not configured');
}

/**
 * Settlement status from PortOne Platform API
 */
export type PlatformPartnerSettlementStatus =
  | 'SCHEDULED'
  | 'IN_PROCESS'
  | 'SETTLED'
  | 'PAYOUT_SCHEDULED'
  | 'PAID_OUT'
  | 'CANCELED';

/**
 * Payout status from PortOne Platform API
 */
export type PlatformPayoutStatus =
  | 'SCHEDULED'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELED';

/**
 * Settlement data from PortOne Platform API
 */
export interface PlatformPartnerSettlement {
  id: string;
  partnerId: string;
  paymentId?: string;
  status: PlatformPartnerSettlementStatus;
  settlementAmount: number;
  settlementCurrency: string;
  settlementDate?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Payout data from PortOne Platform API
 */
export interface PlatformPayout {
  id: string;
  partnerId: string;
  status: PlatformPayoutStatus;
  amount: number;
  currency: string;
  scheduledAt?: string;
  payoutAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * PortOne Platform API Client
 */
export class PortOnePlatformClient {
  private apiSecret: string;
  private storeId: string;

  constructor(apiSecret?: string, storeId?: string) {
    this.apiSecret = apiSecret || PORTONE_API_SECRET || '';
    this.storeId = storeId || PORTONE_STORE_ID || '';

    if (!this.apiSecret) {
      throw new Error('PortOne API Secret is required');
    }

    if (!this.storeId) {
      throw new Error('PortOne Store ID is required');
    }
  }

  /**
   * Make authenticated request to PortOne Platform API
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${PORTONE_API_BASE_URL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `PortOne ${this.apiSecret}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `PortOne API Error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    return response.json();
  }

  /**
   * Get settlements from PortOne Platform API
   *
   * @param params Query parameters
   * @returns List of settlements with pagination
   */
  async getSettlements(params?: {
    page?: number;
    limit?: number;
    status?: PlatformPartnerSettlementStatus[];
    partnerId?: string;
    from?: string; // ISO 8601 date
    to?: string; // ISO 8601 date
  }): Promise<{
    items: PlatformPartnerSettlement[];
    page: { number: number; size: number; totalCount: number };
  }> {
    const requestBody: any = {
      page: {
        number: params?.page || 0,
        size: params?.limit || 100,
      },
      filter: {
        criteria: {
          timestampRange: {
            from: params?.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            until: params?.to || new Date().toISOString(),
          },
        },
      },
    };

    if (params?.status) {
      requestBody.filter.statuses = params.status;
    }
    if (params?.partnerId) {
      requestBody.filter.partnerIds = [params.partnerId];
    }

    // PortOne Platform API uses GET with query params (via x-portone-query-or-body extension)
    const queryParams = new URLSearchParams({
      requestBody: JSON.stringify(requestBody),
    });

    return this.request(`/platform/partner-settlements?${queryParams.toString()}`);
  }

  /**
   * Get payouts from PortOne Platform API
   *
   * @param params Query parameters
   * @returns List of payouts with pagination
   */
  async getPayouts(params?: {
    page?: number;
    limit?: number;
    status?: PlatformPayoutStatus[];
    partnerId?: string;
    from?: string; // ISO 8601 date
    to?: string; // ISO 8601 date
  }): Promise<{
    items: PlatformPayout[];
    page: { number: number; size: number; totalCount: number };
  }> {
    const requestBody: any = {
      page: {
        number: params?.page || 0,
        size: params?.limit || 100,
      },
      filter: {
        criteria: {
          timestampRange: {
            from: params?.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            until: params?.to || new Date().toISOString(),
          },
        },
      },
    };

    if (params?.status) {
      requestBody.filter.statuses = params.status;
    }
    if (params?.partnerId) {
      requestBody.filter.partnerIds = [params.partnerId];
    }

    // PortOne Platform API uses GET with query params (via x-portone-query-or-body extension)
    const queryParams = new URLSearchParams({
      requestBody: JSON.stringify(requestBody),
    });

    return this.request(`/platform/payouts?${queryParams.toString()}`);
  }

  /**
   * Get a single settlement by ID
   */
  async getSettlement(settlementId: string): Promise<PlatformPartnerSettlement> {
    return this.request(`/platform/partner-settlements/${settlementId}`);
  }

  /**
   * Get a single payout by ID
   */
  async getPayout(payoutId: string): Promise<PlatformPayout> {
    return this.request(`/platform/payouts/${payoutId}`);
  }
}

/**
 * Default client instance
 */
export const portoneClient = new PortOnePlatformClient();
