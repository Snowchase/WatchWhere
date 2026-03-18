import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'
import { ApiError } from '../types'

export interface ClientConfig {
  baseURL: string
  token?: string
  timeout?: number
}

/**
 * Creates a configured Axios instance for WatchWhere API calls.
 * Each call can pass a different baseURL so the same factory works
 * for web, mobile, and server-side usage without a singleton.
 */
export function createClient(config: ClientConfig): AxiosInstance {
  const instance = axios.create({
    baseURL: config.baseURL,
    timeout: config.timeout ?? 10_000,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
    },
  })

  // Response interceptor — normalise errors into ApiError shape
  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error) => {
      if (error.response) {
        const apiError: ApiError = {
          code: error.response.data?.code ?? 'UNKNOWN_ERROR',
          message: error.response.data?.message ?? error.message,
          status: error.response.status,
        }
        return Promise.reject(apiError)
      }

      if (error.request) {
        const networkError: ApiError = {
          code: 'NETWORK_ERROR',
          message: 'No response received from server. Check your connection.',
          status: 0,
        }
        return Promise.reject(networkError)
      }

      const unknownError: ApiError = {
        code: 'REQUEST_SETUP_ERROR',
        message: error.message,
        status: 0,
      }
      return Promise.reject(unknownError)
    },
  )

  return instance
}

/**
 * Lightweight helper that performs a single GET without retaining
 * an Axios instance — useful for one-off calls in utility code.
 */
export async function get<T>(
  path: string,
  baseURL: string,
  params?: Record<string, unknown>,
  token?: string,
): Promise<T> {
  const client = createClient({ baseURL, token })
  const response = await client.get<T>(path, { params } as AxiosRequestConfig)
  return response.data
}

/**
 * Lightweight helper that performs a single POST.
 */
export async function post<T>(
  path: string,
  body: unknown,
  baseURL: string,
  token?: string,
): Promise<T> {
  const client = createClient({ baseURL, token })
  const response = await client.post<T>(path, body)
  return response.data
}

/**
 * Lightweight helper that performs a single DELETE.
 */
export async function del<T>(
  path: string,
  baseURL: string,
  token?: string,
): Promise<T> {
  const client = createClient({ baseURL, token })
  const response = await client.delete<T>(path)
  return response.data
}
