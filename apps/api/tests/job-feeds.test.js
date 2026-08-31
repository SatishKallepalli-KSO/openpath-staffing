import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { applyBrand, boardSearchLinks, isCandidateListing, isLiveApplyUrl, isTrustedUsListing, isUsaJob, jobMatchesQuery, linkedinSearchLinks, searchQuery, stackSearchQuery } from '../src/job-feeds.js'

describe('live job query filter', () => {
  it('keeps a software role for an engineer query', () => {
    assert.equal(
      jobMatchesQuery(
        {
          title: 'Senior React Engineer',
          company: 'Harbor',
          location: 'Remote',
          department: 'Engineering',
          skills_csv: 'react, typescript',
          description: 'Build product UI',
        },
        'react typescript engineer',
      ),
      true,
    )
  })

  it('drops an unrelated nursing role', () => {
    assert.equal(
      jobMatchesQuery(
        {
          title: 'Registered Nurse',
          company: 'Clinic',
          location: 'Boston',
          department: 'Care',
          skills_csv: 'nursing',
          description: 'Patient care',
        },
        'react typescript engineer',
      ),
      false,
    )
  })

  it('drops backend roles when the search is frontend', () => {
    assert.equal(
      jobMatchesQuery(
        {
          title: 'Backend Engineer',
          company: 'Harbor',
          location: 'Remote',
          department: 'Engineering',
          skills_csv: 'java, kafka',
          description: 'Build APIs',
        },
        'frontend engineer',
      ),
      false,
    )
    assert.equal(
      jobMatchesQuery(
        {
          title: 'Frontend Engineer',
          company: 'Harbor',
          location: 'Remote',
          department: 'Engineering',
          skills_csv: 'react, typescript',
          description: 'Build product UI',
        },
        'frontend engineer',
      ),
      true,
    )
    assert.equal(
      jobMatchesQuery(
        {
          title: 'Software Engineer',
          company: 'Airbnb',
          location: 'San Francisco, CA',
          department: 'Engineering',
          skills_csv: '',
          description: 'Career posting on Greenhouse.',
        },
        'frontend engineer',
      ),
      true,
    )
  })
})

