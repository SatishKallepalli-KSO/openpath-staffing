import { extractSkills, normalize, tokenize } from './matching.js'

function linesOf(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ''))
}

function isBullet(line) {
  return /^\s*[-•*]\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)
}

function bulletBody(line) {
  return line.replace(/^\s*([-•*]|\d+[.)])\s+/, '').trim()
}

function skillsLineIndex(rows) {
  return rows.findIndex((l) => /^(skills|technical skills|core skills)\b/i.test(l.trim()))
}

function overlapCount(text, keywords) {
  const tokens = new Set(tokenize(text))
  return keywords.filter((k) => tokens.has(k.split(' ')[0]) || normalize(text).includes(k)).length
}

function rewriteBullet(body, keywords) {
  const missing = keywords.filter((k) => !normalize(body).includes(k)).slice(0, 2)
  if (!missing.length) return null
  const insert = missing.map((k) => k.replace(/\b\w/g, (c) => c.toUpperCase())).join(' and ')
  let next = body.replace(/\.$/, '')
  if (next.length > 220) next = `${next.slice(0, 210).replace(/\s+\S*$/, '')}`
  next = `${next}, including ${insert}.`
  return { original: body, suggested: next, reason: `Add ${missing.join(', ')} because the posting asks for them.` }
}

export function suggestEdits(resumeText, job) {
  const jobBlob = `${job.title} ${job.description} ${job.requirements} ${job.skills_csv || ''}`
  const jobSkills = extractSkills(jobBlob)
  const resumeSkills = extractSkills(resumeText)
  const missing = jobSkills.filter((s) => !resumeSkills.includes(s)).slice(0, 8)
  const rows = linesOf(resumeText)
  const bullets = rows
    .map((line, index) => ({ line, index, body: bulletBody(line) }))
    .filter((r) => isBullet(r.line) && r.body.length > 24)

  const ranked = bullets
    .map((b) => ({ ...b, hit: overlapCount(b.body, missing) }))
    .sort((a, b) => a.hit - b.hit || b.body.length - a.body.length)

  const bulletRewrites = []
  const used = new Set()
  for (const b of ranked) {
    if (bulletRewrites.length >= 3) break
    const edit = rewriteBullet(b.body, missing.filter((k) => !used.has(k)))
    if (!edit) continue
    used.add(extractSkills(edit.suggested).find((s) => missing.includes(s)) || missing[0])
    bulletRewrites.push({ ...edit, index: b.index })
  }

  const skillAdditions = missing.slice(0, 6)
  const summaryLines = rows.filter((l) => l.trim()).slice(0, 8)
  const summaryOriginal = summaryLines[0] || ''
  let summarySuggested = null
  if (missing.length && summaryOriginal && summaryOriginal.length < 280 && !/^skills/i.test(summaryOriginal)) {
    const extra = missing.slice(0, 3).join(', ')
    if (!normalize(summaryOriginal).includes(missing[0])) {
      summarySuggested = {
        original: summaryOriginal,
        suggested: `${summaryOriginal.replace(/\.$/, '')} Strong fit for ${job.title} roles using ${extra}.`,
        reason: 'Open the resume with the role and two posting keywords.',
      }
    }
  }

  const tailoredRows = [...rows]
  if (!tailoredRows.length) tailoredRows.push('')
  for (const edit of bulletRewrites) {
    const prefix = tailoredRows[edit.index].match(/^\s*([-•*]|\d+[.)])\s+/)?.[0] || '- '
    tailoredRows[edit.index] = `${prefix}${edit.suggested}`
  }
  if (summarySuggested) {
    const idx = tailoredRows.findIndex((l) => l === summarySuggested.original)
    if (idx >= 0) tailoredRows[idx] = summarySuggested.suggested
  }
  if (skillAdditions.length) {
    const idx = skillsLineIndex(tailoredRows)
    const addition = skillAdditions.join(', ')
    if (idx >= 0) {
      const next = idx + 1 < tailoredRows.length && !isBullet(tailoredRows[idx + 1]) ? idx + 1 : idx
      if (next === idx) {
        tailoredRows[idx] = `${tailoredRows[idx].replace(/\s*$/, '')} ${addition}`
      } else if (!normalize(tailoredRows[next]).includes(skillAdditions[0])) {
        tailoredRows[next] = `${tailoredRows[next].replace(/\s*$/, '')}, ${addition}`
      }
    } else {
      tailoredRows.push('', `Skills: ${[...resumeSkills, ...skillAdditions].slice(0, 24).join(', ')}`)
    }
  }

  const tailoredText = tailoredRows.join('\n').trim()
  const warnings = []
  if (missing.length > 6) {
    warnings.push('Only add skills you can speak to in an interview. Skip tools you have not used.')
  }
  warnings.push('Keep dates, employers, and titles truthful. These edits only rephrase what you already did.')

  return {
    missing_keywords: missing,
    skill_additions: skillAdditions,
    bullet_rewrites: bulletRewrites.map(({ original, suggested, reason }) => ({ original, suggested, reason })),
    summary_tweak: summarySuggested,
    tailored_text: tailoredText || resumeText,
    warnings,
  }
}
