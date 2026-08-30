import { useState, type FormEvent } from 'react'
import { sendInquiry } from '../api'

type Props = {
  onGo: (portal: string) => void
}

export function EmployersPortal({ onGo }: Props) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      await sendInquiry({
        company: String(form.get('company') || ''),
        contact_name: String(form.get('contact_name') || ''),
        email: String(form.get('email') || ''),
        role: String(form.get('role') || ''),
        message: String(form.get('message') || ''),
      })
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the brief')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="portal employers">
      <div className="page-hero">
        <img src="/media/board.jpg" alt="" />
        <div>
          <p className="eyebrow gold">Hiring teams</p>
          <h1>Tell us the role. We return a shortlist.</h1>
        </div>
      </div>
      <div className="manifest">
        <img src="/media/gtm.jpg" alt="A modern hiring floor" />
        <div>
          <p className="lede">
            SAVENTRA works retained-style search on a modern desk. You stay on the offer. We stay
            on the matching. No scrape-and-spam. No invented candidates.
          </p>
          <ol className="steps-rich">
            <li>
              <span>01</span>
              <div>
                <strong>A scored shortlist</strong>
                <p>People whose resumes already fit the brief, not a pile of CVs.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Keyword notes first</strong>
                <p>Missing skills called out before you spend an interview hour.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>One partner</strong>
                <p>Engineering, data, product, GTM, finance, and operations on the same desk.</p>
              </div>
            </li>
          </ol>
        </div>
      </div>
      <div className="split brief-split">
        <section className="brief-panel">
          {done ? (
            <div>
              <h2>Brief received</h2>
              <p>The desk will review it and follow up at the email you gave.</p>
              <button type="button" className="btn btn-primary" onClick={() => onGo('home')}>
                Back to SAVENTRA
              </button>
            </div>
          ) : (
            <>
              <h2>Request a search</h2>
              <form className="stack-form" onSubmit={onSubmit}>
                <label>
                  Company
                  <input name="company" required minLength={2} />
                </label>
                <label>
                  Your name
                  <input name="contact_name" required minLength={2} autoComplete="name" />
                </label>
                <label>
                  Work email
                  <input name="email" type="email" required autoComplete="email" />
                </label>
                <label>
                  Role to fill
                  <input name="role" placeholder="Senior frontend engineer" />
                </label>
                <label>
                  Brief
                  <textarea name="message" rows={6} required minLength={20} placeholder="Must-haves, location, compensation band, and timeline." />
                </label>
                {error ? <p className="form-error">{error}</p> : null}
                <button className="btn btn-gold" type="submit" disabled={busy}>
                  {busy ? 'Sending…' : 'Send brief'}
                </button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
