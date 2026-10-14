// Lesson share links: https://cultivatestudy.com/lesson/?t=<64 hex>
// The token only admits a person once. This page never shows it and never sends
// it anywhere. It checks the format (the app finds out whether a well-formed
// token is still valid when it redeems it) and hands it to the app.
const LESSON_TOKEN_PATTERN = /^[0-9a-f]{64}$/i

export function normalizeLessonToken(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return LESSON_TOKEN_PATTERN.test(trimmed) ? trimmed.toLowerCase() : null
}

/** What "Open in Cultivate" runs. Matches the app's buildLessonAppLink. */
export function buildPillarLessonUrl(token: string): string {
  const normalized = normalizeLessonToken(token)
  if (!normalized) throw new Error('Invalid Lesson link.')
  return `pillar://lesson?t=${normalized}`
}

/** The link as it was shared, for "Copy link". */
export function buildShareUrl(token: string, origin: string): string {
  const normalized = normalizeLessonToken(token)
  if (!normalized) throw new Error('Invalid Lesson link.')
  return `${origin}/lesson/?t=${normalized}`
}

/** A phone or tablet (where the app can be). A computer shows "open this on your phone". */
export function isTouchDevice(userAgent: string, maxTouchPoints: number): boolean {
  return /android|iphone|ipad|ipod/i.test(userAgent) || (/macintosh/i.test(userAgent) && maxTouchPoints > 1)
}
