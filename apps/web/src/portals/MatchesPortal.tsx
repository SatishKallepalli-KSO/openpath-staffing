import type { FormEvent } from 'react'
import type { BoardLink, Job, MatchSources, TailorSuggestion } from '../api'
import { matchTone } from '../lib/format'

function sourceLine(sources: MatchSources | undefined, live: boolean) {
  const labels: [keyof MatchSources, string][] = [
    ['greenhouse', 'Greenhouse'],
    ['lever', 'Lever'],
    ['amazon', 'Amazon'],
    ['nvidia', 'NVIDIA'],
    ['adzuna', 'Adzuna'],
  ]
  const parts = labels
    .filter(([key]) => Number(sources?.[key] || 0) > 0)
    .map(([key, label]) => `${label} (${sources?.[key]})`)
  if (parts.length) return `Live boards searched: ${parts.join(', ')}.`
  if (live) return 'Searched public job APIs. Catalog roles still rank if a board is quiet right now.'
  return 'Ranking SAVENTRA catalog roles until live boards respond.'
}

type MatchesProps = {
  jobs: Job[]
  count: number
  live: boolean
  sources?: MatchSources
  boardLinks?: BoardLink[]
  linkedinLinks?: BoardLink[]
  linkedinUrl?: string
  appliedIds: number[]
  error: string
  busy: boolean
  onFilter: (event: FormEvent<HTMLFormElement>) => void
  onOpen: (id: number) => void
  onApply: (job: Job) => void
  onBatchApply: () => void
  onReplaceResume: () => void
  onAddLinkedin: () => void
}

