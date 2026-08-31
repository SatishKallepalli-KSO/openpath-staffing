import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { query, queryOne, nowIso, addActivity } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-openpath-jwt-secret-change-me'
const TOKEN_TTL = '7d'

export function getAdminPin() {
  const pin = (process.env.ADMIN_PIN || '').trim()
  if (pin) return pin
  if (process.env.ALLOW_INSECURE_DEFAULT_PIN === '1' && process.env.NODE_ENV !== 'production') {
    return 'local-admin-pin'
  }
  return ''
}

export function signUser(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: 'candidate' }, JWT_SECRET, { expiresIn: TOKEN_TTL })
}

export function signAdmin() {
  return jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '12h' })
}

export function readToken(header) {
  if (!header) return null
  const raw = String(header)
  const token = raw.startsWith('Bearer ') ? raw.slice(7) : raw
  try {
    return jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
}

export function normalizeLinkedinUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  const href = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
  try {
    const u = new URL(href)
    const host = u.hostname.replace(/^www\./, '').toLowerCase()
    if (host !== 'linkedin.com' && !host.endsWith('.linkedin.com')) {
      const err = new Error('Use a linkedin.com profile URL')
      err.status = 400
      throw err
    }
    return u.toString().slice(0, 240)
  } catch (err) {
    if (err.status) throw err
    const next = new Error('Use a linkedin.com profile URL')
    next.status = 400
    throw next
  }
}

export function publicUser(row) {
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    headline: row.headline,
    location: row.location,
    target_roles: row.target_roles,
    years_experience: row.years_experience,
    linkedin_url: row.linkedin_url || '',
    created_at: row.created_at,
  }
}

export async function createUser({ email, password, full_name, linkedin_url }) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized || !normalized.includes('@')) {
    const err = new Error('Enter a valid email')
    err.status = 400
    throw err
  }
  if (!password || String(password).length < 8) {
    const err = new Error('Password must be at least 8 characters')
    err.status = 400
    throw err
  }
  const name = String(full_name || '').trim()
  if (name.length < 2) {
    const err = new Error('Enter your name')
    err.status = 400
    throw err
  }
  const linkedin = normalizeLinkedinUrl(linkedin_url)
  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [normalized])
  if (existing) {
    const err = new Error('An account with that email already exists')
    err.status = 409
    throw err
  }
  const password_hash = await bcrypt.hash(String(password), 10)
  const row = await queryOne(
    `INSERT INTO users (email, password_hash, full_name, headline, location, target_roles, years_experience, linkedin_url, created_at)
     VALUES ($1,$2,$3,'','','',0,$4,$5) RETURNING *`,
    [normalized, password_hash, name, linkedin, nowIso()],
  )
  await addActivity(row.id, 'account', 'Created profile', 'Welcome to SAVENTRA')
  return row
}

export async function loginUser(email, password) {
  const normalized = String(email || '').trim().toLowerCase()
  const row = await queryOne('SELECT * FROM users WHERE email = $1', [normalized])
  if (!row) {
    const err = new Error('Email or password is incorrect')
    err.status = 401
    throw err
  }
  const ok = await bcrypt.compare(String(password || ''), row.password_hash)
  if (!ok) {
    const err = new Error('Email or password is incorrect')
    err.status = 401
    throw err
  }
  return row
}

export async function requireUser(req, res, next) {
  const payload = readToken(req.headers.authorization)
  if (!payload || payload.role !== 'candidate' || !payload.sub) {
    res.status(401).json({ detail: 'Sign in to continue' })
    return
  }
  const user = await queryOne('SELECT * FROM users WHERE id = $1', [payload.sub])
  if (!user) {
    res.status(401).json({ detail: 'Sign in to continue' })
    return
  }
  req.user = user
  next()
}

export function requireAdmin(req, res, next) {
  const payload = readToken(req.headers.authorization)
  if (!payload || payload.role !== 'admin') {
    res.status(401).json({ detail: 'Admin sign-in required' })
    return
  }
  req.admin = true
  next()
}
