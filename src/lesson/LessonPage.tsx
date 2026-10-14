import { useState } from 'react'
import { buildPillarLessonUrl, buildShareUrl, isTouchDevice, normalizeLessonToken } from './token'

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

function Brand() {
  return (
    <div className="join-brand" aria-label="Cultivate">
      <span className="join-brand-mark" aria-hidden="true">✦</span>
      <span>Cultivate</span>
    </div>
  )
}

export default function LessonPage() {
  const token = normalizeLessonToken(new URLSearchParams(window.location.search).get('t'))
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const onPhone = isTouchDevice(navigator.userAgent, navigator.maxTouchPoints)

  if (!token) {
    return (
      <main className="join-page">
        <section className="join-card join-card-invalid" aria-labelledby="invalid-title">
          <Brand />
          <p className="join-eyebrow">Lesson link</p>
          <h1 id="invalid-title">This link isn’t valid</h1>
          <p className="join-copy">The link looks incomplete. Ask the person who shared the lesson to send it again.</p>
          <a className="join-secondary-link" href="/">Go to Cultivate</a>
        </section>
      </main>
    )
  }

  const handleOpen = () => {
    // Opening the app is always an explicit tap. This page stays as the fallback if the app isn't installed.
    window.location.assign(buildPillarLessonUrl(token))
  }
  const handleCopy = async () => {
    setCopyState(await copyText(buildShareUrl(token, window.location.origin)) ? 'copied' : 'failed')
  }

  return (
    <main className="join-page">
      <section className="join-card" aria-labelledby="lesson-title">
        <Brand />
        <div className="join-hero-icon" aria-hidden="true">✎</div>
        <p className="join-eyebrow">You’re invited</p>
        <h1 id="lesson-title">Someone shared a lesson with you</h1>

        {onPhone ? (
          <>
            <p className="join-copy">Read it in the Cultivate app. You’ll sign in once, and the lesson stays in your Lessons so you can come back.</p>
            <button className="join-primary-button" type="button" onClick={handleOpen}>
              Open in Cultivate
              <span aria-hidden="true">→</span>
            </button>
            <a className="lesson-secondary-button" href="/beta/#install">Get the app</a>
            <p className="join-fallback">
              <strong>Just installed Cultivate?</strong><br />
              Come back to your message and tap the link again. It takes you straight to the lesson.
            </p>
          </>
        ) : (
          <>
            <p className="join-copy">Lessons open in the Cultivate app. Open this link on your phone or tablet.</p>
            <ol className="lesson-steps">
              <li><strong>Send it to your phone</strong>, or open the message that held the link there.</li>
              <li><strong>Tap the link</strong>, then choose Open in Cultivate.</li>
            </ol>
            <button className="lesson-secondary-button" type="button" onClick={handleCopy}>
              {copyState === 'copied' ? 'Link copied' : 'Copy link'}
            </button>
            <a className="join-secondary-link" href="/beta/#install">Get the Cultivate app</a>
          </>
        )}
        {copyState === 'failed' && <p className="join-status" role="status">Copy didn’t work. Press and hold the address bar to copy the link.</p>}

        <p className="lesson-privacy">This page never shows the lesson. Only what the teacher chose to share opens in the app, and their private notes are never included.</p>
      </section>
    </main>
  )
}
