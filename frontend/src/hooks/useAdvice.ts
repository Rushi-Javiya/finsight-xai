import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, getAdvice, isAbortError } from '../api/client'
import type { AdviceRequest, AdviceResponse } from '../api/types'

export type AdviceState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: AdviceResponse; request: AdviceRequest }
  | { status: 'error'; error: ApiError }

export function useAdvice() {
  const [state, setState] = useState<AdviceState>({ status: 'idle' })
  const controller = useRef<AbortController | null>(null)
  const lastRequest = useRef<AdviceRequest | null>(null)

  const submit = useCallback(async (request: AdviceRequest) => {
    controller.current?.abort()
    const current = new AbortController()
    controller.current = current
    lastRequest.current = request
    setState({ status: 'loading' })
    try {
      const data = await getAdvice(request, current.signal)
      if (!current.signal.aborted) setState({ status: 'success', data, request })
    } catch (error) {
      if (current.signal.aborted || isAbortError(error)) return
      setState({
        status: 'error',
        error: error instanceof ApiError ? error : new ApiError(0, 'Unexpected error', 'Something went wrong. Please try again.'),
      })
    }
  }, [])

  const retry = useCallback(() => {
    if (lastRequest.current) void submit(lastRequest.current)
  }, [submit])

  useEffect(() => () => controller.current?.abort(), [])

  return { state, submit, retry }
}
