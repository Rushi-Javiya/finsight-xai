import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { createElement } from 'react'
import { afterEach, beforeEach, vi } from 'vitest'

vi.mock('react-chartjs-2', () => {
  const chart = (kind: string) => (props: { 'aria-label'?: string }) =>
    createElement('div', { role: 'img', 'aria-label': props['aria-label'], 'data-chart': kind })
  return { Bar: chart('bar'), Doughnut: chart('doughnut'), Line: chart('line'), Scatter: chart('scatter') }
})

beforeEach(() => {
  window.localStorage.clear()
  HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as HTMLCanvasElement['getContext']
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
