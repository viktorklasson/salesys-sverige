
/* SaleSys API integration service
 * 
 * API References for future use:
 * 
 * OFFERS/AGREEMENTS:
 * - GET https://app.salesys.se/api/offers/offers-v2?statuses=signed&teamIds=6717fdd642f051259a6b24ed&from=2025-03-18T00%3A00%3A00.000%2B01%3A00&to=2025-03-18T23%3A59%3A59.999%2B01%3A00&count=50&offset=0&isTest=false&sortBy=date&sortOrder=desc
 * - GET https://app.salesys.se/api/offers/offers-v1/count (for pagination)
 * - Statuses: expired,canceled,declined,signed,read,pending,distributed
 * 
 * CALLS:
 * - GET https://app.salesys.se/api/dial/calls-v1?offset=0&count=100&connectionState=disconnected&country=se&sortBy=date&sortOrder=desc&debug=false
 * - Query params: after, before, teamIds, anyTagId, offset, count, connectionState, country, sortBy, sortOrder, debug, s, query
 * - GET https://app.salesys.se/api/dial/calls-v1/count (for pagination)
 * - GET https://app.salesys.se/api/dial/tags-v1 (call tags)
 * 
 * ORDERS:
 * - GET https://app.salesys.se/api/orders/orders-v3?dateStrategy=businessDateFirst&offset=0&count=100&isTest=false&sortBy=id&sortOrder=desc
 * - Query params: from, to, dateStrategy, anyTagId, anyProductCategoryId, teamIds, offset, count, isTest, sortBy, sortOrder
 * - GET https://app.salesys.se/api/orders/orders-v2/count (for pagination)
 * - GET https://app.salesys.se/api/orders/fields-v1?isRemoved=any (order fields)
 * - GET https://app.salesys.se/api/orders/tags-v1 (order tags)
 * 
 * DIAL GROUPS:
 * - GET https://app.salesys.se/api/dial/dial-groups-v2?offset=0&count=100&sortBy=serialId&sortOrder=desc
 * - GET https://app.salesys.se/api/dial/dial-group-contacts-v1/summaries?dialGroupIds=6814b3950483cf8a7328ec6d
 */

const PROXY_URL = 'https://salesys.se/api/tools/proxy.php';

interface ApiResponse<T> {
  data: T;
  error?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  offset: number;
  count: number;
}

// Common types
export interface Offer {
  id: string;
  serialId: number;
  date: string;
  status: 'expired' | 'canceled' | 'declined' | 'signed' | 'read' | 'pending' | 'distributed';
  statusUpdatedAt: string;
  recipient: {
    name: string;
    email?: string;
    sms?: string;
  };
  products: Array<{
    productId: string;
    quantity: number;
    productName: string;
    categoryId: string;
    categoryName: string;
    price: number;
  }>;
  tags: string[];
  contactId: string;
  organizationId: string;
  projectId: string;
}

export interface Call {
  id: string;
  serialId: number;
  contactId: string;
  dialGroupId: string;
  connectingAt: string;
  disconnectedAt?: string;
  disconnectReason?: string;
  recipient: string;
  caller: string;
  userId: string;
  organizationId: string;
  tagIds: string[];
  isDisconnected: boolean;
  isConnected: boolean;
  isContactAnswer: boolean;
  connectedDuration?: number;
  totalDuration: number;
  date: string;
}

export interface Order {
  id: string;
  organizationId: string;
  date: string;
  offerId: string;
  offerSerialId: number;
  contactId: string;
  serialId: number;
  tagIds: string[];
  fields: Array<{
    fieldId: string;
    value: string;
  }>;
  products: Array<{
    productId: string;
    quantity: number;
    productName: string;
    categoryId: string;
    categoryName: string;
    price: number;
  }>;
  businessDate: string;
  userId: string;
  isTest: boolean;
  projectId: string;
}

