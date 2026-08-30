import type { FormEvent } from 'react'
import { BrandMark } from '../components/BrandMark'

type Props = {
  jobs: number
  candidates: number
  applications: number
  signedIn: boolean
  onGo: (portal: string) => void
}

const PRACTICES = [
  { name: 'Engineering', detail: 'Full stack, platform, mobile, and quality.' },
  { name: 'Data and AI', detail: 'Analytics, warehousing, machine learning.' },
  { name: 'Product and design', detail: 'Product managers, researchers, designers.' },
  { name: 'Go to market', detail: 'Sales, success, and marketing operators.' },
  { name: 'Finance and people', detail: 'FP&A, accounting, recruiting, HRIS.' },
  { name: 'Operations', detail: 'Supply chain, warehouse, and program leads.' },
]

export function HomePortal({ jobs, candidates, applications, signedIn, onGo }: Props) {
  return (
    <div className="home">
      <section className="hero-bleed">
        <div className="wrap hero-grid">
          <div>
            <p className="eyebrow gold">A staffing firm for a hard market</p>
            <h1>We place people into roles they can actually win.</h1>
            <p className="lede">
              OpenPath is a candidate-first staffing company. Upload a resume, see scored matches,
              make small honest edits, apply, and track every conversation. Hiring teams send a
              brief. We shortlist people whose work already fits.
            </p>
            <div className="hero-actions">
              <button type="button" className="btn btn-gold" onClick={() => onGo(signedIn ? 'dashboard' : 'signup')}>
                {signedIn ? 'Open your desk' : 'Find a role'}
              </button>
              <button type="button" className="btn btn-ghost-light" onClick={() => onGo('employers')}>
                Hire talent
              </button>
            </div>
          </div>
          <aside className="hero-panel" aria-label="How OpenPath works">
            <p className="eyebrow">The OpenPath desk</p>
            <ol className="hero-steps">
              <li>
                <span>01</span>
                <div>
                  <strong>Read the resume</strong>
                  <p>Skills, titles, and years. Not a keyword dump.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <strong>Score the market</strong>
                  <p>Roles ranked by fit. Weak matches stay out of the way.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <strong>Tailor, apply, track</strong>
                  <p>Small edits. A living pipeline. No black hole.</p>
                </div>
              </li>
            </ol>
          </aside>
        </div>
      </section>

      <section className="trust-band" aria-label="Live desk">
        <div className="wrap trust-row">
          <div>
            <strong>{jobs}</strong>
            <span>Open roles on the desk</span>
          </div>
          <div>
            <strong>{candidates}</strong>
            <span>Candidates in the book</span>
          </div>
          <div>
            <strong>{applications}</strong>
            <span>Applications under management</span>
          </div>
          <div>
            <strong>US</strong>
            <span>Remote, hybrid, and on-site</span>
          </div>
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <p className="eyebrow">Practices</p>
          <h2>Specialist search, not a general job board.</h2>
        </div>
        <ul className="practice-grid">
          {PRACTICES.map((p) => (
            <li key={p.name}>
              <h3>{p.name}</h3>
              <p>{p.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="split-bleed">
        <div className="wrap split-audience">
          <article>
            <p className="eyebrow">For talent</p>
            <h2>Your search, with a desk behind it.</h2>
            <p>
              Sign up once. We match your resume to live roles, suggest the smallest edits that
              help you clear ATS filters, and keep status honest: saved, applied, interviewing,
              offered, rejected.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => onGo(signedIn ? 'resume' : 'signup')}>
              Upload a resume
            </button>
          </article>
          <article>
            <p className="eyebrow">For hiring teams</p>
            <h2>A shortlist, not a pile of CVs.</h2>
            <p>
              Send the role, the must-haves, and the location. We score our book against that
              brief and return people who already look like a fit. You stay on the hiring
              decision. We stay on the search.
            </p>
            <button type="button" className="btn btn-primary" onClick={() => onGo('employers')}>
              Request a shortlist
            </button>
          </article>
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <p className="eyebrow">How we differ</p>
          <h2>Built like a firm. Run like a modern desk.</h2>
        </div>
        <div className="compare-grid">
          <figure>
            <figcaption>Typical board</figcaption>
            <ul className="plain">
              <li>Spray two hundred applications</li>
              <li>One generic resume for every posting</li>
              <li>Silence after you click Apply</li>
            </ul>
          </figure>
          <figure className="compare-us">
            <figcaption>OpenPath</figcaption>
            <ul className="plain">
              <li>Fewer roles, scored to your resume</li>
              <li>Small, truthful edits per job</li>
              <li>A tracker you own, not a black hole</li>
            </ul>
          </figure>
        </div>
      </section>

      <section className="cta-bleed">
        <div className="wrap cta-row">
          <div>
            <h2>Start the search today.</h2>
            <p>Candidates create a profile in minutes. Hiring teams send a brief the same day.</p>
          </div>
          <div className="hero-actions">
            <button type="button" className="btn btn-gold" onClick={() => onGo('signup')}>
              Create a candidate profile
            </button>
            <button type="button" className="btn btn-ghost-light" onClick={() => onGo('about')}>
              How the firm works
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

type AboutProps = { onGo: (portal: string) => void }

export function AboutPortal({ onGo }: AboutProps) {
  return (
    <div className="portal">
      <p className="eyebrow">The firm</p>
      <h1>OpenPath Staffing is built for people tired of the black hole.</h1>
      <p className="lede">
        Hiring got slower and more automated. We exist so candidates spend energy on roles they
        can win, and so companies see a shortlist instead of noise.
      </p>
      <div className="split">
        <section className="panel">
          <h2>What we do</h2>
          <ul className="plain">
            <li>Match resumes to our catalog and, when configured, live job search.</li>
            <li>Suggest small resume edits you can accept or skip.</li>
            <li>Open the employer apply link and keep status on your dashboard.</li>
            <li>Take hiring briefs and work a specialist practice.</li>
          </ul>
        </section>
        <section className="panel">
          <h2>What we will not pretend</h2>
          <ul className="plain">
            <li>We do not scrape LinkedIn, Indeed, or Greenhouse.</li>
            <li>We do not auto-submit into someone else&apos;s ATS.</li>
            <li>We do not invent jobs, dates, or employers on a resume.</li>
          </ul>
        </section>
      </div>
      <div className="hero-actions">
        <button type="button" className="btn btn-primary" onClick={() => onGo('signup')}>
          Join as talent
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => onGo('employers')}>
          Talk to the desk
        </button>
      </div>
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
    <div className="auth-shell">
      <div className="auth-card">
        <BrandMark className="mark-lg" />
        <p className="eyebrow">OpenPath Staffing</p>
        <h1>{signup ? 'Create your profile' : 'Welcome back'}</h1>
        <p className="muted">
          {signup
            ? 'Free for candidates. Your desk stores matches, tailored resumes, and every application.'
            : 'Sign in to your matching desk, tailored resumes, and tracker.'}
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
          {signup ? 'Already with the firm?' : 'New here?'}{' '}
          <button type="button" className="linkish" onClick={onSwitch}>
            {signup ? 'Sign in' : 'Create an account'}
          </button>
        </p>
        {!signup ? (
          <p className="demo-note">
            Preview the desk: <code>demo@openpath.jobs</code> / <code>DemoPass1234</code>
          </p>
        ) : null}
      </div>
    </div>
  )
}
