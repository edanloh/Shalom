/**
 * Base API Service for AWS API Gateway Integration
 * Industry-standard HTTP client with proper error handling, retries, and interceptors
 */

import * as SecureStore from 'expo-secure-store';
import { ApiResponse, PaginatedResponse } from '../types';

// API Configuration
const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://your-api-gateway-url.amazonaws.com',
  TIMEOUT: 10000, // 10 seconds
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
};

// Error types for better error handling
export class ApiError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
  details?: any;
  data?: any;
  headers?: Record<string, string | null>;

  constructor(
    message: string,
    status?: number,
    code?: string,
    details?: any,
    headers?: Record<string, string | null>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusCode = status;
    this.code = code;
    this.details = details;
    this.data = details;
    this.headers = headers;
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

// Request/Response interceptors
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
  // 204/205 are no-content by spec
  if (res.status === 204 || res.status === 205) return {};
  const text = await res.text();            // don't call res.json() blindly
  if (!text) return {};                     // empty body → harmless empty object
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

  // Add request interceptor
  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  // Authentication interceptor - adds JWT token to requests
  private authInterceptor: RequestInterceptor = async (config) => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      if (token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`,
        };
      }
      // Always add Content-Type header
      config.headers = {
        ...config.headers,
        'Content-Type': 'application/json',
      };
    } catch (error) {
      console.warn('Failed to retrieve auth token:', error);
      // Even if auth fails, add Content-Type header
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
      // Clone so we can safely read the body
      const clone = response.clone();

      let errorData: any = {};
      try {
        errorData = isJsonResponse(clone)
          ? await safeParseJson(clone)
          : { body: await clone.text() };
      } catch {
        // leave errorData minimal
      }

      // Prefer server's message if present
      const serverMsg =
      (errorData && (errorData.message || errorData.error || errorData.reason)) ||
        (typeof errorData === 'string' ? errorData : undefined);

      // Capture useful IDs for CloudWatch correlation
      const hdrs = {
        'apigw-requestid': response.headers.get('apigw-requestid'),
        'x-amzn-requestid': response.headers.get('x-amzn-requestid'),
        'x-lambda-fn': response.headers.get('x-lambda-fn'),
        'x-lambda-ver': response.headers.get('x-lambda-ver'),
        'x-lambda-req': response.headers.get('x-lambda-req'),
      };

      const status = response.status;
      const codeMap: Record<number, string> = {
        400: 'BAD_REQUEST',
        401: 'UNAUTHORIZED',
        403: 'FORBIDDEN',
        404: 'NOT_FOUND',
        409: 'CONFLICT',
        429: 'RATE_LIMIT',
        500: 'SERVER_ERROR',
        502: 'BAD_GATEWAY',
        503: 'SERVICE_UNAVAILABLE',
      };

      const err = new ApiError(
        serverMsg || `HTTP ${status}`,
        status,
        codeMap[status] || 'HTTP_ERROR',
        errorData,
        hdrs
      );

      // helpful console for debugging
      console.log('[HTTP ✖]', response.url, status, hdrs, errorData);
      throw err;
    }

    return response; // ok → let makeRequest() parse the body
  };


  // Build query string from parameters
  private buildQueryString(params: Record<string, string>): string {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, value);
      }
    });
    return searchParams.toString();
  }

  // Sleep function for retry delays
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Core request method with retry logic
  private async makeRequest<T>(config: RequestConfig): Promise<T> {
    // Apply request interceptors
    let processedConfig = config;
    for (const interceptor of this.requestInterceptors) {
      processedConfig = await interceptor(processedConfig);
    }

    const { url, method, headers, body, params, timeout = this.defaultTimeout, retries = API_CONFIG.MAX_RETRIES } = processedConfig;

    // Build full URL
    let fullUrl = `${this.baseURL}${url}`;
    if (params) {
      const queryString = this.buildQueryString(params);
      if (queryString) {
        fullUrl += `?${queryString}`;
      }
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...headers,
      },
    };

    if (body && method !== 'GET') {
      requestOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    // Retry logic
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(fullUrl, {
          ...requestOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Apply response interceptors
        let processedResponse = response;
        for (const interceptor of this.responseInterceptors) {
          processedResponse = await interceptor(processedResponse);
        }

        // If we got here, response.ok is true (otherwise the interceptor threw).
        // Parse the body ONCE, safely.
        const data = isJsonResponse(processedResponse)
          ? await safeParseJson(processedResponse)
          : {}; // or { raw: await processedResponse.text() } if you want text for non-JSON

        return data;

      } catch (error) {
        // Handle different types of errors
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            throw new TimeoutError();
          }
          if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
            if (attempt < retries) {
              await this.sleep(API_CONFIG.RETRY_DELAY * (attempt + 1)); // Exponential backoff
              continue;
            }
            throw new NetworkError();
          }
        }

        // If it's already an ApiError, don't wrap it
        if (error instanceof ApiError) {
          throw error;
        }

        // Last attempt or unknown error
        if (attempt >= retries) {
          throw new ApiError(
            error instanceof Error ? error.message : 'Unknown error occurred',
            undefined,
            'UNKNOWN_ERROR',
            error
          );
        }

        // Wait before retrying
        await this.sleep(API_CONFIG.RETRY_DELAY * (attempt + 1));
      }
    }

    throw new ApiError('Max retries exceeded', undefined, 'MAX_RETRIES_EXCEEDED');
  }

  // Public HTTP methods
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

  // Health check method
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

  // Set base URL (useful for switching between environments)
  setBaseURL(url: string) {
    this.baseURL = url;
  }

  // Get current base URL
  getBaseURL(): string {
    return this.baseURL;
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;