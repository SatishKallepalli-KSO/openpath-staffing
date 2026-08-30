import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  adminCreateJob,
  adminJobs,
  adminLogin,
  fetchApplications,
  fetchDashboard,
  fetchJob,
  fetchMatches,
  fetchMe,
  fetchResumes,
  fetchStats,
  login,
  patchApplication,
  saveTailored,
  signup,
  tailorJob,
  updateMe,
  uploadResume,
  upsertApplication,
  type Application,
  type Dashboard,
  type Job,
  type Resume,
  type TailorSuggestion,
  type User,
} from './api'
import { BrandMark } from './components/BrandMark'
import { PortalBack } from './components/PortalBack'
import { AdminPortal, PrivacyPortal } from './portals/AdminPortal'
import { DashboardPortal } from './portals/DashboardPortal'
import { EmployersPortal } from './portals/EmployersPortal'
import { AboutPortal, AuthPortal, HomePortal } from './portals/HomePortal'
import { JobPortal, MatchesPortal, TailorPortal } from './portals/MatchesPortal'
import { ProfilePortal, ResumePortal } from './portals/ProfilePortal'
import { TrackerPortal } from './portals/TrackerPortal'

export type Portal =
  | 'home'
  | 'about'
  | 'employers'
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'profile'
  | 'resume'
  | 'matches'
  | 'job'
  | 'tailor'
  | 'tracker'
  | 'admin'
  | 'privacy'

const PORTALS = new Set<Portal>([
  'home',
  'about',
  'employers',
  'login',
  'signup',
  'dashboard',
  'profile',
  'resume',
  'matches',
  'job',
  'tailor',
  'tracker',
  'admin',
  'privacy',
])

const TOKEN_KEY = 'openpath_token'
const ADMIN_KEY = 'openpath_admin'

function portalFromHash(): { portal: Portal; id: number | null } {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [name, query] = raw.split('?')
  const portal = PORTALS.has(name as Portal) ? (name as Portal) : 'home'
  const params = new URLSearchParams(query || '')
  const id = Number(params.get('id') || '')
  return { portal, id: Number.isFinite(id) && id > 0 ? id : null }
}

function hashFor(portal: Portal, extra?: Record<string, string>) {
  if (portal === 'home') return '#/'
  const q = extra ? `?${new URLSearchParams(extra).toString()}` : ''
  return `#/${portal}${q}`
}

function readToken(key: string) {
  return sessionStorage.getItem(key) || ''
}

