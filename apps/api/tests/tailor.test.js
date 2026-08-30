import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { suggestEdits } from '../src/tailor.js'

describe('resume tailor', () => {
  it('adds missing job keywords without inventing employers', () => {
    const resume = `Jordan Hale
Full stack engineer.

Skills
JavaScript, React, Node.js

Experience
Software Engineer, Harbor Labs, 2019 to 2022
- Built hiring dashboards in React.
- Wrote API tests and documentation.
`
    const suggestion = suggestEdits(resume, {
      title: 'Full Stack Engineer',
      description: 'TypeScript React Node.js Postgres Docker AWS',
      requirements: 'TypeScript Postgres Docker',
      skills_csv: 'typescript, postgres, docker, react, node.js',
    })
    assert.ok(suggestion.missing_keywords.includes('typescript'))
    assert.ok(suggestion.tailored_text.includes('Harbor Labs'))
    assert.ok(suggestion.tailored_text.length >= resume.length)
    assert.equal(suggestion.bullet_rewrites.length > 0, true)
  })
})
