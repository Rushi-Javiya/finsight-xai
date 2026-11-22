import type {
  AdviceHistoryItem,
  AdviceRequest,
  AdviceResponse,
  Country,
  ProblemDocument,
  RiskLevel,
  StockDetail,
} from './types'

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  readonly status: number
  readonly title: string
  readonly detail: string | undefined
  readonly fieldErrors: Record<string, string>

  constructor(status: number, title: string, detail?: string, fieldErrors: Record<string, string> = {}) {
    super(detail ?? title)
    this.name = 'ApiError'
    this.status = status
    this.title = title
    this.detail = detail
    this.fieldErrors = fieldErrors
  }
}

export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === 'AbortError'

async function toApiError(response: Response): Promise<ApiError> {
  const problem: ProblemDocument | null = await response.json().then(
    (body: ProblemDocument | null) => body,
    () => null,
  )
  const title = problem?.title ?? (response.statusText || `Request failed (${response.status})`)
  return new ApiError(problem?.status ?? response.status, title, problem?.detail, problem?.errors ?? {})
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
    })
  } catch (error) {
    if (isAbortError(error)) throw error
    throw new ApiError(0, 'Network error', 'The server could not be reached. Check your connection and try again.')
  }
  if (!response.ok) throw await toApiError(response)
  return (await response.json()) as T
}

export const getAdvice = (body: AdviceRequest, signal?: AbortSignal) =>
  request<AdviceResponse>('/api/v1/advice', { method: 'POST', body: JSON.stringify(body), signal })

export const getAdviceHistory = (limit = 20, signal?: AbortSignal) =>
  request<AdviceHistoryItem[]>(`/api/v1/advice/history?limit=${limit}`, { signal })

export const getStockDetail = (
  ticker: string,
  params: { riskLevel: RiskLevel; country: Country },
  signal?: AbortSignal,
) => {
  const query = new URLSearchParams(params)
  return request<StockDetail>(`/api/v1/stocks/${encodeURIComponent(ticker)}?${query}`, { signal })
}
