import type { Dashboard as DashboardData, Job } from '../api'
import { formatDate, matchTone } from '../lib/format'

type Props = {
  data: DashboardData | null
  error: string
  onGo: (portal: string, extra?: Record<string, string>) => void
}

const PIPELINE = ['saved', 'applied', 'interviewing', 'offered', 'rejected'] as const

export function DashboardPortal({ data, error, onGo }: Props) {
  if (error) return <p className="form-error">{error}</p>
  if (!data) return <p className="muted">Loading dashboard…</p>
  const { user, pipeline, activity, top_matches: matches, has_resume } = data

  return (
    <div className="portal dashboard">
      <header className="page-head">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1>Hi {user.full_name.split(' ')[0]}</h1>
          <p className="muted">
            {user.headline || 'Add a headline on your profile'}
            {user.location ? ` · ${user.location}` : ''}
          </p>
        </div>
        <div className="hero-actions">
          {has_resume ? (
            <button type="button" className="btn btn-primary" onClick={() => onGo('matches')}>
              View matches
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => onGo('resume')}>
              Upload resume
            </button>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => onGo('profile')}>
            Edit profile
          </button>
        </div>
      </header>

      <section className="pipeline" aria-label="Application pipeline">
        {PIPELINE.map((key) => (
          <button type="button" className="pipe-card" key={key} onClick={() => onGo('tracker')}>
            <strong>{pipeline[key] || 0}</strong>
            <span>{key}</span>
          </button>
        ))}
      </section>

      <div className="split">
        <section>
          <h2>Best matches right now</h2>
          {!has_resume ? (
            <p className="muted">Upload a resume to score jobs against your skills.</p>
          ) : matches.length === 0 ? (
            <p className="muted">No strong matches yet. Try a broader target role on your profile.</p>
          ) : (
            <ul className="job-list">
              {matches.map((job) => (
                <MatchRow key={job.id} job={job} onOpen={() => onGo('job', { id: String(job.id) })} />
              ))}
            </ul>
          )}
        </section>
        <section>
          <h2>Recent activity</h2>
          {activity.length === 0 ? (
            <p className="muted">Your applies, tailors, and profile updates will land here.</p>
          ) : (
            <ol className="activity">
              {activity.map((item, i) => (
                <li key={`${item.created_at}-${i}`}>
                  <span className="pill">{item.kind}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <p className="muted">
                      {item.detail} {formatDate(item.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}

function MatchRow({ job, onOpen }: { job: Job; onOpen: () => void }) {
  const tone = matchTone(job.match_score)
  return (
    <li>
      <button type="button" className="job-row" onClick={onOpen}>
        <span className={`score score-${tone}`}>{job.match_score}%</span>
        <span>
          <strong>{job.title}</strong>
          <span className="muted">
            {job.company} · {job.location}
          </span>
        </span>
      </button>
    </li>
  )
}
