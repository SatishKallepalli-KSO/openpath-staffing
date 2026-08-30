import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractSkills, parseResume, scoreJob } from '../src/matching.js'

describe('resume parse', () => {
  it('extracts skills and years from a typical resume', () => {
    const text = `
Jordan Hale
Full stack engineer with 6 years of experience.
Skills: React, TypeScript, Node.js, Postgres, Docker, AWS
- Built APIs in Express and PostgreSQL
`
    const parsed = parseResume(text)
    assert.ok(parsed.skills.includes('react'))
    assert.ok(parsed.skills.includes('typescript'))
    assert.ok(parsed.skills.includes('node.js'))
    assert.equal(parsed.years, 6)
  })

  it('scores a matching job higher than an unrelated one', () => {
    const resume = parseResume('React TypeScript Node.js Postgres Docker AWS full stack engineer 5 years')
    resume.location = 'San Jose, CA'
    const fit = scoreJob(resume, {
      title: 'Full Stack Engineer',
      company: 'Harbor',
      location: 'San Francisco, CA',
      remote: 'hybrid',
      description: 'React and Node.js',
      requirements: 'TypeScript Postgres AWS Docker',
      skills_csv: 'react, node.js, typescript, postgres',
      seniority: 'mid',
    })
    const miss = scoreJob(resume, {
      title: 'Registered Nurse',
      company: 'Clinic',
      location: 'Boston, MA',
      remote: 'onsite',
      description: 'Epic EHR patient care HIPAA',
      requirements: 'RN license case management',
      skills_csv: 'nursing, epic, hipaa',
      seniority: 'mid',
    })
    assert.ok(fit.score > miss.score)
    assert.ok(fit.score >= 50)
  })

  it('finds multi-word skills', () => {
    const skills = extractSkills('I used machine learning and power bi with dbt on snowflake')
    assert.ok(skills.includes('machine learning'))
    assert.ok(skills.includes('power bi'))
    assert.ok(skills.includes('dbt'))
  })
})
