import { act, renderHook, waitFor } from '@testing-library/react'
import { ApiError } from '../api/client'
import { adviceFixture, jsonResponse, problemJson } from '../test/fixtures'
import { useAdvice } from './useAdvice'

const request = { income: 5000, expenses: 3000, age: 30, riskLevel: 'MEDIUM', country: 'US', topN: 8 } as const

describe('useAdvice', () => {
  it('starts idle, then moves through loading to success', async () => {
    let resolve: (response: Response) => void = () => {}
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>((r) => (resolve = r))))
    const { result } = renderHook(() => useAdvice())
    expect(result.current.state).toEqual({ status: 'idle' })

    act(() => {
      void result.current.submit(request)
    })
    expect(result.current.state.status).toBe('loading')

    await act(async () => resolve(jsonResponse(adviceFixture)))
    await waitFor(() => expect(result.current.state.status).toBe('success'))
    expect(result.current.state).toMatchObject({ data: adviceFixture, request })
  })

  it('exposes API errors with their field errors', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(problemJson(400, 'Validation failed', undefined, { age: 'too low' }))))
    const { result } = renderHook(() => useAdvice())

    await act(() => result.current.submit(request))

    const state = result.current.state
    expect(state.status).toBe('error')
    if (state.status === 'error') {
      expect(state.error).toBeInstanceOf(ApiError)
      expect(state.error.fieldErrors).toEqual({ age: 'too low' })
    }
  })

  it('aborts the in-flight request when a newer one starts and ignores its result', async () => {
    const signals: AbortSignal[] = []
    const resolvers: ((response: Response) => void)[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        if (init.signal) signals.push(init.signal)
        return new Promise<Response>((resolve, reject) => {
          resolvers.push(resolve)
          init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        })
      }),
    )
    const { result } = renderHook(() => useAdvice())

    act(() => {
      void result.current.submit(request)
    })
    act(() => {
      void result.current.submit({ ...request, age: 40 })
    })
    expect(signals[0]?.aborted).toBe(true)
    expect(signals[1]?.aborted).toBe(false)

    await act(async () => resolvers[1]?.(jsonResponse({ ...adviceFixture, id: 99 })))
    await waitFor(() => expect(result.current.state.status).toBe('success'))
    expect(result.current.state).toMatchObject({ data: { id: 99 }, request: { age: 40 } })
  })

  it('retries the last request after a failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(problemJson(503, 'Service unavailable'))
      .mockResolvedValueOnce(jsonResponse(adviceFixture))
    vi.stubGlobal('fetch', fetchMock)
    const { result } = renderHook(() => useAdvice())

    await act(() => result.current.submit(request))
    expect(result.current.state.status).toBe('error')

    await act(async () => result.current.retry())
    await waitFor(() => expect(result.current.state.status).toBe('success'))
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1].body))).toEqual(request)
  })

  it('aborts the pending request on unmount', () => {
    let signal: AbortSignal | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => {
        signal = init.signal ?? undefined
        return new Promise<Response>(() => {})
      }),
    )
    const { result, unmount } = renderHook(() => useAdvice())
    act(() => {
      void result.current.submit(request)
    })

    unmount()

    expect(signal?.aborted).toBe(true)
  })
})
