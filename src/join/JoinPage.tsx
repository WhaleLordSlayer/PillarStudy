import { useState } from 'react'
import { buildPillarJoinUrl, normalizeInviteToken, normalizeJoinCode } from './invite'

type CopyState = 'idle' | 'copied' | 'failed'

async function copyText(value: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value)
      return true
    } catch {
      // Fall through to the older browser clipboard path.
    }
  }

  const textArea = document.createElement('textarea')
  textArea.value = value
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  document.body.appendChild(textArea)
  textArea.select()
  let copied = false
  try {
    copied = document.execCommand('copy')
  } catch {
    copied = false
  }
  document.body.removeChild(textArea)
  return copied
}

export default function JoinPage() {
  const params = new URLSearchParams(window.location.search)
  const code = normalizeJoinCode(params.get('code'))
  const inviteToken = normalizeInviteToken(params.get('inviteToken'))
  const [copyState, setCopyState] = useState<CopyState>('idle')

  if (!code || !inviteToken) {
    const displayCode = code
    const hasDisplayCode = Boolean(displayCode)
    return (
      <main className="join-page">
        <section className="join-card join-card-invalid" aria-labelledby="invalid-title">
          <div className="join-brand" aria-label="Cultivate Study">
            <span className="join-brand-mark" aria-hidden="true">✦</span>
            <span>Cultivate Study</span>
          </div>
          <p className="join-eyebrow">Group invite</p>
          <h1 id="invalid-title">This invite link {hasDisplayCode ? 'is incomplete' : 'isn’t valid'}</h1>
          <p className="join-copy">
            {hasDisplayCode
              ? 'Ask your friend for a fresh Cultivate invite link. A secure invite link is required to open Cultivate.'
              : 'Ask your friend for a fresh Cultivate invite link.'}
          </p>
          {hasDisplayCode && (
            <div className="join-code-panel">
              <div>
                <p className="join-label">Join code</p>
                <p className="join-code" aria-label={`Join code ${displayCode}`}>{displayCode}</p>
              </div>
              <button className="join-copy-button" type="button" onClick={async () => setCopyState(await copyText(displayCode) ? 'copied' : 'failed')}>
                {copyState === 'copied' ? 'Copied' : 'Copy Code'}
              </button>
            </div>
          )}
          <a className="join-secondary-link" href="/">Return to Cultivate</a>
        </section>
      </main>
    )
  }

  const handleCopy = async () => {
    setCopyState(await copyText(code) ? 'copied' : 'failed')
  }

  const handleOpen = () => {
    // Opening the installed app is always an explicit user action. The page
    // remains the fallback when the custom scheme is unavailable.
    window.location.assign(buildPillarJoinUrl(code, inviteToken))
  }

  return (
    <main className="join-page">
      <section className="join-card" aria-labelledby="join-title">
        <div className="join-brand" aria-label="Cultivate Study">
          <span className="join-brand-mark" aria-hidden="true">✦</span>
          <span>Cultivate Study</span>
        </div>

        <div className="join-hero-icon" aria-hidden="true">⌂</div>
        <p className="join-eyebrow">You’re invited</p>
        <h1 id="join-title">Study together in Cultivate</h1>
        <p className="join-copy">Join this scripture study group in Cultivate.</p>

        <button className="join-primary-button" type="button" onClick={handleOpen}>
          Open Cultivate
          <span aria-hidden="true">→</span>
        </button>

        <div className="join-code-panel">
          <div>
            <p className="join-label">Join code</p>
            <p className="join-code" aria-label={`Join code ${code}`}>{code}</p>
          </div>
          <button className="join-copy-button" type="button" onClick={handleCopy}>
            {copyState === 'copied' ? 'Copied' : 'Copy Code'}
          </button>
        </div>

        <p className="join-fallback">
          <strong>Cultivate not installed yet?</strong><br />
          Cultivate is coming soon. Save this invitation and use the code when you install the app.
        </p>
        {copyState === 'failed' && (
          <p className="join-status" role="status">Copy didn’t work — press and hold the code to copy it.</p>
        )}
      </section>
    </main>
  )
}