export interface DialGroup {
  id: string;
  name: string;
  serialId: number;
  contactSummaryCache: {
    contactCount: number;
    reservedContactCount: number;
    skippedContactCount: number;
    quarantinedContactCount: number;
  };
  date: string;
}

export interface DialGroupSummary {
  dialGroupId: string;
  summary: {
    contactCount: number;
    reservedContactCount: number;
    skippedContactCount: number;
    quarantinedContactCount: number;
  };
}

export interface Tag {
  id: string;
  name: string;
  color?: string;
  isLocking?: boolean;
}

class SalesysApiService {
  private bearerToken: string | null = null;

  setBearerToken(token: string) {
    this.bearerToken = token;
    localStorage.setItem('salesys_bearer_token', token);
  }

  getBearerToken(): string | null {
    if (!this.bearerToken) {
      this.bearerToken = localStorage.getItem('salesys_bearer_token');
    }
    return this.bearerToken;
  }

  private async makeRequest<T>(url: string): Promise<T> {
    const token = this.getBearerToken();
    if (!token) {
      throw new Error('Ingen bearer token tillgänglig. Vänligen logga in.');
    }

    const proxyUrl = `${PROXY_URL}?url=${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API fel: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Get today's date range in Swedish timezone
  private getTodayRange(): { from: string; to: string } {
    const now = new Date();
    const today = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Stockholm" }));
    
    const from = new Date(today);
    from.setHours(0, 0, 0, 0);
    
    const to = new Date(today);
    to.setHours(23, 59, 59, 999);

    return {
      from: from.toISOString(),
      to: to.toISOString()
    };
  }

  // Offers/Agreements API
  async getOffers(params?: {
    statuses?: string[];
    teamIds?: string[];
    from?: string;
    to?: string;
    offset?: number;
    count?: number;
  }): Promise<PaginatedResponse<Offer>> {
    const { from, to } = params?.from && params?.to ? 
      { from: params.from, to: params.to } : 
      this.getTodayRange();

    const queryParams = new URLSearchParams({
      from: from,
      to: to,
      count: (params?.count || 50).toString(),
      offset: (params?.offset || 0).toString(),
      isTest: 'false',
      sortBy: 'date',
      sortOrder: 'desc'
    });

    if (params?.statuses?.length) {
      queryParams.set('statuses', params.statuses.join(','));
    }
    if (params?.teamIds?.length) {
      queryParams.set('teamIds', params.teamIds.join(','));
    }

    const url = `https://app.salesys.se/api/offers/offers-v2?${queryParams}`;
    const data = await this.makeRequest<Offer[]>(url);

    // Get total count
    const countUrl = `https://app.salesys.se/api/offers/offers-v1/count?${queryParams}`;
    const countResponse = await this.makeRequest<{ count: number }>(countUrl);

    return {
      data,
      total: countResponse.count,
      offset: params?.offset || 0,
      count: params?.count || 50
    };
  }

  async getOffersCount(params?: {
    statuses?: string[];
    teamIds?: string[];
    from?: string;
    to?: string;
  }): Promise<number> {
    const { from, to } = params?.from && params?.to ? 
      { from: params.from, to: params.to } : 
      this.getTodayRange();

    const queryParams = new URLSearchParams({
      from: from,
      to: to,
      isTest: 'false'
    });

    if (params?.statuses?.length) {
      queryParams.set('statuses', params.statuses.join(','));
    }
    if (params?.teamIds?.length) {
      queryParams.set('teamIds', params.teamIds.join(','));
    }

    const url = `https://app.salesys.se/api/offers/offers-v1/count?${queryParams}`;
    const response = await this.makeRequest<{ count: number }>(url);
    return response.count;
  }

