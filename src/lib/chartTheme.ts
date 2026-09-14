import { computed } from 'vue'

import { useTheme } from '@/composables/useTheme'

/**
 * Chart series colors for ECharts. Do not pass raw CSS variables:
 * `getComputedStyle` can still be the previous theme, and values like
 * `rgb(255 255 255 / 12%)` are not valid canvas colors.
 */
export type ChartColors = {
  volume: string
  maxOt: string
  forecast: string
  overcapacity: string
  overtime: string
  axis: string
  border: string
  theoretical: string
  target: string
  cumulative: string
  daily: string
  rolling: string
  limit: string
  center: string
  outlier: string
}

const LIGHT: ChartColors = {
  volume: '#071d49',
  maxOt: '#315f9b',
  forecast: '#79a6d2',
  overcapacity: '#da291c',
  overtime: '#4e7d69',
  axis: '#14233a',
  border: '#d4dde9',
  theoretical: '#14233a',
  target: '#a6a6a6',
  cumulative: '#548235',
  daily: '#14233a',
  rolling: '#0f6b78',
  limit: '#da291c',
  center: '#315f9b',
  outlier: '#d98b16',
}

const DARK: ChartColors = {
  volume: '#90b8e7',
  maxOt: '#5f8fc6',
  forecast: '#b9d2ed',
  overcapacity: '#ff675e',
  overtime: '#79b99b',
  axis: '#f3f6fa',
  border: 'rgba(255, 255, 255, 0.12)',
  theoretical: '#f3f6fa',
  target: '#c8c8c8',
  cumulative: '#8fbc5a',
  daily: '#f3f6fa',
  rolling: '#4ecbd6',
  limit: '#ff675e',
  center: '#5f8fc6',
  outlier: '#f0a93b',
}

export const CHART_UPDATE_OPTIONS = { notMerge: true } as const

export function chartColors(theme: 'light' | 'dark'): ChartColors {
  return theme === 'dark' ? DARK : LIGHT
}

export function useChartTheme() {
  const { theme } = useTheme()
  const colors = computed(() => chartColors(theme.value))
  return { theme, colors, updateOptions: CHART_UPDATE_OPTIONS }
}
