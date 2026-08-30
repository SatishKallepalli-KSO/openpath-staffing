import type { Application } from '../api'
import { formatDate } from '../lib/format'

const STATUSES = ['saved', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn']

type Props = {
  rows: Application[]
  error: string
  onStatus: (id: number, status: string) => void
  onOpen: (jobId: number) => void
}

export function TrackerPortal({ rows, error, onStatus, onOpen }: Props) {
  return (
    <div className="portal">
      <header className="desk-mast">
        <div className="desk-mast-inner">
          <p className="eyebrow gold">Pipeline</p>
          <h1>Application tracker</h1>
          <p className="muted">Move each role as you hear back. This is your record, not the employer&apos;s.</p>
        </div>
      </header>
      {error ? <p className="form-error">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="muted">No applications yet. Match a role and mark it applied.</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Role</th>
                <th>Company</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <button type="button" className="linkish" onClick={() => onOpen(row.job_id)}>
                      {row.title}
                    </button>
                  </td>
                  <td>
                    {row.company}
                    <div className="muted">{row.location}</div>
                  </td>
                  <td>
                    <select value={row.status} onChange={(e) => onStatus(row.id, e.target.value)}>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{formatDate(row.updated_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
