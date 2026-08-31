/** Shared skill lexicon used by resume parse and job scoring. */

export const SKILLS = [
  'javascript',
  'typescript',
  'python',
  'java',
  'kotlin',
  'swift',
  'go',
  'golang',
  'rust',
  'c++',
  'c#',
  'php',
  'ruby',
  'scala',
  'r',
  'sql',
  'nosql',
  'react',
  'react native',
  'next.js',
  'vue',
  'angular',
  'svelte',
  'node.js',
  'express',
  'nest.js',
  'django',
  'flask',
  'fastapi',
  'spring',
  'rails',
  '.net',
  'html',
  'css',
  'sass',
  'tailwind',
  'graphql',
  'rest',
  'grpc',
  'aws',
  'azure',
  'gcp',
  'docker',
  'kubernetes',
  'terraform',
  'linux',
  'git',
  'ci/cd',
  'github actions',
  'jenkins',
  'postgres',
  'postgresql',
  'mysql',
  'mongodb',
  'redis',
  'elasticsearch',
  'snowflake',
  'databricks',
  'dbt',
  'airflow',
  'spark',
  'hadoop',
  'kafka',
  'tableau',
  'power bi',
  'looker',
  'excel',
  'pandas',
  'numpy',
  'scikit-learn',
  'tensorflow',
  'pytorch',
  'machine learning',
  'nlp',
  'llm',
  'prompt engineering',
  'figma',
  'sketch',
  'jira',
  'confluence',
  'salesforce',
  'hubspot',
  'zendesk',
  'stripe',
  'shopify',
  'wordpress',
  'seo',
  'sem',
  'google analytics',
  'a/b testing',
  'product management',
  'agile',
  'scrum',
  'kanban',
  'okrs',
  'roadmap',
  'user research',
  'ux',
  'ui',
  'wireframing',
  'copywriting',
  'content strategy',
  'project management',
  'stakeholder management',
  'budgeting',
  'forecasting',
  'financial modeling',
  'accounting',
  'gaap',
  'sox',
  'audit',
  'payroll',
  'hris',
  'workday',
  'bamboohr',
  'recruiting',
  'sourcing',
  'onboarding',
  'customer success',
  'account management',
  'enterprise sales',
  'sdr',
  'b2b',
  'b2c',
  'negotiation',
  'cold calling',
  'pipeline',
  'nursing',
  'ehr',
  'epic',
  'hipaa',
  'cpt',
  'icd-10',
  'patient care',
  'case management',
  'supply chain',
  'logistics',
  'inventory',
  'sap',
  'oracle',
  'netsuite',
  'lean',
  'six sigma',
  'qa',
  'cypress',
  'playwright',
  'jest',
  'pytest',
  'selenium',
  'security',
  'oauth',
  'sso',
  'okta',
  'communication',
  'leadership',
  'mentoring',
  'documentation',
  'data analysis',
  'statistics',
  'etl',
  'data modeling',
  'api design',
  'microservices',
  'system design',
  'accessibility',
  'i18n',
  'mobile',
  'ios',
  'android',
  'node',
]

const SKILL_LOOKUP = SKILLS.map((s) => s.toLowerCase()).sort((a, b) => b.length - a.length)

const ROLE_WORDS = [
  'engineer',
  'developer',
  'designer',
  'manager',
  'analyst',
  'scientist',
  'specialist',
  'coordinator',
  'director',
  'architect',
  'consultant',
  'administrator',
  'recruiter',
  'nurse',
  'accountant',
  'marketer',
  'writer',
  'researcher',
]

const TITLE_HINTS = [
  ...ROLE_WORDS,
  'lead',
  'principal',
  'staff',
  'intern',
  'associate',
]

const FE_SKILLS = ['react', 'vue', 'angular', 'html', 'css', 'sass', 'tailwind', 'next.js']
const BE_SKILLS = ['java', 'python', 'go', 'golang', 'spring', 'django', 'flask', 'fastapi', 'kafka', 'ruby', 'c++']

export function roleFamily(text) {
  const t = normalize(text)
    .replace(/front[\s-]?end/g, 'frontend')
    .replace(/back[\s-]?end/g, 'backend')
    .replace(/full[\s-]?stack/g, 'fullstack')
  if (/\b(firmware|secdevops|devops|sre|site reliability|platform engineer|infrastructure)\b/.test(t)) return 'devops'
  if (/\b(data engineer|data scientist|machine learning|\bml\b|etl|analytics engineer)\b/.test(t)) return 'data'
  if (/\b(ios|android|react native|mobile engineer)\b/.test(t)) return 'mobile'
  if (/\b(frontend|ui engineer|ui developer|react developer|vue developer|angular)\b/.test(t)) return 'frontend'
  if (/\b(backend|server engineer|api engineer)\b/.test(t)) return 'backend'
  if (/\bfullstack\b/.test(t)) return 'fullstack'
  if (/\b(qa\b|sdet|quality assurance|test engineer)\b/.test(t)) return 'qa'
  return 'generic'
}

