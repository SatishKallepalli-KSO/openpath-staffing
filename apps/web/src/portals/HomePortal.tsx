import type { FormEvent } from 'react'
import { BrandMark } from '../components/BrandMark'

type Props = {
  jobs: number
  candidates: number
  applications: number
  signedIn: boolean
  onGo: (portal: string) => void
}

export function HomePortal({ jobs, candidates, applications, signedIn, onGo }: Props) {
  return (
    <div className="portal home">
      <section className="hero">
        <p className="eyebrow">Staffing for a hard market</p>
        <h1>Upload your resume. See the roles that actually fit. Tailor a little. Apply with a plan.</h1>
        <p className="lede">
          OpenPath is a candidate-first staffing company. We match your resume to open roles, suggest
          small edits so you clear ATS filters, and keep a dashboard so you are never guessing where
          you stand.
        </p>
        <div className="hero-actions">
          <button type="button" className="btn btn-primary" onClick={() => onGo(signedIn ? 'dashboard' : 'signup')}>
            {signedIn ? 'Open dashboard' : 'Create a free account'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => onGo('about')}>
            How it works
          </button>
        </div>
      </section>

      <section className="stat-row" aria-label="Live platform pulse">
        <div>
          <strong>{jobs}</strong>
          <span>Roles in the catalog</span>
        </div>
        <div>
          <strong>{candidates}</strong>
          <span>Candidates signed up</span>
        </div>
        <div>
          <strong>{applications}</strong>
          <span>Applications tracked</span>
        </div>
      </section>

      <section className="steps">
        <h2>The loop</h2>
        <ol>
          <li>
            <strong>Profile</strong>
            <p>Sign up once. Add location and the titles you want.</p>
          </li>
          <li>
            <strong>Resume</strong>
            <p>Upload PDF, Word, or paste text. We read skills and experience, not the disk forever.</p>
          </li>
          <li>
            <strong>Matches</strong>
            <p>Jobs are scored against your resume. Weak fits stay out of the way.</p>
          </li>
          <li>
            <strong>Tailor</strong>
            <p>Accept a few keyword-aware edits. We never invent jobs you did not do.</p>
          </li>
          <li>
            <strong>Track</strong>
            <p>Saved, applied, interviewing, offered, rejected. Your pipeline, not a spreadsheet graveyard.</p>
          </li>
        </ol>
      </section>
    </div>
  )
}

type AboutProps = { onGo: (portal: string) => void }

export function AboutPortal({ onGo }: AboutProps) {
  return (
    <div className="portal about">
      <h1>Built for people who are tired of the black hole</h1>
      <p>
        Hiring got slower, quieter, and more automated. OpenPath exists so candidates can spend energy
        on roles they can actually win, instead of sending the same PDF to 200 portals.
      </p>
      <div className="split">
        <section>
          <h2>What we will do</h2>
          <ul className="plain">
            <li>Match your resume to our job catalog and, when configured, live Adzuna search.</li>
            <li>Show missing keywords and small resume edits you can accept or skip.</li>
            <li>Open the employer apply link and keep the status on your dashboard.</li>
            <li>Let our office post partner roles from an admin desk.</li>
          </ul>
        </section>
        <section>
          <h2>What we will not pretend</h2>
          <ul className="plain">
            <li>We do not scrape LinkedIn, Indeed, or Greenhouse. That breaks their terms and our host limits.</li>
            <li>We do not auto-submit applications into someone else&apos;s ATS.</li>
            <li>We do not write fiction onto your resume.</li>
          </ul>
        </section>
      </div>
      <button type="button" className="btn btn-primary" onClick={() => onGo('signup')}>
        Get started
      </button>
    </div>
  )
}

type AuthProps = {
  mode: 'login' | 'signup'
  error: string
  busy: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onSwitch: () => void
}

export function AuthPortal({ mode, error, busy, onSubmit, onSwitch }: AuthProps) {
  const signup = mode === 'signup'
  return (
    <div className="portal auth-portal">
      <BrandMark className="mark-lg" />
      <h1>{signup ? 'Create your OpenPath profile' : 'Welcome back'}</h1>
      <p className="muted">
        {signup
          ? 'Free for candidates. Your dashboard stores progress across matches and applications.'
          : 'Use your email to open matches, tailored resumes, and the tracker.'}
      </p>
      <form className="stack-form" onSubmit={onSubmit}>
        {signup ? (
          <label>
            Full name
            <input name="full_name" autoComplete="name" required minLength={2} />
          </label>
        ) : null}
        <label>
          Email
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={8} />
        </label>
        {error ? <p className="form-error">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Working…' : signup ? 'Create account' : 'Sign in'}
        </button>
      </form>
      <p className="muted">
        {signup ? 'Already have an account?' : 'New here?'}{' '}
        <button type="button" className="linkish" onClick={onSwitch}>
          {signup ? 'Sign in' : 'Create an account'}
        </button>
      </p>
      {!signup ? (
        <p className="demo-note">
          Try the demo: <code>demo@openpath.jobs</code> / <code>DemoPass1234</code>
        </p>
      ) : null}
    </div>
  )
}
