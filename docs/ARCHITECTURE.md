# Architecture

OpenPath Staffing is a candidate-first staffing app. People sign up, upload a resume, see scored jobs, tailor a few lines, apply, and track the pipeline.

## System overview

```mermaid
flowchart LR
  subgraph Clients
    B[Browser SPA]
  end
  subgraph Render["Render Free · Docker web service"]
    API[Express + Node 22]
    SPA[Static Vite build]
    API --> SPA
  end
  subgraph Data
    Neon[(Neon Free Postgres)]
    SQLite[(SQLite local fallback)]
  end
  B --> API
  API --> Neon
  API --> SQLite
```

- Frontend: React 19, Vite, TypeScript, CSS (`apps/web`)
- Backend: Node 22, Express, JWT (`apps/api`)
- Database: Neon Postgres (prod), SQLite (local default)
- Hosting: Render Free Docker service (Oregon)

Same deploy shape as murali-transport: one container serves the API and the built SPA.

## Repository layout

```
staffing-copmany/
├── apps/web/          React SPA
├── apps/api/          Express API
├── Dockerfile         Multi-stage: build SPA, serve with Node
├── render.yaml
└── docs/
```

## Runtime

Production: Vite builds with `VITE_API_BASE=` (same origin). Express serves `/v1/*`, `/healthz`, and `index.html`.

Local: Vite on `5175` proxies `/v1` and `/healthz` to Express on `8000`.

## Matching

`matching.js` extracts skills from a lexicon, titles, and years, then scores each job:

- Skill overlap (largest weight)
- Title similarity
- Keyword hit
- Location / remote
- Seniority vs years

Tailoring (`tailor.js`) only rephrases existing bullets and a skills line. It does not invent employers or dates.

## Job sources

1. Seeded catalog (Greenhouse / Lever / company-style postings, plus OpenPath-owned roles)
2. Admin desk can publish more roles
3. Optional Adzuna API (`ADZUNA_APP_ID`, `ADZUNA_APP_KEY`)

Apply records status locally and opens `source_url` when it is an http(s) link.