describe('apply urls and board search', () => {
  it('accepts a real https posting and rejects example.com', () => {
    assert.equal(isLiveApplyUrl('https://remoteok.com/remote-jobs/role'), true)
    assert.equal(isLiveApplyUrl('https://example.com/jobs/harbor-labs-fullstack'), false)
    assert.equal(isLiveApplyUrl('not-a-url'), false)
  })

  it('builds LinkedIn, Indeed, Google, Meta, and Oracle career searches', () => {
    const links = boardSearchLinks('Full stack engineer', 'San Jose, CA')
    const names = links.map((l) => l.name)
    assert.equal(names.includes('LinkedIn'), false)
    assert.ok(names.includes('Indeed'))
    assert.ok(names.includes('ZipRecruiter'))
    assert.ok(names.includes('Greenhouse'))
    assert.ok(names.includes('Google'))
    assert.ok(names.includes('Meta'))
    assert.ok(names.includes('Oracle'))
    const linkedin = links.find((l) => l.name === 'Indeed')
    assert.ok(linkedin?.url.includes('indeed.com/jobs'))
    assert.ok(linkedin?.url.includes('fromage=1'))
    assert.ok(linkedin?.url.includes('sort=date'))
    const google = links.find((l) => l.name === 'Google')
    assert.ok(google?.url.includes('careers.google.com') || google?.url.includes('about/careers'))
    const meta = links.find((l) => l.name === 'Meta')
    assert.ok(meta?.url.includes('metacareers.com'))
    const oracle = links.find((l) => l.name === 'Oracle')
    assert.ok(oracle?.url.includes('oracle.com'))
  })

  it('builds LinkedIn searches for recent posts and few applicants', () => {
    const links = linkedinSearchLinks('frontend engineer', 'United States')
    assert.equal(links.length, 3)
    for (const link of links) {
      assert.ok(link.url.includes('linkedin.com/jobs/search'))
      assert.ok(link.url.includes('frontend'))
      assert.ok(link.url.includes('sortBy=DD'))
      assert.ok(link.url.includes('f_AL=true'))
    }
    assert.ok(links.some((l) => l.url.includes('f_TPR=r86400')))
    assert.ok(links.some((l) => l.url.includes('f_EA=true')))
    assert.ok(links.some((l) => l.url.includes('f_TPR=r604800')))
  })

  it('labels Greenhouse, LinkedIn, and Amazon apply destinations', () => {
    assert.equal(applyBrand('https://job-boards.greenhouse.io/gitlab/jobs/1'), 'Greenhouse')
    assert.equal(applyBrand('https://www.linkedin.com/jobs/view/123'), 'LinkedIn')
    assert.equal(applyBrand('https://www.amazon.jobs/en/jobs/1/software-engineer'), 'Amazon')
  })

  it('shortens a long resume headline into a job search query', () => {
    assert.equal(
      searchQuery(
        { titles: ['Full stack engineer with 6 years building React and Node.js products.'], skills: ['react'] },
        { target_roles: 'Full stack, frontend, backend' },
      ),
      'Full stack engineer',
    )
  })

  it('searches the tech stack instead of a project name', () => {
    const q = searchQuery(
      {
        titles: ['Halogen Media Operations Platform Feb 2024 – Present'],
        skills: ['react', 'typescript', 'node.js', 'aws'],
      },
      { headline: '', target_roles: '' },
    )
    assert.equal(q.includes('Halogen'), false)
    assert.equal(q, 'frontend engineer')
  })

  it('prefixes the main frontend skill so LinkedIn is not every frontend job', () => {
    const parsed = {
      titles: ['Frontend Engineer'],
      skills: ['react', 'typescript', 'css'],
    }
    const user = { headline: '', target_roles: '' }
    assert.equal(searchQuery(parsed, user), 'frontend engineer')
    assert.equal(stackSearchQuery(parsed, user), 'React frontend engineer')
    const links = linkedinSearchLinks(stackSearchQuery(parsed, user), 'United States')
    assert.ok(links.every((l) => l.url.includes('React')))
    assert.ok(links.every((l) => l.url.includes('frontend')))
  })

  it('uses Vue when that is the main frontend skill', () => {
    assert.equal(
      stackSearchQuery(
        { titles: ['Frontend Engineer'], skills: ['vue', 'javascript'] },
        { headline: '', target_roles: '' },
      ),
      'Vue frontend engineer',
    )
  })

  it('keeps US Greenhouse roles and drops Remotive or overseas listings', () => {
    assert.equal(
      isTrustedUsListing({
        source: 'greenhouse',
        source_url: 'https://job-boards.greenhouse.io/figma/jobs/1',
        location: 'San Francisco, CA',
      }),
      true,
    )
    assert.equal(
      isTrustedUsListing({
        source: 'remotive',
        source_url: 'https://remotive.com/remote-jobs/role',
        location: 'Remote',
      }),
      false,
    )
    assert.equal(
      isTrustedUsListing({
        source: 'greenhouse',
        source_url: 'https://job-boards.greenhouse.io/gitlab/jobs/1',
        location: 'Italy',
      }),
      false,
    )
    assert.equal(
      isCandidateListing({
        source: 'company',
        source_url: 'https://example.com/jobs/harbor-labs-fullstack',
        location: 'San Jose, CA',
      }),
      false,
    )
    assert.equal(
      isCandidateListing({
        source: 'greenhouse',
        source_url: 'https://job-boards.greenhouse.io/figma/jobs/1',
        location: 'San Francisco, CA',
      }),
      true,
    )
    assert.equal(
      isUsaJob({
        location: 'Melbourne, Victoria, AUS',
        source: 'amazon',
        source_url: 'https://www.amazon.jobs/en/jobs/1',
      }),
      false,
    )
    assert.equal(
      isUsaJob({
        location: 'N/A',
        source: 'greenhouse',
        source_url: 'https://job-boards.greenhouse.io/stripe/jobs/1',
      }),
      false,
    )
  })
})
