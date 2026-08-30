import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import {
  addActivity,
  closeDb,
  DATABASE_URL,
  initDb,
  isPostgres,
  nowIso,
  query,
  queryOne,
} from './db.js'
import {
  createUser,
  getAdminPin,
  loginUser,
  publicUser,
  requireAdmin,
  requireUser,
  signAdmin,
  signUser,
} from './auth.js'
import { extractFromUpload, parsedOrThrow } from './resume.js'
import { parseResume, rankJobs } from './matching.js'
import { suggestEdits } from './tailor.js'
import { adzunaEnabled } from './adzuna.js'
import { applyBrand, applyHost, boardSearchLinks, isLiveApplyUrl, liveFeedsEnabled, refreshLiveJobs, searchQuery } from './job-feeds.js'
import { rateLimit } from './rate-limit.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STATIC_DIR = path.resolve(__dirname, '../static')
const APP_URL = (process.env.APP_URL || '').replace(/\/$/, '')
const PORT = Number(process.env.PORT || 8000)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
})

const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)

const corsOrigins = (process.env.CORS_ORIGINS || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)
const allowCredentials = !corsOrigins.includes('*')
app.use(
  cors({
    origin: corsOrigins.includes('*') ? true : corsOrigins,
    credentials: allowCredentials,
  }),
)
app.use(express.json({ limit: '1mb' }))

function fail(res, err) {
  const status = err.status || 500
  const detail = status === 500 ? 'Something went wrong' : err.message
  if (status === 500) console.error(err)
  res.status(status).json({ detail })
}

function parseJson(value, fallback) {
  if (value && typeof value === 'object') return value
  try {
    return JSON.parse(value || '')
  } catch {
    return fallback
  }
}

function resumeOut(row) {
  if (!row) return null
  return {
    id: row.id,
    filename: row.filename,
    kind: row.kind,
    parent_id: row.parent_id,
    job_id: row.job_id,
    created_at: row.created_at,
    parsed: parseJson(row.parsed_json, {}),
    text: row.raw_text,
  }
}

function jobOut(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    company: row.company,
    location: row.location,
    remote: row.remote,
    source: row.source,
    source_url: row.source_url,
    apply_host: applyHost(row.source_url),
    apply_via: applyBrand(row.source_url),
    can_apply: isLiveApplyUrl(row.source_url),
    department: row.department,
    seniority: row.seniority,
    description: row.description,
    requirements: row.requirements,
    skills_csv: row.skills_csv,
    posted_at: row.posted_at,
    created_at: row.created_at,
    match_score: row.match_score,
    missing_skills: row.missing_skills,
    matched_skills: row.matched_skills,
  }
}

async function latestOriginalResume(userId) {
  return queryOne(
    `SELECT * FROM resumes WHERE user_id = $1 AND kind = 'original' ORDER BY id DESC LIMIT 1`,
    [userId],
  )
}

app.get('/healthz', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'saventra-api',
    db: isPostgres ? 'postgres' : 'sqlite',
    jobs_live: liveFeedsEnabled() || adzunaEnabled(),
    timestamp: new Date().toISOString(),
  })
})

app.get('/v1/stats', async (_req, res) => {
  try {
    const jobs = await queryOne('SELECT COUNT(*) AS n FROM jobs')
    const users = await queryOne('SELECT COUNT(*) AS n FROM users')
    const apps = await queryOne('SELECT COUNT(*) AS n FROM applications')
    res.json({
      jobs: Number(jobs?.n || 0),
      candidates: Number(users?.n || 0),
      applications: Number(apps?.n || 0),
    })
  } catch (err) {
    fail(res, err)
  }
})

