import { query, queryOne, nowIso } from './db.js'
import { extractSkills, inferSeniority, isRoleTitle } from './matching.js'
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

export function isUsaJob(job) {
  const loc = String(job.location || '')
  if (!loc.trim() || /^(n\/a|na|none|unknown|not specified)$/i.test(loc.trim())) return false
  const nonUs =
    /\b(germany|berlin|munich|india|bangalore|hyderabad|london|united kingdom|\buk\b|england|france|paris|netherlands|amsterdam|israel|tel aviv|australia|sydney|italy|milan|sweden|stockholm|poland|singapore|brazil|ireland|dublin|japan|tokyo|canada|toronto|mexico|spain|barcelona)\b/i
  const us =
    /\b(united states|usa|u\.s\.a?|\bus\b|remote,? us|nationwide|california|new york|texas|washington|seattle|austin|boston|chicago|denver|atlanta|miami|colorado|georgia|florida|illinois|massachusetts|san francisco|san jose|los angeles|nyc|bay area)\b/i
  if (nonUs.test(loc) && !us.test(loc)) return false
  return true
}

export function isUsOnlyLocation(job) {
  if (!isUsaJob(job)) return false
  return !/\b(canada|united kingdom|\buk\b|germany|india|israel|australia|ireland|mexico)\b/i.test(String(job.location || ''))
}

export const AGGREGATOR_SOURCES = new Set(['remotive', 'arbeitnow', 'themuse', 'remoteok', 'himalayas', 'jobicy'])

export function isTrustedUsListing(job) {
  if (AGGREGATOR_SOURCES.has(String(job.source || '').toLowerCase())) return false
  if (/remotive\.com|arbeitnow\.com|themuse\.com|remoteok\.com|himalayas\.app|jobicy\.com/i.test(String(job.source_url || ''))) {
    return false
  }
  return isUsaJob(job)
}

export function isCandidateListing(job) {
  return isTrustedUsListing(job) && isLiveApplyUrl(job.source_url)
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
      blurb: 'Search with your title filled in',
      url: `https://www.linkedin.com/jobs/search/?keywords=${enc(keywords)}&location=${enc(loc)}`,
    },
    {
      name: 'Indeed',
      kind: 'indeed',
      blurb: 'The board most US recruiters still post on',
      url: `https://www.indeed.com/jobs?q=${enc(keywords)}&l=${enc(loc)}`,
    },
    {
      name: 'ZipRecruiter',
      kind: 'ziprecruiter',
      blurb: 'US recruiter board',
      url: `https://www.ziprecruiter.com/jobs-search?search=${enc(keywords)}&location=${enc(loc)}`,
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

function greenhouseJobId(url) {
  const raw = String(url || '')
  return raw.match(/gh_jid=(\d+)/i)?.[1] || raw.match(/\/jobs\/(\d{5,})/)?.[1] || ''
}

export async function upsertLiveJob(job) {
  if (!job?.title || !isLiveApplyUrl(job.source_url)) return null
  const url = String(job.source_url).slice(0, 500)
  const existing = await queryOne('SELECT id FROM jobs WHERE source_url = $1', [url])
  if (existing) return existing.id
  const gh = greenhouseJobId(url)
  if (gh) {
    const dup = await queryOne(
      `SELECT id FROM jobs WHERE source_url LIKE $1 OR source_url LIKE $2 LIMIT 1`,
      [`%gh_jid=${gh}%`, `%/jobs/${gh}%`],
    )
    if (dup) return dup.id
  }
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
      url,
      String(job.department || '').slice(0, 80),
      inferSeniority(job).slice(0, 40),
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
  const filtered = jobs.filter((j) => isTrustedUsListing(j) && jobMatchesQuery(j, q)).slice(0, max)
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
          seniority: inferSeniority({ title: hit.title }),
          description: 'Career posting on Greenhouse.',
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
          seniority: inferSeniority({ title: hit.text }),
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
  url.searchParams.set('loc_query', 'United States')
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
      seniority: inferSeniority({ title: hit.title }),
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
      seniority: inferSeniority({ title: hit.title }),
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
