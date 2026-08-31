import type { FormEvent } from 'react'
import type { Resume, User } from '../api'

type ProfileProps = {
  user: User
  busy: boolean
  error: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function ProfilePortal({ user, busy, error, onSubmit }: ProfileProps) {
  return (
    <div className="portal">
      <header className="desk-mast">
        <div className="desk-mast-inner">
          <p className="eyebrow gold">Candidate book</p>
          <h1>Your profile</h1>
          <p className="muted">Hiring teams never see this until you apply. It only improves matching.</p>
        </div>
      </header>
      <form className="stack-form" onSubmit={onSubmit}>
        <label>
          Full name
          <input name="full_name" defaultValue={user.full_name} required />
        </label>
        <label>
          Headline
          <input name="headline" defaultValue={user.headline} placeholder="Full stack engineer" />
        </label>
        <label>
          Location
          <input name="location" defaultValue={user.location} placeholder="San Jose, CA" />
        </label>
        <label>
          Target roles
          <input name="target_roles" defaultValue={user.target_roles} placeholder="Frontend, full stack" />
        </label>
        <label>
          Years of experience
          <input name="years_experience" type="number" min={0} max={50} defaultValue={user.years_experience} />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </button>
      </form>
    </div>
  )
}

type ResumeProps = {
  resumes: Resume[]
  error: string
  busy: boolean
  onUpload: (event: FormEvent<HTMLFormElement>) => void
}

export function ResumePortal({ resumes, error, busy, onUpload }: ResumeProps) {
  const latest = resumes[0]
  return (
    <div className="portal">
      <header className="desk-mast">
        <div className="desk-mast-inner">
          <p className="eyebrow gold">The document</p>
          <h1>{latest ? 'Replace resume' : 'Resume'}</h1>
          <p className="muted">
            {latest
              ? 'Upload a new PDF, Word, or text file. We will re-read it and rank roles again.'
              : 'PDF, Word, or plain text. After you save, we search public job APIs and rank roles to this document.'}
          </p>
        </div>
      </header>
      <form className="stack-form" onSubmit={onUpload}>
        <label>
          File
          <input name="file" type="file" accept=".pdf,.docx,.txt,application/pdf" />
        </label>
        <label>
          Or paste text
          <textarea name="text" rows={8} placeholder="Paste your resume here if the file will not parse." />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Reading and searching roles…' : latest ? 'Replace and find roles' : 'Save and find roles'}
        </button>
      </form>
      {latest ? (
        <section className="parsed">
          <h2>Latest parse</h2>
          <p>
            <strong>{latest.filename}</strong> · {latest.kind}
          </p>
          <p className="muted">Skills we will score against jobs</p>
          <div className="chips">
            {(latest.parsed.skills || []).map((s) => (
              <span className="chip" key={s}>
                {s}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
