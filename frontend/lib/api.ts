const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export interface ApiError {
  message: string;
  statusCode?: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = typeof window !== 'undefined' 
      ? localStorage.getItem('access_token') 
      : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        message: response.statusText,
      }));
      error.statusCode = response.status;
      throw error;
    }

    return response.json();
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.request<{ access_token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string) {
    return this.request<{ access_token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  // Signals endpoints
  async getSignals(params?: {
    chain?: string;
    minScore?: number;
    signalType?: string;
    tokenId?: string;
    recentHours?: number;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.chain) queryParams.append('chain', params.chain);
    if (params?.minScore) queryParams.append('minScore', params.minScore.toString());
    if (params?.signalType) queryParams.append('signalType', params.signalType);
    if (params?.tokenId) queryParams.append('tokenId', params.tokenId);
    if (params?.recentHours) queryParams.append('recentHours', params.recentHours.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.request<any[]>(`/signals${query ? `?${query}` : ''}`);
  }

  async getSignal(id: string) {
    return this.request<any>(`/signals/${id}`);
  }

  // Tokens endpoints
  async getTokens(params?: { chain?: string; active?: boolean; withSignals?: boolean }) {
    const queryParams = new URLSearchParams();
    if (params?.chain) queryParams.append('chain', params.chain);
    if (params?.active !== undefined) queryParams.append('active', params.active.toString());
    if (params?.withSignals) queryParams.append('withSignals', 'true');

    const query = queryParams.toString();
    return this.request<any[]>(`/tokens${query ? `?${query}` : ''}`);
  }

  async getToken(id: string) {
    return this.request<any>(`/tokens/${id}`);
  }

  // Alerts endpoints
  async getAlerts() {
    return this.request<any[]>('/alerts');
  }

  async getMySubscriptions() {
    return this.request<any[]>('/alerts/my-subscriptions');
  }

  async subscribeToAlerts(tokenId: string, channels: { telegram?: boolean; email?: boolean }) {
    return this.request<any>('/alerts/subscribe', {
      method: 'POST',
      body: JSON.stringify({ tokenId, channels }),
    });
  }

  async unsubscribeFromAlerts(tokenId: string) {
    return this.request<any>('/alerts/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ tokenId }),
    });
  }

  // Whales endpoints
  async getTopBuyers(tokenId: string, hours: number = 24, limit: number = 10) {
    return this.request<any[]>(`/whales/top-buyers?tokenId=${tokenId}&hours=${hours}&limit=${limit}`);
  }

  async getExchangeFlows(tokenId?: string, exchange?: string, hours: number = 24) {
    const queryParams = new URLSearchParams();
    if (tokenId) queryParams.append('tokenId', tokenId);
    if (exchange) queryParams.append('exchange', exchange);
    queryParams.append('hours', hours.toString());
    return this.request<any>(`/whales/exchange-flows?${queryParams.toString()}`);
  }

  async getTokenWhaleActivity(tokenId: string, hours: number = 24) {
    return this.request<any>(`/whales/token/${tokenId}?hours=${hours}`);
  }

  // Orderbook endpoints
  async getOrderbook(symbol: string, exchange: string = 'binance') {
    return this.request<any>(`/orderbook/${symbol}?exchange=${exchange}`);
  }

  // Sell Walls endpoints
  async getSellWalls(params?: {
    exchange?: string;
    symbol?: string;
    activeOnly?: boolean;
    limit?: number;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.exchange) queryParams.append('exchange', params.exchange);
    if (params?.symbol) queryParams.append('symbol', params.symbol);
    if (params?.activeOnly !== undefined) queryParams.append('activeOnly', params.activeOnly.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const query = queryParams.toString();
    return this.request<any[]>(`/sell-walls${query ? `?${query}` : ''}`);
  }

  // Billing endpoints
  async createCheckoutSession(plan: string = 'PRO') {
    return this.request<{ sessionId: string; url: string }>('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan }),
    });
  }

  async createBillingPortalSession() {
    return this.request<{ url: string }>('/billing/portal', {
      method: 'POST',
    });
  }

  async getCurrentUser() {
    return this.request<any>('/users/me');
  }

  // Payment endpoints
  async createPayment(plan: string, paymentMethod: string, amount: number, currency?: string) {
    return this.request<any>('/payments', {
      method: 'POST',
      body: JSON.stringify({ plan, paymentMethod, amount, currency }),
    });
  }

  async getMyPayments(status?: string) {
    const query = status ? `?status=${status}` : '';
    return this.request<any[]>(`/payments/my${query}`);
  }

  async getPayment(paymentId: string) {
    return this.request<any>(`/payments/${paymentId}`);
  }

  async createBinancePayOrder(plan: string, amount: number, currency?: string) {
    return this.request<any>('/payments/binance-pay/create', {
      method: 'POST',
      body: JSON.stringify({ plan, amount, currency }),
    });
  }

  async verifyUSDTPayment(paymentId: string, txHash: string) {
    return this.request<any>(`/payments/${paymentId}/verify-usdt`, {
      method: 'POST',
      body: JSON.stringify({ txHash }),
    });
  }

  // Notification endpoints
  async getMyNotifications(limit?: number, unreadOnly?: boolean) {
    const query = new URLSearchParams();
    if (limit) query.append('limit', limit.toString());
    if (unreadOnly) query.append('unreadOnly', 'true');
    return this.request<any[]>(`/alerts/my-notifications?${query.toString()}`);
  }

  async getUnreadNotificationCount() {
    return this.request<{ count: number }>('/alerts/unread-count');
  }

  async markNotificationAsRead(notificationId: string) {
    return this.request<any>(`/alerts/${notificationId}/mark-read`, {
      method: 'PATCH',
    });
  }

  async markAllNotificationsAsRead() {
    return this.request<any>('/alerts/mark-all-read', {
      method: 'POST',
    });
  }

  // Public homepage endpoints (no auth required)
  async getHomepageStats() {
    return this.request<{
      walletsTracked: number;
      volumeTracked: number;
      alertsSent: number;
      accuracy: number;
    }>('/public/stats', {
      headers: { skipAuth: 'true' },
    });
  }

  async getTopAccumulatingTokens(limit: number = 10) {
    return this.request<any[]>(`/public/top-tokens?limit=${limit}`, {
      headers: { skipAuth: 'true' },
    });
  }

  async getRecentWhaleTransactions(limit: number = 10) {
    return this.request<any[]>(`/public/whale-transactions?limit=${limit}`, {
      headers: { skipAuth: 'true' },
    });
  }
}

export const api = new ApiClient(API_BASE_URL);

