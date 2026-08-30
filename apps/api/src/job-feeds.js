import { query, queryOne, nowIso } from './db.js'
import { extractSkills } from './matching.js'
import { adzunaEnabled, refreshAdzuna } from './adzuna.js'

const FETCH_MS = 12000
const PER_FEED = 30
let cache = { at: 0, query: '', ids: [], sources: {} }

export function liveFeedsEnabled() {
  return true
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokensFromQuery(q) {
  return String(q || '')
    .toLowerCase()
    .split(/[^a-z0-9+.#]+/g)
    .filter((t) => t.length > 2)
    .slice(0, 8)
}

export function jobMatchesQuery(job, q) {
  const tokens = tokensFromQuery(q)
  if (!tokens.length) return true
  const hay = `${job.title} ${job.company} ${job.location} ${job.department} ${job.skills_csv} ${job.description}`.toLowerCase()
  const hits = tokens.filter((t) => hay.includes(t)).length
  return hits >= 1
}

export function isLiveApplyUrl(url) {
  const raw = String(url || '')
  if (!/^https?:\/\//i.test(raw)) return false
  try {
    const host = new URL(raw).hostname.replace(/^www\./, '').toLowerCase()
    if (!host || host === 'example.com' || host.endsWith('.example.com')) return false
    return true
  } catch {
    return false
  }
}

export function applyHost(url) {
  try {
    return new URL(String(url)).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function boardSearchLinks(q, location) {
  const keywords = String(q || 'software engineer').slice(0, 80)
  const loc = String(location || 'United States').slice(0, 80)
  return [
    {
      name: 'LinkedIn',
      url: `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(keywords)}&location=${encodeURIComponent(loc)}`,
    },
    {
      name: 'Indeed',
      url: `https://www.indeed.com/jobs?q=${encodeURIComponent(keywords)}&l=${encodeURIComponent(loc)}`,
    },
    {
      name: 'Google Jobs',
      url: `https://www.google.com/search?ibp=htl;jobs&q=${encodeURIComponent(`${keywords} ${loc}`)}`,
    },
  ]
}

export function searchQuery(parsed, user, fallback = 'software engineer') {
  const target = String(user?.target_roles || '')
    .split(',')[0]
    .replace(/\s+with\b.*/i, '')
    .trim()
  const title = String(parsed?.titles?.[0] || '')
    .replace(/\s+with\b.*/i, '')
    .split(/[.|]/)[0]
    .trim()
    .slice(0, 60)
  if (target && target.length >= 4 && target.length <= 60) {
    if (!/\b(engineer|developer|designer|manager|analyst|scientist)\b/i.test(target) && /\bengineer\b/i.test(title)) {
      return `${target} engineer`.slice(0, 60)
    }
    return target
  }
  if (title) return title
  const skills = Array.isArray(parsed?.skills) ? parsed.skills.slice(0, 4).join(' ') : ''
  return skills || fallback
}

function skillsFrom(text) {
  return extractSkills(text).slice(0, 14).join(', ')
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'SAVENTRA-desk/1.0' },
    signal: AbortSignal.timeout(FETCH_MS),
  })
  if (!res.ok) throw new Error(`feed ${res.status}`)
  return res.json()
}

export async function upsertLiveJob(job) {
  if (!job?.title || !isLiveApplyUrl(job.source_url)) return null
  const existing = await queryOne('SELECT id FROM jobs WHERE source_url = $1', [job.source_url])
  if (existing) return existing.id
  const skills = job.skills_csv || skillsFrom(`${job.title} ${job.description}`)
  const row = await queryOne(
    `INSERT INTO jobs (title, company, location, remote, source, source_url, department, seniority, description, requirements, skills_csv, posted_at, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
    [
      String(job.title).slice(0, 180),
      String(job.company || 'Company').slice(0, 160),
      String(job.location || 'Remote').slice(0, 160),
      job.remote === 'hybrid' || job.remote === 'onsite' ? job.remote : 'remote',
      String(job.source || 'live').slice(0, 40),
      String(job.source_url).slice(0, 500),
      String(job.department || '').slice(0, 80),
      String(job.seniority || 'mid').slice(0, 40),
      stripHtml(job.description).slice(0, 2500),
      String(job.requirements || '').slice(0, 1500),
      skills.slice(0, 400),
      String(job.posted_at || nowIso()).slice(0, 10),
      nowIso(),
    ],
  )
  return row.id
}

async function ingest(jobs, q) {
  const ids = []
  const filtered = jobs.filter((j) => jobMatchesQuery(j, q)).slice(0, PER_FEED)
  for (const job of filtered) {
    try {
      const id = await upsertLiveJob(job)
      if (id) ids.push(id)
    } catch (err) {
      console.warn('job ingest skipped', err.message)
    }
  }
  return ids
}

async function pullRemotive(q) {
  const url = new URL('https://remotive.com/api/remote-jobs')
  url.searchParams.set('search', q || 'software')
  const body = await fetchJson(url)
  const jobs = Array.isArray(body.jobs) ? body.jobs : []
  return ingest(
    jobs.slice(0, 80).map((hit) => ({
      title: hit.title,
      company: hit.company_name,
      location: hit.candidate_required_location || 'Remote',
      remote: 'remote',
      source: 'remotive',
      source_url: hit.url,
      department: hit.category || '',
      seniority: /senior|staff|principal/i.test(hit.title || '') ? 'senior' : 'mid',
      description: hit.description,
      requirements: Array.isArray(hit.tags) ? hit.tags.join(', ') : '',
      skills_csv: Array.isArray(hit.tags) ? hit.tags.join(', ').toLowerCase() : '',
      posted_at: String(hit.publication_date || '').slice(0, 10),
    })),
    q,
  )
}

async function pullArbeitnow(q) {
  const body = await fetchJson('https://www.arbeitnow.com/api/job-board-api')
  const rows = Array.isArray(body.data) ? body.data : []
  return ingest(
    rows.slice(0, 120).map((hit) => ({
      title: hit.title,
      company: hit.company_name,
      location: hit.location || (hit.remote ? 'Remote' : ''),
      remote: hit.remote ? 'remote' : 'onsite',
      source: 'arbeitnow',
      source_url: hit.url,
      department: Array.isArray(hit.tags) ? hit.tags[0] : '',
      seniority: /senior|staff|lead/i.test(hit.title || '') ? 'senior' : 'mid',
      description: hit.description,
      requirements: Array.isArray(hit.tags) ? hit.tags.join(', ') : '',
      skills_csv: Array.isArray(hit.tags) ? hit.tags.join(', ').toLowerCase() : '',
      posted_at: hit.created_at ? String(hit.created_at).slice(0, 10) : '',
    })),
    q,
  )
}

function museCategories(q) {
  const s = String(q || '').toLowerCase()
  const cats = []
  if (/design|figma|ux|ui/.test(s)) cats.push('Design and UX')
  if (/data|sql|analyst|machine learning|python/.test(s)) cats.push('Data Science')
  if (/product/.test(s)) cats.push('Product')
  if (/market/.test(s)) cats.push('Marketing and PR')
  if (/sales|account/.test(s)) cats.push('Sales')
  if (!cats.length || /engineer|developer|software|react|node/.test(s)) cats.unshift('Software Engineering')
  return [...new Set(cats)].slice(0, 2)
}

async function pullMuse(q) {
  const ids = []
  for (const category of museCategories(q)) {
    const url = new URL('https://www.themuse.com/api/public/jobs')
    url.searchParams.set('page', '0')
    url.searchParams.set('descending', 'true')
    url.searchParams.set('category', category)
    const body = await fetchJson(url)
    const rows = Array.isArray(body.results) ? body.results : []
    const mapped = rows.map((hit) => {
      const loc = Array.isArray(hit.locations) && hit.locations[0] ? hit.locations[0].name : 'United States'
      return {
        title: hit.name,
        company: hit.company?.name || 'Company',
        location: loc,
        remote: /remote/i.test(loc) ? 'remote' : 'hybrid',
        source: 'themuse',
        source_url: hit.refs?.landing_page || '',
        department: category,
        seniority: /senior|staff|director/i.test(hit.name || '') ? 'senior' : 'mid',
        description: Array.isArray(hit.contents) ? hit.contents : String(hit.contents || ''),
        requirements: '',
        posted_at: String(hit.publication_date || '').slice(0, 10),
      }
    })
    ids.push(...(await ingest(mapped, q)))
  }
  return ids
}

async function pullRemoteOK(q) {
  const rows = await fetchJson('https://remoteok.com/api')
  const jobs = Array.isArray(rows) ? rows : []
  return ingest(
    jobs
      .filter((hit) => hit && hit.position && (hit.apply_url || hit.url))
      .slice(0, 80)
      .map((hit) => ({
        title: hit.position,
        company: hit.company,
        location: hit.location || 'Remote',
        remote: 'remote',
        source: 'remoteok',
        source_url: hit.apply_url || hit.url,
        department: Array.isArray(hit.tags) ? String(hit.tags[0] || '') : '',
        seniority: /senior|staff|principal/i.test(hit.position || '') ? 'senior' : 'mid',
        description: hit.description,
        requirements: Array.isArray(hit.tags) ? hit.tags.join(', ') : '',
        skills_csv: Array.isArray(hit.tags) ? hit.tags.join(', ').toLowerCase() : '',
        posted_at: String(hit.date || '').slice(0, 10),
      })),
    q,
  )
}

async function pullHimalayas(q) {
  const url = new URL('https://himalayas.app/jobs/api')
  url.searchParams.set('limit', '40')
  const body = await fetchJson(url)
  const rows = Array.isArray(body.jobs) ? body.jobs : []
  return ingest(
    rows.map((hit) => {
      const loc = Array.isArray(hit.locationRestrictions) && hit.locationRestrictions.length
        ? hit.locationRestrictions.join(', ')
        : 'Remote'
      const seniority = Array.isArray(hit.seniority) ? String(hit.seniority[0] || 'mid').toLowerCase() : 'mid'
      return {
        title: hit.title,
        company: hit.companyName,
        location: loc,
        remote: 'remote',
        source: 'himalayas',
        source_url: hit.applicationLink || hit.guid,
        department: Array.isArray(hit.categories) ? String(hit.categories[0] || '') : '',
        seniority: /senior|staff|lead/.test(seniority) ? 'senior' : seniority.slice(0, 40),
        description: hit.description || hit.excerpt,
        requirements: '',
        posted_at: String(hit.pubDate || '').slice(0, 10),
      }
    }),
    q,
  )
}

async function pullJobicy(q) {
  const url = new URL('https://jobicy.com/api/v2/remote-jobs')
  url.searchParams.set('count', '50')
  const tag = tokensFromQuery(q)[0]
  if (tag) url.searchParams.set('tag', tag)
  const body = await fetchJson(url)
  const rows = Array.isArray(body.jobs) ? body.jobs : []
  return ingest(
    rows.map((hit) => ({
      title: hit.jobTitle,
      company: hit.companyName,
      location: hit.jobGeo || 'Remote',
      remote: 'remote',
      source: 'jobicy',
      source_url: hit.url,
      department: Array.isArray(hit.jobIndustry) ? String(hit.jobIndustry[0] || '') : '',
      seniority: /senior|staff|lead/i.test(String(hit.jobLevel || hit.jobTitle || '')) ? 'senior' : 'mid',
      description: hit.jobDescription || hit.jobExcerpt,
      requirements: '',
      posted_at: String(hit.pubDate || '').slice(0, 10),
    })),
    q,
  )
}

export async function refreshLiveJobs(what) {
  const q = String(what || 'software engineer').slice(0, 80)
  const now = Date.now()
  if (cache.query === q && now - cache.at < 20 * 60 * 1000) {
    return { ids: cache.ids, sources: cache.sources, cached: true }
  }
  const sources = {
    adzuna: 0,
    remotive: 0,
    arbeitnow: 0,
    themuse: 0,
    remoteok: 0,
    himalayas: 0,
    jobicy: 0,
  }
  const settled = await Promise.allSettled([
    adzunaEnabled()
      ? refreshAdzuna(q).then((ids) => {
          sources.adzuna = ids.length
          return ids
        })
      : Promise.resolve([]),
    pullRemotive(q).then((ids) => {
      sources.remotive = ids.length
      return ids
    }),
    pullArbeitnow(q).then((ids) => {
      sources.arbeitnow = ids.length
      return ids
    }),
    pullMuse(q).then((ids) => {
      sources.themuse = ids.length
      return ids
    }),
    pullRemoteOK(q).then((ids) => {
      sources.remoteok = ids.length
      return ids
    }),
    pullHimalayas(q).then((ids) => {
      sources.himalayas = ids.length
      return ids
    }),
    pullJobicy(q).then((ids) => {
      sources.jobicy = ids.length
      return ids
    }),
  ])
  const ids = []
  for (const item of settled) {
    if (item.status === 'fulfilled') ids.push(...item.value)
    else console.warn('live feed skipped', item.reason?.message || item.reason)
  }
  cache = { at: now, query: q, ids, sources }
  return { ids, sources, cached: false }
}
