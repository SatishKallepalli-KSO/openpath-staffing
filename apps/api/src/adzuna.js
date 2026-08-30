import { query, queryOne, nowIso } from './db.js'

const APP_ID = (process.env.ADZUNA_APP_ID || '').trim()
const APP_KEY = (process.env.ADZUNA_APP_KEY || '').trim()
const COUNTRY = (process.env.ADZUNA_COUNTRY || 'us').trim()

let cache = { at: 0, query: '', ids: [] }

export function adzunaEnabled() {
  return Boolean(APP_ID && APP_KEY)
}

function mapAdzunaJob(hit) {
  const loc = hit.location?.display_name || 'United States'
  const remote = /remote/i.test(`${hit.title} ${loc} ${hit.description || ''}`) ? 'remote' : 'onsite'
  const skills = (hit.category?.label || '').toLowerCase()
  return {
    title: hit.title || 'Role',
    company: hit.company?.display_name || 'Company',
    location: loc,
    remote,
    source: 'adzuna',
    source_url: hit.redirect_url || hit.adref || '',
    department: hit.category?.label || '',
    seniority: 'mid',
    description: String(hit.description || '').replace(/<[^>]+>/g, ' ').slice(0, 2500),
    requirements: '',
    skills_csv: skills,
    posted_at: String(hit.created || '').slice(0, 10) || nowIso().slice(0, 10),
  }
}

export async function refreshAdzuna(what) {
  if (!adzunaEnabled()) return []
  const q = String(what || 'software').slice(0, 80)
  const now = Date.now()
  if (cache.query === q && now - cache.at < 30 * 60 * 1000) return cache.ids

  const url = new URL(`https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1`)
  url.searchParams.set('app_id', APP_ID)
  url.searchParams.set('app_key', APP_KEY)
  url.searchParams.set('results_per_page', '20')
  url.searchParams.set('what', q)
  url.searchParams.set('content-type', 'application/json')

  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) return []
  const body = await res.json()
  const hits = Array.isArray(body.results) ? body.results : []
  const ids = []
  for (const hit of hits) {
    const job = mapAdzunaJob(hit)
    if (!job.source_url) continue
    const existing = await queryOne('SELECT id FROM jobs WHERE source_url = $1', [job.source_url])
    if (existing) {
      ids.push(existing.id)
      continue
    }
    const row = await queryOne(
      `INSERT INTO jobs (title, company, location, remote, source, source_url, department, seniority, description, requirements, skills_csv, posted_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [
        job.title,
        job.company,
        job.location,
        job.remote,
        job.source,
        job.source_url,
        job.department,
        job.seniority,
        job.description,
        job.requirements,
        job.skills_csv,
        job.posted_at,
        nowIso(),
      ],
    )
    ids.push(row.id)
  }
  cache = { at: now, query: q, ids }
  return ids
}
