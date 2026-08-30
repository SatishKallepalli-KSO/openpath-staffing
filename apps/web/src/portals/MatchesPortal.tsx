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
  appliedIds: number[]
  error: string
  busy: boolean
  onFilter: (event: FormEvent<HTMLFormElement>) => void
  onOpen: (id: number) => void
  onApply: (job: Job) => void
  onBatchApply: () => void
}

export function MatchesPortal({
  jobs,
  count,
  live,
  sources,
  boardLinks,
  appliedIds,
  error,
  busy,
  onFilter,
  onOpen,
  onApply,
  onBatchApply,
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
      {boardLinks?.length ? (
        <div className="board-links">
          <h2>Search the big boards and career sites</h2>
          <p className="muted">
            LinkedIn, Indeed, and ZipRecruiter are where US recruiters post most. Those tiles open their
            search. Scored roles below come from Greenhouse, Lever, Amazon.jobs, and NVIDIA careers in the
            United States. We dropped Remotive and other remote aggregators.
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
          Apply opens the employer posting in a new tab and tracks it on your desk. We do not log into
          LinkedIn, Indeed, or Greenhouse, and we do not submit their forms for you.
        </p>
        <button type="button" className="btn btn-gold" onClick={onBatchApply} disabled={busy || jobs.length === 0}>
          Apply to top matches
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
      <ul className="card-grid">
        {jobs.map((job) => {
          const queued = applied.has(job.id)
          const applyLabel = queued
            ? 'Queued'
            : job.can_apply
              ? `Easy Apply · ${job.apply_via || job.apply_host || 'employer'}`
              : 'Apply and track'
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
                    {job.remote} · {job.apply_via || job.source} · {job.seniority}
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
                  <button type="button" className="btn btn-gold" onClick={() => onApply(job)} disabled={busy || queued}>
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
            <button type="button" className="btn btn-ghost-light" onClick={onApply} disabled={busy}>
              {job.can_apply
                ? `Easy Apply · ${job.apply_via || job.apply_host || 'employer'}`
                : 'Apply and track'}
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
          Save, apply, and track
        </button>
      </div>
    </div>
  )
}