app.post('/v1/inquiries', rateLimit({ max: 6, windowSec: 3600, key: 'inquiry' }), async (req, res) => {
  try {
    const company = String(req.body?.company || '').trim()
    const contact_name = String(req.body?.contact_name || '').trim()
    const email = String(req.body?.email || '').trim().toLowerCase()
    const role = String(req.body?.role || '').trim().slice(0, 160)
    const message = String(req.body?.message || '').trim().slice(0, 4000)
    if (company.length < 2 || contact_name.length < 2 || !email.includes('@') || message.length < 20) {
      res.status(400).json({ detail: 'Company, name, email, and a short brief are required.' })
      return
    }
    const row = await queryOne(
      `INSERT INTO inquiries (company, contact_name, email, role, message, created_at)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, created_at`,
      [company.slice(0, 160), contact_name.slice(0, 120), email.slice(0, 180), role, message, nowIso()],
    )
    res.status(201).json({ id: row.id, created_at: row.created_at })
  } catch (err) {
    fail(res, err)
  }
})

app.post('/v1/auth/signup', rateLimit({ max: 8, windowSec: 3600, key: 'signup' }), async (req, res) => {
  try {
    const user = await createUser(req.body || {})
    res.status(201).json({ access_token: signUser(user), user: publicUser(user) })
  } catch (err) {
    fail(res, err)
  }
})

app.post('/v1/auth/login', rateLimit({ max: 12, windowSec: 900, key: 'login' }), async (req, res) => {
  try {
    const user = await loginUser(req.body?.email, req.body?.password)
    res.json({ access_token: signUser(user), user: publicUser(user) })
  } catch (err) {
    fail(res, err)
  }
})

app.post('/v1/auth/logout', (_req, res) => {
  res.json({ ok: true })
})

app.get('/v1/me', requireUser, (req, res) => {
  res.json(publicUser(req.user))
})

app.patch('/v1/me', requireUser, async (req, res) => {
  try {
    const headline = String(req.body?.headline ?? req.user.headline ?? '').slice(0, 160)
    const location = String(req.body?.location ?? req.user.location ?? '').slice(0, 120)
    const target_roles = String(req.body?.target_roles ?? req.user.target_roles ?? '').slice(0, 200)
    const years = Number(req.body?.years_experience ?? req.user.years_experience ?? 0)
    const years_experience = Number.isFinite(years) ? Math.max(0, Math.min(50, Math.round(years))) : 0
    const full_name = String(req.body?.full_name ?? req.user.full_name).trim().slice(0, 120)
    const row = await queryOne(
      `UPDATE users SET full_name=$1, headline=$2, location=$3, target_roles=$4, years_experience=$5
       WHERE id=$6 RETURNING *`,
      [full_name || req.user.full_name, headline, location, target_roles, years_experience, req.user.id],
    )
    res.json(publicUser(row))
  } catch (err) {
    fail(res, err)
  }
})

app.get('/v1/resumes', requireUser, async (req, res) => {
  try {
    const rows = await query(
      `SELECT id, filename, kind, parent_id, job_id, created_at, parsed_json FROM resumes
       WHERE user_id = $1 ORDER BY id DESC LIMIT 40`,
      [req.user.id],
    )
    res.json(
      rows.map((row) => ({
        id: row.id,
        filename: row.filename,
        kind: row.kind,
        parent_id: row.parent_id,
        job_id: row.job_id,
        created_at: row.created_at,
        parsed: parseJson(row.parsed_json, {}),
      })),
    )
  } catch (err) {
    fail(res, err)
  }
})

app.get('/v1/resumes/:id', requireUser, async (req, res) => {
  try {
    const row = await queryOne('SELECT * FROM resumes WHERE id = $1 AND user_id = $2', [
      Number(req.params.id),
      req.user.id,
    ])
    if (!row) {
      res.status(404).json({ detail: 'Resume not found' })
      return
    }
    res.json(resumeOut(row))
  } catch (err) {
    fail(res, err)
  }
})

