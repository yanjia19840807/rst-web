const CLOCK_RE = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/

export type ClockParts = {
  hours: string
  minutes: string
  seconds: string
}

function pad(value: string) {
  return value.padStart(2, '0')
}

/** Midnight (`00:00`) is a real time. Only a blank or invalid string is empty. */
export function clockParts(value: string | null | undefined): ClockParts | null {
  const match = CLOCK_RE.exec((value ?? '').trim())
  if (!match) return null
  return {
    hours: pad(match[1]),
    minutes: match[2],
    seconds: pad(match[3] ?? '00'),
  }
}

export function hasClockValue(value: string | null | undefined) {
  return clockParts(value) != null
}

export function formatClock(value: string | null | undefined, fallback = '—') {
  const parts = clockParts(value)
  if (!parts) return fallback
  return `${parts.hours}:${parts.minutes}`
}

/** Blank hour or minute clears the time. `00` is kept. */
export function composeClock(hours: string, minutes: string, seconds = '00') {
  if (hours === '' || minutes === '' || seconds === '') return ''
  const parts = clockParts(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`)
  if (!parts) return ''
  return `${parts.hours}:${parts.minutes}:${parts.seconds}`
}
