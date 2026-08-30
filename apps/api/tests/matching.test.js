import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractSkills, parseResume, rankJobs, scoreJob } from '../src/matching.js'

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

  it('does not treat a dated project name as a job title', () => {
    const parsed = parseResume(`
Satish Kallepalli
Software Engineer
Skills: React, TypeScript, Node.js, AWS
Halogen Media Operations Platform Feb 2024 – Present
- Built media workflows in React and Node.js
`)
    assert.ok(parsed.titles.some((t) => /engineer/i.test(t)))
    assert.equal(
      parsed.titles.some((t) => /halogen/i.test(t)),
      false,
    )
    assert.ok(parsed.skills.includes('react'))
    assert.ok(parsed.skills.includes('typescript'))
  })

  it('does not treat Figma the company as a skill hit for an IC engineer', () => {
    const resume = parseResume(`
Jordan Hale
Full stack engineer with 6 years building React and Node.js products.
Skills: JavaScript, TypeScript, React, Node.js, Figma, Docker
Senior Software Engineer, Northwind Health, 2022 to present
`)
    resume.location = 'San Jose, CA'
    resume.years = 6
    const director = scoreJob(resume, {
      title: 'Director, People Partners - Product, Design & Engineering',
      company: 'Figma',
      location: 'San Francisco, CA',
      remote: 'hybrid',
      description: 'Career posting on Greenhouse.',
      requirements: '',
      skills_csv: '',
      seniority: 'mid',
      source_url: 'https://boards.greenhouse.io/figma/jobs/6150563004?gh_jid=6150563004',
    })
    const ic = scoreJob(resume, {
      title: 'Full Stack Engineer',
      company: 'Stripe',
      location: 'San Francisco, CA',
      remote: 'hybrid',
      description: 'Build product with React, TypeScript, and Node.js.',
      requirements: 'TypeScript, React, Node.js, Postgres',
      skills_csv: 'react, typescript, node.js',
      seniority: 'mid',
      source_url: 'https://boards.greenhouse.io/stripe/jobs/1?gh_jid=11111',
    })
    assert.ok(director.score < 45, `director scored ${director.score}`)
    assert.ok(ic.score > director.score)
    assert.ok(ic.score >= 50, `ic scored ${ic.score}`)
  })

  it('dedupes the same Greenhouse posting listed twice', () => {
    const resume = parseResume('React TypeScript Node.js full stack engineer 5 years')
    const a = {
      title: 'Software Engineer - Graphics & Media',
      company: 'Figma',
      location: 'San Francisco, CA',
      remote: 'hybrid',
      description: 'Career posting on Greenhouse.',
      requirements: '',
      skills_csv: 'react',
      seniority: 'mid',
      source_url: 'https://boards.greenhouse.io/figma/jobs/5552522004?gh_jid=5552522004',
    }
    const b = {
      ...a,
      source_url: 'https://job-boards.greenhouse.io/figma/jobs/5552522004',
    }
    const ranked = rankJobs(resume, [a, b], { minScore: 0 })
    assert.equal(ranked.length, 1)
  })
})