export function MatchesPortal({
  jobs,
  count,
  live,
  sources,
  boardLinks,
  linkedinLinks,
  linkedinUrl,
  appliedIds,
  error,
  busy,
  onFilter,
  onOpen,
  onApply,
  onBatchApply,
  onReplaceResume,
  onAddLinkedin,
}: MatchesProps) {
  const applied = new Set(appliedIds)
  return (
    <div className="portal">
      <header className="desk-mast">
        <div className="desk-mast-inner">
          <p className="eyebrow gold">{live ? 'Catalog + live boards' : 'SAVENTRA catalog'}</p>
          <h1>Roles filtered to your resume</h1>
          <p className="muted">
            {busy ? 'Searching public job APIs and scoring…' : `${count} roles above your match floor.`}
          </p>
          <p className="muted">{sourceLine(sources, live)}</p>
        </div>
      </header>
      {linkedinLinks?.length ? (
        <div className="board-links linkedin-fast">
          <h2>Apply faster on LinkedIn</h2>
          <p className="muted">
            LinkedIn does not let us list their jobs inside SAVENTRA. These searches use your resume title,
            newest posts first, Easy Apply, and early-applicant jobs with fewer people in line.
          </p>
          {!linkedinUrl ? (
            <p className="muted">
              Add your LinkedIn profile on your desk so recruiters can find you.{' '}
              <button type="button" className="linkish" onClick={onAddLinkedin}>
                Add LinkedIn URL
              </button>
            </p>
          ) : (
            <p className="muted">
              Your profile:{' '}
              <a className="linkish" href={linkedinUrl} target="_blank" rel="noopener noreferrer">
                Open LinkedIn
              </a>
            </p>
          )}
          <div className="board-card-grid">
            {linkedinLinks.map((link) => (
              <a
                key={link.name}
                className={`board-card board-${link.kind || 'generic'}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>{link.name}</strong>
                <span>{link.blurb || 'Open LinkedIn'}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}
      {boardLinks?.length ? (
        <div className="board-links">
          <h2>Other US boards and career sites</h2>
          <p className="muted">
            Indeed is sorted to the last day. Scored roles below are live US listings from Greenhouse, Lever,
            Amazon.jobs, and NVIDIA.
          </p>
          <div className="board-card-grid">
            {boardLinks.map((link) => (
              <a
                key={link.name}
                className={`board-card board-${link.kind || 'generic'}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                <strong>{link.name}</strong>
                <span>{link.blurb || 'Open search'}</span>
              </a>
            ))}
          </div>
        </div>
      ) : null}
      <div className="match-toolbar">
        <p className="muted">
          Apply opens the employer posting. We mark applied only after you confirm you submitted. We do not
          log into LinkedIn, Indeed, or Greenhouse, and we do not submit their forms.
        </p>
        <button type="button" className="btn btn-gold" onClick={onBatchApply} disabled={busy || jobs.length === 0}>
          Open top apply pages
        </button>
        <button type="button" className="btn btn-ghost" onClick={onReplaceResume} disabled={busy}>
          Replace resume
        </button>
      </div>
      <form className="filter-bar" onSubmit={onFilter}>
        <input name="search" placeholder="Title, company, skill" />
        <select name="remote" defaultValue="">
          <option value="">Any workplace</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </select>
        <select name="min_score" defaultValue="35">
          <option value="20">Show more (20%+)</option>
          <option value="35">Balanced (35%+)</option>
          <option value="55">Strict (55%+)</option>
        </select>
        <button className="btn btn-primary" type="submit">
          Filter
        </button>
      </form>
      {error ? <p className="form-error">{error}</p> : null}
      {jobs.length === 0 && !busy ? (
        <div className="empty-matches">
          <p className="muted">
            {error
              ? 'We could not load roles. Replace your resume or try again.'
              : 'No live US listings above this match floor yet. Replace your resume or lower the floor.'}
          </p>
          <button type="button" className="btn btn-primary" onClick={onReplaceResume}>
            Replace resume
          </button>
        </div>
      ) : null}
      <ul className="card-grid">
        {jobs.map((job) => {
          const queued = applied.has(job.id)
          const applyLabel = queued
            ? 'Applied'
            : job.can_apply
              ? `Apply on ${job.apply_via || job.apply_host || 'employer site'}`
              : 'No public apply link'
          return (
            <li key={job.id}>
              <article className="job-card">
                <button type="button" className="job-card-main" onClick={() => onOpen(job.id)}>
                  <span className="job-card-top">
                    <span className="company-mark" aria-hidden>
                      {(job.company || 'O').slice(0, 1)}
                    </span>
                    <span className={`score score-${matchTone(job.match_score)}`}>{job.match_score}% match</span>
                  </span>
                  <h3>{job.title}</h3>
                  <p>
                    {job.company} · {job.location}
                  </p>
                  <p className="muted">
                    {job.remote} · {job.seniority} · {job.apply_via || job.source}
                    {job.posted_at ? ` · posted ${job.posted_at}` : ''}
                  </p>
                  <div className="chips">
                    {(job.matched_skills || []).slice(0, 5).map((s) => (
                      <span className="chip" key={s}>
                        {s}
                      </span>
                    ))}
                  </div>
                </button>
                <div className="job-card-actions">
                  <button type="button" className="btn btn-gold" onClick={() => onApply(job)} disabled={busy || queued || !job.can_apply}>
                    {applyLabel}
                  </button>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

type JobProps = {
  job: Job | null
  error: string
  busy: boolean
  onTailor: () => void
  onSave: () => void
  onApply: () => void
}

export function JobPortal({ job, error, busy, onTailor, onSave, onApply }: JobProps) {
  if (error) return <p className="form-error">{error}</p>
  if (!job) return <p className="muted">Loading role…</p>
  return (
    <div className="portal job-detail">
      <header className="desk-mast">
        <div className="desk-mast-inner">
          <p className="eyebrow gold">
            {job.company} · {job.source}
          </p>
          <h1>{job.title}</h1>
          <p className="muted">
            {job.location} · {job.remote} · {job.seniority}
            {job.posted_at ? ` · posted ${job.posted_at}` : ''}
          </p>
          {job.match_score != null ? (
            <p className={`score score-${matchTone(job.match_score)} inline`}>
              {job.match_score}% match to your resume
            </p>
          ) : null}
          <div className="hero-actions">
            <button type="button" className="btn btn-gold" onClick={onTailor} disabled={busy}>
              Suggest small edits
            </button>
            <button type="button" className="btn btn-ghost-light" onClick={onSave} disabled={busy}>
              Save role
            </button>
            <button type="button" className="btn btn-ghost-light" onClick={onApply} disabled={busy || !job.can_apply}>
              {job.can_apply
                ? `Apply on ${job.apply_via || job.apply_host || 'employer site'}`
                : 'No public apply link'}
            </button>
          </div>
        </div>
      </header>
      {job.matched_skills?.length ? (
        <p>
          You already show: {job.matched_skills.join(', ')}
        </p>
      ) : null}
      {job.missing_skills?.length ? (
        <p className="muted">Consider covering: {job.missing_skills.join(', ')}</p>
      ) : null}
      <h2>About the role</h2>
      <p>{job.description}</p>
      {job.requirements ? (
        <>
          <h2>Requirements</h2>
          <p>{job.requirements}</p>
        </>
      ) : null}
    </div>
  )
}

type TailorProps = {
  suggestion: TailorSuggestion | null
  text: string
  error: string
  busy: boolean
  onText: (value: string) => void
  onSave: () => void
  onApply: () => void
}

export function TailorPortal({ suggestion, text, error, busy, onText, onSave, onApply }: TailorProps) {
  if (error) return <p className="form-error">{error}</p>
  if (!suggestion) return <p className="muted">Building edits…</p>
  return (
    <div className="portal tailor">
      <h1>Small edits for {suggestion.job.title}</h1>
      <p className="muted">Review every change. Keep dates and employers exactly as they happened.</p>
      {suggestion.warnings.map((w) => (
        <p className="callout" key={w}>
          {w}
        </p>
      ))}
      {suggestion.bullet_rewrites.length ? (
        <section>
          <h2>Bullet suggestions</h2>
          {suggestion.bullet_rewrites.map((b) => (
            <article className="diff-card" key={b.original}>
              <p className="muted">{b.reason}</p>
              <p className="before">{b.original}</p>
              <p className="after">{b.suggested}</p>
            </article>
          ))}
        </section>
      ) : (
        <p className="muted">Your bullets already cover the posting. You can still tweak the text below.</p>
      )}
      <label>
        Tailored resume
        <textarea value={text} onChange={(e) => onText(e.target.value)} rows={18} />
      </label>
      <div className="hero-actions">
        <button type="button" className="btn btn-primary" onClick={onSave} disabled={busy}>
          Save this version
        </button>
        <button type="button" className="btn btn-warm" onClick={onApply} disabled={busy}>
          Save and open apply page
        </button>
      </div>
    </div>
  )
}