app.post(
  '/v1/resumes',
  requireUser,
  rateLimit({ max: 10, windowSec: 3600, key: 'resume' }),
  upload.single('file'),
  async (req, res) => {
    try {
      let raw = String(req.body?.text || '').trim()
      let filename = 'pasted-resume.txt'
      if (req.file) {
        raw = await extractFromUpload(req.file)
        filename = req.file.originalname || filename
      }
      const { parsed } = parsedOrThrow(raw)
      const row = await queryOne(
        `INSERT INTO resumes (user_id, filename, raw_text, parsed_json, kind, created_at)
         VALUES ($1,$2,$3,$4,'original',$5) RETURNING *`,
        [req.user.id, filename.slice(0, 180), raw, JSON.stringify(parsed), nowIso()],
      )
      if (!req.user.headline && parsed.titles[0]) {
        await query('UPDATE users SET headline=$1 WHERE id=$2', [parsed.titles[0].slice(0, 160), req.user.id])
      }
      if (!req.user.years_experience && parsed.years) {
        await query('UPDATE users SET years_experience=$1 WHERE id=$2', [parsed.years, req.user.id])
      }
      await addActivity(req.user.id, 'resume', 'Uploaded resume', filename)
      const q = searchQuery(parsed, req.user)
      try {
        await refreshLiveJobs(q)
      } catch (err) {
        console.warn('Live job pull after resume skipped', err.message)
      }
      res.status(201).json(resumeOut(row))
    } catch (err) {
      fail(res, err)
    }
  },
)

app.get('/v1/jobs/public', async (_req, res) => {
  try {
    const rows = await query(
      `SELECT id, title, company, location, remote, department, seniority, posted_at
       FROM jobs ORDER BY posted_at DESC, id DESC LIMIT 6`,
    )
    res.json(rows)
  } catch (err) {
    fail(res, err)
  }
})

app.get('/v1/jobs/:id', requireUser, async (req, res) => {
  try {
    const job = await queryOne('SELECT * FROM jobs WHERE id = $1', [Number(req.params.id)])
    if (!job) {
      res.status(404).json({ detail: 'Job not found' })
      return
    }
    const resume = await latestOriginalResume(req.user.id)
    const parsed = resume
      ? { ...parseJson(resume.parsed_json, parseResume(resume.raw_text)), location: req.user.location }
      : { skills: [], titles: [], years: req.user.years_experience, keywords: [], location: req.user.location }
    const ranked = rankJobs(parsed, [job])[0]
    res.json(jobOut(ranked))
  } catch (err) {
    fail(res, err)
  }
})

app.get('/v1/matches', requireUser, async (req, res) => {
  try {
    const resume = await latestOriginalResume(req.user.id)
    if (!resume) {
      res.status(400).json({ detail: 'Upload a resume before matching jobs' })
      return
    }
    const parsed = {
      ...parseJson(resume.parsed_json, parseResume(resume.raw_text)),
      location: req.user.location,
      years: req.user.years_experience || parseJson(resume.parsed_json, {}).years,
    }
    const q = String(req.query.q || searchQuery(parsed, req.user))
    let feedMeta = {
      remotive: 0,
      arbeitnow: 0,
      themuse: 0,
      adzuna: 0,
      remoteok: 0,
      himalayas: 0,
      jobicy: 0,
      greenhouse: 0,
      lever: 0,
      amazon: 0,
      nvidia: 0,
    }
    try {
      const live = await refreshLiveJobs(q)
      feedMeta = live.sources || feedMeta
    } catch (err) {
      console.warn('Live job refresh skipped', err.message)
    }
    const jobs = await query('SELECT * FROM jobs ORDER BY id DESC LIMIT 500')
    const minScore = Number(req.query.min_score || 35)
    const remote = String(req.query.remote || '')
    const department = String(req.query.department || '')
    let ranked = rankJobs(parsed, jobs, { minScore: Number.isFinite(minScore) ? minScore : 35 })
    ranked.sort((a, b) => {
      const liveDiff = Number(isLiveApplyUrl(b.source_url)) - Number(isLiveApplyUrl(a.source_url))
      if (liveDiff) return liveDiff
      return b.match_score - a.match_score
    })
    if (remote) ranked = ranked.filter((j) => j.remote === remote)
    if (department) ranked = ranked.filter((j) => j.department.toLowerCase() === department.toLowerCase())
    const search = String(req.query.search || '').toLowerCase()
    if (search) {
      ranked = ranked.filter((j) =>
        `${j.title} ${j.company} ${j.location} ${j.skills_csv}`.toLowerCase().includes(search),
      )
    }
    res.json({
      resume_id: resume.id,
      live_jobs: Object.values(feedMeta).some((n) => Number(n) > 0),
      sources: feedMeta,
      board_links: boardSearchLinks(q, req.user.location),
      count: ranked.length,
      jobs: ranked.slice(0, 50).map(jobOut),
    })
  } catch (err) {
    fail(res, err)
  }
})

