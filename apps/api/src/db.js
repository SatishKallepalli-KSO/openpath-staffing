import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import { SEED_JOBS } from './jobs-seed.js'
import { parseResume } from './matching.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.resolve(__dirname, '../data')
const SQLITE_PATH = path.join(DATA_DIR, 'openpath.db')

export const DATABASE_URL = (process.env.DATABASE_URL || '').trim()
export const isPostgres = /^(postgres|postgresql):\/\//i.test(DATABASE_URL)

let pool = null
let sqlite = null

function convertPlaceholders(sql) {
  return sql.replace(/\$(\d+)/g, '?')
}

export async function query(sql, params = []) {
  if (isPostgres) {
    const res = await pool.query(sql, params)
    return res.rows
  }
  const stmt = sqlite.prepare(convertPlaceholders(sql))
  const upper = sql.trim().toUpperCase()
  const returnsRows =
    upper.startsWith('SELECT') ||
    upper.startsWith('WITH') ||
    /\bRETURNING\b/i.test(sql)
  if (returnsRows) {
    const rows = stmt.all(...params)
    return rows.map(normalizeRow)
  }
  stmt.run(...params)
  return []
}

function normalizeRow(row) {
  const out = {}
  for (const [k, v] of Object.entries(row)) {
    out[k] = typeof v === 'bigint' ? Number(v) : v
  }
  return out
}

export async function queryOne(sql, params = []) {
  const rows = await query(sql, params)
  return rows[0] || null
}

const SQLITE_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  headline TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  target_roles TEXT NOT NULL DEFAULT '',
  years_experience INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS resumes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  filename TEXT NOT NULL DEFAULT 'resume.txt',
  raw_text TEXT NOT NULL,
  parsed_json TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'original',
  parent_id INTEGER,
  job_id INTEGER,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  remote TEXT NOT NULL DEFAULT 'hybrid',
  source TEXT NOT NULL DEFAULT 'company',
  source_url TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  seniority TEXT NOT NULL DEFAULT 'mid',
  description TEXT NOT NULL,
  requirements TEXT NOT NULL DEFAULT '',
  skills_csv TEXT NOT NULL DEFAULT '',
  posted_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  job_id INTEGER NOT NULL,
  resume_id INTEGER,
  status TEXT NOT NULL DEFAULT 'saved',
  notes TEXT NOT NULL DEFAULT '',
  applied_at TEXT,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, job_id)
);
CREATE TABLE IF NOT EXISTS activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_apps_user ON applications(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_jobs_source_url ON jobs(source_url);
`

const PG_SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  headline TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  target_roles TEXT NOT NULL DEFAULT '',
  years_experience INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS resumes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL DEFAULT 'resume.txt',
  raw_text TEXT NOT NULL,
  parsed_json TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'original',
  parent_id INTEGER,
  job_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT NOT NULL,
  remote TEXT NOT NULL DEFAULT 'hybrid',
  source TEXT NOT NULL DEFAULT 'company',
  source_url TEXT NOT NULL DEFAULT '',
  department TEXT NOT NULL DEFAULT '',
  seniority TEXT NOT NULL DEFAULT 'mid',
  description TEXT NOT NULL,
  requirements TEXT NOT NULL DEFAULT '',
  skills_csv TEXT NOT NULL DEFAULT '',
  posted_at TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  resume_id INTEGER,
  status TEXT NOT NULL DEFAULT 'saved',
  notes TEXT NOT NULL DEFAULT '',
  applied_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, job_id)
);
CREATE TABLE IF NOT EXISTS activity (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_resumes_user ON resumes(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_apps_user ON applications(user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_jobs_source_url ON jobs(source_url);
`

export function nowIso() {
  return new Date().toISOString()
}

const DEMO_RESUME = `Jordan Hale
San Jose, CA | jordan.hale@example.com | (408) 555-0142
Full stack engineer with 6 years building React and Node.js products.

Skills
JavaScript, TypeScript, React, Node.js, Express, PostgreSQL, REST, GraphQL, Docker, AWS, Git, Jest, CI/CD, HTML, CSS, Agile

Experience
Senior Software Engineer, Northwind Health, 2022 to present
- Led a React and TypeScript patient portal used by 40k members, including accessibility work.
- Designed Node.js APIs on Postgres with Redis caching for appointment search.
- Set up GitHub Actions CI/CD and Docker images for staging and production.

Software Engineer, Harbor Labs, 2019 to 2022
- Built hiring dashboards in React and REST services in Express.
- Wrote pytest-style API tests and documentation for a 6-person team.
- Partnered with design on Figma handoff and UX reviews.

Education
B.S. Computer Science, San Jose State University
`

export async function addActivity(userId, kind, title, detail = '') {
  await query(
    `INSERT INTO activity (user_id, kind, title, detail, created_at) VALUES ($1, $2, $3, $4, $5)`,
    [userId, kind, title, detail, nowIso()],
  )
}

async function seedJobs() {
  const count = await queryOne('SELECT COUNT(*) AS n FROM jobs')
  const n = Number(count?.n || 0)
  if (n > 0) return
  for (const job of SEED_JOBS) {
    await query(
      `INSERT INTO jobs (title, company, location, remote, source, source_url, department, seniority, description, requirements, skills_csv, posted_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
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
  }
}

async function seedDemoUser() {
  const existing = await queryOne('SELECT id FROM users WHERE email = $1', ['demo@openpath.jobs'])
  if (existing) return
  const hash = await bcrypt.hash('DemoPass1234', 10)
  const user = await queryOne(
    `INSERT INTO users (email, password_hash, full_name, headline, location, target_roles, years_experience, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [
      'demo@openpath.jobs',
      hash,
      'Jordan Hale',
      'Full stack engineer',
      'San Jose, CA',
      'Full stack, frontend, backend',
      6,
      nowIso(),
    ],
  )
  const parsed = parseResume(DEMO_RESUME)
  const resume = await queryOne(
    `INSERT INTO resumes (user_id, filename, raw_text, parsed_json, kind, created_at)
     VALUES ($1,$2,$3,$4,'original',$5) RETURNING id`,
    [user.id, 'jordan-hale-resume.txt', DEMO_RESUME, JSON.stringify(parsed), nowIso()],
  )
  const jobs = await query('SELECT id, title, company FROM jobs ORDER BY id ASC LIMIT 4')
  const statuses = ['applied', 'interviewing', 'saved', 'applied']
  for (let i = 0; i < jobs.length; i += 1) {
    const job = jobs[i]
    await query(
      `INSERT INTO applications (user_id, job_id, resume_id, status, notes, applied_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        user.id,
        job.id,
        resume.id,
        statuses[i],
        '',
        statuses[i] === 'saved' ? null : nowIso(),
        nowIso(),
      ],
    )
    await addActivity(
      user.id,
      statuses[i],
      statuses[i] === 'saved' ? `Saved ${job.title}` : `Applied to ${job.title}`,
      job.company,
    )
  }
}

export async function initDb() {
  if (isPostgres) {
    pool = new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false },
      max: 4,
    })
    await pool.query(PG_SCHEMA)
  } else {
    const { DatabaseSync } = await import('node:sqlite')
    fs.mkdirSync(DATA_DIR, { recursive: true })
    sqlite = new DatabaseSync(SQLITE_PATH)
    sqlite.exec(SQLITE_SCHEMA)
  }
  await seedJobs()
  await seedDemoUser()
}

export async function closeDb() {
  if (pool) await pool.end()
  if (sqlite) sqlite.close()
}
