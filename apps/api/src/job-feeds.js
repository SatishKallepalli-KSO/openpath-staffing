import { query, queryOne, nowIso } from './db.js'
import { extractSkills, isRoleTitle } from './matching.js'
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

export function applyBrand(url) {
  const host = applyHost(url).toLowerCase()
  const href = String(url || '').toLowerCase()
  if (host.includes('greenhouse') || href.includes('gh_jid')) return 'Greenhouse'
  if (host.includes('linkedin')) return 'LinkedIn'
  if (host.includes('indeed')) return 'Indeed'
  if (host.includes('lever.co')) return 'Lever'
  if (host.includes('amazon')) return 'Amazon'
  if (host.includes('myworkdayjobs') || host.includes('workday')) return 'Workday'
  if (host.includes('oracle')) return 'Oracle'
  if (host.includes('metacareers') || host.includes('meta.com')) return 'Meta'
  if (host.includes('apple.com')) return 'Apple'
  if (host.includes('microsoft')) return 'Microsoft'
  if (host.includes('google.com') && href.includes('careers')) return 'Google'
  return host
}

export function boardSearchLinks(q, location) {
  const keywords = String(q || 'software engineer').slice(0, 80)
  const loc = String(location || 'United States').slice(0, 80)
  const enc = encodeURIComponent
  return [
    {
      name: 'LinkedIn',
      kind: 'linkedin',
      blurb: 'Easy Apply search with your title filled in',
      url: `https://www.linkedin.com/jobs/search/?keywords=${enc(keywords)}&location=${enc(loc)}`,
    },
    {
      name: 'Indeed',
      kind: 'indeed',
      blurb: 'Same search on Indeed',
      url: `https://www.indeed.com/jobs?q=${enc(keywords)}&l=${enc(loc)}`,
    },
    {
      name: 'Greenhouse',
      kind: 'greenhouse',
      blurb: 'Company career pages that run on Greenhouse',
      url: `https://www.google.com/search?q=${enc(`${keywords} site:greenhouse.io OR site:job-boards.greenhouse.io`)}`,
    },
    {
      name: 'Google',
      kind: 'google',
      blurb: 'Google careers',
      url: `https://www.google.com/about/careers/applications/jobs/results/?q=${enc(keywords)}`,
    },
    {
      name: 'Meta',
      kind: 'meta',
      blurb: 'Meta careers',
      url: `https://www.metacareers.com/jobs?q=${enc(keywords)}`,
    },
    {
      name: 'Oracle',
      kind: 'oracle',
      blurb: 'Oracle careers',
      url: `https://careers.oracle.com/en/sites/jobsearch/jobs?keyword=${enc(keywords)}`,
    },
    {
      name: 'Microsoft',
      kind: 'microsoft',
      blurb: 'Microsoft careers',
      url: `https://jobs.careers.microsoft.com/global/en/search?q=${enc(keywords)}`,
    },
    {
      name: 'Amazon',
      kind: 'amazon',
      blurb: 'Amazon.jobs',
      url: `https://www.amazon.jobs/en/search?base_query=${enc(keywords)}`,
    },
    {
      name: 'Apple',
      kind: 'apple',
      blurb: 'Apple jobs',
      url: `https://jobs.apple.com/en-us/search?search=${enc(keywords)}`,
    },
  ]
}

export function searchQuery(parsed, user, fallback = 'software engineer') {
  const headline = String(user?.headline || '')
    .replace(/\s+with\b.*/i, '')
    .trim()
    .slice(0, 60)
  if (headline && isRoleTitle(headline)) return headline

  const target = String(user?.target_roles || '')
    .split(',')[0]
    .replace(/\s+with\b.*/i, '')
    .trim()
  const targetLow = target.toLowerCase()
  if (target && target.length >= 4 && target.length <= 60) {
    if (/\b(full[\s-]?stack|front[\s-]?end|back[\s-]?end)\b/.test(targetLow) && !/\b(engineer|developer)\b/.test(targetLow)) {
      return `${target} engineer`.slice(0, 60)
    }
    if (isRoleTitle(target)) return target
  }

  const role = (parsed?.titles || []).find((t) => isRoleTitle(t))
  if (role) {
    return String(role)
      .replace(/\s+with\b.*/i, '')
      .split(/[.|]/)[0]
      .trim()
      .slice(0, 60)
  }

  const skills = Array.isArray(parsed?.skills) ? parsed.skills.slice(0, 5).join(' ') : ''
  return skills || fallback
}

function skillsFrom(text) {
  return extractSkills(text).slice(0, 14).join(', ')
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; SAVENTRA-desk/1.0)' },
    signal: AbortSignal.timeout(FETCH_MS),
  })
  if (!res.ok) throw new Error(`feed ${res.status}`)
  return res.json()
}

async function fetchJsonPost(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (compatible; SAVENTRA-desk/1.0)',
    },
    body: JSON.stringify(body),
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
  return row?.id
}

