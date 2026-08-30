const apiBase = import.meta.env.VITE_API_BASE ?? ''

async function readError(res: Response, fallback: string) {
  const raw = await res.text()
  try {
    const parsed = JSON.parse(raw) as { detail?: unknown }
    if (typeof parsed.detail === 'string') return parsed.detail
  } catch {
    /* keep text */
  }
  return raw || fallback
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    throw new Error(await readError(res, `Request failed (${res.status})`))
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

function authHeaders(token?: string): HeadersInit {
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export type User = {
  id: number
  email: string
  full_name: string
  headline: string
  location: string
  target_roles: string
  years_experience: number
  created_at: string
}

export type AuthResponse = {
  access_token: string
  user: User
}

export type ParsedResume = {
  skills: string[]
  titles: string[]
  years: number
  keywords: string[]
  summary?: string
}

export type Resume = {
  id: number
  filename: string
  kind: string
  parent_id: number | null
  job_id: number | null
  created_at: string
  parsed: ParsedResume
  text?: string
}

export type Job = {
  id: number
  title: string
  company: string
  location: string
  remote: string
  source: string
  source_url: string
  apply_host?: string
  apply_via?: string
  can_apply?: boolean
  department: string
  seniority: string
  description: string
  requirements: string
  skills_csv: string
  posted_at: string
  match_score?: number
  missing_skills?: string[]
  matched_skills?: string[]
}

export type Application = {
  id: number
  job_id: number
  resume_id: number | null
  status: string
  notes: string
  applied_at: string | null
  updated_at: string
  title: string
  company: string
  location: string
  source: string
  source_url: string
  remote: string
}

export type Dashboard = {
  user: User
  has_resume: boolean
  resume_skills: string[]
  pipeline: Record<string, number>
  applications: number
  activity: { kind: string; title: string; detail: string; created_at: string }[]
  top_matches: Job[]
}

export type TailorSuggestion = {
  job: Job
  resume_id: number
  missing_keywords: string[]
  skill_additions: string[]
  bullet_rewrites: { original: string; suggested: string; reason: string }[]
  summary_tweak: { original: string; suggested: string; reason: string } | null
  tailored_text: string
  warnings: string[]
}

export function fetchPublicJobs() {
  return api<Pick<Job, 'id' | 'title' | 'company' | 'location' | 'remote' | 'department' | 'seniority' | 'posted_at'>[]>(
    '/v1/jobs/public',
  )
}

export function fetchStats() {
  return api<{ jobs: number; candidates: number; applications: number }>('/v1/stats')
}

export function sendInquiry(body: {
  company: string
  contact_name: string
  email: string
  role?: string
  message: string
}) {
  return api<{ id: number; created_at: string }>('/v1/inquiries', { method: 'POST', body: JSON.stringify(body) })
}

export function signup(body: { email: string; password: string; full_name: string }) {
  return api<AuthResponse>('/v1/auth/signup', { method: 'POST', body: JSON.stringify(body) })
}

export function login(body: { email: string; password: string }) {
  return api<AuthResponse>('/v1/auth/login', { method: 'POST', body: JSON.stringify(body) })
}

export function fetchMe(token: string) {
  return api<User>('/v1/me', { headers: authHeaders(token) })
}

export function updateMe(token: string, body: Partial<User>) {
  return api<User>('/v1/me', { method: 'PATCH', headers: authHeaders(token), body: JSON.stringify(body) })
}

export function fetchDashboard(token: string) {
  return api<Dashboard>('/v1/dashboard', { headers: authHeaders(token) })
}

export function fetchResumes(token: string) {
  return api<Resume[]>('/v1/resumes', { headers: authHeaders(token) })
}

export function fetchResume(token: string, id: number) {
  return api<Resume>(`/v1/resumes/${id}`, { headers: authHeaders(token) })
}

export async function uploadResume(token: string, file?: File, text?: string) {
  const body = new FormData()
  if (file) body.append('file', file)
  if (text) body.append('text', text)
  return api<Resume>('/v1/resumes', { method: 'POST', headers: authHeaders(token), body })
}

export type MatchSources = {
  remotive?: number
  arbeitnow?: number
  themuse?: number
  adzuna?: number
  remoteok?: number
  himalayas?: number
  jobicy?: number
  greenhouse?: number
  lever?: number
  amazon?: number
  nvidia?: number
}

export type BoardLink = {
  name: string
  url: string
  blurb?: string
  kind?: string
}

export type MatchResult = {
  resume_id: number
  live_jobs: boolean
  sources: MatchSources
  board_links?: BoardLink[]
  count: number
  jobs: Job[]
}

export function fetchMatches(
  token: string,
  params: { min_score?: number; remote?: string; search?: string; department?: string } = {},
) {
  const q = new URLSearchParams()
  if (params.min_score != null) q.set('min_score', String(params.min_score))
  if (params.remote) q.set('remote', params.remote)
  if (params.search) q.set('search', params.search)
  if (params.department) q.set('department', params.department)
  const suffix = q.toString() ? `?${q}` : ''
  return api<MatchResult>(`/v1/matches${suffix}`, {
    headers: authHeaders(token),
  })
}

export function fetchJob(token: string, id: number) {
  return api<Job>(`/v1/jobs/${id}`, { headers: authHeaders(token) })
}

export function tailorJob(token: string, jobId: number, resumeId?: number) {
  return api<TailorSuggestion>(`/v1/jobs/${jobId}/tailor`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ resume_id: resumeId }),
  })
}

export function saveTailored(token: string, jobId: number, text: string, parentId?: number) {
  return api<Resume>(`/v1/jobs/${jobId}/tailor/save`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ text, parent_id: parentId }),
  })
}

export function fetchApplications(token: string) {
  return api<Application[]>('/v1/applications', { headers: authHeaders(token) })
}

export function upsertApplication(
  token: string,
  body: { job_id: number; status?: string; resume_id?: number; notes?: string },
) {
  return api<Application & { apply_url?: string }>('/v1/applications', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
}

export type BatchApplyResult = {
  count: number
  note: string
  applications: (Application & { apply_url?: string })[]
}

export function batchApply(token: string, body: { limit?: number; min_score?: number; job_ids?: number[] } = {}) {
  return api<BatchApplyResult>('/v1/applications/batch', {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
}

export function patchApplication(token: string, id: number, body: { status: string; notes?: string }) {
  return api<Application>(`/v1/applications/${id}`, {
    method: 'PATCH',
    headers: authHeaders(token),
    body: JSON.stringify(body),
  })
}

export function adminLogin(pin: string) {
  return api<{ access_token: string }>('/v1/admin/login', { method: 'POST', body: JSON.stringify({ pin }) })
}

export function adminJobs(token: string) {
  return api<Job[]>('/v1/admin/jobs', { headers: authHeaders(token) })
}

export function adminCreateJob(token: string, body: Record<string, string>) {
  return api<Job>('/v1/admin/jobs', { method: 'POST', headers: authHeaders(token), body: JSON.stringify(body) })
}
