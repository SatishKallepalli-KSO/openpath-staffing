import { useEffect, useState, type FormEvent } from 'react'
import { fetchPublicJobs, type Job } from '../api'
import { BRAND } from '../brand'
import { BrandMark } from '../components/BrandMark'

type Props = {
  jobs: number
  applications: number
  signedIn: boolean
  onGo: (portal: string) => void
}

const PRACTICES = [
  { name: 'Engineering', detail: 'Full stack, platform, mobile, and quality.', img: '/media/team.jpg' },
  { name: 'Data and AI', detail: 'Analytics, warehousing, machine learning.', img: '/media/data.jpg' },
  { name: 'Product and design', detail: 'Product managers, researchers, designers.', img: '/media/design.jpg' },
  { name: 'Go to market', detail: 'Sales, success, and marketing operators.', img: '/media/gtm.jpg' },
  { name: 'Finance and people', detail: 'FP&A, accounting, recruiting, HRIS.', img: '/media/finance.jpg' },
  { name: 'Operations', detail: 'Supply chain, warehouse, and program leads.', img: '/media/ops.jpg' },
]

export function HomePortal({ jobs, applications, signedIn, onGo }: Props) {
  const [featured, setFeatured] = useState<Job[]>([])

  useEffect(() => {
    fetchPublicJobs()
      .then((rows) => setFeatured(rows as Job[]))
      .catch(() => undefined)
  }, [])

  return (
    <div className="home">
      <section className="hero-bleed">
        <div className="hero-photo" aria-hidden>
          <img src="/media/hero.jpg" alt="" />
        </div>
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <p className="eyebrow gold">{BRAND.practice}</p>
            <h1>
              Connecting Talent.
              <em>Enabling Technology.</em>
            </h1>
            <p className="lede">
              SAVENTRA Technologies staffs engineers, data, product, and operators, and sits with
              hiring teams as a consulting desk. Resume in. Roles ranked. A pipeline you own.
            </p>
            <div className="hero-actions">
              <button type="button" className="btn btn-gold" onClick={() => onGo(signedIn ? 'dashboard' : 'signup')}>
                {signedIn ? 'Open your desk' : 'Start as talent'}
              </button>
              <button type="button" className="btn btn-ghost-light" onClick={() => onGo('employers')}>
                Brief a search
              </button>
            </div>
            <p className="hero-fine">Engineering · Data · Product · GTM · Finance · Operations</p>
          </div>
          <aside className="hero-frame">
            <img src="/media/talent.jpg" alt="Candidate in a quiet working session" />
            <div className="hero-caption">
              <span>01 / The desk</span>
              <strong>Resume in. Roles ranked. Status you can see.</strong>
            </div>
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
            <strong>Private</strong>
            <span>Candidate book, not a marketplace</span>
          </div>
          <div>
            <strong>{applications}</strong>
            <span>Searches in motion</span>
          </div>
          <div>
            <strong>Same day</strong>
            <span>Profile to first matches</span>
          </div>
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head row-head">
          <div>
            <p className="eyebrow">On the market</p>
            <h2>A few roles the desk is working now.</h2>
          </div>
          <button type="button" className="btn btn-ghost" onClick={() => onGo(signedIn ? 'matches' : 'signup')}>
            See matches
          </button>
        </div>
        {featured.length === 0 ? (
          <p className="muted">Loading the desk…</p>
        ) : (
          <ul className="featured-grid">
            {featured.map((job, i) => (
              <li key={job.id}>
                <button type="button" className="featured-card" onClick={() => onGo(signedIn ? 'matches' : 'signup')}>
                  <span className="featured-idx">{String(i + 1).padStart(2, '0')}</span>
                  <span className="featured-dept">{job.department || job.seniority}</span>
                  <h3>{job.title}</h3>
                  <p>
                    {job.company}
                    <span>
                      {job.location} · {job.remote}
                    </span>
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="wrap section practice-section">
        <div className="section-head">
          <p className="eyebrow">Practices</p>
          <h2>Specialist search across six desks.</h2>
        </div>
        <ul className="practice-rich">
          {PRACTICES.map((p) => (
            <li key={p.name}>
              <img src={p.img} alt="" />
              <div>
                <h3>{p.name}</h3>
                <p>{p.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="split-bleed">
        <div className="wrap split-audience">
          <article className="audience-card">
            <img src="/media/talent.jpg" alt="" />
            <div>
              <p className="eyebrow gold">For talent</p>
              <h2>Your search, with a partner behind it.</h2>
              <p>
                Sign up once. We match your resume, suggest the smallest edits that help you clear
                ATS filters, and keep status honest through offer or no.
              </p>
              <button type="button" className="btn btn-gold" onClick={() => onGo(signedIn ? 'resume' : 'signup')}>
                Upload a resume
              </button>
            </div>
          </article>
          <article className="audience-card">
            <img src="/media/board.jpg" alt="" />
            <div>
              <p className="eyebrow gold">For hiring teams</p>
              <h2>A shortlist, not a pile of CVs.</h2>
              <p>
                Send the role, the must-haves, and the location. We score our book against that
                brief. You stay on the offer. We stay on the search.
              </p>
              <button type="button" className="btn btn-gold" onClick={() => onGo('employers')}>
                Request a shortlist
              </button>
            </div>
          </article>
        </div>
      </section>

      <section className="quote-bleed">
        <div className="wrap quote-inner">
          <p className="eyebrow gold">SAVENTRA Technologies</p>
          <blockquote>
            Connecting Talent. Enabling Technology.
          </blockquote>
        </div>
      </section>

      <section className="cta-bleed">
        <img src="/media/city.jpg" alt="" />
        <div className="wrap cta-row">
          <div>
            <h2>The next search starts with SAVENTRA.</h2>
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
    <div className="portal about-rich">
      <div className="page-hero">
        <img src="/media/city.jpg" alt="" />
        <div>
          <p className="eyebrow gold">{BRAND.practice}</p>
          <h1>Built for people tired of the black hole.</h1>
        </div>
      </div>
      <div className="manifest">
        <img src="/media/talent.jpg" alt="A candidate working through a search" />
        <div>
          <p className="lede">
            Hiring got slower and more automated. SAVENTRA exists so candidates spend energy on roles
            they can win, and so companies see a shortlist instead of noise.
          </p>
          <ol className="steps-rich">
            <li>
              <span>01</span>
              <div>
                <strong>Read the resume</strong>
                <p>We parse skills, titles, and years. Matching starts from what you actually did.</p>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <strong>Score the desk</strong>
                <p>Public job APIs plus our catalog, scored against that document.</p>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <strong>Small honest edits</strong>
                <p>Keyword-aware lines you can accept or skip. No invented employers or dates.</p>
              </div>
            </li>
            <li>
              <span>04</span>
              <div>
                <strong>Track the conversation</strong>
                <p>We open the real apply link and keep status on a desk you own.</p>
              </div>
            </li>
          </ol>
        </div>
      </div>
      <p className="muted fine-print">
        We do not scrape LinkedIn, Indeed, or Greenhouse. We do not auto-submit into someone
        else&apos;s ATS.
      </p>
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
    <div className="auth-split">
      <div className="auth-visual">
        <img src="/media/board.jpg" alt="" />
        <p>{BRAND.tagline}</p>
      </div>
      <div className="auth-card">
        <BrandMark className="mark-lg" />
        <p className="eyebrow">{BRAND.practice}</p>
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
        {!signup && import.meta.env.DEV ? (
          <p className="demo-note">
            Local preview: <code>{BRAND.demoEmail}</code> / <code>{BRAND.demoPassword}</code>
          </p>
        ) : null}
      </div>
    </div>
  )
}