export function resumeFamily(resume) {
  const titled = roleFamily(
    `${(resume?.titles || []).join(' ')} ${resume?.headline || ''} ${resume?.target_roles || ''} ${resume?.summary || ''}`,
  )
  if (titled !== 'generic') return titled
  const skills = new Set((resume?.skills || []).map((s) => normalize(s)))
  const fe = FE_SKILLS.filter((s) => skills.has(s)).length
  const be = BE_SKILLS.filter((s) => skills.has(s)).length
  if (fe >= 2 && be === 0) return 'frontend'
  if (fe >= 1 && be === 0 && (skills.has('javascript') || skills.has('typescript'))) return 'frontend'
  if (fe >= 1 && be >= 1) return 'fullstack'
  if (be >= 2 && fe === 0) return 'backend'
  if (skills.has('react native') || skills.has('ios') || skills.has('android')) return 'mobile'
  return 'generic'
}

export function jobFamily(job) {
  const fromTitle = roleFamily(`${job?.title || ''} ${job?.department || ''}`)
  if (fromTitle !== 'generic') return fromTitle
  const blob = `${job?.title || ''} ${job?.skills_csv || ''} ${String(job?.description || '').slice(0, 500)} ${job?.requirements || ''}`
  const fromBlob = roleFamily(blob)
  if (fromBlob !== 'generic') return fromBlob
  const skills = extractSkills(blob)
  const fe = FE_SKILLS.filter((s) => skills.includes(s)).length
  const be = BE_SKILLS.filter((s) => skills.includes(s)).length
  if (fe >= 2 && be === 0) return 'frontend'
  if (be >= 2 && fe === 0) return 'backend'
  return 'generic'
}

function familyCap(resumeFam, jobFam, job) {
  if (!resumeFam || resumeFam === 'generic') return 99
  if (resumeFam === jobFam) return 99
  if (resumeFam === 'fullstack' && (jobFam === 'frontend' || jobFam === 'backend' || jobFam === 'generic')) return 99
  if (jobFam === 'fullstack' && (resumeFam === 'frontend' || resumeFam === 'backend')) return 62
  if (resumeFam === 'frontend' && jobFam === 'generic') {
    const hay = normalize(`${job?.title || ''} ${job?.skills_csv || ''} ${job?.description || ''}`)
    if (/react|vue|angular|css|html|frontend|\bui\b/.test(hay)) return 99
    if (/\b(software engineer|software developer|swe|product engineer)\b/.test(normalize(job?.title || ''))) return 70
    return 32
  }
  if (resumeFam === 'backend' && jobFam === 'generic') return 55
  if (['frontend', 'backend', 'mobile', 'data', 'devops'].includes(resumeFam) && resumeFam !== jobFam) {
    return 28
  }
  return 99
}

const MONTH = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i

export function looksLikeProjectLine(line) {
  const raw = String(line || '').trim()
  const low = raw.toLowerCase()
  if (!low) return true
  if (/^(projects?|experience|education|skills|summary|work history|selected work)\b/.test(low)) return true
  if (MONTH.test(low) && /\b(19|20)\d{2}\b/.test(low)) return true
  if (/\b(19|20)\d{2}\b/.test(low) && /\b(present|current|now)\b/.test(low)) return true
  if (/\b(platform|project|application)\b/.test(low) && !ROLE_WORDS.some((w) => low.includes(w))) return true
  return false
}

export function isRoleTitle(line) {
  const low = String(line || '').toLowerCase()
  if (!low || looksLikeProjectLine(line)) return false
  if (ROLE_WORDS.some((w) => low.includes(w))) return true
  if (/\b(full[\s-]?stack|front[\s-]?end|back[\s-]?end|product manager|data scientist)\b/.test(low)) return true
  return false
}

export function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
}