app.post('/v1/jobs/:id/tailor', requireUser, async (req, res) => {
  try {
    const job = await queryOne('SELECT * FROM jobs WHERE id = $1', [Number(req.params.id)])
    if (!job) {
      res.status(404).json({ detail: 'Job not found' })
      return
    }
    const resumeId = Number(req.body?.resume_id)
    const resume = resumeId
      ? await queryOne('SELECT * FROM resumes WHERE id = $1 AND user_id = $2', [resumeId, req.user.id])
      : await latestOriginalResume(req.user.id)
    if (!resume) {
      res.status(400).json({ detail: 'Upload a resume first' })
      return
    }
    const suggestion = suggestEdits(resume.raw_text, job)
    res.json({ job: jobOut(job), resume_id: resume.id, ...suggestion })
  } catch (err) {
    fail(res, err)
  }
})

app.post('/v1/jobs/:id/tailor/save', requireUser, async (req, res) => {
  try {
    const job = await queryOne('SELECT * FROM jobs WHERE id = $1', [Number(req.params.id)])
    if (!job) {
      res.status(404).json({ detail: 'Job not found' })
      return
    }
    const text = String(req.body?.text || '')
    const { raw, parsed } = parsedOrThrow(text)
    const parentId = Number(req.body?.parent_id) || null
    const row = await queryOne(
      `INSERT INTO resumes (user_id, filename, raw_text, parsed_json, kind, parent_id, job_id, created_at)
       VALUES ($1,$2,$3,$4,'tailored',$5,$6,$7) RETURNING *`,
      [
        req.user.id,
        `tailored-${job.company}-${job.title}.txt`.replace(/\s+/g, '-').slice(0, 180),
        raw,
        JSON.stringify(parsed),
        parentId,
        job.id,
        nowIso(),
      ],
    )
    await addActivity(req.user.id, 'tailor', `Tailored resume for ${job.title}`, job.company)
    res.status(201).json(resumeOut(row))
  } catch (err) {
    fail(res, err)
  }
})

app.get('/v1/applications', requireUser, async (req, res) => {
  try {
    const rows = await query(
      `SELECT a.*, j.title, j.company, j.location, j.source, j.source_url, j.remote
       FROM applications a JOIN jobs j ON j.id = a.job_id
       WHERE a.user_id = $1 ORDER BY a.updated_at DESC`,
      [req.user.id],
    )
    res.json(rows)
  } catch (err) {
    fail(res, err)
  }
})