export default function App() {
  const [{ portal, id: jobId }, setRoute] = useState(portalFromHash)
  const [token, setToken] = useState(() => readToken(TOKEN_KEY))
  const [adminToken, setAdminToken] = useState(() => readToken(ADMIN_KEY))
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState({ jobs: 0, candidates: 0, applications: 0 })
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [resumes, setResumes] = useState<Resume[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [matchMeta, setMatchMeta] = useState({ count: 0, live: false })
  const [job, setJob] = useState<Job | null>(null)
  const [suggestion, setSuggestion] = useState<TailorSuggestion | null>(null)
  const [tailorText, setTailorText] = useState('')
  const [applications, setApplications] = useState<Application[]>([])
  const [adminJobList, setAdminJobList] = useState<Job[]>([])
  const [adminPin, setAdminPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const signedIn = Boolean(token && user)

  function go(next: Portal, extra?: Record<string, string>) {
    window.location.hash = hashFor(next, extra)
  }

  useEffect(() => {
    const onHash = () => setRoute(portalFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!token) {
      setUser(null)
      return
    }
    fetchMe(token)
      .then(setUser)
      .catch(() => {
        sessionStorage.removeItem(TOKEN_KEY)
        setToken('')
        setUser(null)
      })
  }, [token])

  useEffect(() => {
    setError('')
    if (!token) return
    if (portal === 'dashboard') {
      fetchDashboard(token).then(setDashboard).catch((err: Error) => setError(err.message))
    }
    if (portal === 'resume') {
      fetchResumes(token).then(setResumes).catch((err: Error) => setError(err.message))
    }
    if (portal === 'matches') {
      fetchMatches(token)
        .then((data) => {
          setJobs(data.jobs)
          setMatchMeta({ count: data.count, live: data.live_jobs })
        })
        .catch((err: Error) => setError(err.message))
    }
    if (portal === 'job' && jobId) {
      fetchJob(token, jobId).then(setJob).catch((err: Error) => setError(err.message))
    }
    if (portal === 'tracker') {
      fetchApplications(token).then(setApplications).catch((err: Error) => setError(err.message))
    }
    if (portal === 'admin' && adminToken) {
      adminJobs(adminToken).then(setAdminJobList).catch((err: Error) => setError(err.message))
    }
  }, [portal, token, jobId, adminToken])

  const needsAuth = useMemo(
    () => ['dashboard', 'profile', 'resume', 'matches', 'job', 'tailor', 'tracker'].includes(portal),
    [portal],
  )

  useEffect(() => {
    if (needsAuth && !token) go('login')
  }, [needsAuth, token])

  async function onAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      const body = {
        email: String(form.get('email') || ''),
        password: String(form.get('password') || ''),
        full_name: String(form.get('full_name') || ''),
      }
      const result = portal === 'signup' ? await signup(body) : await login(body)
      sessionStorage.setItem(TOKEN_KEY, result.access_token)
      setToken(result.access_token)
      setUser(result.user)
      go('dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
    } finally {
      setBusy(false)
    }
  }

  function signOut() {
    sessionStorage.removeItem(TOKEN_KEY)
    setToken('')
    setUser(null)
    go('home')
  }

  async function onProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      const next = await updateMe(token, {
        full_name: String(form.get('full_name') || ''),
        headline: String(form.get('headline') || ''),
        location: String(form.get('location') || ''),
        target_roles: String(form.get('target_roles') || ''),
        years_experience: Number(form.get('years_experience') || 0),
        email: user?.email || '',
        id: user?.id || 0,
        created_at: user?.created_at || '',
      })
      setUser(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    const form = new FormData(event.currentTarget)
    const file = form.get('file')
    const text = String(form.get('text') || '')
    setBusy(true)
    setError('')
    try {
      await uploadResume(token, file instanceof File && file.size ? file : undefined, text)
      const list = await fetchResumes(token)
      setResumes(list)
      go('matches')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read resume')
    } finally {
      setBusy(false)
    }
  }

  async function onFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) return
    const form = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      const data = await fetchMatches(token, {
        search: String(form.get('search') || ''),
        remote: String(form.get('remote') || ''),
        min_score: Number(form.get('min_score') || 35),
      })
      setJobs(data.jobs)
      setMatchMeta({ count: data.count, live: data.live_jobs })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not filter')
    } finally {
      setBusy(false)
    }
  }

  async function startTailor() {
    if (!token || !job) return
    setBusy(true)
    setError('')
    try {
      const result = await tailorJob(token, job.id)
      setSuggestion(result)
      setTailorText(result.tailored_text)
      go('tailor', { id: String(job.id) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not tailor')
    } finally {
      setBusy(false)
    }
  }

  async function persistTailor(alsoApply: boolean) {
    if (!token || !job) return
    setBusy(true)
    setError('')
    try {
      const saved = await saveTailored(token, job.id, tailorText, suggestion?.resume_id)
      if (alsoApply) {
        const applied = await upsertApplication(token, {
          job_id: job.id,
          status: 'applied',
          resume_id: saved.id,
        })
        if (applied.apply_url && applied.apply_url.startsWith('http')) {
          window.open(applied.apply_url, '_blank', 'noopener')
        }
        go('tracker')
      } else {
        go('job', { id: String(job.id) })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save tailored resume')
    } finally {
      setBusy(false)
    }
  }

  async function applyJob(status: 'saved' | 'applied') {
    if (!token || !job) return
    setBusy(true)
    setError('')
    try {
      const applied = await upsertApplication(token, { job_id: job.id, status })
      if (status === 'applied' && applied.apply_url?.startsWith('http')) {
        window.open(applied.apply_url, '_blank', 'noopener')
      }
      go('tracker')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not record application')
    } finally {
      setBusy(false)
    }
  }

  const showBack =
    portal !== 'home' &&
    portal !== 'login' &&
    portal !== 'signup' &&
    portal !== 'about' &&
    portal !== 'employers'
  const isMarketing = portal === 'home'
  const isAuth = portal === 'login' || portal === 'signup'

  return (
    <div className={isMarketing ? 'site site-home' : 'site'}>
      <div className="ticker" aria-hidden>
        <div className="ticker-track">
          {['Engineering', 'Data and AI', 'Product', 'Go to market', 'Finance', 'Operations', 'Bay Area · Remote US'].map(
            (label) => (
              <span key={`a-${label}`}>{label}</span>
            ),
          )}
          {['Engineering', 'Data and AI', 'Product', 'Go to market', 'Finance', 'Operations', 'Bay Area · Remote US'].map(
            (label) => (
              <span key={`b-${label}`}>{label}</span>
            ),
          )}
        </div>
      </div>
      <header className="nav">
        <button type="button" className="brand" onClick={() => go('home')}>
          <BrandMark className="mark" />
          <span>
            OpenPath
            <small>Staffing</small>
          </span>
        </button>
        <nav className="nav-links">
          <button type="button" onClick={() => go('about')}>
            The firm
          </button>
          <button type="button" onClick={() => go('employers')}>
            Hiring teams
          </button>
          {signedIn ? (
            <>
              <button type="button" onClick={() => go('dashboard')}>
                Desk
              </button>
              <button type="button" onClick={() => go('matches')}>
                Roles
              </button>
              <button type="button" onClick={() => go('tracker')}>
                Pipeline
              </button>
              <button type="button" className="nav-quiet" onClick={signOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => go('login')}>
                Sign in
              </button>
              <button type="button" className="btn btn-gold nav-cta" onClick={() => go('signup')}>
                Get placed
              </button>
            </>
          )}
        </nav>
      </header>
      <main className={isMarketing ? 'main-home' : isAuth ? 'main-auth' : 'main-app'}>
        {showBack ? <PortalBack onBack={() => history.back()} label="Back" /> : null}
        {portal === 'home' ? (
          <HomePortal
            jobs={stats.jobs}
            applications={stats.applications}
            signedIn={signedIn}
            onGo={(p) => go(p as Portal)}
          />
        ) : null}
        {portal === 'about' ? <AboutPortal onGo={(p) => go(p as Portal)} /> : null}
        {portal === 'employers' ? <EmployersPortal onGo={(p) => go(p as Portal)} /> : null}
        {portal === 'login' || portal === 'signup' ? (
          <AuthPortal
            mode={portal}
            error={error}
            busy={busy}
            onSubmit={onAuth}
            onSwitch={() => go(portal === 'login' ? 'signup' : 'login')}
          />
        ) : null}
        {portal === 'dashboard' ? (
          <DashboardPortal data={dashboard} error={error} onGo={(p, extra) => go(p as Portal, extra)} />
        ) : null}
        {portal === 'profile' && user ? (
          <ProfilePortal user={user} busy={busy} error={error} onSubmit={onProfile} />
        ) : null}
        {portal === 'resume' ? (
          <ResumePortal resumes={resumes} error={error} busy={busy} onUpload={onUpload} />
        ) : null}
        {portal === 'matches' ? (
          <MatchesPortal
            jobs={jobs}
            count={matchMeta.count}
            live={matchMeta.live}
            error={error}
            busy={busy}
            onFilter={onFilter}
            onOpen={(id) => go('job', { id: String(id) })}
          />
        ) : null}
        {portal === 'job' ? (
          <JobPortal
            job={job}
            error={error}
            busy={busy}
            onTailor={startTailor}
            onSave={() => void applyJob('saved')}
            onApply={() => void applyJob('applied')}
          />
        ) : null}
        {portal === 'tailor' ? (
          <TailorPortal
            suggestion={suggestion}
            text={tailorText}
            error={error}
            busy={busy}
            onText={setTailorText}
            onSave={() => void persistTailor(false)}
            onApply={() => void persistTailor(true)}
          />
        ) : null}
        {portal === 'tracker' ? (
          <TrackerPortal
            rows={applications}
            error={error}
            onOpen={(id) => go('job', { id: String(id) })}
            onStatus={(id, status) => {
              if (!token) return
              void patchApplication(token, id, { status }).then(() => fetchApplications(token).then(setApplications))
            }}
          />
        ) : null}
        {portal === 'admin' ? (
          <AdminPortal
            authed={Boolean(adminToken)}
            jobs={adminJobList}
            error={error}
            busy={busy}
            pin={adminPin}
            onPin={setAdminPin}
            onLogin={() => {
              setBusy(true)
              adminLogin(adminPin)
                .then((res) => {
                  sessionStorage.setItem(ADMIN_KEY, res.access_token)
                  setAdminToken(res.access_token)
                  setError('')
                })
                .catch((err: Error) => setError(err.message))
                .finally(() => setBusy(false))
            }}
            onCreate={(event) => {
              event.preventDefault()
              if (!adminToken) return
              const form = new FormData(event.currentTarget)
              const body: Record<string, string> = {}
              form.forEach((v, k) => {
                body[k] = String(v)
              })
              setBusy(true)
              adminCreateJob(adminToken, body)
                .then(() => adminJobs(adminToken).then(setAdminJobList))
                .catch((err: Error) => setError(err.message))
                .finally(() => setBusy(false))
            }}
          />
        ) : null}
        {portal === 'privacy' ? <PrivacyPortal /> : null}
      </main>
      <footer className="footer">
        <div className="wrap footer-grid">
          <div>
            <BrandMark className="mark" />
            <p className="footer-brand">OpenPath Staffing</p>
            <p className="muted">Candidate-first search for a hard market.</p>
          </div>
          <div>
            <p className="footer-label">Talent</p>
            <button type="button" className="linkish" onClick={() => go('signup')}>
              Create a profile
            </button>
            <button type="button" className="linkish" onClick={() => go('about')}>
              How matching works
            </button>
          </div>
          <div>
            <p className="footer-label">Companies</p>
            <button type="button" className="linkish" onClick={() => go('employers')}>
              Request a shortlist
            </button>
            <button type="button" className="linkish" onClick={() => go('admin')}>
              Office desk
            </button>
          </div>
          <div>
            <p className="footer-label">Legal</p>
            <button type="button" className="linkish" onClick={() => go('privacy')}>
              Privacy
            </button>
          </div>
        </div>
        <p className="footer-fine wrap">© {new Date().getFullYear()} OpenPath Staffing. All searches stay truthful.</p>
      </footer>
    </div>
  )
}
