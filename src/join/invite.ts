const JOIN_CODE_PATTERN = /^[0-9A-F]{6}$/
const INVITE_TOKEN_PATTERN = /^[0-9a-f]{64}$/i

export function normalizeJoinCode(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim().toUpperCase()
  return JOIN_CODE_PATTERN.test(normalized) ? normalized : null
}

export function normalizeInviteToken(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return INVITE_TOKEN_PATTERN.test(trimmed) ? trimmed : null
}

export function buildPillarJoinUrl(joinCode: string, inviteToken: string): string {
  const normalized = normalizeJoinCode(joinCode)
  const token = normalizeInviteToken(inviteToken)
  if (!normalized || !token) throw new Error('Invalid secure Study Space invite.')
  return `pillar://groups?joinCode=${encodeURIComponent(normalized)}&inviteToken=${encodeURIComponent(token)}`
}