async function recordApplication(user, job, status, resumeId, notes) {
  const existing = await queryOne('SELECT * FROM applications WHERE user_id = $1 AND job_id = $2', [user.id, job.id])
  if (existing) {
    await query(
      `UPDATE applications SET status=$1, notes=$2, resume_id=COALESCE($3, resume_id),
       applied_at = CASE WHEN $1 = 'applied' AND applied_at IS NULL THEN $4 ELSE applied_at END,
       updated_at=$4 WHERE id=$5`,
      [status, notes || existing.notes, resumeId, nowIso(), existing.id],
    )
  } else {
    await query(
      `INSERT INTO applications (user_id, job_id, resume_id, status, notes, applied_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [user.id, job.id, resumeId, status, notes, status === 'saved' ? null : nowIso(), nowIso()],
    )
  }
  const row = await queryOne('SELECT * FROM applications WHERE user_id = $1 AND job_id = $2', [user.id, job.id])
  await addActivity(
    user.id,
    status,
    status === 'saved' ? `Saved ${job.title}` : `Marked ${job.title} as ${status}`,
    job.company,
  )
  return { ...row, apply_url: job.source_url, source_url: job.source_url, title: job.title, company: job.company }
}

app.post('/v1/applications', requireUser, async (req, res) => {
  try {
    const job = await queryOne('SELECT * FROM jobs WHERE id = $1', [Number(req.body?.job_id)])
    if (!job) {
      res.status(404).json({ detail: 'Job not found' })
      return
    }
    const status = ['saved', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn'].includes(req.body?.status)
      ? req.body.status
      : 'applied'
    const resumeId = Number(req.body?.resume_id) || null
    const notes = String(req.body?.notes || '').slice(0, 1000)
    const row = await recordApplication(req.user, job, status, resumeId, notes)
    res.status(201).json(row)
  } catch (err) {
    fail(res, err)
  }
})

app.post(
  '/v1/applications/batch',
  requireUser,
  rateLimit({ max: 6, windowSec: 3600, key: 'batch-apply' }),
  async (req, res) => {
    try {
      const resume = await latestOriginalResume(req.user.id)
      if (!resume) {
        res.status(400).json({ detail: 'Upload a resume before applying' })
        return
      }
      const parsed = {
        ...parseJson(resume.parsed_json, parseResume(resume.raw_text)),
        location: req.user.location,
        years: req.user.years_experience || parseJson(resume.parsed_json, {}).years,
      }
      const limit = Math.min(8, Math.max(1, Number(req.body?.limit || 5)))
      const minScore = Number(req.body?.min_score || 55)
      const requested = Array.isArray(req.body?.job_ids) ? req.body.job_ids.map(Number).filter((n) => n > 0) : []
      let jobs
      if (requested.length) {
        jobs = []
        for (const id of requested.slice(0, limit)) {
          const row = await queryOne('SELECT * FROM jobs WHERE id = $1', [id])
          if (row) jobs.push(row)
        }
      } else {
        const all = await query('SELECT * FROM jobs ORDER BY id DESC LIMIT 500')
        const ranked = rankJobs(parsed, all, { minScore: Number.isFinite(minScore) ? minScore : 55 })
        const live = ranked.filter((j) => isLiveApplyUrl(j.source_url))
        jobs = (live.length ? live : ranked).slice(0, limit)
      }
      const already = await query('SELECT job_id FROM applications WHERE user_id = $1 AND status = $2', [
        req.user.id,
        'applied',
      ])
      const appliedIds = new Set(already.map((a) => Number(a.job_id)))
      const applications = []
      for (const job of jobs) {
        if (appliedIds.has(Number(job.id))) continue
        const row = await recordApplication(
          req.user,
          job,
          'applied',
          resume.id,
          'Queued from resume match. Complete the employer apply page.',
        )
        applications.push(row)
        if (applications.length >= limit) break
      }
      res.json({
        count: applications.length,
        note: 'We track these on your desk and return employer apply links. We do not log into LinkedIn, Indeed, or Greenhouse for you.',
        applications,
      })
    } catch (err) {
      fail(res, err)
    }
  },
)

app.patch('/v1/applications/:id', requireUser, async (req, res) => {
  try {
    const status = String(req.body?.status || '')
    if (!['saved', 'applied', 'interviewing', 'offered', 'rejected', 'withdrawn'].includes(status)) {
      res.status(400).json({ detail: 'Unknown status' })
      return
    }
    const notes = req.body?.notes != null ? String(req.body.notes).slice(0, 1000) : null
    const row = await queryOne(
      `UPDATE applications SET status=$1, notes=COALESCE($2, notes), updated_at=$3
       WHERE id=$4 AND user_id=$5 RETURNING *`,
      [status, notes, nowIso(), Number(req.params.id), req.user.id],
    )
    if (!row) {
      res.status(404).json({ detail: 'Application not found' })
      return
    }
    res.json(row)
  } catch (err) {
    fail(res, err)
  }
})

app.get('/v1/dashboard', requireUser, async (req, res) => {
  try {
    const resume = await latestOriginalResume(req.user.id)
    const apps = await query('SELECT status FROM applications WHERE user_id = $1', [req.user.id])
    const counts = { saved: 0, applied: 0, interviewing: 0, offered: 0, rejected: 0, withdrawn: 0 }
    for (const a of apps) counts[a.status] = (counts[a.status] || 0) + 1
    const activity = await query(
      `SELECT kind, title, detail, created_at FROM activity WHERE user_id = $1 ORDER BY id DESC LIMIT 12`,
      [req.user.id],
    )
    let topMatches = []
    if (resume) {
      const parsed = { ...parseJson(resume.parsed_json, {}), location: req.user.location }
      const jobs = await query('SELECT * FROM jobs ORDER BY id DESC LIMIT 80')
      topMatches = rankJobs(parsed, jobs, { minScore: 40 }).slice(0, 4).map(jobOut)
    }
    res.json({
      user: publicUser(req.user),
      has_resume: Boolean(resume),
      resume_skills: resume ? parseJson(resume.parsed_json, {}).skills || [] : [],
      pipeline: counts,
      applications: apps.length,
      activity,
      top_matches: topMatches,
    })
  } catch (err) {
    fail(res, err)
  }
})

app.post('/v1/admin/login', rateLimit({ max: 8, windowSec: 900, key: 'admin' }), (req, res) => {
  const pin = getAdminPin()
  if (!pin) {
    res.status(503).json({ detail: 'Admin PIN is not configured' })
    return
  }
  if (String(req.body?.pin || '') !== pin) {
    res.status(401).json({ detail: 'Incorrect PIN' })
    return
  }
  res.json({ access_token: signAdmin() })
})

app.get('/v1/admin/jobs', requireAdmin, async (_req, res) => {
  try {
    const rows = await query('SELECT * FROM jobs ORDER BY id DESC LIMIT 200')
    res.json(rows)
  } catch (err) {
    fail(res, err)
  }
})

app.get('/v1/admin/inquiries', requireAdmin, async (_req, res) => {
  try {
    const rows = await query('SELECT * FROM inquiries ORDER BY id DESC LIMIT 100')
    res.json(rows)
  } catch (err) {
    fail(res, err)
  }
})

app.post('/v1/admin/jobs', requireAdmin, async (req, res) => {
  try {
    const title = String(req.body?.title || '').trim()
    const company = String(req.body?.company || 'SAVENTRA Technologies').trim()
    const description = String(req.body?.description || '').trim()
    if (!title || !description) {
      res.status(400).json({ detail: 'Title and description are required' })
      return
    }
    const row = await queryOne(
      `INSERT INTO jobs (title, company, location, remote, source, source_url, department, seniority, description, requirements, skills_csv, posted_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        title,
        company,
        String(req.body?.location || 'Remote, US'),
        String(req.body?.remote || 'remote'),
        'company',
        String(req.body?.source_url || ''),
        String(req.body?.department || 'General'),
        String(req.body?.seniority || 'mid'),
        description,
        String(req.body?.requirements || ''),
        String(req.body?.skills_csv || ''),
        nowIso().slice(0, 10),
        nowIso(),
      ],
    )
    res.status(201).json(row)
  } catch (err) {
    fail(res, err)
  }
})

if (fs.existsSync(STATIC_DIR)) {
  app.use(express.static(STATIC_DIR, { index: false, maxAge: '1h' }))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/v1') || req.path === '/healthz') {
      next()
      return
    }
    res.sendFile(path.join(STATIC_DIR, 'index.html'))
  })
}

await initDb()

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`SAVENTRA API on :${PORT} (${isPostgres ? 'postgres' : 'sqlite'}) ${APP_URL}`)
})

async function shutdown() {
  server.close()
  await closeDb()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

export { DATABASE_URL }
