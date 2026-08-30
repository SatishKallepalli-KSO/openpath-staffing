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
  for (const line of lines.slice(0, 80)) {
    if (line.length <= 8 || line.length >= 90) continue
    if (!isRoleTitle(line)) continue
    titles.push(line.replace(/^[-•*\d.)\s]+/, '').slice(0, 80))
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
    const tokens = tokenize(t)
    const shared = tokens.filter((x) => jobTokens.has(x) && x.length > 2)
    best = Math.max(best, Math.min(1, shared.length / Math.max(3, tokens.length)))
  }
  const hints = TITLE_HINTS.filter((h) => job.includes(h))
  if (hints.length && resumeTitles.some((t) => hints.some((h) => normalize(t).includes(h)))) {
    best = Math.max(best, 0.55)
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
  if (s.includes('staff') || s.includes('principal') || s.includes('director')) return y >= 7 ? 1 : 0.4
  if (s.includes('senior') || s.includes('lead')) return y >= 4 ? 1 : 0.5
  return y >= 2 ? 0.85 : 0.65
}

export function scoreJob(resume, job) {
  const jobBlob = `${job.title} ${job.company} ${job.description} ${job.requirements} ${job.skills_csv || ''}`
  const jobSkills = extractSkills(jobBlob)
  const resumeSkills = resume.skills || []
  const skillOverlap = overlap(jobSkills.length ? jobSkills : tokenize(job.skills_csv || ''), resumeSkills)
  const reverseOverlap = overlap(resumeSkills, jobSkills)
  const title = titleScore(resume.titles || [], job.title || '')
  const loc = locationScore(resume.location || '', job.location || '', job.remote)
  const seniority = seniorityScore(resume.years, job.seniority || '')
  const keywordHit = overlap(
    tokenize(`${job.title} ${job.skills_csv || ''}`).filter((t) => t.length > 3),
    resume.keywords || [],
  )

  const score =
    40 * Math.max(skillOverlap, reverseOverlap * 0.7) +
    25 * title +
    15 * keywordHit +
    12 * loc +
    8 * seniority

  const missing = jobSkills.filter((s) => !resumeSkills.includes(s)).slice(0, 12)
  const matched = jobSkills.filter((s) => resumeSkills.includes(s)).slice(0, 12)

  return {
    score: Math.round(Math.min(99, Math.max(8, score))),
    missing,
    matched,
    jobSkills,
  }
}

export function rankJobs(resume, jobs, { minScore = 0 } = {}) {
  return jobs
    .map((job) => {
      const result = scoreJob(resume, job)
      return { ...job, match_score: result.score, missing_skills: result.missing, matched_skills: result.matched }
    })
    .filter((j) => j.match_score >= minScore)
    .sort((a, b) => b.match_score - a.match_score)
}
