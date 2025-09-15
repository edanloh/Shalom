/**
 * Base API Service for AWS API Gateway Integration
 * Industry-standard HTTP client with proper error handling, retries, and interceptors
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
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
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`,
        };
      }
    } catch (error) {
      console.warn('Failed to retrieve auth token:', error);
    }
    return config;
  };

  // Error handling interceptor
  private errorInterceptor: ResponseInterceptor = async (response) => {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      switch (response.status) {
        case 400:
          throw new ApiError('Bad Request', 400, 'BAD_REQUEST', errorData);
        case 401:
          throw new ApiError('Unauthorized', 401, 'UNAUTHORIZED', errorData);
        case 403:
          throw new ApiError('Forbidden', 403, 'FORBIDDEN', errorData);
        case 404:
          throw new ApiError('Not Found', 404, 'NOT_FOUND', errorData);
        case 429:
          throw new ApiError('Too Many Requests', 429, 'RATE_LIMIT', errorData);
        case 500:
          throw new ApiError('Internal Server Error', 500, 'SERVER_ERROR', errorData);
        case 502:
          throw new ApiError('Bad Gateway', 502, 'BAD_GATEWAY', errorData);
        case 503:
          throw new ApiError('Service Unavailable', 503, 'SERVICE_UNAVAILABLE', errorData);
        default:
          throw new ApiError(`HTTP Error ${response.status}`, response.status, 'HTTP_ERROR', errorData);
      }
    }
    return response;
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

        const rawData = await processedResponse.json();
        
        // Handle AWS API Gateway response format where actual data is in body as JSON string
        if (rawData.body && typeof rawData.body === 'string') {
          try {
            const parsedBody = JSON.parse(rawData.body);
            // Return the parsed data directly if it has success/data structure
            if (parsedBody.success && parsedBody.data) {
              return parsedBody.data;
            }
            return parsedBody;
          } catch (parseError) {
            console.warn('Failed to parse response body JSON:', parseError);
            return rawData;
          }
        }
        
        return rawData;

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