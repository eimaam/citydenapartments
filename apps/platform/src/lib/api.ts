import axios, { type AxiosError, type AxiosResponse } from 'axios';

export class ApiError extends Error {
  status: number;
  endpoint: string;
  data: unknown;

  constructor(message: string, status: number, endpoint: string, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.endpoint = endpoint;
    this.data = data;
  }
}

const client = axios.create({
  baseURL: import.meta.env.API_BASE_URL || "http://localhost:3000/api/v1",
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// jwt
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// validate + log errors
client.interceptors.response.use(
  (res) => {
    const body = res.data;
    if (body?.success === false) {
      if (res.status === 401) localStorage.removeItem('token');
      throw new ApiError(body.message ?? 'Request failed', res.status, res.config.url ?? '', body);
    }
    return res;
  },
  (error: AxiosError<{ success?: boolean; message?: string }>) => {
    const status = error.response?.status ?? 0;
    const body = error.response?.data;
    const msg = body?.message ?? error.message ?? 'Network error';
    const url = error.config?.url ?? '';

    if (status === 401) localStorage.removeItem('token');

    console.error(
      `[API] ${error.config?.method?.toUpperCase() ?? '?'} ${url} → ${status}`,
      '\n  message:', msg,
      '\n  payload:', error.config?.data ?? undefined,
    );

    throw new ApiError(msg, status, url, body);
  },
);

// extract the `data` field from the API response 
async function request<T>(req: Promise<AxiosResponse<{ success: boolean; message: string; data: T }>>): Promise<T> {
  const res = await req;
  return res.data.data;
}

export const api = {
  get: <T>(url: string) => request<T>(client.get(url)),
  post: <T>(url: string, body?: unknown) => request<T>(client.post(url, body)),
  put: <T>(url: string, body?: unknown) => request<T>(client.put(url, body)),
  patch: <T>(url: string, body?: unknown) => request<T>(client.patch(url, body)),
  delete: <T>(url: string) => request<T>(client.delete(url)),
};
