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
 * 
 * STATISTICS:
 * - GET https://app.salesys.se/api/offers/statistics-v1/own/issue_1238_2?from=2025-04-01&to=2025-05-13&fixedIntervalType=day
 * - GET https://app.salesys.se/api/dial/statistics-v1/own/issue_1238_2?from=2025-05-10&to=2025-05-15&fixedIntervalType=day
 * - GET https://app.salesys.se/api/orders/statistics-v1/own/issue_1238_2?from=2025-05-30&to=2025-06-03&fixedIntervalType=day
 * 
 * DASHBOARDS:
 * - GET https://app.salesys.se/api/users/dashboards-v1
 * - POST https://app.salesys.se/api/users/dashboards-v1/{id}/results
 * 
 * USERS & TEAMS:
 * - GET https://app.salesys.se/api/users/users-v1
 * - GET https://app.salesys.se/api/users/teams-v1
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

export interface StatisticsData {
  intervalStart: string;
  intervalEnd: string;
  userId: string;
  tagId: string | null;
  projectId: string | null;
  count: number;
  totalDuration?: number;
  connectedDuration?: number;
  unansweredCount?: number;
  connectedCount?: number;
  productId?: string | null;
}

export interface User {
  id: string;
  type: string;
  organizationId: string;
  rights: string[];
  superRights: string[];
  teamId: string;
  supervisedTeamIds: string[];
  roleIds: string[];
  fullName: string;
  username: string;
  createdByUserId: string;
  passwordResets: any[];
  phone: string | null;
  active: boolean;
  mfa: {
    enabled: boolean;
    smsRecipient: string | null;
  };
  preferences: any;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  color: string;
  rights: string[];
  isLocked: boolean;
  calendarAccess: any[];
}

export interface Dashboard {
  id: string;
  name: string;
  organizationId: string;
  readers: Array<{
    id: string;
    name: string;
    variables: Array<{
      id: string;
      calls?: any;
      orders?: any;
      offers?: any;
      users?: any;
    }>;
    expression?: string;
    unit?: string;
    intervalMillis?: number;
    position: number;
  }>;
  groupBy: any;
  filterTypes: string[];
  projectIds: any;
  isRemoved: boolean;
}

export interface DashboardResult {
  readerId: string;
  intervals: Array<{
    value: number;
    intervalStart: string;
  }>;
  groupedId: string;
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

  // Add cache busting parameter to URLs
  private addCacheBusting(url: string): string {
    const separator = url.includes('?') ? '&' : '?';
    const timestamp = Date.now();
    return `${url}${separator}_cb=${timestamp}`;
  }

  private async makeRequest<T>(url: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<T> {
    const token = this.getBearerToken();
    if (!token) {
      throw new Error('Ingen bearer token tillgänglig. Vänligen logga in.');
    }

    // Add cache busting to the URL before encoding
    const urlWithCacheBusting = this.addCacheBusting(url);
    const proxyUrl = `${PROXY_URL}?url=${encodeURIComponent(urlWithCacheBusting)}`;
    
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      },
    };

    if (body && method === 'POST') {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(proxyUrl, requestOptions);

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

  // Statistics API
  async getStatistics(params: {
    endpoint: string;
    from: string;
    to: string;
    fixedIntervalType?: 'day' | 'week' | 'month';
  }): Promise<StatisticsData[]> {
    const queryParams = new URLSearchParams({
      from: params.from,
      to: params.to,
      fixedIntervalType: params.fixedIntervalType || 'day'
    });

    const url = `https://app.salesys.se/api/offers/statistics-v1/own/${params.endpoint}?${queryParams}`;
    return this.makeRequest<StatisticsData[]>(url);
  }

  // Call Statistics API
  async getCallStatistics(params: {
    endpoint: string;
    from: string;
    to: string;
    fixedIntervalType?: 'day' | 'week' | 'month';
  }): Promise<StatisticsData[]> {
    const queryParams = new URLSearchParams({
      from: params.from,
      to: params.to,
      fixedIntervalType: params.fixedIntervalType || 'day'
    });

    const url = `https://app.salesys.se/api/dial/statistics-v1/own/${params.endpoint}?${queryParams}`;
    return this.makeRequest<StatisticsData[]>(url);
  }

  // Order Statistics API
  async getOrderStatistics(params: {
    endpoint: string;
    from: string;
    to: string;
    fixedIntervalType?: 'day' | 'week' | 'month';
  }): Promise<StatisticsData[]> {
    const queryParams = new URLSearchParams({
      from: params.from,
      to: params.to,
      fixedIntervalType: params.fixedIntervalType || 'day'
    });

    const url = `https://app.salesys.se/api/orders/statistics-v1/own/${params.endpoint}?${queryParams}`;
    return this.makeRequest<StatisticsData[]>(url);
  }

  async getOfferStatistics(params: {
    from: string;
    to: string;
    fixedIntervalType?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<StatisticsData[]> {
    const queryParams = new URLSearchParams({
      from: params.from,
      to: params.to,
      fixedIntervalType: params.fixedIntervalType || 'day'
    });

    const url = `https://app.salesys.se/api/offers/statistics-v1/own/issue_1238_2?${queryParams}`;
    return this.makeRequest<StatisticsData[]>(url);
  }

  async getCallStatisticsHourly(params: {
    from: string;
    to: string;
    fixedIntervalType?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<StatisticsData[]> {
    const queryParams = new URLSearchParams({
      from: params.from,
      to: params.to,
      fixedIntervalType: params.fixedIntervalType || 'hour'
    });

    const url = `https://app.salesys.se/api/dial/statistics-v1/own/issue_1238_2?${queryParams}`;
    return this.makeRequest<StatisticsData[]>(url);
  }

  async getOrderStatisticsHourly(params: {
    from: string;
    to: string;
    fixedIntervalType?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<StatisticsData[]> {
    const queryParams = new URLSearchParams({
      from: params.from,
      to: params.to,
      fixedIntervalType: params.fixedIntervalType || 'hour'
    });

    const url = `https://app.salesys.se/api/orders/statistics-v1/own/issue_1238_2?${queryParams}`;
    return this.makeRequest<StatisticsData[]>(url);
  }

  // Users API
  async getUsers(): Promise<User[]> {
    const url = 'https://app.salesys.se/api/users/users-v1';
    return this.makeRequest<User[]>(url);
  }

  // Teams API
  async getTeams(): Promise<Team[]> {
    const url = 'https://app.salesys.se/api/users/teams-v1';
    return this.makeRequest<Team[]>(url);
  }

  // Dashboards API
  async getDashboards(): Promise<Dashboard[]> {
    const url = 'https://app.salesys.se/api/users/dashboards-v1';
    return this.makeRequest<Dashboard[]>(url);
  }

  async getDashboardResults(dashboardId: string): Promise<DashboardResult[]> {
    const url = `https://app.salesys.se/api/users/dashboards-v1/${dashboardId}/results`;
    return this.makeRequest<DashboardResult[]>(url, 'POST');
  }

  async updateDashboardGroupBy(dashboardId: string, groupBy: 'user' | 'team' | 'leadList' | null): Promise<void> {
    const url = `https://app.salesys.se/api/users/dashboards-v1/${dashboardId}`;
    await this.makeRequest(url, 'PUT', { groupBy });
  }
}

export const salesysApi = new SalesysApiService();
