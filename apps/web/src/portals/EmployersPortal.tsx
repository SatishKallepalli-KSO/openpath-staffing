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
      <p className="lede">
        OpenPath works retained-style search on a modern desk. You stay on the offer. We stay on
        the matching. No scrape-and-spam. No invented candidates.
      </p>
      <div className="split">
        <section className="panel">
          <h2>What you get</h2>
          <ul className="plain">
            <li>A scored shortlist from people whose resumes already fit.</li>
            <li>Notes on missing keywords before you spend an interview hour.</li>
            <li>A single partner on engineering, data, product, GTM, and operations.</li>
          </ul>
        </section>
        <section className="panel">
          {done ? (
            <div>
              <h2>Brief received</h2>
              <p>The desk will review it and follow up at the email you gave.</p>
              <button type="button" className="btn btn-primary" onClick={() => onGo('home')}>
                Back to OpenPath
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
                <button className="btn btn-primary" type="submit" disabled={busy}>
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
