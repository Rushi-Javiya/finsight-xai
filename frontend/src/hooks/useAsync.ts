import { useEffect, useState } from 'react'
import { isAbortError } from '../api/client'

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error' }

/** Runs `load` on mount (and whenever it changes). Remount the caller to reset to `loading`. */
export function useAsync<T>(load: (signal: AbortSignal) => Promise<T>): AsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: 'success', data })
      },
      (error: unknown) => {
        if (!controller.signal.aborted && !isAbortError(error)) setState({ status: 'error' })
      },
    )
    return () => controller.abort()
  }, [load])

  return state
}
