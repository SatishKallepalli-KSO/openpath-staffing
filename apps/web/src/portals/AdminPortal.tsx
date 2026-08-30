import type { FormEvent } from 'react'
import type { Job } from '../api'

type Props = {
  authed: boolean
  jobs: Job[]
  error: string
  busy: boolean
  pin: string
  onPin: (value: string) => void
  onLogin: () => void
  onCreate: (event: FormEvent<HTMLFormElement>) => void
}

export function AdminPortal({ authed, jobs, error, busy, pin, onPin, onLogin, onCreate }: Props) {
  return (
    <div className="portal">
      <h1>Office desk</h1>
      <p className="muted">Post OpenPath-owned roles. Candidates will see them in match results.</p>
      {!authed ? (
        <form
          className="stack-form"
          onSubmit={(e) => {
            e.preventDefault()
            onLogin()
          }}
        >
          <label>
            Admin PIN
            <input type="password" value={pin} onChange={(e) => onPin(e.target.value)} autoComplete="off" />
          </label>
          {error ? <p className="form-error">{error}</p> : null}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            Unlock
          </button>
        </form>
      ) : (
        <>
          <form className="stack-form" onSubmit={onCreate}>
            <label>
              Title
              <input name="title" required />
            </label>
            <label>
              Company
              <input name="company" defaultValue="OpenPath Staffing" />
            </label>
            <label>
              Location
              <input name="location" defaultValue="Remote, US" />
            </label>
            <label>
              Workplace
              <select name="remote" defaultValue="remote">
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="onsite">On-site</option>
              </select>
            </label>
            <label>
              Skills (comma separated)
              <input name="skills_csv" placeholder="react, node.js, postgres" />
            </label>
            <label>
              Description
              <textarea name="description" rows={5} required />
            </label>
            <label>
              Requirements
              <textarea name="requirements" rows={4} />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <button className="btn btn-primary" type="submit" disabled={busy}>
              Publish role
            </button>
          </form>
          <h2>Posted jobs</h2>
          <ul className="plain">
            {jobs.map((job) => (
              <li key={job.id}>
                <strong>{job.title}</strong> · {job.company} · {job.location}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

export function PrivacyPortal() {
  return (
    <div className="portal">
      <p className="eyebrow">Legal</p>
      <h1>Privacy</h1>
      <p className="lede">
        OpenPath stores your account, resume text, hiring briefs, and application statuses so we
        can match roles and run searches. Resume files are parsed on the server and saved as text.
        We do not sell candidate data. To request deletion, write from the email on your profile.
      </p>
    </div>
  )
}