  // Calls API
  async getCalls(params?: {
    teamIds?: string[];
    tagIds?: string[];
    after?: string;
    before?: string;
    offset?: number;
    count?: number;
  }): Promise<PaginatedResponse<Call>> {
    const { from: after, to: before } = params?.after && params?.before ? 
      { from: params.after, to: params.before } : 
      this.getTodayRange();

    const queryParams = new URLSearchParams({
      after: after,
      before: before,
      offset: (params?.offset || 0).toString(),
      count: (params?.count || 100).toString(),
      connectionState: 'disconnected',
      country: 'se',
      sortBy: 'date',
      sortOrder: 'desc',
      debug: 'false'
    });

    if (params?.teamIds?.length) {
      queryParams.set('teamIds', params.teamIds.join(','));
    }
    if (params?.tagIds?.length) {
      queryParams.set('anyTagId', params.tagIds.join(','));
    }

    const url = `https://app.salesys.se/api/dial/calls-v1?${queryParams}`;
    const response = await this.makeRequest<{ calls: Call[] }>(url);

    // Get total count
    const countUrl = `https://app.salesys.se/api/dial/calls-v1/count?${queryParams}`;
    const countResponse = await this.makeRequest<{ count: number }>(countUrl);

    return {
      data: response.calls,
      total: countResponse.count,
      offset: params?.offset || 0,
      count: params?.count || 100
    };
  }

  async getCallTags(): Promise<Tag[]> {
    const url = 'https://app.salesys.se/api/dial/tags-v1';
    const response = await this.makeRequest<{ tags: Tag[] }>(url);
    return response.tags;
  }

  // Orders API
  async getOrders(params?: {
    teamIds?: string[];
    tagIds?: string[];
    from?: string;
    to?: string;
    offset?: number;
    count?: number;
  }): Promise<PaginatedResponse<Order>> {
    const { from, to } = params?.from && params?.to ? 
      { from: params.from, to: params.to } : 
      this.getTodayRange();

    const queryParams = new URLSearchParams({
      from: from,
      to: to,
      dateStrategy: 'businessDateFirst',
      offset: (params?.offset || 0).toString(),
      count: (params?.count || 100).toString(),
      isTest: 'false',
      sortBy: 'id',
      sortOrder: 'desc'
    });

    if (params?.teamIds?.length) {
      queryParams.set('teamIds', params.teamIds.join(','));
    }
    if (params?.tagIds?.length) {
      queryParams.set('anyTagId', params.tagIds.join(','));
    }

    const url = `https://app.salesys.se/api/orders/orders-v3?${queryParams}`;
    const data = await this.makeRequest<Order[]>(url);

    // Get total count
    const countUrl = `https://app.salesys.se/api/orders/orders-v2/count?${queryParams}`;
    const countResponse = await this.makeRequest<{ count: number }>(countUrl);

    return {
      data,
      total: countResponse.count,
      offset: params?.offset || 0,
      count: params?.count || 100
    };
  }

  async getOrderTags(): Promise<Tag[]> {
    const url = 'https://app.salesys.se/api/orders/tags-v1';
    return this.makeRequest<Tag[]>(url);
  }

  // Dial Groups API
  async getDialGroups(params?: {
    offset?: number;
    count?: number;
  }): Promise<PaginatedResponse<DialGroup>> {
    const queryParams = new URLSearchParams({
      offset: (params?.offset || 0).toString(),
      count: (params?.count || 100).toString(),
      sortBy: 'serialId',
      sortOrder: 'desc'
    });

    const url = `https://app.salesys.se/api/dial/dial-groups-v2?${queryParams}`;
    const data = await this.makeRequest<DialGroup[]>(url);

    return {
      data,
      total: data.length, // This API doesn't provide total count separately
      offset: params?.offset || 0,
      count: params?.count || 100
    };
  }

  async getDialGroupSummaries(dialGroupIds: string[]): Promise<DialGroupSummary[]> {
    const queryParams = new URLSearchParams({
      dialGroupIds: dialGroupIds.join(',')
    });

    const url = `https://app.salesys.se/api/dial/dial-group-contacts-v1/summaries?${queryParams}`;
    return this.makeRequest<DialGroupSummary[]>(url);
  }
}

export const salesysApi = new SalesysApiService();