export function tokenize(text) {
  return normalize(text)
    .split(/[^a-z0-9+.#/]+/g)
    .filter((t) => t.length >= 2)
}

export function extractSkills(text) {
  const hay = ` ${normalize(text)} `
  const found = []
  for (const skill of SKILL_LOOKUP) {
    const needle = ` ${skill} `
    const alt = skill.replace(/\./g, '')
    if (hay.includes(needle) || hay.includes(` ${alt} `) || hay.includes(` ${skill},`)) {
      found.push(skill)
    }
  }
  return [...new Set(found)]
}

export function extractTitles(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  const titles = []
  const phrase =
    /\b((?:senior|staff|lead|jr\.?|junior)?\s*(?:front[\s-]?end|back[\s-]?end|full[\s-]?stack|ui|ux)?\s*(?:software\s+)?(?:engineer|developer|designer)s?)\b/gi
  for (const line of lines.slice(0, 80)) {
    if (line.length <= 8) continue
    if (line.length < 90 && isRoleTitle(line)) {
      titles.push(line.replace(/^[-•*\d.)\s]+/, '').slice(0, 80))
      continue
    }
    const found = line.match(phrase) || []
    for (const hit of found) {
      const clean = hit.trim()
      if (clean.length >= 8) titles.push(clean.slice(0, 80))
    }
  }
  return [...new Set(titles)].slice(0, 8)
}

export function extractYears(text) {
  const hay = String(text || '')
  const explicit = hay.match(/(\d{1,2})\+?\s+years?/i)
  if (explicit) return Math.min(40, Number(explicit[1]))
  const ranges = [...hay.matchAll(/\b(19|20)\d{2}\s*[-–—to]+\s*((?:19|20)\d{2}|present|current|now)\b/gi)]
  let max = 0
  const now = new Date().getFullYear()
  for (const m of ranges) {
    const start = Number(m[0].slice(0, 4))
    const endRaw = m[2].toLowerCase()
    const end = /present|current|now/.test(endRaw) ? now : Number(endRaw)
    if (end >= start) max = Math.max(max, end - start)
  }
  return max
}

export function parseResume(text) {
  const raw = String(text || '').trim()
  const skills = extractSkills(raw)
  const titles = extractTitles(raw)
  const years = extractYears(raw)
  const keywords = [...new Set(tokenize(raw).filter((t) => t.length > 3))].slice(0, 80)
  const summary = raw.split(/\n/).map((l) => l.trim()).filter(Boolean).slice(0, 6).join(' ')
  return { skills, titles, years, keywords, summary: summary.slice(0, 600) }
}

function overlap(a, b) {
  const sb = new Set(b)
  const hit = a.filter((x) => sb.has(x))
  if (!a.length) return 0
  return hit.length / a.length
}

export function isLeadershipTitle(title) {
  return /\b(director|vice president|\bvp\b|chief |head of|people partner|engineering manager|manager)\b/i.test(
    String(title || ''),
  )
}

export function isIcTitle(title) {
  const t = String(title || '')
  if (isLeadershipTitle(t)) return false
  return /\b(engineer|developer|designer|analyst|scientist|specialist)\b/i.test(t)
}

export function resumeLooksIc(titles) {
  const list = titles || []
  return list.some((t) => isIcTitle(t)) && !list.some((t) => isLeadershipTitle(t))
}

export function inferSeniority(job) {
  const t = normalize(`${job.seniority || ''} ${job.title || ''}`)
  if (/\b(intern|junior|entry)\b/.test(t)) return 'junior'
  if (/\b(director|vice president|\bvp\b|chief|head of|people partner)\b/.test(t)) return 'director'
  if (/\b(staff|principal)\b/.test(t)) return 'staff'
  if (/\bmanager\b/.test(t)) return 'manager'
  if (/\blead\b/.test(t)) return 'lead'
  if (/\b(senior|sr\.?)\b/.test(t)) return 'senior'
  const given = String(job.seniority || '').toLowerCase()
  return given || 'mid'
}

export function skillsExcludingCompany(skills, company) {
  const c = normalize(company)
  if (!c) return skills || []
  const parts = new Set(tokenize(company).filter((t) => t.length > 2))
  return (skills || []).filter((s) => {
    const n = normalize(s)
    if (n === c) return false
    if (parts.has(n)) return false
    return true
  })
}

export function listingKey(job) {
  const url = String(job.source_url || '')
  const gh = url.match(/gh_jid=(\d+)/i)?.[1] || url.match(/\/jobs\/(\d{5,})/)?.[1]
  if (gh) return `jid:${gh}`
  try {
    const u = new URL(url)
    return `${u.hostname.replace(/^www\./, '')}${u.pathname.replace(/\/$/, '')}`.toLowerCase()
  } catch {
    return `${normalize(job.company)}|${normalize(job.title)}|${normalize(job.location)}`
  }
}

export function dedupeJobs(jobs) {
  const seen = new Set()
  const out = []
  for (const job of jobs) {
    const urlKey = listingKey(job)
    const titleKey = `${normalize(job.company)}|${normalize(job.title)}|${normalize(job.location)}`
    if (seen.has(urlKey) || seen.has(titleKey)) continue
    seen.add(urlKey)
    seen.add(titleKey)
    out.push(job)
  }
  return out
}

function titleScore(resumeTitles, jobTitle) {
  const job = normalize(jobTitle)
  const jobTokens = new Set(tokenize(jobTitle))
  let best = 0
  for (const t of resumeTitles) {
    const low = normalize(t)
    if (low.includes(job) || job.includes(low)) {
      best = Math.max(best, 1)
      continue
    }
    const tokens = tokenize(t).filter((x) => x.length > 2 && !['with', 'and', 'the'].includes(x))
    const shared = tokens.filter((x) => jobTokens.has(x))
    best = Math.max(best, Math.min(1, shared.length / Math.max(3, tokens.length)))
  }
  const specific = ['full stack', 'front end', 'frontend', 'back end', 'backend', 'data scientist', 'product manager']
  if (specific.some((h) => job.includes(h) && resumeTitles.some((t) => normalize(t).includes(h)))) {
    best = Math.max(best, 0.75)
  }
  if (resumeLooksIc(resumeTitles) && isLeadershipTitle(jobTitle)) {
    return Math.min(best, 0.12)
  }
  if (resumeLooksIc(resumeTitles) && isIcTitle(jobTitle)) {
    if (/\b(engineer|developer)\b/.test(job) && resumeTitles.some((t) => /\b(engineer|developer|front)\b/.test(normalize(t)))) {
      best = Math.max(best, 0.48)
    }
  }
  return best
}

function locationScore(resumeLocation, jobLocation, remote) {
  if (remote === 'remote') return 1
  const a = normalize(resumeLocation)
  const b = normalize(jobLocation)
  if (!a || !b) return 0.55
  if (a.includes(b) || b.includes(a)) return 1
  const at = new Set(tokenize(a))
  const shared = tokenize(b).filter((t) => at.has(t) && t.length > 2)
  if (shared.length) return 0.8
  return 0.35
}

function seniorityScore(resumeYears, seniority) {
  const y = Number(resumeYears) || 0
  const s = normalize(seniority)
  if (s.includes('intern') || s.includes('junior') || s.includes('entry')) return y <= 3 ? 1 : 0.55
  if (s.includes('director') || s.includes('vp') || s.includes('chief') || s.includes('people partner')) {
    return y >= 10 ? 1 : 0.22
  }
  if (s.includes('manager') || s.includes('staff') || s.includes('principal')) return y >= 8 ? 1 : 0.32
  if (s.includes('senior') || s.includes('lead')) return y >= 4 ? 1 : 0.5
  return y >= 2 ? 0.85 : 0.65
}

export function scoreJob(resume, job) {
  const jobBlob = `${job.title} ${job.description} ${job.requirements} ${job.skills_csv || ''}`
  const jobSkills = skillsExcludingCompany(extractSkills(jobBlob), job.company)
  const resumeSkills = skillsExcludingCompany(resume.skills || [], job.company)
  const skillOverlap = overlap(jobSkills.length ? jobSkills : tokenize(job.skills_csv || ''), resumeSkills)
  const reverseOverlap = overlap(resumeSkills, jobSkills)
  const title = titleScore(resume.titles || [], job.title || '')
  const loc = locationScore(resume.location || '', job.location || '', job.remote)
  const band = inferSeniority(job)
  const seniority = seniorityScore(resume.years, band)
  const keywordHit = overlap(
    tokenize(`${job.title} ${job.skills_csv || ''}`).filter((t) => t.length > 3),
    resume.keywords || [],
  )

  let score =
    40 * Math.max(skillOverlap, reverseOverlap * 0.7) +
    25 * title +
    15 * keywordHit +
    12 * loc +
    8 * seniority

  if (resumeLooksIc(resume.titles || []) && isLeadershipTitle(job.title)) {
    score = Math.min(score, 28)
  }
  const rf = resumeFamily(resume)
  const jf = jobFamily(job)
  if (rf === 'frontend' && jf === 'generic' && /\b(software engineer|software developer|swe)\b/.test(normalize(job.title || ''))) {
    score += 22
  }
  score = Math.min(score, familyCap(rf, jf, job))

  const missing = jobSkills.filter((s) => !resumeSkills.includes(s)).slice(0, 12)
  const matched = jobSkills.filter((s) => resumeSkills.includes(s)).slice(0, 12)

  return {
    score: Math.round(Math.min(99, Math.max(8, score))),
    missing,
    matched,
    jobSkills,
    seniority: band,
  }
}

export function rankJobs(resume, jobs, { minScore = 0 } = {}) {
  return dedupeJobs(
    jobs
      .map((job) => {
        const result = scoreJob(resume, job)
        return {
          ...job,
          match_score: result.score,
          missing_skills: result.missing,
          matched_skills: result.matched,
          seniority: result.seniority || job.seniority,
        }
      })
      .filter((j) => j.match_score >= minScore)
      .sort((a, b) => b.match_score - a.match_score),
  )
}
