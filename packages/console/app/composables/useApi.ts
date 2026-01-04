// API composable for backend calls
const API_BASE = '/api';

interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
}

interface Channel {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  credentials: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  title: string;
  desp?: string;
  createdAt: string;
  deliveries: Array<{
    channelId: string;
    channelName: string;
    status: 'pending' | 'success' | 'failed';
    error?: string;
    sentAt?: string;
  }>;
}

interface User {
  sendKey: string;
  createdAt: string;
}

export function useApi() {
  const token = useCookie('auth_token');

  const headers = computed(() => ({
    'Content-Type': 'application/json',
    ...(token.value ? { Authorization: `Bearer ${token.value}` } : {}),
  }));

  // Generic request helper
  async function request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<ApiResponse<T>> {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: headers.value,
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  }

  // User APIs
  async function getUser(): Promise<ApiResponse<User>> {
    return request('GET', '/user');
  }

  async function regenerateSendKey(): Promise<ApiResponse<User>> {
    return request('POST', '/user/regenerate');
  }

  // Channel APIs
  async function getChannels(): Promise<ApiResponse<Channel[]>> {
    return request('GET', '/channels');
  }

  async function getChannel(id: string): Promise<ApiResponse<Channel>> {
    return request('GET', `/channels/${id}`);
  }

  async function createChannel(
    data: Omit<Channel, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<Channel>> {
    return request('POST', '/channels', data);
  }

  async function updateChannel(
    id: string,
    data: Partial<Channel>
  ): Promise<ApiResponse<Channel>> {
    return request('PUT', `/channels/${id}`, data);
  }

  async function deleteChannel(id: string): Promise<ApiResponse<void>> {
    return request('DELETE', `/channels/${id}`);
  }

  // Message APIs
  async function getMessages(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<{ items: Message[]; total: number }>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const queryStr = query.toString();
    return request('GET', `/messages${queryStr ? `?${queryStr}` : ''}`);
  }

  async function getMessage(id: string): Promise<ApiResponse<Message>> {
    return request('GET', `/messages/${id}`);
  }

  return {
    token,
    getUser,
    regenerateSendKey,
    getChannels,
    getChannel,
    createChannel,
    updateChannel,
    deleteChannel,
    getMessages,
    getMessage,
  };
}
