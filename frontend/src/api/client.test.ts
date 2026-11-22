import { adviceFixture, historyFixture, jsonResponse, problemJson, stockDetailFixture } from '../test/fixtures'
import { ApiError, getAdvice, getAdviceHistory, getStockDetail, isAbortError } from './client'

const request = { income: 5000, expenses: 3000, age: 30, riskLevel: 'MEDIUM', country: 'US', topN: 8 } as const

function stubFetch(handler: (url: string, init: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn((url: string, init: RequestInit) => handler(url, init))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('getAdvice', () => {
  it('POSTs the JSON body and returns the parsed response', async () => {
    const fetchMock = stubFetch(() => Promise.resolve(jsonResponse(adviceFixture)))

    await expect(getAdvice(request)).resolves.toEqual(adviceFixture)

    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('/api/v1/advice')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual(request)
    expect(init?.headers).toMatchObject({ 'Content-Type': 'application/json' })
  })

  it('parses problem+json validation errors into an ApiError', async () => {
    stubFetch(() =>
      Promise.resolve(problemJson(400, 'Validation failed', 'Request validation failed', { income: 'must be greater than 0' })),
    )

    const error = await getAdvice(request).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 400,
      title: 'Validation failed',
      detail: 'Request validation failed',
      fieldErrors: { income: 'must be greater than 0' },
      message: 'Request validation failed',
    })
  })

  it('falls back to the status line when the error body is not JSON', async () => {
    stubFetch(() => Promise.resolve(new Response('<html>Bad gateway</html>', { status: 502, statusText: 'Bad Gateway' })))

    const error = await getAdvice(request).catch((caught: unknown) => caught)

    expect(error).toMatchObject({ status: 502, title: 'Bad Gateway', fieldErrors: {} })
  })

  it('maps network failures to an ApiError with status 0', async () => {
    stubFetch(() => Promise.reject(new TypeError('Failed to fetch')))

    const error = await getAdvice(request).catch((caught: unknown) => caught)

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 0, title: 'Network error' })
  })

  it('passes the AbortSignal through and rethrows aborts untouched', async () => {
    const fetchMock = stubFetch(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
    )
    const controller = new AbortController()

    const pending = getAdvice(request, controller.signal)
    controller.abort()

    const error = await pending.catch((caught: unknown) => caught)
    expect(isAbortError(error)).toBe(true)
    expect(error).not.toBeInstanceOf(ApiError)
    expect(fetchMock.mock.calls[0]?.[1].signal).toBe(controller.signal)
  })
})

describe('getAdviceHistory', () => {
  it('requests the history with a limit', async () => {
    const fetchMock = stubFetch(() => Promise.resolve(jsonResponse(historyFixture)))

    await expect(getAdviceHistory(5)).resolves.toEqual(historyFixture)
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/advice/history?limit=5')
  })
})

describe('getStockDetail', () => {
  it('encodes the ticker and passes risk level and country', async () => {
    const fetchMock = stubFetch(() => Promise.resolve(jsonResponse(stockDetailFixture)))

    await getStockDetail('BRK.B', { riskLevel: 'HIGH', country: 'IN' })

    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/stocks/BRK.B?riskLevel=HIGH&country=IN')
    expect(fetchMock.mock.calls[0]?.[1].method).toBeUndefined()
  })
})
