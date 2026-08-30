import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { boardSearchLinks, isLiveApplyUrl, jobMatchesQuery, searchQuery } from '../src/job-feeds.js'

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
})

describe('apply urls and board search', () => {
  it('accepts a real https posting and rejects example.com', () => {
    assert.equal(isLiveApplyUrl('https://remoteok.com/remote-jobs/role'), true)
    assert.equal(isLiveApplyUrl('https://example.com/jobs/harbor-labs-fullstack'), false)
    assert.equal(isLiveApplyUrl('not-a-url'), false)
  })

  it('builds LinkedIn and Indeed search links from the resume title', () => {
    const links = boardSearchLinks('Full stack engineer', 'San Jose, CA')
    const linkedin = links.find((l) => l.name === 'LinkedIn')
    const indeed = links.find((l) => l.name === 'Indeed')
    assert.ok(linkedin?.url.includes('linkedin.com/jobs/search'))
    assert.ok(linkedin?.url.includes('Full%20stack'))
    assert.ok(indeed?.url.includes('indeed.com/jobs'))
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
})
