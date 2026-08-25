const JOIN_CODE_PATTERN = /^[0-9A-F]{6}$/

export function normalizeJoinCode(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  return JOIN_CODE_PATTERN.test(normalized) ? normalized : null
}

export function buildPillarJoinUrl(joinCode: string): string {
  const normalized = normalizeJoinCode(joinCode)
  if (!normalized) throw new Error('Invalid group join code.')
  return `pillar://groups?joinCode=${encodeURIComponent(normalized)}`
}
