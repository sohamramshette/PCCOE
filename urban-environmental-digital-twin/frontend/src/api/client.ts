/**
 * Centralized API Client
 * Manages baseURL, JSON serialization, timeout, and structured error responses.
 */

const DEFAULT_API_URL = import.meta.env.PROD
  ? 'https://pccoe-75ji.onrender.com'
  : 'http://localhost:8000';

const RAW_API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  DEFAULT_API_URL;

const API_BASE_URL = RAW_API_URL.replace(/\/+$/, '');

export class ApiError extends Error {
  status: number;
  code: string;
  detail: string | { [key: string]: unknown }[];

  constructor(status: number, code: string, detail: string | { [key: string]: unknown }[]) {
    super(typeof detail === 'string' ? detail : JSON.stringify(detail));
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  params?: object;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 30000, params, ...customConfig } = options;

  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  const headers = new Headers(customConfig.headers || {});
  if (!headers.has('Content-Type') && !(customConfig.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');

  try {
    const response = await fetch(url, {
      ...customConfig,
      headers,
      signal: controller.signal,
    });

    clearTimeout(id);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { detail: response.statusText, code: `HTTP_${response.status}` };
      }

      const detail = errorData.detail || 'An error occurred during request.';
      const code = errorData.code || `HTTP_${response.status}`;
      throw new ApiError(response.status, code, detail);
    }

    // 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (error: unknown) {
    clearTimeout(id);
    if (error instanceof ApiError) {
      throw error;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError(408, 'REQUEST_TIMEOUT', `Request timed out after ${Math.round(timeoutMs / 1000)} seconds.`);
    }
    const message = error instanceof Error ? error.message : 'Network request failed';
    throw new ApiError(0, 'NETWORK_ERROR', `Unable to connect to backend at ${API_BASE_URL} (${message}). Ensure FastAPI is running.`);
  }
}