async function ingest(jobs, q, max = PER_FEED) {
  const ids = []
  const filtered = jobs.filter((j) => jobMatchesQuery(j, q)).slice(0, max)
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

const GREENHOUSE_BOARDS = [
  ['stripe', 'Stripe'],
  ['gitlab', 'GitLab'],
  ['datadog', 'Datadog'],
  ['cloudflare', 'Cloudflare'],
  ['airbnb', 'Airbnb'],
  ['discord', 'Discord'],
  ['figma', 'Figma'],
  ['airtable', 'Airtable'],
  ['twilio', 'Twilio'],
  ['mongodb', 'MongoDB'],
  ['snowflake', 'Snowflake'],
  ['pinterest', 'Pinterest'],
  ['dropbox', 'Dropbox'],
  ['robinhood', 'Robinhood'],
  ['coinbase', 'Coinbase'],
  ['databricks', 'Databricks'],
  ['doordash', 'DoorDash'],
  ['lyft', 'Lyft'],
  ['asana', 'Asana'],
  ['okta', 'Okta'],
]

const LEVER_SITES = [
  ['palantir', 'Palantir'],
  ['spotify', 'Spotify'],
]

async function mapLimit(items, limit, fn) {
  const out = []
  let i = 0
  async function worker() {
    while (i < items.length) {
      const cur = i++
      try {
        out.push(await fn(items[cur]))
      } catch (err) {
        console.warn('career board skipped', err.message)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out.flat()
}

async function pullGreenhouse(q) {
  return mapLimit(GREENHOUSE_BOARDS, 5, async ([token, company]) => {
    const body = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs`)
    const rows = Array.isArray(body.jobs) ? body.jobs : []
    return ingest(
      rows.map((hit) => {
        const loc = hit.location?.name || ''
        return {
          title: hit.title,
          company,
          location: loc || 'United States',
          remote: /remote/i.test(loc) ? 'remote' : 'hybrid',
          source: 'greenhouse',
          source_url: hit.absolute_url,
          department: hit.departments?.[0]?.name || '',
          seniority: /senior|staff|principal|director/i.test(hit.title || '') ? 'senior' : 'mid',
          description: `${company} career posting on Greenhouse.`,
          requirements: '',
          posted_at: String(hit.updated_at || hit.created_at || '').slice(0, 10),
        }
      }),
      q,
      8,
    )
  })
}

async function pullLever(q) {
  return mapLimit(LEVER_SITES, 2, async ([site, company]) => {
    const rows = await fetchJson(`https://api.lever.co/v0/postings/${site}?mode=json`)
    const jobs = Array.isArray(rows) ? rows : []
    return ingest(
      jobs.map((hit) => {
        const loc = hit.categories?.location || ''
        return {
          title: hit.text,
          company,
          location: loc || 'United States',
          remote: /remote/i.test(`${loc} ${hit.text}`) ? 'remote' : 'hybrid',
          source: 'lever',
          source_url: hit.hostedUrl || hit.applyUrl,
          department: hit.categories?.team || '',
          seniority: /senior|staff|principal/i.test(hit.text || '') ? 'senior' : 'mid',
          description: stripHtml(hit.descriptionPlain || hit.description || ''),
          requirements: '',
          posted_at: hit.createdAt ? new Date(hit.createdAt).toISOString().slice(0, 10) : '',
        }
      }),
      q,
      12,
    )
  })
}

async function pullAmazon(q) {
  const url = new URL('https://www.amazon.jobs/en/search.json')
  url.searchParams.set('base_query', q || 'software engineer')
  url.searchParams.set('offset', '0')
  url.searchParams.set('result_limit', '30')
  url.searchParams.set('sort', 'relevant')
  const body = await fetchJson(url)
  const rows = Array.isArray(body.jobs) ? body.jobs : []
  return ingest(
    rows.map((hit) => ({
      title: hit.title,
      company: hit.company_name || 'Amazon',
      location: hit.normalized_location || hit.location || hit.city || 'United States',
      remote: /remote/i.test(`${hit.title} ${hit.normalized_location || ''}`) ? 'remote' : 'hybrid',
      source: 'amazon',
      source_url: hit.job_path ? `https://www.amazon.jobs${hit.job_path}` : hit.url_next_step,
      department: hit.job_family || hit.business_category || '',
      seniority: /senior|principal|ii+|iii/i.test(hit.title || '') ? 'senior' : 'mid',
      description: stripHtml(hit.description_short || hit.description || ''),
      requirements: stripHtml(hit.basic_qualifications || ''),
      posted_at: '',
    })),
    q,
    20,
  )
}

async function pullNvidia(q) {
  const body = await fetchJsonPost(
    'https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs',
    { appliedFacets: {}, limit: 30, offset: 0, searchText: q || 'software engineer' },
  )
  const rows = Array.isArray(body.jobPostings) ? body.jobPostings : []
  return ingest(
    rows.map((hit) => ({
      title: hit.title,
      company: 'NVIDIA',
      location: hit.locationsText || 'United States',
      remote: /remote/i.test(hit.locationsText || '') ? 'remote' : 'hybrid',
      source: 'nvidia',
      source_url: hit.externalPath
        ? `https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite${hit.externalPath}`
        : '',
      department: 'Engineering',
      seniority: /senior|staff|principal/i.test(hit.title || '') ? 'senior' : 'mid',
      description: 'NVIDIA career posting.',
      requirements: '',
      posted_at: '',
    })),
    q,
    15,
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
    greenhouse: 0,
    lever: 0,
    amazon: 0,
    nvidia: 0,
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
    pullGreenhouse(q).then((ids) => {
      sources.greenhouse = ids.length
      return ids
    }),
    pullLever(q).then((ids) => {
      sources.lever = ids.length
      return ids
    }),
    pullAmazon(q).then((ids) => {
      sources.amazon = ids.length
      return ids
    }),
    pullNvidia(q).then((ids) => {
      sources.nvidia = ids.length
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
