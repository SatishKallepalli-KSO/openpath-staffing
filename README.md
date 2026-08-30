# OpenPath Staffing

Candidate-first staffing site: upload a resume, match roles, make small edits, apply, and track progress.

**Stack:** React 19 + Vite (web), Node.js Express (API), Render Free Docker, Neon Free Postgres.

## What this is

The job market is noisy. OpenPath helps people spend energy on roles they can actually win.

1. Sign up and build a profile
2. Upload a resume (PDF, Word, or paste)
3. See jobs scored against that resume
4. Accept small, keyword-aware edits
5. Apply (we open the employer link and keep your status)
6. Track saved / applied / interviewing / offered / rejected

We do **not** scrape LinkedIn, Indeed, or Greenhouse. v1 uses an OpenPath catalog (plus optional Adzuna live search if you add API keys). We do **not** auto-submit into someone else's ATS.

## Quick start

```bash
npm install
# terminal 1
npm run dev:api
# terminal 2
npm run dev          # http://localhost:5175
```

Demo login: `demo@openpath.jobs` / `DemoPass1234`

Admin desk (`#/admin`): set `ADMIN_PIN` or local `ALLOW_INSECURE_DEFAULT_PIN=1`.

## Documentation

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- [docs/DEPLOY-FREE.md](docs/DEPLOY-FREE.md)
- [docs/DATABASE.md](docs/DATABASE.md)

## Tests

```bash
npm run lint && npm run build
npm run test:api
```
