/**
 * Base API Service for AWS API Gateway Integration
 * Web version matching mobile implementation
 */

import { API_BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/env';

// Error types for better error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends ApiError {
  constructor(message = 'Network connection failed') {
    super(message, 0, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends ApiError {
  constructor(message = 'Request timed out') {
    super(message, 408, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
  }
}

// API Configuration
const API_CONFIG = {
  // BASE_URL: API_BASE_URL || 'https://your-api-gateway-url.amazonaws.com',
  BASE_URL: SUPABASE_URL + '/functions/v1' || 'https://your-supabase-url.supabase.co/rest/v1',
  TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

interface RequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

interface RequestInterceptor {
  (config: RequestConfig): Promise<RequestConfig>;
}

interface ResponseInterceptor {
  (response: any): Promise<any>;
}

function isJsonResponse(res: Response) {
  const ct = res.headers?.get?.('content-type') || '';
  return ct.toLowerCase().includes('application/json');
}

async function safeParseJson(res: Response) {
  if (res.status === 204 || res.status === 205) return {};
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(
      `Bad JSON from ${res.url}`,
      res.status,
      'BAD_JSON',
      { body: text.slice(0, 200) }
    );
  }
}

class ApiService {
  private baseURL: string;
  private defaultTimeout: number;
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor() {
    this.baseURL = API_CONFIG.BASE_URL;
    this.defaultTimeout = API_CONFIG.TIMEOUT;
    
    // Add default request interceptor for authentication
    this.addRequestInterceptor(this.authInterceptor);
    
    // Add default response interceptor for error handling
    this.addResponseInterceptor(this.errorInterceptor);
  }

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  // Authentication interceptor - adds JWT token to requests
  private authInterceptor: RequestInterceptor = async (config) => {
    try {
      // const authData = localStorage.getItem('shalom_auth');
      // let token = null;
      
      // if (authData) {
      //   const parsed = JSON.parse(authData);
      //   token = parsed.IdToken || parsed.AccessToken;
      // }
      
      if (SUPABASE_ANON_KEY) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          // supabase specific
          apikey: SUPABASE_ANON_KEY,
        };
      }

      // Only set Content-Type: application/json if not sending File, Blob, or ArrayBuffer
      if (
        !(config.body instanceof File) &&
        !(config.body instanceof Blob) &&
        !(config.body instanceof ArrayBuffer)
      ) {
        config.headers = {
          ...config.headers,
          'Content-Type': 'application/json',
        };
      } else {
        // Use whatever Content-Type is set in config.headers (from caller)
        config.headers = {
          ...config.headers,
        };
      }
    } catch (error) {
      console.warn('Failed to retrieve auth token:', error);
      config.headers = {
        ...config.headers,
        'Content-Type': 'application/json',
      };
    }
    return config;
  };

  // Error handling interceptor
  private errorInterceptor: ResponseInterceptor = async (response) => {
    if (!response.ok) {
      const clone = response.clone();
      let errorData: any = {};
      try {
        errorData = isJsonResponse(clone)
          ? await safeParseJson(clone)
          : { body: await clone.text() };
      } catch { /* leave errorData minimal */ }

      switch (response.status) {
        case 400: throw new ApiError('Bad Request', 400, 'BAD_REQUEST', errorData);
        case 401: throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED', errorData);
        case 403: throw new ApiError('Forbidden', 403, 'FORBIDDEN', errorData);
        case 404: throw new ApiError('Not Found', 404, 'NOT_FOUND', errorData);
        case 429: throw new ApiError('Too Many Requests', 429, 'RATE_LIMIT', errorData);
        case 500: throw new ApiError('Internal Server Error', 500, 'SERVER_ERROR', errorData);
        case 502: throw new ApiError('Bad Gateway', 502, 'BAD_GATEWAY', errorData);
        case 503: throw new ApiError('Service Unavailable', 503, 'SERVICE_UNAVAILABLE', errorData);
        default:  throw new ApiError(`HTTP Error ${response.status}`, response.status, 'HTTP_ERROR', errorData);
      }
    }
    return response;
  };

  private buildQueryString(params: Record<string, string>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value);
      }
    });
    return searchParams.toString();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async makeRequest<T>(config: RequestConfig): Promise<T> {
    let processedConfig = config;
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }

    const { url, method, headers, body, params, timeout = this.defaultTimeout, retries = API_CONFIG.MAX_RETRIES } = processedConfig;

    let fullUrl = `${this.baseURL}${url}`;
    if (params) {
      const queryString = this.buildQueryString(params);
      if (queryString) {
        fullUrl += `?${queryString}`;
      }
    }

    // Only set Content-Type: application/json if not sending File, Blob, or ArrayBuffer
    const computedHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...headers,
    };
    if (
      !(body instanceof File) &&
      !(body instanceof Blob) &&
      !(body instanceof ArrayBuffer)
    ) {
      computedHeaders['Content-Type'] =
        computedHeaders['Content-Type'] || 'application/json';
    }

    const requestOptions: RequestInit = {
      method,
      headers: computedHeaders,
    };

    if (
      body instanceof File ||
      body instanceof Blob ||
      body instanceof ArrayBuffer
    ) {
      requestOptions.body = body as BodyInit;
    } else {
      requestOptions.body =
        typeof body === 'string' ? body : JSON.stringify(body);
    }

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(fullUrl, {
          ...requestOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        let processedResponse = response;
        for (const interceptor of this.responseInterceptors) {
          processedResponse = await interceptor(processedResponse);
        }

        const data = isJsonResponse(processedResponse)
          ? await safeParseJson(processedResponse)
          : {};

        return data;

      } catch (error) {
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new TimeoutError();
          }
          if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
            if (attempt < retries) {
              await this.sleep(API_CONFIG.RETRY_DELAY * (attempt + 1));
              continue;
            }
            throw new NetworkError();
          }
        }

        if (error instanceof ApiError) {
          throw error;
        }

        if (attempt >= retries) {
          throw new ApiError(
            error instanceof Error ? error.message : 'Unknown error occurred',
            undefined,
            'UNKNOWN_ERROR',
            error
          );
        }

        await this.sleep(API_CONFIG.RETRY_DELAY * (attempt + 1));
      }
    }

    throw new ApiError('Max retries exceeded', undefined, 'MAX_RETRIES_EXCEEDED');
  }

  async get<T>(url: string, params?: Record<string, string>, config?: Partial<RequestConfig>): Promise<T> {
    return this.makeRequest<T>({
      url,
      method: 'GET',
      params,
      ...config,
    });
  }

  async post<T>(url: string, body?: any, config?: Partial<RequestConfig>): Promise<T> {
    return this.makeRequest<T>({
      url,
      method: 'POST',
      body,
      ...config,
    });
  }

  async put<T>(url: string, body?: any, config?: Partial<RequestConfig>): Promise<T> {
    return this.makeRequest<T>({
      url,
      method: 'PUT',
      body,
      ...config,
    });
  }

  async patch<T>(url: string, body?: any, config?: Partial<RequestConfig>): Promise<T> {
    return this.makeRequest<T>({
      url,
      method: 'PATCH',
      body,
      ...config,
    });
  }

  async delete<T>(url: string, config?: Partial<RequestConfig>): Promise<T> {
    return this.makeRequest<T>({
      url,
      method: 'DELETE',
      ...config,
    });
  }

  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      return await this.get('/health');
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      };
    }
  }

  setBaseURL(url: string) {
    this.baseURL = url;
  }

  getBaseURL(): string {
    return this.baseURL;
  }
}

export const apiService = new ApiService();
export default apiService;
